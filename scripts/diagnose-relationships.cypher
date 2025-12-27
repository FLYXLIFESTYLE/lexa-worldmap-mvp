// =============================================================================
// RELATIONSHIP GAP DIAGNOSTIC
// Why did relationships only increase 23% when nodes doubled?
// =============================================================================

// 1. COUNT POIs BY SOURCE WITH RELATIONSHIP DENSITY
MATCH (p:poi)
WITH p.source as source, p, size((p)-[]-()) as rel_count
RETURN 
  source,
  count(p) as poi_count,
  avg(rel_count) as avg_relationships_per_poi,
  min(rel_count) as min_rels,
  max(rel_count) as max_rels,
  sum(rel_count) as total_rels_for_source
ORDER BY poi_count DESC;

// 2. FIND ORPHANED POIs (NO LOCATED_IN)
MATCH (p:poi)
WHERE NOT (p)-[:LOCATED_IN]->()
WITH count(p) as orphaned_count
MATCH (p:poi)
WITH orphaned_count, count(p) as total_pois
RETURN 
  total_pois,
  orphaned_count,
  round(100.0 * orphaned_count / total_pois, 1) as orphaned_percent;

// 3. SAMPLE ORPHANED POIs
MATCH (p:poi)
WHERE NOT (p)-[:LOCATED_IN]->()
RETURN 
  p.name as poi_name,
  p.source as source,
  p.type as poi_type,
  p.destination_name as destination_name,
  p.lat as lat,
  p.lon as lon,
  size((p)-[]-()) as rel_count
LIMIT 20;

// 4. CHECK IF POIs HAVE DESTINATION_NAME BUT NO LOCATED_IN
MATCH (p:poi)
WHERE p.destination_name IS NOT NULL
  AND NOT (p)-[:LOCATED_IN]->()
RETURN count(p) as can_create_located_in;

// 5. POIs WITHOUT TYPE (CAN'T CREATE ACTIVITY RELATIONSHIPS)
MATCH (p:poi)
WHERE p.type IS NULL OR p.type = ''
RETURN count(p) as pois_without_type;

// 6. POIs WITHOUT LUXURY SCORE (CAN'T CREATE THEME RELATIONSHIPS)
MATCH (p:poi)
WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NULL
RETURN count(p) as pois_without_score;

// 7. BREAKDOWN BY IMPORT (OLD VS NEW DATA)
// Assuming older POIs have IDs < 10000 (adjust if needed)
MATCH (p:poi)
WHERE id(p) < 10000
WITH count(p) as old_poi_count, sum(size((p)-[]-()))  as old_rels
MATCH (p:poi)
WHERE id(p) >= 10000
WITH old_poi_count, old_rels, count(p) as new_poi_count, sum(size((p)-[]-()))  as new_rels
RETURN 
  old_poi_count,
  old_rels,
  round(old_rels * 1.0 / old_poi_count, 1) as old_avg_rels,
  new_poi_count,
  new_rels,
  round(new_rels * 1.0 / new_poi_count, 1) as new_avg_rels;

// 8. WHICH RELATIONSHIPS ARE MISSING THE MOST?
MATCH (p:poi)
WHERE NOT (p)-[:LOCATED_IN]->()
WITH count(p) as missing_located_in
MATCH (p:poi)
WHERE NOT (p)-[:SUPPORTS_ACTIVITY]->()
WITH missing_located_in, count(p) as missing_activity
MATCH (p:poi)
WHERE NOT (p)-[:HAS_THEME]->()
WITH missing_located_in, missing_activity, count(p) as missing_theme
RETURN 
  missing_located_in,
  missing_activity,
  missing_theme;

// 9. DESTINATIONS WITHOUT POIS
MATCH (d:destination)
WHERE NOT ()-[:LOCATED_IN]->(d)
RETURN 
  d.name as destination_name,
  d.source as source
LIMIT 10;

// 10. CHECK IF ADRIATIC/IONIAN DESTINATIONS EXIST
MATCH (d:destination)
WHERE d.name CONTAINS 'Split' 
   OR d.name CONTAINS 'Dubrovnik'
   OR d.name CONTAINS 'Hvar'
   OR d.name CONTAINS 'Korcula'
   OR d.name CONTAINS 'Zadar'
RETURN 
  d.name as destination_name,
  d.source as source,
  [(d)<-[:LOCATED_IN]-(p:poi) | p.name][0..5] as sample_pois,
  size((d)<-[:LOCATED_IN]-()) as poi_count
ORDER BY poi_count DESC;

