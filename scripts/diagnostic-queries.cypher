// =============================================================================
// DIAGNOSTIC QUERIES FOR DATA QUALITY
// Run these in Neo4j Browser to see what needs to be processed
// =============================================================================

// 1. COUNT UNNAMED POIs
MATCH (p:poi)
WHERE p.name IS NULL 
  OR p.name = '' 
  OR trim(p.name) = ''
RETURN count(p) as unnamed_pois;

// 2. SAMPLE UNNAMED POIs (first 10)
MATCH (p:poi)
WHERE p.name IS NULL 
  OR p.name = '' 
  OR trim(p.name) = ''
RETURN p.poi_uid, p.name, p.type, p.source, p.source_id
LIMIT 10;

// 3. COUNT POIs WITHOUT LUXURY SCORES
MATCH (p:poi)
WHERE p.luxury_score IS NULL
RETURN count(p) as missing_luxury_scores;

// 4. COUNT RELATIONSHIPS WITHOUT CONFIDENCE
MATCH ()-[r]->()
WHERE r.confidence IS NULL
  AND type(r) IN [
    'EVOKES', 'AMPLIFIES_DESIRE', 'MITIGATES_FEAR', 'RELATES_TO',
    'SUPPORTS_ACTIVITY', 'HAS_THEME', 'FEATURED_IN'
  ]
RETURN count(r) as missing_confidence;

// 5. TOTAL POI COUNT
MATCH (p:poi)
RETURN count(p) as total_pois;

// 6. POIs WITH LUXURY SCORES
MATCH (p:poi)
WHERE p.luxury_score IS NOT NULL
RETURN count(p) as scored_pois,
       avg(p.luxury_score) as avg_score,
       min(p.luxury_score) as min_score,
       max(p.luxury_score) as max_score;

// 7. POTENTIAL DUPLICATES (same name + close coordinates)
MATCH (p1:poi), (p2:poi)
WHERE id(p1) < id(p2)
  AND p1.name = p2.name
  AND p1.name IS NOT NULL
  AND p1.lat IS NOT NULL
  AND p1.lon IS NOT NULL
  AND p2.lat IS NOT NULL
  AND p2.lon IS NOT NULL
  AND point.distance(
    point({latitude: p1.lat, longitude: p1.lon}),
    point({latitude: p2.lat, longitude: p2.lon})
  ) < 100
RETURN count(*) as duplicate_pairs;

// 8. POIs WITHOUT LOCATED_IN RELATIONSHIP
MATCH (p:poi)
WHERE NOT (p)-[:LOCATED_IN]->()
RETURN count(p) as orphaned_pois;

// 9. BREAKDOWN BY NAME STATUS
MATCH (p:poi)
RETURN 
  CASE 
    WHEN p.name IS NULL THEN 'NULL'
    WHEN p.name = '' THEN 'EMPTY_STRING'
    WHEN trim(p.name) = '' THEN 'WHITESPACE_ONLY'
    ELSE 'HAS_NAME'
  END as name_status,
  count(p) as count
ORDER BY count DESC;

// 10. PROGRESS SUMMARY (ALL IN ONE)
MATCH (p:poi)
WITH count(p) as total
MATCH (p:poi) WHERE p.name IS NULL OR p.name = '' OR trim(p.name) = ''
WITH total, count(p) as unnamed
MATCH (p:poi) WHERE p.luxury_score IS NULL
WITH total, unnamed, count(p) as unscored
MATCH (p:poi) WHERE p.luxury_score IS NOT NULL
WITH total, unnamed, unscored, count(p) as scored
RETURN 
  total as total_pois,
  unnamed as unnamed_pois,
  unscored as pois_needing_scores,
  scored as pois_scored,
  round(100.0 * scored / total, 1) as percent_scored;

