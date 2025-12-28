/**
 * List destinations currently stored in Supabase `destinations_geo`.
 *
 * Usage:
 *   npm run destinations:list
 */
import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

type DestRow = {
  id: string;
  name: string;
  kind: string;
  bbox: unknown | null;
  centroid_lat: number | null;
  centroid_lon: number | null;
  updated_at: string;
};

async function main() {
  const supabase = createSupabaseAdmin();

  const rows: DestRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('destinations_geo')
      .select('id,name,kind,bbox,centroid_lat,centroid_lon,updated_at')
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as DestRow[]));
    if (data.length < pageSize) break;
  }

  console.log(`destinations_geo rows: ${rows.length}`);
  for (const d of rows) {
    const bboxOk =
      !!d.bbox &&
      typeof d.bbox === 'object' &&
      d.bbox !== null &&
      'minLon' in (d.bbox as any) &&
      'minLat' in (d.bbox as any) &&
      'maxLon' in (d.bbox as any) &&
      'maxLat' in (d.bbox as any);
    console.log(
      `- ${d.name} [${d.kind}] bbox=${bboxOk ? 'yes' : 'no'} updated_at=${d.updated_at}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



