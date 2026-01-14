/**
 * Generate Merge Candidates (Task #9: Dedupe/Conflation)
 *
 * Purpose: Find duplicate POIs across sources (OSM, Overture, Wikidata) for Captain review
 *
 * Method:
 * - Spatial grid (group nearby POIs)
 * - Name similarity (token Jaccard)
 * - Distance threshold (<60m)
 * - Confidence scoring (name + distance + category match)
 *
 * Usage: npm run merge:candidates -- "French Riviera" --sources "overture,osm"
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

function cellKey(lat: number, lon: number, cellSize: number) {
  const x = Math.floor(lon / cellSize);
  const y = Math.floor(lat / cellSize);
  return `${x}:${y}`;
}

type POI = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tags: string[];
  source: string;
};

async function main() {
  const args = process.argv.slice(2);
  const destinationName = args[0]?.trim();
  const sourcesArg = args.find((a) => a.startsWith('--sources='))?.split('=')[1] || 'overture,osm';
  const sources = sourcesArg.split(',').map((s) => s.trim());
  const maxCandidates = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 500);

  if (!destinationName) {
    console.error('Usage: npm run merge:candidates -- "Destination Name" --sources=overture,osm --limit=500');
    process.exit(1);
  }

  console.log(`\n🔍 Generating merge candidates for: ${destinationName}`);
  console.log(`   Sources: ${sources.join(' ↔ ')}`);
  console.log(`   Max candidates: ${maxCandidates}\n`);

  const supabase = createSupabaseAdmin();

  const { data: dest, error: destErr } = await supabase
    .from('destinations_geo')
    .select('id,name')
    .eq('name', destinationName)
    .maybeSingle();
  if (destErr || !dest) throw new Error(`Destination not found: ${destinationName}`);

  // Fetch POIs from all requested sources
  const poisBySource = new Map<string, POI[]>();
  
  for (const source of sources) {
    console.log(`Fetching ${source} POIs...`);
    const pois: POI[] = [];
    const pageSize = 1000;
    
    for (let offset = 0; offset < 50000; offset += pageSize) {
      const { data, error } = await supabase
        .from('experience_entities')
        .select('id,name,lat,lon,tags')
        .eq('destination_id', dest.id)
        .contains('tags', [source])
        .range(offset, offset + pageSize - 1);
      
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      
      for (const row of data) {
        if (row.lat != null && row.lon != null && row.name?.trim()) {
          pois.push({
            id: row.id,
            name: row.name,
            lat: row.lat,
            lon: row.lon,
            tags: Array.isArray(row.tags) ? row.tags : [],
            source,
          });
        }
      }
      
      if (data.length < pageSize) break;
    }
    
    poisBySource.set(source, pois);
    console.log(`  Found ${pois.length} ${source} POIs`);
  }

  // Generate candidates (pairwise comparison between sources)
  const candidates: Array<{
    poi_a_id: string;
    poi_b_id: string;
    source_a: string;
    source_b: string;
    name_similarity: number;
    distance_meters: number;
    overall_confidence: number;
    match_reason: string;
  }> = [];

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const sourceA = sources[i];
      const sourceB = sources[j];
      const poisA = poisBySource.get(sourceA) || [];
      const poisB = poisBySource.get(sourceB) || [];

      console.log(`\nComparing ${sourceA} ↔ ${sourceB} (${poisA.length} vs ${poisB.length})...`);

      // Build spatial grid for source B
      const cellSize = 0.001; // ~111m
      const grid = new Map<string, POI[]>();
      for (const poi of poisB) {
        const key = cellKey(poi.lat, poi.lon, cellSize);
        const arr = grid.get(key) || [];
        arr.push(poi);
        grid.set(key, arr);
      }

      // Find matches in source A
      let matched = 0;
      for (const poiA of poisA) {
        if (candidates.length >= maxCandidates) break;

        const baseKey = cellKey(poiA.lat, poiA.lon, cellSize);
        const [xStr, yStr] = baseKey.split(':');
        const x = Number(xStr);
        const y = Number(yStr);
        const nameA = normalizeName(poiA.name);

        // Search neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${x + dx}:${y + dy}`;
            const candidatePois = grid.get(key);
            if (!candidatePois) continue;

            for (const poiB of candidatePois) {
              const distance = haversineMeters(poiA, poiB);
              if (distance > 60) continue; // Too far apart

              const similarity = tokenJaccard(nameA, normalizeName(poiB.name));
              if (similarity < 0.6) continue; // Names too different

              // Calculate overall confidence
              let confidence = 0;
              if (similarity >= 0.95 && distance < 10) confidence = 0.98; // Almost certain
              else if (similarity >= 0.9 && distance < 20) confidence = 0.92;
              else if (similarity >= 0.8 && distance < 30) confidence = 0.85;
              else if (similarity >= 0.7 && distance < 40) confidence = 0.75;
              else if (similarity >= 0.6 && distance < 60) confidence = 0.65;

              if (confidence < 0.65) continue; // Too low confidence

              const matchReason =
                similarity >= 0.95 ? 'exact_name' : similarity >= 0.8 ? 'very_similar_name' : 'similar_name';

              candidates.push({
                poi_a_id: poiA.id,
                poi_b_id: poiB.id,
                source_a: sourceA,
                source_b: sourceB,
                name_similarity: Math.round(similarity * 100) / 100,
                distance_meters: Math.round(distance * 10) / 10,
                overall_confidence: Math.round(confidence * 100) / 100,
                match_reason: `${matchReason}_within_${Math.round(distance)}m`,
              });

              matched++;
              break; // Only one match per poi_a (best match)
            }
          }
        }
      }

      console.log(`  Found ${matched} merge candidates`);
    }
  }

  console.log(`\n✅ Total merge candidates: ${candidates.length}`);

  if (!candidates.length) {
    console.log('No duplicates found. Sources appear to be unique!');
    return;
  }

  // Insert candidates into database
  const toInsert = candidates.map((c) => ({
    ...c,
    destination_id: dest.id,
    status: 'pending',
  }));

  console.log(`\nInserting ${toInsert.length} candidates into database...`);

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('poi_merge_candidates').upsert(batch, { onConflict: 'poi_a_id,poi_b_id' });
    if (error) throw new Error(error.message);
    console.log(`  Batch ${Math.floor(i / batchSize) + 1} inserted`);
  }

  // Show sample
  console.log('\n📝 Sample high-confidence candidates:');
  const sample = candidates.filter((c) => c.overall_confidence >= 0.85).slice(0, 10);
  for (const c of sample) {
    const { data: a } = await supabase.from('experience_entities').select('name').eq('id', c.poi_a_id).maybeSingle();
    const { data: b } = await supabase.from('experience_entities').select('name').eq('id', c.poi_b_id).maybeSingle();
    console.log(`  ${c.source_a}:"${a?.name}" ↔ ${c.source_b}:"${b?.name}"`);
    console.log(`    Distance: ${c.distance_meters}m, Similarity: ${c.name_similarity}, Confidence: ${c.overall_confidence}`);
  }

  console.log('\n✅ Merge candidates generated!');
  console.log('\nNext steps:');
  console.log('1. Review candidates in Captain UI (upcoming feature)');
  console.log('2. Or query directly: SELECT * FROM pending_merges LIMIT 20;');
  console.log('3. Approve/reject via API: /api/captain/merge-candidates/[id]/approve');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
