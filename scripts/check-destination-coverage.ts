/**
 * Check how many entities fall within each destination bbox (geometry-based),
 * independent of `experience_entities.destination_id`.
 *
 * Why:
 * - We dedupe open sources globally (e.g., Wikidata QIDs), so destination_id is not a reliable
 *   “membership” field when the same entity can appear in multiple destination bboxes.
 *
 * Usage:
 *   npm run destinations:coverage
 */
import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };
type DestinationRow = { id: string; name: string; kind: string; bbox: BBox | null };

async function countEntitiesInBBox(b: BBox): Promise<number> {
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from('experience_entities')
    .select('id', { head: true, count: 'exact' })
    .gte('lat', b.minLat)
    .lte('lat', b.maxLat)
    .gte('lon', b.minLon)
    .lte('lon', b.maxLon);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('destinations_geo')
    .select('id,name,kind,bbox')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  const destinations = (data ?? []) as DestinationRow[];
  console.log(`destinations_geo rows: ${destinations.length}`);

  let totalWithBbox = 0;
  for (const d of destinations) {
    if (!d.bbox) {
      console.log(`- ${d.name} [${d.kind}] bbox=no entities_in_bbox=?`);
      continue;
    }
    totalWithBbox++;
    const n = await countEntitiesInBBox(d.bbox);
    console.log(`- ${d.name} [${d.kind}] bbox=yes entities_in_bbox=${n}`);
  }

  console.log(`Done. destinations_with_bbox=${totalWithBbox}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


