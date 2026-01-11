/**
 * Ingest Wikidata POIs inside a destination bbox into Supabase canonical tables.
 *
 * Why: This is the simplest “open-only” ingestion to validate our new schema end-to-end
 * before we wire heavier bulk datasets (Foursquare OS / Overture).
 *
 * Usage:
 *   npm run ingest:wikidata -- <destinationName>
 *
 * Requirements:
 *   - env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - destination exists in Supabase table `destinations_geo` with a bbox
 */

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
  if (!data.bbox) throw new Error(`Destination "${name}" has no bbox. Add bbox first.`);

  return data as { id: string; name: string; bbox: BBox };
}

function sparqlForBBox(b: BBox) {
  // Important: use the geospatial index via `SERVICE wikibase:box` to avoid heavy scans / OOMs.
  // NOTE: WKT Point is "lon lat".
  const cornerWest = `Point(${b.minLon} ${b.maxLat})`;
  const cornerEast = `Point(${b.maxLon} ${b.minLat})`;

  return `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>

SELECT ?item ?itemLabel ?coord ?instanceOfLabel WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "${cornerWest}"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "${cornerEast}"^^geo:wktLiteral.
  }
  OPTIONAL { ?item wdt:P31 ?instanceOf. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 500
`.trim();
}

async function runSparql(query: string) {
  const url = new URL('https://query.wikidata.org/sparql');
  url.searchParams.set('format', 'json');
  url.searchParams.set('query', query);

  const headers = {
    // Wikidata asks for a descriptive UA.
    'User-Agent': 'LEXA-Worldmap-MVP/1.0 (open-only ingestion; contact: dev@local)',
    Accept: 'application/sparql-results+json',
  } as const;

  const retryable = new Set([429, 503, 504]);
  const maxRetries = 5;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url.toString(), { headers });

    if (res.ok) return (await res.json()) as any;

    const txt = await res.text().catch(() => '');
    const err = new Error(`Wikidata SPARQL failed: ${res.status} ${res.statusText}\n${txt}`);
    lastErr = err;

    if (!retryable.has(res.status) || attempt === maxRetries) {
      throw err;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
    const delayMs = Math.min(16000, 1000 * Math.pow(2, attempt));
    console.log(`Wikidata SPARQL retryable error (${res.status}). Retrying in ${delayMs}ms... (${attempt + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw lastErr ?? new Error('Wikidata SPARQL failed (unknown error)');
}

function parseWikidataId(uri: string) {
  // e.g. http://www.wikidata.org/entity/Q123
  const parts = uri.split('/');
  return parts[parts.length - 1] || uri;
}

function parseCoordWkt(wkt: string): { lat: number; lon: number } | null {
  // Wikidata returns geo literals like: "Point(7.2620 43.7102)"
  const m = wkt.match(/Point\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/i);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}

async function main() {
  assertEnv();
  const supabaseAdmin = createSupabaseAdmin();

  const destinationName = process.argv.slice(2).join(' ').trim();
  if (!destinationName) {
    throw new Error('Usage: npm run ingest:wikidata -- <destinationName>');
  }

  const dest = await fetchDestinationByName(destinationName);
  const query = sparqlForBBox(dest.bbox);
  const json = await runSparql(query);

  const bindings: any[] = json?.results?.bindings ?? [];
  console.log(`Wikidata returned ${bindings.length} items for ${dest.name}`);

  let createdEntities = 0;
  let createdSources = 0;
  let createdDestinationLinks = 0;
  let createdDestinationSourceLinks = 0;
  let skippedExisting = 0;

  for (const row of bindings) {
    const itemUri = row?.item?.value;
    const label = row?.itemLabel?.value;
    const coordWkt = row?.coord?.value as string | undefined;
    const coord = coordWkt ? parseCoordWkt(coordWkt) : null;
    const lat = coord?.lat ?? null;
    const lon = coord?.lon ?? null;

    if (!itemUri || !label || Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const wikidataId = parseWikidataId(itemUri);

    // Idempotency: if this source record already exists, skip without creating a new entity.
    const { data: existingSource, error: existingErr } = await supabaseAdmin
      .from('experience_entity_sources')
      .select('id,entity_id')
      .eq('source', 'wikidata')
      .eq('source_id', wikidataId)
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      throw new Error(`Failed to check existing source for ${wikidataId}: ${existingErr.message}`);
    }

    if (existingSource?.id) {
      // Even if the Wikidata source is globally deduped, we still want destination coverage.
      // These tables may not exist yet (migration not applied), so treat as best-effort.
      try {
        if (existingSource.entity_id) {
          await supabaseAdmin
            .from('experience_entity_destinations')
            .upsert(
              { entity_id: existingSource.entity_id, destination_id: dest.id },
              { onConflict: 'entity_id,destination_id', ignoreDuplicates: true }
            );
          createdDestinationLinks++;

          await supabaseAdmin
            .from('experience_entity_destination_sources')
            .upsert(
              {
                destination_id: dest.id,
                entity_id: existingSource.entity_id,
                source: 'wikidata',
                source_id: wikidataId,
              },
              { onConflict: 'destination_id,source,source_id', ignoreDuplicates: true }
            );
          createdDestinationSourceLinks++;
        }
      } catch {
        // Ignore if tables don't exist yet.
      }
      skippedExisting++;
      continue;
    }

    // 1) Create a canonical entity (one per source record for now; conflation comes later)
    const { data: entity, error: entityErr } = await supabaseAdmin
      .from('experience_entities')
      .insert({
        kind: 'poi',
        name: label,
        normalized_name: label.toLowerCase(),
        destination_id: dest.id,
        lat,
        lon,
        categories: { wikidata_instance_of: row?.instanceOfLabel?.value ?? null },
        tags: ['wikidata'],
        source_hints: { wikidata_id: wikidataId },
        score_evidence: {},
        risk_flags: {},
      })
      .select('id')
      .single();

    if (entityErr) {
      // If inserts fail due to duplicates later, we’ll switch to upserts.
      // For now, keep it simple and loud.
      throw new Error(`Failed to insert experience_entity for ${wikidataId}: ${entityErr.message}`);
    }

    createdEntities++;

    // Destination membership + destination-specific source pointer (best-effort)
    try {
      await supabaseAdmin
        .from('experience_entity_destinations')
        .upsert({ entity_id: entity.id, destination_id: dest.id }, { onConflict: 'entity_id,destination_id', ignoreDuplicates: true });
      createdDestinationLinks++;

      await supabaseAdmin
        .from('experience_entity_destination_sources')
        .upsert(
          { destination_id: dest.id, entity_id: entity.id, source: 'wikidata', source_id: wikidataId },
          { onConflict: 'destination_id,source,source_id', ignoreDuplicates: true }
        );
      createdDestinationSourceLinks++;
    } catch {
      // ignore
    }

    // 2) Record the source payload (auditing)
    const { error: srcErr } = await supabaseAdmin.from('experience_entity_sources').insert({
      source: 'wikidata',
      source_id: wikidataId,
      entity_id: entity.id,
      normalized: {
        name: label,
        lat,
        lon,
      },
      raw: row,
    });

    if (srcErr) {
      throw new Error(`Failed to insert source for ${wikidataId}: ${srcErr.message}`);
    }

    createdSources++;
  }

  console.log(
    `Done. Inserted entities=${createdEntities}, sources=${createdSources}, ` +
      `dest_links=${createdDestinationLinks}, dest_source_links=${createdDestinationSourceLinks}, ` +
      `skipped_existing_sources=${skippedExisting}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


