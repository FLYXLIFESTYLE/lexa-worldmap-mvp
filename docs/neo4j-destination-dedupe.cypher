// Neo4j Destination De-dupe (run once if you see duplicates)
//
// Problem:
// Neo4j allows duplicates unless uniqueness constraints exist.
// This script merges duplicates for:
// - kind = 'mvp_destination'
// - kind = 'city'
//
// IMPORTANT:
// Run the FULL file (not a snippet), otherwise you may partially rewire relationships.
//
// Safe to re-run.

// 0) Ensure canonical_id exists (stable key for de-dupe + future constraints)
MATCH (d:destination)
WHERE d.kind IN ["mvp_destination", "city"]
SET
  d.name = trim(d.name),
  d.canonical_id = coalesce(
    d.canonical_id,
    toLower(replace(replace(trim(d.name), " ", "-"), ".", ""))
  ),
  d.updated_at = datetime();

// Helper pattern: pick the node with the most relationships to keep
// (We do this twice per kind: first by canonical_id, then fallback by name)

// ============================================================================
// 1) De-dupe MVP destinations (kind='mvp_destination')
// ============================================================================

// 1a) By canonical_id
MATCH (d:destination {kind: "mvp_destination"})
WITH d.canonical_id AS key, collect(d) AS nodes
WHERE key IS NOT NULL AND size(nodes) > 1
CALL {
  WITH nodes
  UNWIND nodes AS n
  WITH n, COUNT { (n)--() } AS relCount
  ORDER BY relCount DESC, id(n) ASC
  WITH collect(n) AS ordered
  RETURN ordered[0] AS keep, ordered[1..] AS dups
}
UNWIND dups AS dup
WITH keep, dup
CALL {
  WITH keep, dup
  MATCH (p:poi)-[r:LOCATED_IN]->(dup)
  MERGE (p)-[:LOCATED_IN]->(keep)
  DELETE r
  RETURN count(*) AS moved_located_in
}
CALL {
  WITH keep, dup
  MATCH (p:poi)-[r:PROMINENT_IN]->(dup)
  MERGE (p)-[:PROMINENT_IN]->(keep)
  DELETE r
  RETURN count(*) AS moved_prominent_in
}
CALL {
  WITH keep, dup
  MATCH (c:destination)-[r:IN_DESTINATION]->(dup)
  MERGE (c)-[:IN_DESTINATION]->(keep)
  DELETE r
  RETURN count(*) AS moved_city_links
}
CALL {
  WITH keep, dup
  MATCH (dup)-[r:IN_AREA]->(a:area)
  MERGE (keep)-[:IN_AREA]->(a)
  DELETE r
  RETURN count(*) AS moved_area
}
CALL {
  WITH keep, dup
  MATCH (dup)-[r:IN_REGION]->(rg:region)
  MERGE (keep)-[:IN_REGION]->(rg)
  DELETE r
  RETURN count(*) AS moved_region
}
CALL {
  WITH keep, dup
  MATCH (dup)-[r:IN_CONTINENT]->(ct:continent)
  MERGE (keep)-[:IN_CONTINENT]->(ct)
  DELETE r
  RETURN count(*) AS moved_continent
}
CALL {
  WITH keep, dup
  MATCH (yr:yacht_route)-[r:INCLUDES_PORT]->(dup)
  MERGE (yr)-[r2:INCLUDES_PORT {order: coalesce(r.order, 0)}]->(keep)
  SET r2 += properties(r)
  DELETE r
  RETURN count(*) AS moved_routes
}
DETACH DELETE dup;

// 1b) Fallback by normalized name
MATCH (d:destination {kind: "mvp_destination"})
WITH trim(d.name) AS key, collect(d) AS nodes
WHERE size(nodes) > 1
CALL {
  WITH nodes
  UNWIND nodes AS n
  WITH n, COUNT { (n)--() } AS relCount
  ORDER BY relCount DESC, id(n) ASC
  WITH collect(n) AS ordered
  RETURN ordered[0] AS keep, ordered[1..] AS dups
}
UNWIND dups AS dup
WITH keep, dup
CALL {
  WITH keep, dup
  MATCH (p:poi)-[r:LOCATED_IN]->(dup)
  MERGE (p)-[:LOCATED_IN]->(keep)
  DELETE r
  RETURN count(*) AS moved_located_in
}
CALL {
  WITH keep, dup
  MATCH (c:destination)-[r:IN_DESTINATION]->(dup)
  MERGE (c)-[:IN_DESTINATION]->(keep)
  DELETE r
  RETURN count(*) AS moved_city_links
}
CALL {
  WITH keep, dup
  MATCH (yr:yacht_route)-[r:INCLUDES_PORT]->(dup)
  MERGE (yr)-[r2:INCLUDES_PORT {order: coalesce(r.order, 0)}]->(keep)
  SET r2 += properties(r)
  DELETE r
  RETURN count(*) AS moved_routes
}
DETACH DELETE dup;

// ============================================================================
// 2) De-dupe Cities (kind='city')
// ============================================================================

// 2a) By canonical_id
MATCH (d:destination {kind: "city"})
WITH d.canonical_id AS key, collect(d) AS nodes
WHERE key IS NOT NULL AND size(nodes) > 1
CALL {
  WITH nodes
  UNWIND nodes AS n
  WITH n, COUNT { (n)--() } AS relCount
  ORDER BY relCount DESC, id(n) ASC
  WITH collect(n) AS ordered
  RETURN ordered[0] AS keep, ordered[1..] AS dups
}
UNWIND dups AS dup
WITH keep, dup
CALL {
  WITH keep, dup
  MATCH (p:poi)-[r:LOCATED_IN]->(dup)
  MERGE (p)-[:LOCATED_IN]->(keep)
  DELETE r
  RETURN count(*) AS moved_located_in
}
CALL {
  WITH keep, dup
  MATCH (dup)-[r:IN_DESTINATION]->(mvp:destination)
  MERGE (keep)-[:IN_DESTINATION]->(mvp)
  DELETE r
  RETURN count(*) AS moved_city_to_mvp
}
CALL {
  WITH keep, dup
  MATCH (yr:yacht_route)-[r:INCLUDES_PORT]->(dup)
  MERGE (yr)-[r2:INCLUDES_PORT {order: coalesce(r.order, 0)}]->(keep)
  SET r2 += properties(r)
  DELETE r
  RETURN count(*) AS moved_routes
}
DETACH DELETE dup;

// 2b) Fallback by normalized name
MATCH (d:destination {kind: "city"})
WITH trim(d.name) AS key, collect(d) AS nodes
WHERE size(nodes) > 1
CALL {
  WITH nodes
  UNWIND nodes AS n
  WITH n, COUNT { (n)--() } AS relCount
  ORDER BY relCount DESC, id(n) ASC
  WITH collect(n) AS ordered
  RETURN ordered[0] AS keep, ordered[1..] AS dups
}
UNWIND dups AS dup
WITH keep, dup
CALL {
  WITH keep, dup
  MATCH (p:poi)-[r:LOCATED_IN]->(dup)
  MERGE (p)-[:LOCATED_IN]->(keep)
  DELETE r
  RETURN count(*) AS moved_located_in
}
CALL {
  WITH keep, dup
  MATCH (dup)-[r:IN_DESTINATION]->(mvp:destination)
  MERGE (keep)-[:IN_DESTINATION]->(mvp)
  DELETE r
  RETURN count(*) AS moved_city_to_mvp
}
DETACH DELETE dup;

