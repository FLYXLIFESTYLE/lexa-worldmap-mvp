/**
 * Ingest Foursquare OS Places export (JSON/NDJSON) into Supabase canonical tables.
 *
 * We intentionally ingest from an exported JSON file (created by DuckDB)
 * so we don't need a Parquet reader in Node.
 *
 * Usage:
 *   npm run ingest:fsq -- "<Destination Name>" "<PathToJsonOrNdjson>"
 *
 * Example:
 *   npm run ingest:fsq -- "Monaco" "C:\\Users\\chris\\Downloads\\duckdb_cli-windows-amd64\\fsq_monaco_places.ndjson"
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

type BBoxStruct = { xmin?: number; ymin?: number; xmax?: number; ymax?: number } | null;

function assertArgs(destinationName: string, filePath: string) {
  if (!destinationName || !filePath) {
    throw new Error('Usage: npm run ingest:fsq -- "<Destination Name>" "<PathToJsonOrNdjson>"');
  }
}

async function fetchDestinationByName(name: string) {
  const supabaseAdmin = createSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('destinations_geo')
    .select('*')
    .eq('name', name)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load destination: ${error.message}`);
  if (!data) throw new Error(`Destination not found in destinations_geo: "${name}"`);

  return data as { id: string; name: string };
}

function normalizeName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const n = name.trim();
  if (!n) return null;
  return n;
}

function getFsqId(row: any): string | null {
  const id = row?.fsq_place_id ?? row?.place_id ?? row?.id;
  if (!id) return null;
  return String(id);
}

function bboxCenter(bbox: BBoxStruct): { lat: number; lon: number } | null {
  if (!bbox) return null;
  const xmin = typeof bbox.xmin === 'number' ? bbox.xmin : undefined;
  const xmax = typeof bbox.xmax === 'number' ? bbox.xmax : undefined;
  const ymin = typeof bbox.ymin === 'number' ? bbox.ymin : undefined;
  const ymax = typeof bbox.ymax === 'number' ? bbox.ymax : undefined;
  if (xmin === undefined || xmax === undefined || ymin === undefined || ymax === undefined) return null;
  const lon = (xmin + xmax) / 2;
  const lat = (ymin + ymax) / 2;
  return { lat, lon };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadExistingFsqSources(fsqIds: string[]) {
  const supabaseAdmin = createSupabaseAdmin();
  const existing = new Set<string>();

  // Keep batches small to avoid URL length limits.
  const batches = chunk(fsqIds, 50);
  for (const ids of batches) {
    const { data, error } = await supabaseAdmin
      .from('experience_entity_sources')
      .select('source_id')
      .eq('source', 'foursquare_os')
      .in('source_id', ids);

    if (error) throw new Error(`Failed to query existing FSQ sources: ${error.message}`);
    for (const row of data ?? []) existing.add(String(row.source_id));
  }

  return existing;
}

async function parseJsonOrNdjson(filePath: string): Promise<any[]> {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);

  // Heuristic: if the file starts with "[" treat as JSON array; otherwise NDJSON.
  const firstBytes = fs.readFileSync(abs, { encoding: 'utf-8' }).slice(0, 50).trimStart();
  if (firstBytes.startsWith('[')) {
    const all = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    if (!Array.isArray(all)) throw new Error('Expected a JSON array');
    return all;
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(abs, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  const rows: any[] = [];
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    rows.push(JSON.parse(t));
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const destinationName = (args[0] ?? '').trim();
  const inputPath = (args[1] ?? '').trim();
  assertArgs(destinationName, inputPath);

  const dest = await fetchDestinationByName(destinationName);
  const rows = await parseJsonOrNdjson(inputPath);
  console.log(`Loaded FSQ rows: ${rows.length}`);

  const fsqIds: string[] = [];
  for (const r of rows) {
    const id = getFsqId(r);
    if (id) fsqIds.push(id);
  }

  const existing = await loadExistingFsqSources(fsqIds);
  console.log(`Existing FSQ sources already in DB: ${existing.size}`);

  const supabaseAdmin = createSupabaseAdmin();

  const candidates = rows
    .map((r) => {
      const fsqId = getFsqId(r);
      const name = normalizeName(r?.name);
      const bbox = (r?.bbox ?? null) as BBoxStruct;
      const center = bboxCenter(bbox);
      if (!fsqId || !name || !center) return null;
      return { fsqId, name, center, raw: r };
    })
    .filter(Boolean) as Array<{ fsqId: string; name: string; center: { lat: number; lon: number }; raw: any }>;

  const toInsert = candidates.filter((c) => !existing.has(c.fsqId));
  const skipped = candidates.length - toInsert.length;

  console.log(`Will ingest: ${toInsert.length} (skipped existing: ${skipped})`);

  // Keep batches small; raw rows can be large.
  const batches = chunk(toInsert, 25);

  let insertedEntities = 0;
  let insertedSources = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const entityRows = batch.map((c) => ({
      kind: 'poi' as const,
      name: c.name,
      normalized_name: c.name.toLowerCase(),
      destination_id: dest.id,
      lat: c.center.lat,
      lon: c.center.lon,
      categories: {
        foursquare_os: {
          categories: c.raw?.categories ?? null,
        },
      },
      tags: ['foursquare_os'],
      source_hints: { fsq_place_id: c.fsqId },
      score_evidence: {},
      risk_flags: {},
    }));

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('experience_entities')
      .insert(entityRows)
      .select('id, source_hints');

    if (insertErr) throw new Error(`Failed to insert experience_entities batch: ${insertErr.message}`);

    const idByFsqId = new Map<string, string>();
    for (const row of inserted ?? []) {
      const fid = row?.source_hints?.fsq_place_id;
      if (typeof fid === 'string' && row?.id) idByFsqId.set(fid, row.id);
    }

    const sourceRows = batch.map((c) => ({
      source: 'foursquare_os' as const,
      source_id: c.fsqId,
      entity_id: idByFsqId.get(c.fsqId) ?? null,
      normalized: {
        name: c.name,
        lat: c.center.lat,
        lon: c.center.lon,
      },
      raw: c.raw,
    }));

    const { error: srcErr } = await supabaseAdmin
      .from('experience_entity_sources')
      .upsert(sourceRows, { onConflict: 'source,source_id' });

    if (srcErr) throw new Error(`Failed to upsert experience_entity_sources batch: ${srcErr.message}`);

    insertedEntities += batch.length;
    insertedSources += batch.length;

    const done = i + 1;
    if (done === 1 || done % 10 === 0 || done === batches.length) {
      console.log(`Progress: ${done}/${batches.length} batches (inserted=${insertedEntities})`);
    }
  }

  console.log(
    `Done for destination="${dest.name}". insertedEntities=${insertedEntities}, insertedSources=${insertedSources}, skipped=${skipped}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


