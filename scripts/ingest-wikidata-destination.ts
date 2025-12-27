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

import 'dotenv/config';
import { supabaseAdmin } from '@/lib/supabase/client';

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
  if (!data.bbox) throw new Error(`Destination "${name}" has no bbox. Add bbox first.`);

  return data as { id: string; name: string; bbox: BBox };
}

function sparqlForBBox(b: BBox) {
  // Note: Wikidata uses lat,lon ordering in some geo helpers; we keep it explicit.
  // We ask for “things with coordinates inside bbox” and basic labels.
  return `
SELECT ?item ?itemLabel ?coord ?lat ?lon ?instanceOfLabel WHERE {
  ?item wdt:P625 ?coord.
  BIND(geof:latitude(?coord) AS ?lat).
  BIND(geof:longitude(?coord) AS ?lon).
  FILTER(?lat >= ${b.minLat} && ?lat <= ${b.maxLat} && ?lon >= ${b.minLon} && ?lon <= ${b.maxLon}).
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

  const res = await fetch(url.toString(), {
    headers: {
      // Wikidata asks for a descriptive UA.
      'User-Agent': 'LEXA-Worldmap-MVP/1.0 (open-only ingestion; contact: dev@local)',
      Accept: 'application/sparql-results+json',
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Wikidata SPARQL failed: ${res.status} ${res.statusText}\n${txt}`);
  }

  return (await res.json()) as any;
}

function parseWikidataId(uri: string) {
  // e.g. http://www.wikidata.org/entity/Q123
  const parts = uri.split('/');
  return parts[parts.length - 1] || uri;
}

async function main() {
  assertEnv();

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

  for (const row of bindings) {
    const itemUri = row?.item?.value;
    const label = row?.itemLabel?.value;
    const lat = row?.lat?.value ? Number(row.lat.value) : null;
    const lon = row?.lon?.value ? Number(row.lon.value) : null;

    if (!itemUri || !label || Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const wikidataId = parseWikidataId(itemUri);

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

  console.log(`Done. Inserted entities=${createdEntities}, sources=${createdSources}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


