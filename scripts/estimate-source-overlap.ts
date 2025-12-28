/**
 * Estimate overlap between Overture and FSQ OS entities for a destination.
 *
 * This is NOT the final conflation step; it's a quick diagnostic for "are these unique?"
 * We estimate duplicates by:
 * - same destination
 * - name similarity (normalized)
 * - within ~60m distance
 *
 * Usage:
 *   npm run estimate:overlap -- "Monaco"
 */

import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function tokenSet(s: string): Set<string> {
  return new Set(s.split(' ').filter(Boolean));
}

function tokenJaccard(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

type EntityRow = {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  tags: string[] | null;
};

function hasTag(row: EntityRow, tag: string) {
  return Array.isArray(row.tags) && row.tags.includes(tag);
}

function cellKey(lat: number, lon: number, cellSize: number) {
  const x = Math.floor(lon / cellSize);
  const y = Math.floor(lat / cellSize);
  return `${x}:${y}`;
}

async function main() {
  const destinationName = process.argv.slice(2).join(' ').trim();
  if (!destinationName) throw new Error('Usage: npm run estimate:overlap -- "Destination Name"');

  const supabase = createSupabaseAdmin();
  const { data: dest, error: destErr } = await supabase
    .from('destinations_geo')
    .select('id,name')
    .eq('name', destinationName)
    .maybeSingle();
  if (destErr) throw new Error(destErr.message);
  if (!dest) throw new Error(`Destination not found: ${destinationName}`);

  const destId = dest.id as string;

  // Pull all entities for destination (paginate)
  const rows: EntityRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('experience_entities')
      .select('id,name,lat,lon,tags')
      .eq('destination_id', destId)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as EntityRow[]));
    if (data.length < pageSize) break;
  }

  const overture = rows.filter((r) => hasTag(r, 'overture') && r.lat != null && r.lon != null);
  const fsq = rows.filter((r) => hasTag(r, 'foursquare_os') && r.lat != null && r.lon != null);

  console.log(`Destination: ${dest.name}`);
  console.log(`Overture entities: ${overture.length}`);
  console.log(`FSQ OS entities: ${fsq.length}`);

  // Build spatial index for FSQ
  const cellSize = 0.001; // ~111m (lon varies slightly); good for candidate narrowing
  const grid = new Map<string, EntityRow[]>();
  for (const r of fsq) {
    const key = cellKey(r.lat as number, r.lon as number, cellSize);
    const arr = grid.get(key) ?? [];
    arr.push(r);
    grid.set(key, arr);
  }

  let matchedOverture = 0;
  let matchedPairs = 0;

  const seenFsq = new Set<string>();
  const distMax = 60; // meters
  const nameMin = 0.6; // token jaccard

  for (const o of overture) {
    const lat = o.lat as number;
    const lon = o.lon as number;
    const baseKey = cellKey(lat, lon, cellSize);
    const [xStr, yStr] = baseKey.split(':');
    const x = Number(xStr);
    const y = Number(yStr);

    const oName = normalizeName(o.name);
    let found = false;

    // search neighboring cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${x + dx}:${y + dy}`;
        const candidates = grid.get(key);
        if (!candidates) continue;

        for (const f of candidates) {
          const d = haversineMeters({ lat, lon }, { lat: f.lat as number, lon: f.lon as number });
          if (d > distMax) continue;
          const sim = tokenJaccard(oName, normalizeName(f.name));
          if (sim < nameMin) continue;

          found = true;
          matchedPairs++;
          seenFsq.add(f.id);
          break;
        }
        if (found) break;
      }
      if (found) break;
    }

    if (found) matchedOverture++;
  }

  const matchedFsq = seenFsq.size;
  console.log('--- overlap estimate (heuristic) ---');
  console.log(`Overture rows that likely exist in FSQ: ${matchedOverture}/${overture.length}`);
  console.log(`FSQ rows that likely exist in Overture: ${matchedFsq}/${fsq.length}`);
  console.log(`Matched pairs (approx): ${matchedPairs}`);
  console.log('Note: This is an estimate, not conflation. Next step is to merge sources into a single canonical entity.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


