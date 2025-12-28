/**
 * Report which sources are present for entities inside a destination bbox.
 *
 * Why:
 * - We dedupe globally, so destination_id is not a reliable indicator of coverage.
 * - This answers questions like: "Is French Riviera done with Overture + FSQ + Wikidata?"
 *
 * Usage:
 *   npm run destinations:sources -- "French Riviera"
 */
import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const destinationName = process.argv.slice(2).join(' ').trim();
  if (!destinationName) {
    throw new Error('Usage: npm run destinations:sources -- "<Destination Name>"');
  }

  const supabase = createSupabaseAdmin();
  const { data: dest, error: destErr } = await supabase
    .from('destinations_geo')
    .select('id,name,bbox')
    .eq('name', destinationName)
    .maybeSingle();
  if (destErr) throw new Error(destErr.message);
  if (!dest) throw new Error(`Destination not found in destinations_geo: "${destinationName}"`);
  if (!dest.bbox) throw new Error(`Destination "${destinationName}" has no bbox.`);

  const bbox = dest.bbox as BBox;

  // 1) Load entity ids inside bbox (paginated)
  const entityIds: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: page, error } = await supabase
      .from('experience_entities')
      .select('id')
      .gte('lat', bbox.minLat)
      .lte('lat', bbox.maxLat)
      .gte('lon', bbox.minLon)
      .lte('lon', bbox.maxLon)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!page || page.length === 0) break;
    for (const r of page) entityIds.push(String((r as any).id));
    if (page.length < pageSize) break;
  }

  console.log(`Destination="${dest.name}" entities_in_bbox=${entityIds.length}`);
  if (entityIds.length === 0) return;

  // 2) Fetch sources for those entity_ids in safe chunks (avoid URL limits)
  const counts = new Map<string, number>();
  const batches = chunk(entityIds, 200);
  for (let i = 0; i < batches.length; i++) {
    const ids = batches[i];
    const { data, error } = await supabase
      .from('experience_entity_sources')
      .select('source, entity_id')
      .in('entity_id', ids);
    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const s = String((row as any).source);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  console.log('Sources (count of source rows linked to entities in bbox):');
  for (const [source, n] of sorted) {
    console.log(`- ${source}: ${n}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


