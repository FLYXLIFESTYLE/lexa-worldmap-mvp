/**
 * Estimate overlap between Overture and OSM for a destination (Task #9)
 *
 * Purpose: Measure duplicate problem before implementing merge logic
 *
 * Method:
 * - Spatial + name matching (within 60m, name similarity >0.6)
 * - Counts how many Overture POIs likely already exist in OSM
 * - Helps prioritize: should we dedupe or is overlap minimal?
 *
 * Usage: npm run estimate:osm-overture -- "French Riviera"
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

function cellKey(lat: number, lon: number, cellSize: number) {
  const x = Math.floor(lon / cellSize);
  const y = Math.floor(lat / cellSize);
  return `${x}:${y}`;
}

type EntityRow = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tags: string[];
};

async function main() {
  const destinationName = process.argv.slice(2).join(' ').trim();
  if (!destinationName) throw new Error('Usage: npm run estimate:osm-overture -- "Destination Name"');

  const supabase = createSupabaseAdmin();
  const { data: dest, error: destErr } = await supabase
    .from('destinations_geo')
    .select('id,name')
    .eq('name', destinationName)
    .maybeSingle();
  if (destErr) throw new Error(destErr.message);
  if (!dest) throw new Error(`Destination not found: ${destinationName}`);

  console.log(`\n🔍 Estimating Overture ↔ OSM overlap for: ${dest.name}\n`);

  // Sample-based approach (faster for large datasets)
  const sampleSize = 2000;
  
  // Query entities by tags (fallback if destination-source table not fully populated)
  const { data: allEntities } = await supabase
    .from('experience_entities')
    .select('id,name,lat,lon,tags')
    .eq('destination_id', dest.id)
    .limit(sampleSize * 2);

  const overtureEntities = (allEntities || []).filter((e: any) => 
    Array.isArray(e.tags) && e.tags.includes('overture') && e.lat != null && e.lon != null
  );
  const osmEntities = (allEntities || []).filter((e: any) => 
    Array.isArray(e.tags) && e.tags.includes('osm') && e.lat != null && e.lon != null
  );

  const overtureIds = overtureEntities.map((e: any) => e.id);
  const osmIds = osmEntities.map((e: any) => e.id);

  console.log(`Sample: ${overtureIds.length} Overture, ${osmIds.length} OSM entities`);

  if (!overtureIds.length || !osmIds.length) {
    console.log('⚠️  Not enough data for overlap estimation');
    return;
  }

  // Fetch entity data
  const entityIds = Array.from(new Set([...overtureIds.slice(0, sampleSize), ...osmIds.slice(0, sampleSize)]));
  const { data: entities } = await supabase
    .from('experience_entities')
    .select('id,name,lat,lon,tags')
    .in('id', entityIds);

  const entitiesById = new Map<string, any>();
  for (const e of entities || []) entitiesById.set(e.id, e);

  const overture: EntityRow[] = overtureEntities.slice(0, sampleSize);
  const osm: EntityRow[] = osmEntities.slice(0, sampleSize);

  console.log(`Valid entities: ${overture.length} Overture, ${osm.length} OSM\n`);

  // Build spatial grid for OSM
  const cellSize = 0.001; // ~111m
  const grid = new Map<string, EntityRow[]>();
  for (const r of osm) {
    const key = cellKey(r.lat, r.lon, cellSize);
    const arr = grid.get(key) ?? [];
    arr.push(r);
    grid.set(key, arr);
  }

  let matchedOverture = 0;
  let matchedPairs = 0;
  const seenOsm = new Set<string>();
  const distMax = 60; // meters
  const nameMin = 0.6; // token jaccard

  const sampleMatches: Array<{ overture: string; osm: string; distance: number; similarity: number }> = [];

  for (const o of overture) {
    const lat = o.lat;
    const lon = o.lon;
    const baseKey = cellKey(lat, lon, cellSize);
    const [xStr, yStr] = baseKey.split(':');
    const x = Number(xStr);
    const y = Number(yStr);

    const oName = normalizeName(o.name);
    let found = false;

    // Search neighboring cells
    for (let dx = -1; dx <= 1 && !found; dx++) {
      for (let dy = -1; dy <= 1 && !found; dy++) {
        const key = `${x + dx}:${y + dy}`;
        const candidates = grid.get(key);
        if (!candidates) continue;

        for (const f of candidates) {
          const d = haversineMeters({ lat, lon }, { lat: f.lat, lon: f.lon });
          if (d > distMax) continue;
          const sim = tokenJaccard(oName, normalizeName(f.name));
          if (sim < nameMin) continue;

          found = true;
          matchedPairs++;
          seenOsm.add(f.id);

          if (sampleMatches.length < 10) {
            sampleMatches.push({ overture: o.name, osm: f.name, distance: Math.round(d), similarity: Math.round(sim * 100) / 100 });
          }
          break;
        }
      }
    }

    if (found) matchedOverture++;
  }

  const matchedOsm = seenOsm.size;

  console.log('📊 OVERLAP ESTIMATE (Sample-based)');
  console.log('═'.repeat(50));
  console.log(`Overture entities that likely exist in OSM: ${matchedOverture}/${overture.length} (${Math.round((matchedOverture / overture.length) * 100)}%)`);
  console.log(`OSM entities that likely exist in Overture: ${matchedOsm}/${osm.length} (${Math.round((matchedOsm / osm.length) * 100)}%)`);
  console.log(`Matched pairs (approx): ${matchedPairs}`);

  console.log('\n📝 Sample matches:');
  sampleMatches.forEach((m) => {
    console.log(`  - "${m.overture}" ↔ "${m.osm}" (${m.distance}m, sim=${m.similarity})`);
  });

  console.log('\n💡 Interpretation:');
  const overlapPercent = Math.round((matchedOverture / overture.length) * 100);
  if (overlapPercent > 40) {
    console.log(`  ⚠️  HIGH OVERLAP (${overlapPercent}%) - Deduplication is critical`);
  } else if (overlapPercent > 20) {
    console.log(`  ⚠️  MODERATE OVERLAP (${overlapPercent}%) - Deduplication recommended`);
  } else {
    console.log(`  ✅ LOW OVERLAP (${overlapPercent}%) - Sources are mostly unique`);
  }

  console.log('\n🎯 Next steps:');
  console.log('  1. Run overlap estimator for other destinations');
  console.log('  2. Implement merge candidate generator');
  console.log('  3. Create Captain review UI for merge approval');
  console.log('  4. Safe merge API (merge approved candidates)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
