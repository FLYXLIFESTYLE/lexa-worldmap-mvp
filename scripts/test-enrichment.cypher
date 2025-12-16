// =============================================================================
// TEST ENRICHMENT QUERIES
// Run these to verify the enrichment module will work
// =============================================================================

// 1. COUNT UNNAMED POIs (exact pattern from your data)
MATCH (p:poi)
WHERE p.name =~ 'Unnamed POI \\(osm:.*\\)'
RETURN count(*) as unnamed_with_osm_ids;

// 2. SAMPLE 10 UNNAMED POIs TO ENRICH
MATCH (p:poi)
WHERE p.name =~ 'Unnamed POI \\(osm:.*\\)'
  AND p.lat IS NOT NULL
  AND p.lon IS NOT NULL
RETURN 
  id(p) as poi_id,
  p.name as current_name,
  p.type as poi_type,
  p.lat as latitude,
  p.lon as longitude
LIMIT 10;

// 3. EXTRACT OSM IDs (test the parsing logic)
MATCH (p:poi)
WHERE p.name =~ 'Unnamed POI \\(osm:.*\\)'
WITH p, 
  substring(p.name, size('Unnamed POI (osm:'), 
    size(p.name) - size('Unnamed POI (osm:') - 1) as osm_id
RETURN 
  p.name as original_name,
  osm_id,
  CASE 
    WHEN osm_id CONTAINS 'node' THEN 'node'
    WHEN osm_id CONTAINS 'way' THEN 'way'
    WHEN osm_id CONTAINS 'relation' THEN 'relation'
  END as osm_type,
  split(osm_id, '_')[2] as numeric_id
LIMIT 10;

// 4. CHECK IF ANY WERE ALREADY ENRICHED
MATCH (p:poi)
WHERE p.enriched_at IS NOT NULL
RETURN 
  p.name,
  p.enrichment_source,
  p.enriched_at
LIMIT 10;

// 5. BREAKDOWN BY TYPE (to prioritize enrichment)
MATCH (p:poi)
WHERE p.name =~ 'Unnamed POI \\(osm:.*\\)'
RETURN 
  coalesce(p.type, 'no_type') as poi_type,
  count(*) as count
ORDER BY count DESC
LIMIT 20;

