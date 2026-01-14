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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatSupabaseError(err: any): string {
  if (!err) return 'Unknown error (err is null/undefined)';
  if (typeof err === 'string') return err;
  const msg = err.message ?? err.error_description ?? err.hint ?? err.details;
  try {
    return msg ? String(msg) : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function sanitizeString(s: unknown): string {
  if (typeof s !== 'string') return '';
  // Remove null bytes (Postgres rejects) and strip lone UTF-16 surrogate code units.
  // Note: Array.from iterates *code points* (so valid surrogate pairs remain intact).
  return Array.from(s.replaceAll('\u0000', '')).filter((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp < 0xd800 || cp > 0xdfff;
  }).join('');
}

function sanitizeJson(v: any): any {
  if (v == null) return v;
  if (typeof v === 'string') return sanitizeString(v);
  if (Array.isArray(v)) return v.map((x) => sanitizeJson(x));
  if (typeof v === 'object') {
    const out: any = {};
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeJson(val);
    return out;
  }
  return v;
}

function isBadUnicodeError(err: any): boolean {
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('unsupported unicode escape sequence') ||
    msg.includes('invalid byte sequence for encoding') ||
    msg.includes('invalid unicode') ||
    msg.includes('unicode escape')
  );
}

async function withRetries<T>(
  fn: () => Promise<T>,
  opts: { label: string; maxRetries?: number; baseDelayMs?: number } = { label: 'op' }
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let lastErr: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const message = String(err?.message ?? '');
      const retriable =
        message.includes('fetch failed') ||
        message.includes('ECONNRESET') ||
        message.includes('ETIMEDOUT') ||
        message.includes('timeout') ||
        message.includes('429') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504');

      if (!retriable || attempt === maxRetries) throw err;

      const delay = Math.min(15_000, baseDelayMs * Math.pow(2, attempt));
      console.log(`⚠️  ${opts.label} failed (retriable). Retrying in ${delay}ms... (${attempt + 1}/${maxRetries})`);
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error(`${opts.label} failed`);
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
    name: sanitizeString(c.name),
    normalized_name: sanitizeString(c.name).toLowerCase(),
    destination_id: destId,
    lat: c.lat,
    lon: c.lon,
    categories: {
      overture: {
        categories: sanitizeJson(c.props?.categories ?? null),
        class: sanitizeJson(c.props?.class ?? null),
        confidence: c.props?.confidence ?? null,
      },
    },
    tags: ['overture'],
    source_hints: { overture_id: c.overtureId },
    score_evidence: {},
    risk_flags: {},
  }));

  let inserted: any[] = [];
  let skippedBad = 0;
  try {
    const res = await withRetries(
      async () => {
        const r = await supabaseAdmin.from('experience_entities').insert(entityRows).select('id, source_hints');
        if (r.error) throw r.error;
        return r.data ?? [];
      },
      { label: 'insert experience_entities batch' }
    );
    inserted = res;
  } catch (err: any) {
    if (!isBadUnicodeError(err)) {
      throw new Error(`Failed to insert experience_entities batch: ${formatSupabaseError(err)}`);
    }

    // Slow path: isolate + skip only problematic rows (keeps ingestion moving).
    console.log('⚠️  Batch insert failed due to bad Unicode. Falling back to row-by-row insert (skipping bad rows).');
    for (const row of entityRows) {
      try {
        const one = await withRetries(
          async () => {
            const r = await supabaseAdmin.from('experience_entities').insert(row).select('id, source_hints').maybeSingle();
            if (r.error) throw r.error;
            return r.data ?? null;
          },
          { label: 'insert experience_entities (single row)' }
        );
        if (one) inserted.push(one);
      } catch (e: any) {
        if (isBadUnicodeError(e)) {
          skippedBad += 1;
          continue;
        }
        throw new Error(`Failed to insert experience_entities row: ${formatSupabaseError(e)}`);
      }
    }
  }

  const idByOvertureId = new Map<string, string>();
  for (const row of inserted ?? []) {
    const oid = row?.source_hints?.overture_id;
    if (typeof oid === 'string' && row?.id) idByOvertureId.set(oid, row.id);
  }

  const insertedCandidates = candidates.filter((c) => idByOvertureId.has(c.overtureId));

  // Destination membership (best-effort; migration may not be applied yet)
  try {
    const membershipRows = Array.from(idByOvertureId.values()).map((entity_id) => ({
      entity_id,
      destination_id: destId,
    }));
    if (membershipRows.length) {
      await supabaseAdmin
        .from('experience_entity_destinations')
        .upsert(membershipRows, { onConflict: 'entity_id,destination_id', ignoreDuplicates: true });
    }
  } catch {
    // ignore
  }

  // 2) Upsert source payloads (batch)
  const sourceRows = insertedCandidates.map((c) => {
    const entityId = idByOvertureId.get(c.overtureId) ?? null;
    return {
      source: 'overture' as const,
      source_id: c.overtureId,
      entity_id: entityId,
      normalized: { name: sanitizeString(c.name), lat: c.lat, lon: c.lon },
      raw: sanitizeJson(c.raw),
    };
  });

  try {
    await withRetries(
      async () => {
        const r = await supabaseAdmin
          .from('experience_entity_sources')
          .upsert(sourceRows, { onConflict: 'source,source_id' });
        if (r.error) throw r.error;
        return true;
      },
      { label: 'upsert experience_entity_sources batch' }
    );
  } catch (err: any) {
    if (!isBadUnicodeError(err)) {
      throw new Error(`Failed to upsert experience_entity_sources batch: ${formatSupabaseError(err)}`);
    }

    console.log('⚠️  Source upsert failed due to bad Unicode. Falling back to row-by-row upsert (raw may be dropped).');
    for (const row of sourceRows) {
      try {
        const r1 = await supabaseAdmin
          .from('experience_entity_sources')
          .upsert(row, { onConflict: 'source,source_id' });
        if (!r1.error) continue;
        if (!isBadUnicodeError(r1.error)) throw r1.error;

        // If the raw payload is the problem, drop it and keep the pointer (idempotency + linkage).
        const { raw: _raw, ...withoutRaw } = row as any;
        const r2 = await supabaseAdmin
          .from('experience_entity_sources')
          .upsert({ ...withoutRaw, raw: null }, { onConflict: 'source,source_id' });
        if (r2.error) throw r2.error;
      } catch (e: any) {
        if (isBadUnicodeError(e)) {
          skippedBad += 1;
          continue;
        }
        throw new Error(`Failed to upsert experience_entity_sources row: ${formatSupabaseError(e)}`);
      }
    }
  }

  // Destination-specific source pointers (best-effort)
  try {
    const destSourceRows = insertedCandidates
      .map((c) => ({
        destination_id: destId,
        entity_id: idByOvertureId.get(c.overtureId) ?? null,
        source: 'overture',
        source_id: c.overtureId,
      }))
      .filter((r) => !!r.entity_id);

    if (destSourceRows.length) {
      await supabaseAdmin
        .from('experience_entity_destination_sources')
        .upsert(destSourceRows as any, { onConflict: 'destination_id,source,source_id', ignoreDuplicates: true });
    }
  } catch {
    // ignore
  }

  return { insertedEntities: insertedCandidates.length, insertedSources: insertedCandidates.length, skippedBad };
}

async function main() {
  assertEnv();
  const supabaseAdmin = createSupabaseAdmin();

  const args = process.argv.slice(2);
  const destinationName = (args[0] ?? '').trim();
  const geojsonPath = (args[1] ?? '').trim();
  const startBatchIdx = (() => {
    const idx = args.findIndex((a) => a === '--startBatch');
    if (idx === -1) return 0;
    const v = Number(args[idx + 1]);
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  })();
  const batchSize = (() => {
    const idx = args.findIndex((a) => a === '--batchSize');
    if (idx === -1) return 25;
    const v = Number(args[idx + 1]);
    return Number.isFinite(v) && v >= 1 && v <= 100 ? Math.floor(v) : 25;
  })();

  if (!destinationName || !geojsonPath) {
    throw new Error(
      'Usage: npm run ingest:overture -- "<Destination Name>" "<PathToGeoJSON>" [--startBatch N] [--batchSize N]'
    );
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

  let insertedEntities = 0;
  let insertedSources = 0;
  let skipped = 0;
  let skippedBad = 0;
  let linkedExisting = 0;

  // Process candidates directly in batches; each batch checks existing sources for its own IDs.
  // This avoids a huge up-front "load existing" query (which can be thousands of requests on big files).
  const batches = chunk(candidatesAll, batchSize);
  const totalBatches = batches.length;

  console.log(`Total candidates: ${candidatesAll.length}. Processing in ${totalBatches} batches (size=${batchSize}).`);
  if (startBatchIdx > 0) console.log(`Resuming from batch index: ${startBatchIdx} (0-based).`);

  for (let i = 0; i < batches.length; i++) {
    if (i < startBatchIdx) continue;
    const batch = batches[i];

    // Idempotency: skip already-ingested Overture IDs in THIS batch.
    const ids = batch.map((b) => b.overtureId);
    const existingMap = await withRetries(() => loadExistingOvertureSources(ids), { label: 'load existing overture sources (batch)' });
    const existingToLink = batch
      .map((c) => ({ c, entityId: existingMap.get(c.overtureId)?.entity_id ?? null }))
      .filter((x) => !!x.entityId) as Array<{ c: OvertureCandidate; entityId: string }>;

    const toInsert = batch.filter((c) => !existingMap.get(c.overtureId)?.entity_id);
    const batchSkipped = batch.length - toInsert.length; // already exists globally (won't be re-inserted)
    skipped += batchSkipped;

    // IMPORTANT: even if an entity+source already exists globally, we still need to link it to THIS destination
    // so destination-level dashboards can show correct source counts.
    if (existingToLink.length) {
      try {
        const membershipRows = existingToLink.map((x) => ({ entity_id: x.entityId, destination_id: dest.id }));
        await supabaseAdmin
          .from('experience_entity_destinations')
          .upsert(membershipRows as any, { onConflict: 'entity_id,destination_id', ignoreDuplicates: true });

        const destSourceRows = existingToLink.map((x) => ({
          destination_id: dest.id,
          entity_id: x.entityId,
          source: 'overture',
          source_id: x.c.overtureId,
        }));
        await supabaseAdmin
          .from('experience_entity_destination_sources')
          .upsert(destSourceRows as any, { onConflict: 'destination_id,source,source_id', ignoreDuplicates: true });

        linkedExisting += existingToLink.length;
      } catch {
        // best-effort only (table may not exist yet)
      }
    }

    if (toInsert.length > 0) {
      const res = await ingestOvertureBatch({ supabaseAdmin, destId: dest.id, candidates: toInsert });
      insertedEntities += res.insertedEntities;
      insertedSources += res.insertedSources;
      skippedBad += (res as any).skippedBad ?? 0;
    }

    const done = i + 1;
    if (done === 1 || done % 10 === 0 || done === totalBatches) {
      console.log(
        `Progress: ${done}/${totalBatches} batches (inserted=${insertedEntities}, skipped_existing=${skipped})`
      );
    }
  }

  console.log(
    `Done for destination="${dest.name}". insertedEntities=${insertedEntities}, insertedSources=${insertedSources}, skipped_existing=${skipped}, linked_existing=${linkedExisting}, skipped_bad=${skippedBad}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


