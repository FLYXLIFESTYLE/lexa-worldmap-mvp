/**
 * Ingest OSM POIs from a local JSONL file into Supabase canonical tables.
 *
 * Input format: one JSON object per line (see `data_raw/*.jsonl`), e.g.:
 * { "source":"osm", "source_id":"osm_node_123", "name":"...", "lat":..., "lon":..., "tags":{...}, "destination_name":"..." }
 *
 * Usage:
 *   npm run ingest:osm -- "<Destination Name>" "<path-to-jsonl>"
 *
 * Requirements:
 *   - env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - destination exists in Supabase table `destinations_geo`
 *
 * Notes:
 *   - Named-POI-only: rows without a usable name are skipped.
 *   - Idempotent by `experience_entity_sources(source='osm', source_id)` unique index.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

type OSMRow = {
  source?: string;
  source_id?: string;
  name?: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, any>;
  destination_name?: string;
  osm_type?: string;
};

function assertEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set them in your .env.local (or environment) before running this script.'
    );
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

  return data as { id: string; name: string; bbox: BBox | null };
}

function looksLikePlaceholderName(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return true;
  if (/^(unnamed|unknown|n\/a|null)$/i.test(n)) return true;
  return false;
}

function pickPrimaryCategory(tags: Record<string, any>): { key: string; value: string } | null {
  const keys = ['tourism', 'amenity', 'leisure', 'natural', 'shop', 'sport', 'aeroway', 'man_made', 'harbour'];
  for (const k of keys) {
    const v = tags?.[k];
    if (typeof v === 'string' && v.trim()) return { key: k, value: v.trim() };
  }
  return null;
}

async function readJsonl(filePath: string): Promise<OSMRow[]> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  const out: OSMRow[] = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines (rare)
    }
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  assertEnv();
  const supabase = createSupabaseAdmin();

  const destinationName = process.argv[2]?.trim();
  const inputPathArg = process.argv[3]?.trim();
  if (!destinationName || !inputPathArg) {
    throw new Error('Usage: npm run ingest:osm -- "<Destination Name>" "<path-to-jsonl>"');
  }

  const dest = await fetchDestinationByName(destinationName);
  const inputPath = path.isAbsolute(inputPathArg) ? inputPathArg : path.join(process.cwd(), inputPathArg);

  console.log(`=== OSM JSONL ingestion: ${dest.name} ===`);
  console.log(`File: ${inputPath}`);

  const raw = await readJsonl(inputPath);
  console.log(`Read rows=${raw.length}`);

  // Basic validation + named-only filtering
  const cleaned = raw
    .map((r) => {
      const name = String(r.name || '').trim();
      const sourceId = String(r.source_id || '').trim();
      const lat = typeof r.lat === 'number' ? r.lat : Number(r.lat);
      const lon = typeof r.lon === 'number' ? r.lon : Number(r.lon);
      const tags = typeof r.tags === 'object' && r.tags ? r.tags : {};
      return { name, sourceId, lat, lon, tags, raw: r };
    })
    .filter((r) => r.sourceId && r.name && !looksLikePlaceholderName(r.name) && Number.isFinite(r.lat) && Number.isFinite(r.lon));

  // De-dupe by source_id (some bbox exports can contain duplicates; source_id is globally unique).
  const bySourceId = new Map<string, (typeof cleaned)[number]>();
  for (const r of cleaned) {
    if (!bySourceId.has(r.sourceId)) bySourceId.set(r.sourceId, r);
  }
  const cleanedUnique = Array.from(bySourceId.values());

  console.log(`Usable rows (named + coords)=${cleanedUnique.length}`);
  if (!cleanedUnique.length) return;

  // 1) Preload existing sources to keep it idempotent without 10k round trips.
  const sourceIds = Array.from(new Set(cleanedUnique.map((r) => r.sourceId)));
  const existing = new Set<string>();
  for (const ids of chunk(sourceIds, 200)) {
    const { data, error } = await supabase
      .from('experience_entity_sources')
      .select('source_id')
      .eq('source', 'osm')
      .in('source_id', ids);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) existing.add(String((row as any).source_id));
  }

  const toInsert = cleanedUnique.filter((r) => !existing.has(r.sourceId));
  console.log(`Already present sources=${existing.size} | New sources to ingest=${toInsert.length}`);
  if (!toInsert.length) return;

  // 2) Insert entities (batch) and then insert source rows pointing to them.
  let createdEntities = 0;
  let createdSources = 0;

  const entityBatchSize = 200;
  for (const batch of chunk(toInsert, entityBatchSize)) {
    const entityRows = batch.map((r) => {
      const primary = pickPrimaryCategory(r.tags);
      const website = typeof r.tags.website === 'string' ? r.tags.website : null;
      const phone = typeof r.tags.phone === 'string' ? r.tags.phone : null;

      const tags: string[] = ['osm'];
      if (primary?.value) tags.push(primary.value);

      return {
        kind: 'poi',
        name: r.name,
        normalized_name: r.name.toLowerCase(),
        destination_id: dest.id,
        lat: r.lat,
        lon: r.lon,
        website,
        phone,
        categories: {
          osm_primary: primary ? { key: primary.key, value: primary.value } : null,
        },
        tags,
        source_hints: {
          osm_source_id: r.sourceId,
        },
        score_evidence: {},
        risk_flags: {},
      };
    });

    const { data: inserted, error: insErr } = await supabase.from('experience_entities').insert(entityRows).select('id');
    if (insErr) throw new Error(`Failed to insert experience_entities: ${insErr.message}`);
    if (!inserted || inserted.length !== batch.length) {
      throw new Error(`Insert mismatch: expected ${batch.length} entity ids, got ${inserted?.length ?? 0}`);
    }

    createdEntities += inserted.length;

    // Destination membership + destination-specific source pointers (best-effort).
    // These tables may not exist yet (migration not applied), so ignore failures.
    try {
      const membershipRows = inserted.map((row) => ({
        entity_id: (row as any).id,
        destination_id: dest.id,
      }));

      await supabase
        .from('experience_entity_destinations')
        .upsert(membershipRows, { onConflict: 'entity_id,destination_id', ignoreDuplicates: true });
    } catch {
      // ignore
    }

    const sourceRows = batch.map((r, idx) => ({
      source: 'osm',
      source_id: r.sourceId,
      entity_id: (inserted[idx] as any).id,
      normalized: {
        name: r.name,
        lat: r.lat,
        lon: r.lon,
        destination_name: dest.name,
      },
      raw: r.raw,
    }));

    const { error: srcErr } = await supabase.from('experience_entity_sources').insert(sourceRows);
    if (srcErr) throw new Error(`Failed to insert experience_entity_sources: ${srcErr.message}`);
    createdSources += sourceRows.length;

    try {
      const destSourceRows = batch.map((r, idx) => ({
        destination_id: dest.id,
        entity_id: (inserted[idx] as any).id,
        source: 'osm',
        source_id: r.sourceId,
      }));
      await supabase
        .from('experience_entity_destination_sources')
        .upsert(destSourceRows, { onConflict: 'destination_id,source,source_id', ignoreDuplicates: true });
    } catch {
      // ignore
    }
  }

  console.log(`Done. Inserted entities=${createdEntities}, sources=${createdSources}, skipped_existing_sources=${existing.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

