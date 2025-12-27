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

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { supabaseAdmin } from '../lib/supabase/client';

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
  const existing = new Map<string, { entity_id: string | null }>();
  const batches = chunk(overtureIds, 500);

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

async function main() {
  assertEnv();

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
  for (const f of features) {
    const id = getOvertureId(f);
    if (id) overtureIds.push(id);
  }

  const existing = await loadExistingOvertureSources(overtureIds);
  console.log(`Existing overture sources already in DB: ${existing.size}`);

  let insertedEntities = 0;
  let insertedSources = 0;
  let skipped = 0;
  let bad = 0;

  for (const feature of features) {
    const overtureId = getOvertureId(feature);
    const name = getName(feature);
    const pt = getPoint(feature);

    if (!overtureId || !name || !pt) {
      bad++;
      continue;
    }

    const already = existing.get(overtureId);
    if (already?.entity_id) {
      skipped++;
      continue;
    }

    // 1) Create canonical entity
    const props = feature?.properties ?? {};
    const { data: entity, error: entityErr } = await supabaseAdmin
      .from('experience_entities')
      .insert({
        kind: 'poi',
        name,
        normalized_name: name.toLowerCase(),
        destination_id: dest.id,
        lat: pt.lat,
        lon: pt.lon,
        categories: {
          overture: {
            categories: props.categories ?? null,
            class: props.class ?? null,
            confidence: props.confidence ?? null,
          },
        },
        tags: ['overture'],
        source_hints: { overture_id: overtureId },
        score_evidence: {},
        risk_flags: {},
      })
      .select('id')
      .single();

    if (entityErr) {
      throw new Error(`Failed to insert experience_entity for overture ${overtureId}: ${entityErr.message}`);
    }

    insertedEntities++;

    // 2) Create or update source record
    const { error: srcErr } = await supabaseAdmin
      .from('experience_entity_sources')
      .upsert(
        {
          source: 'overture',
          source_id: overtureId,
          entity_id: entity.id,
          normalized: { name, lat: pt.lat, lon: pt.lon },
          raw: feature,
        },
        { onConflict: 'source,source_id' }
      );

    if (srcErr) {
      throw new Error(`Failed to upsert source for overture ${overtureId}: ${srcErr.message}`);
    }

    insertedSources++;
  }

  console.log(
    `Done for destination="${dest.name}". insertedEntities=${insertedEntities}, insertedSources=${insertedSources}, skipped=${skipped}, bad=${bad}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


