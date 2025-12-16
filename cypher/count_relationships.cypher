// Count relationships in Neo4j database
// Run this in Neo4j Browser or Neo4j Desktop

// Count POI nodes per destination
MATCH (p:poi)
RETURN p.destination_name AS destination, count(p) AS poi_count
ORDER BY poi_count DESC;

// Count total POI nodes
MATCH (p:poi)
RETURN count(p) AS total_pois;

// Count LOCATED_IN relationships
MATCH ()-[r:LOCATED_IN]->()
RETURN count(r) AS located_in_count;

// Count SUPPORTS_ACTIVITY relationships
MATCH ()-[r:SUPPORTS_ACTIVITY]->()
RETURN count(r) AS supports_activity_count;

// Count HAS_THEME relationships
MATCH ()-[r:HAS_THEME]->()
RETURN count(r) AS has_theme_count;

// Count all relationships by type
MATCH ()-[r]->()
RETURN type(r) AS relationship_type, count(r) AS count
ORDER BY count DESC;

// Summary: POIs and relationships per destination (Fixed)
// This version uses UNION to combine all relationship types, then aggregates
MATCH (p:poi)
WITH p.destination_name AS destination, count(p) AS poi_count
MATCH (p2:poi {destination_name: destination})
WITH destination, poi_count, collect(p2) AS pois
UNWIND pois AS poi
MATCH (poi)-[r]->()
WITH destination, poi_count, type(r) AS rel_type, count(r) AS rel_count
WITH destination, poi_count,
     sum(CASE WHEN rel_type = 'LOCATED_IN' THEN rel_count ELSE 0 END) AS located_in_count,
     sum(CASE WHEN rel_type = 'SUPPORTS_ACTIVITY' THEN rel_count ELSE 0 END) AS activity_relations,
     sum(CASE WHEN rel_type = 'HAS_THEME' THEN rel_count ELSE 0 END) AS theme_relations
RETURN destination,
       poi_count,
       located_in_count,
       activity_relations,
       theme_relations
ORDER BY poi_count DESC;

// Alternative: Simpler separate queries (Recommended if above doesn't work)
// These work reliably - run them separately:

// 1. POI count per destination
MATCH (p:poi)
RETURN p.destination_name AS destination, count(p) AS poi_count
ORDER BY poi_count DESC;

// 2. LOCATED_IN count per destination  
MATCH (p:poi)-[r:LOCATED_IN]->()
RETURN p.destination_name AS destination, count(r) AS located_in_count
ORDER BY located_in_count DESC;

// 3. SUPPORTS_ACTIVITY count per destination
MATCH (p:poi)-[r:SUPPORTS_ACTIVITY]->()
RETURN p.destination_name AS destination, count(r) AS activity_relations
ORDER BY activity_relations DESC;

// 4. HAS_THEME count per destination
MATCH (p:poi)-[r:HAS_THEME]->()
RETURN p.destination_name AS destination, count(r) AS theme_relations
ORDER BY theme_relations DESC;

