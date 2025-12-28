/**
 * Seed (upsert) destinations into Supabase `destinations_geo` from a JSON config.
 *
 * Default config: docs/destinations_bbox_pilot10.json
 *
 * Usage:
 *   npm run destinations:seed
 *   npm run destinations:seed -- "docs/destinations_bbox_pilot10.json"
 */
import './_env';
import fs from 'node:fs';
import path from 'node:path';
import { createSupabaseAdmin } from './_supabaseAdmin';

type DestConfig = {
  name: string;
  kind?: 'city' | 'region' | 'country' | 'route' | 'other';
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  metadata?: Record<string, any>;
};

type ConfigFile = { destinations: DestConfig[] };

function bboxToObj(b: [number, number, number, number]) {
  const [minLon, minLat, maxLon, maxLat] = b;
  return { minLon, minLat, maxLon, maxLat };
}

function centroidFromBBox(b: [number, number, number, number]) {
  const [minLon, minLat, maxLon, maxLat] = b;
  return { centroid_lon: (minLon + maxLon) / 2, centroid_lat: (minLat + maxLat) / 2 };
}

async function main() {
  const configPath = process.argv.slice(2).join(' ').trim() || 'docs/destinations_bbox_pilot10.json';
  const abs = path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
  if (!fs.existsSync(abs)) throw new Error(`Config file not found: ${abs}`);

  const parsed = JSON.parse(fs.readFileSync(abs, 'utf8')) as ConfigFile;
  if (!parsed?.destinations?.length) throw new Error(`No destinations found in ${abs}`);

  const supabase = createSupabaseAdmin();

  // NOTE: We intentionally DO NOT rely on a unique constraint here, because some Supabase
  // instances may not have the (name, kind) unique index applied yet. Instead we do:
  // lookup by (name, kind) -> update if exists -> insert otherwise.
  let upserts = 0;
  let inserts = 0;
  let updates = 0;

  for (const d of parsed.destinations) {
    const kind = d.kind ?? 'region';
    const bbox = d.bbox ? bboxToObj(d.bbox) : null;
    const centroid = d.bbox ? centroidFromBBox(d.bbox) : { centroid_lon: null, centroid_lat: null };
    const rowPayload = {
      name: d.name,
      kind,
      bbox,
      polygon: null,
      centroid_lat: centroid.centroid_lat,
      centroid_lon: centroid.centroid_lon,
      metadata: { ...(d.metadata ?? {}), source: 'seed-destinations-geo' },
    };

    const { data: existing, error: findErr } = await supabase
      .from('destinations_geo')
      .select('id')
      .eq('name', d.name)
      .eq('kind', kind)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);

    if (existing?.id) {
      const { error: updErr } = await supabase.from('destinations_geo').update(rowPayload).eq('id', existing.id);
      if (updErr) throw new Error(updErr.message);
      updates++;
      upserts++;
      console.log(`Updated: ${d.name} [${kind}]`);
    } else {
      const { error: insErr } = await supabase.from('destinations_geo').insert(rowPayload);
      if (insErr) throw new Error(insErr.message);
      inserts++;
      upserts++;
      console.log(`Inserted: ${d.name} [${kind}]`);
    }
  }

  console.log(`Done. Upserts=${upserts} inserts=${inserts} updates=${updates}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


