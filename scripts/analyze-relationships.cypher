// =============================================================================
// RELATIONSHIP ANALYSIS
// Find out why relationships didn't increase proportionally with nodes
// =============================================================================

// 1. CURRENT GRAPH STATS
CALL db.stats.retrieve('GRAPH COUNTS') YIELD data
RETURN 
  data.nodes as total_nodes,
  data.relationships as total_relationships,
  round(data.relationships * 1.0 / data.nodes, 2) as avg_relationships_per_node;

// 2. RELATIONSHIP TYPES BREAKDOWN
MATCH ()-[r]->()
RETURN type(r) as relationship_type, count(r) as count
ORDER BY count DESC;

// 3. POIs WITHOUT LOCATED_IN (orphaned POIs)
MATCH (p:poi)
WHERE NOT (p)-[:LOCATED_IN]->()
RETURN count(p) as pois_without_destination;

// 4. POIs WITHOUT ANY RELATIONSHIPS
MATCH (p:poi)
WHERE NOT (p)-[]-()
RETURN count(p) as completely_orphaned_pois;

// 5. POIs WITH FEW RELATIONSHIPS (less connected)
MATCH (p:poi)
WITH p, size((p)-[]-()) as rel_count
WHERE rel_count < 2
RETURN 
  CASE 
    WHEN rel_count = 0 THEN '0 relationships'
    WHEN rel_count = 1 THEN '1 relationship'
    ELSE '2+ relationships'
  END as category,
  count(p) as poi_count
ORDER BY category;

// 6. SAMPLE POORLY CONNECTED POIs
MATCH (p:poi)
WITH p, size((p)-[]-()) as rel_count
WHERE rel_count <= 1
RETURN 
  p.name,
  p.type,
  p.destination_name,
  rel_count,
  [(p)-[r]->(n) | type(r) + ' -> ' + labels(n)[0]] as existing_relationships
LIMIT 20;

// 7. POIs BY SOURCE (check if new POIs are less connected)
MATCH (p:poi)
WITH p.source as source, p, size((p)-[]-()) as rel_count
RETURN 
  source,
  count(p) as poi_count,
  avg(rel_count) as avg_relationships_per_poi,
  min(rel_count) as min_rels,
  max(rel_count) as max_rels
ORDER BY poi_count DESC;

// 8. EXPECTED VS ACTUAL RELATIONSHIPS
// If all POIs had LOCATED_IN + SUPPORTS_ACTIVITY + HAS_THEME
MATCH (p:poi)
WITH count(p) as poi_count
MATCH ()-[r]->()
WITH poi_count, count(r) as current_rels
RETURN 
  poi_count,
  current_rels,
  poi_count * 3 as expected_minimum_rels,
  poi_count * 3 - current_rels as missing_relationships_estimate;

// 9. POTENTIAL RELATIONSHIPS TO CREATE
// POIs that should have LOCATED_IN but don't
MATCH (p:poi)
WHERE NOT (p)-[:LOCATED_IN]->()
  AND p.destination_name IS NOT NULL
RETURN count(p) as can_create_located_in;

// 10. RELATIONSHIP DENSITY BY NODE TYPE
MATCH (n)
WITH labels(n)[0] as label, n, size((n)-[]-()) as rel_count
RETURN 
  label,
  count(n) as node_count,
  sum(rel_count) as total_relationships,
  round(avg(rel_count), 2) as avg_rels_per_node,
  round(sum(rel_count) * 1.0 / count(n), 2) as density
ORDER BY node_count DESC;

