/**
 * Ingest Overture Places GeoJSON (downloaded via overturemaps) into Supabase canonical tables.
 *
 * Why: Overture is open, high coverage, and easy to filter by bbox. This script ingests
 * a single destination file (e.g., Monaco) into:
 * - experience_entities
 * - experience_entity_sources (source='overture', unique per overture id)
 *
 * Usage:
 *   npm run ingest:overture -- "<Destination Name>" "<PathToGeoJSON>"
 *
 * Example (Windows):
 *   npm run ingest:overture -- "Monaco" "C:\\Users\\chris\\overture_monaco_places.geojson"
 */

import fs from 'node:fs';
import path from 'node:path';
import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

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

  return data as { id: string; name: string; bbox?: BBox };
}

function readJsonFile(filePath: string): any {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`GeoJSON file not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, 'utf-8');
  return JSON.parse(raw);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type OvertureCandidate = {
  overtureId: string;
  name: string;
  lat: number;
  lon: number;
  raw: any;
  props: any;
};

function getOvertureId(feature: any): string | null {
  // Prefer properties.id; fallback to feature.id
  const p = feature?.properties ?? {};
  const id = p.id ?? feature?.id;
  if (!id) return null;
  return String(id);
}

function getName(feature: any): string | null {
  const p = feature?.properties ?? {};
  const names = p.names ?? {};
  const primary = names.primary;
  if (typeof primary === 'string' && primary.trim()) return primary.trim();
  const common = names.common;
  if (Array.isArray(common) && typeof common[0] === 'string') return common[0].trim();
  const display = p.name ?? p.display_name;
  if (typeof display === 'string' && display.trim()) return display.trim();
  return null;
}

function getPoint(feature: any): { lon: number; lat: number } | null {
  const g = feature?.geometry;
  if (!g || g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return null;
  const [lon, lat] = g.coordinates;
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;
  return { lon, lat };
}

async function loadExistingOvertureSources(overtureIds: string[]) {
  const supabaseAdmin = createSupabaseAdmin();
  const existing = new Map<string, { entity_id: string | null }>();
  // IMPORTANT:
  // PostgREST encodes `.in()` lists into the URL query string.
  // Overture IDs are long; large batches can exceed URL limits and cause `TypeError: fetch failed`.
  // Keep this intentionally small for reliability.
  const batches = chunk(overtureIds, 50);

  for (const ids of batches) {
    const { data, error } = await supabaseAdmin
      .from('experience_entity_sources')
      .select('source_id, entity_id')
      .eq('source', 'overture')
      .in('source_id', ids);

    if (error) throw new Error(`Failed to query existing sources: ${error.message}`);
    for (const row of data ?? []) {
      existing.set(String(row.source_id), { entity_id: row.entity_id ?? null });
    }
  }

  return existing;
}

async function ingestOvertureBatch(params: {
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>;
  destId: string;
  candidates: OvertureCandidate[];
}) {
  const { supabaseAdmin, destId, candidates } = params;

  // 1) Insert canonical entities (batch)
  const entityRows = candidates.map((c) => ({
    kind: 'poi' as const,
    name: c.name,
    normalized_name: c.name.toLowerCase(),
    destination_id: destId,
    lat: c.lat,
    lon: c.lon,
    categories: {
      overture: {
        categories: c.props?.categories ?? null,
        class: c.props?.class ?? null,
        confidence: c.props?.confidence ?? null,
      },
    },
    tags: ['overture'],
    source_hints: { overture_id: c.overtureId },
    score_evidence: {},
    risk_flags: {},
  }));

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('experience_entities')
    .insert(entityRows)
    .select('id, source_hints');

  if (insertErr) {
    throw new Error(`Failed to insert experience_entities batch: ${insertErr.message}`);
  }

  const idByOvertureId = new Map<string, string>();
  for (const row of inserted ?? []) {
    const oid = row?.source_hints?.overture_id;
    if (typeof oid === 'string' && row?.id) idByOvertureId.set(oid, row.id);
  }

  // 2) Upsert source payloads (batch)
  const sourceRows = candidates.map((c) => {
    const entityId = idByOvertureId.get(c.overtureId) ?? null;
    return {
      source: 'overture' as const,
      source_id: c.overtureId,
      entity_id: entityId,
      normalized: { name: c.name, lat: c.lat, lon: c.lon },
      raw: c.raw,
    };
  });

  const { error: srcErr } = await supabaseAdmin
    .from('experience_entity_sources')
    .upsert(sourceRows, { onConflict: 'source,source_id' });

  if (srcErr) {
    throw new Error(`Failed to upsert experience_entity_sources batch: ${srcErr.message}`);
  }

  return { insertedEntities: candidates.length, insertedSources: candidates.length };
}

async function main() {
  assertEnv();
  const supabaseAdmin = createSupabaseAdmin();

  const args = process.argv.slice(2);
  const destinationName = (args[0] ?? '').trim();
  const geojsonPath = (args[1] ?? '').trim();

  if (!destinationName || !geojsonPath) {
    throw new Error('Usage: npm run ingest:overture -- "<Destination Name>" "<PathToGeoJSON>"');
  }

  const dest = await fetchDestinationByName(destinationName);
  const geo = readJsonFile(geojsonPath);

  const features: any[] = Array.isArray(geo?.features) ? geo.features : [];
  console.log(`Loaded GeoJSON features: ${features.length}`);

  const overtureIds: string[] = [];
  const candidatesAll: OvertureCandidate[] = [];
  for (const feature of features) {
    const overtureId = getOvertureId(feature);
    const name = getName(feature);
    const pt = getPoint(feature);
    if (!overtureId || !name || !pt) continue;
    overtureIds.push(overtureId);
    candidatesAll.push({
      overtureId,
      name,
      lat: pt.lat,
      lon: pt.lon,
      raw: feature,
      props: feature?.properties ?? {},
    });
  }

  const existing = await loadExistingOvertureSources(overtureIds);
  console.log(`Existing overture sources already in DB: ${existing.size}`);

  let insertedEntities = 0;
  let insertedSources = 0;
  let skipped = 0;

  const toInsert = candidatesAll.filter((c) => !existing.get(c.overtureId)?.entity_id);
  skipped = candidatesAll.length - toInsert.length;

  console.log(`Will ingest: ${toInsert.length} (skipped existing: ${skipped})`);

  // Keep batches small to avoid request-size limits (raw GeoJSON payload can be large).
  const batches = chunk(toInsert, 25);
  const totalBatches = batches.length;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const res = await ingestOvertureBatch({ supabaseAdmin, destId: dest.id, candidates: batch });
    insertedEntities += res.insertedEntities;
    insertedSources += res.insertedSources;

    const done = i + 1;
    if (done === 1 || done % 10 === 0 || done === totalBatches) {
      console.log(`Progress: ${done}/${totalBatches} batches (inserted=${insertedEntities})`);
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


