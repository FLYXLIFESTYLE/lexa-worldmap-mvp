/**
 * CEO/Admin: POI counts per destination (Supabase + Neo4j)
 *
 * Why:
 * - Gives an investor/CEO-friendly “coverage dashboard”
 * - Helps validate ingestion (Wikidata/OSM/Overture) per destination
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { slugifyDestination } from '@/lib/neo4j/destination-resolver';

export const runtime = 'nodejs';

type DestinationGeoRow = {
  id: string;
  name: string;
  kind: string;
};

function neo4jNameVariants(destinationGeoName: string): { primary: string; also: string[] } {
  const raw = (destinationGeoName || '').trim();
  if (!raw) return { primary: '', also: [] };

  // Handle our legacy naming for Adriatic bboxes in Supabase:
  // "Adriatic (North)" -> Neo4j canonical "Adriatic North"
  const m = raw.match(/^Adriatic\s*\((North|Central|South)\)\s*$/i);
  if (m) {
    const canon = `Adriatic ${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}`;
    return { primary: canon, also: [raw] };
  }

  return { primary: raw, also: [] };
}

async function requireAdminUser(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: profile, error: profileError } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Forbidden');
  }

  return { userId: user.id };
}

async function countExperienceEntitiesByDestination(destId: string): Promise<number> {
  // Prefer the destination membership table if it exists (accurate even when entities are globally deduped).
  try {
    const { count, error } = await supabaseAdmin
      .from('experience_entity_destinations')
      .select('id', { head: true, count: 'exact' })
      .eq('destination_id', destId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch {
    // Fallback to destination_id on experience_entities if migration not applied yet.
    const { count, error } = await supabaseAdmin
      .from('experience_entities')
      .select('id', { head: true, count: 'exact' })
      .eq('kind', 'poi')
      .eq('destination_id', destId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}

async function countExtractedPoisByDestinationName(destinationName: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('extracted_pois')
    .select('id', { head: true, count: 'exact' })
    .eq('destination', destinationName);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countSourcesByDestination(destId: string, source: 'wikidata' | 'osm' | 'overture' | 'foursquare_os'): Promise<number> {
  // Prefer the destination-specific source pointers (accurate per destination).
  try {
    const { count, error } = await supabaseAdmin
      .from('experience_entity_destination_sources')
      .select('id', { head: true, count: 'exact' })
      .eq('destination_id', destId)
      .eq('source', source);
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch {
    // Fallback: join sources -> entities and filter by entity.destination_id
    const { count, error } = await supabaseAdmin
      .from('experience_entity_sources')
      .select('id, experience_entities!inner(destination_id)', { head: true, count: 'exact' })
      .eq('source', source)
      .eq('experience_entities.destination_id', destId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}

async function countNeo4jPoisForDestination(destName: string): Promise<{ count: number; matchedDestinations: string[] }> {
  const { primary, also } = neo4jNameVariants(destName);
  const slug = slugifyDestination(primary);

  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (d:destination)
      WHERE
        (d.kind = 'mvp_destination' AND toString(d.canonical_id) = $slug)
        OR toLower(toString(d.name)) = toLower($primaryName)
        OR (size($alsoNames) > 0 AND toLower(toString(d.name)) IN [n IN $alsoNames | toLower(n)])
      WITH collect(d) AS ds
      UNWIND ds AS d
      OPTIONAL MATCH (p:poi)-[:LOCATED_IN]->(d)
      RETURN count(DISTINCT p) AS poiCount, collect(DISTINCT toString(d.name)) AS matched
      `,
      {
        slug,
        primaryName: primary,
        alsoNames: also,
      },
    );

    const record = result.records[0];
    const poiCount = record?.get('poiCount')?.toNumber?.() ?? 0;
    const matched = (record?.get('matched') as string[] | undefined) ?? [];
    return { count: poiCount, matchedDestinations: matched.filter(Boolean) };
  } finally {
    await session.close();
  }
}

export async function GET() {
  try {
    await requireAdminUser();

    // Load destinations (include regions + cities)
    const { data: destinations, error: destErr } = await supabaseAdmin
      .from('destinations_geo')
      .select('id,name,kind')
      .order('kind', { ascending: true })
      .order('name', { ascending: true });

    if (destErr) throw new Error(destErr.message);

    const rows: DestinationGeoRow[] = (destinations ?? []) as any;

    // Supabase counts in parallel (fast; uses indexes)
    const supabaseCounts = await Promise.all(
      rows.map(async (d) => {
        const [supabase_pois, extracted_pois, wikidata_sources, osm_sources, overture_sources, foursquare_sources] = await Promise.all([
          countExperienceEntitiesByDestination(d.id),
          countExtractedPoisByDestinationName(d.name),
          countSourcesByDestination(d.id, 'wikidata'),
          countSourcesByDestination(d.id, 'osm'),
          countSourcesByDestination(d.id, 'overture'),
          countSourcesByDestination(d.id, 'foursquare_os'),
        ]);

        return {
          destination_id: d.id,
          destination: d.name,
          kind: d.kind,
          supabase_pois,
          extracted_pois,
          sources: {
            wikidata: wikidata_sources,
            osm: osm_sources,
            overture: overture_sources,
            foursquare: foursquare_sources,
          },
        };
      }),
    );

    // Neo4j counts (sequential; safest)
    const out = [];
    for (const row of supabaseCounts) {
      const neo = await countNeo4jPoisForDestination(row.destination);
      out.push({
        ...row,
        neo4j_pois: neo.count,
        neo4j_matched_destinations: neo.matchedDestinations,
      });
    }

    return NextResponse.json({
      success: true,
      rows: out,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

