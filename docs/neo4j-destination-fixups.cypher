// Neo4j Destination Fixups (run once, safe to re-run)
//
// Why this exists:
// After adding uniqueness constraints, we want the graph to behave consistently:
// - Cities like Monaco / St. Tropez / Cannes / Nice should map to the MVP destination "French Riviera"
// - Some old destination nodes may have a UUID in canonical_id (legacy) which blocks consistent lookups
// - Some legacy Adriatic names use parentheses (Adriatic (South)) and should standardize
//
// Run this in Neo4j Browser (Aura):
// - Open this file
// - Copy/paste all
// - Run

// ----------------------------------------------------------------------------
// 0) Ensure MVP destinations exist (idempotent)
// ----------------------------------------------------------------------------
UNWIND [
  "French Riviera",
  "Amalfi Coast",
  "Balearics",
  "Cyclades",
  "Adriatic North",
  "Adriatic Central",
  "Adriatic South",
  "Ionian Sea",
  "Bahamas",
  "BVI",
  "USVI",
  "French Antilles"
] AS name
MERGE (d:destination {name: name})
SET
  d.kind = "mvp_destination",
  d.canonical_id = CASE
    WHEN d.canonical_id IS NULL OR trim(toString(d.canonical_id)) = '' THEN toLower(replace(replace(name, " ", "-"), ".", ""))
    WHEN toString(d.canonical_id) =~ '(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN toLower(replace(replace(name, " ", "-"), ".", ""))
    ELSE d.canonical_id
  END,
  d.updated_at = datetime();

// ----------------------------------------------------------------------------
// 1) Backfill French Riviera key cities + ensure they link to MVP destination
// ----------------------------------------------------------------------------
UNWIND [
  {city:"Monaco", parent:"French Riviera"},
  {city:"St. Tropez", parent:"French Riviera"},
  {city:"Cannes", parent:"French Riviera"},
  {city:"Nice", parent:"French Riviera"}
] AS row
MERGE (c:destination {name: row.city})
SET
  c.kind = "city",
  c.canonical_id = CASE
    WHEN c.canonical_id IS NULL OR trim(toString(c.canonical_id)) = '' THEN toLower(replace(replace(row.city, " ", "-"), ".", ""))
    WHEN toString(c.canonical_id) =~ '(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN toLower(replace(replace(row.city, " ", "-"), ".", ""))
    ELSE c.canonical_id
  END,
  c.updated_at = datetime()
WITH row, c
MATCH (mvp:destination {name: row.parent, kind: "mvp_destination"})
MERGE (c)-[:IN_DESTINATION]->(mvp);

// ----------------------------------------------------------------------------
// 2) Standardize "Adriatic (X)" legacy names.
//
// IMPORTANT:
// With uniqueness constraints active, we MUST keep the node that already owns
// the correct canonical_id (slug) if it exists (e.g. 'adriatic-north').
//
// This is written to be Aura-safe:
// - We KEEP the node that has most :LOCATED_IN relationships (so we don't move 600k edges).
// - We only rewire the smaller node into the kept node.
// ----------------------------------------------------------------------------
UNWIND [
  {canonical:"Adriatic North", alias:"Adriatic (North)"},
  {canonical:"Adriatic Central", alias:"Adriatic (Central)"},
  {canonical:"Adriatic South", alias:"Adriatic (South)"}
] AS row
WITH row, toLower(replace(replace(row.canonical, " ", "-"), ".", "")) AS slug
MATCH (a:destination {name: row.alias})
MATCH (c:destination {name: row.canonical})
WITH row, slug, a, c,
  COUNT { (:poi)-[:LOCATED_IN]->(a) } AS aLoc,
  COUNT { (:poi)-[:LOCATED_IN]->(c) } AS cLoc,
  (toString(a.canonical_id) = slug) AS aSlug,
  (toString(c.canonical_id) = slug) AS cSlug
WITH row, slug,
  CASE
    WHEN aSlug THEN a
    WHEN cSlug THEN c
    WHEN aLoc >= cLoc THEN a
    ELSE c
  END AS keep,
  CASE
    WHEN aSlug THEN c
    WHEN cSlug THEN a
    WHEN aLoc >= cLoc THEN c
    ELSE a
  END AS drop
WITH row, slug, keep, drop
WHERE id(keep) <> id(drop)

// Move ONLY the smaller node's POI links (should be small) in batches.
CALL {
  WITH keep, drop
  MATCH (p:poi)-[r:LOCATED_IN]->(drop)
  MERGE (p)-[:LOCATED_IN]->(keep)
  DELETE r
} IN TRANSACTIONS OF 50000 ROWS

// Other rewires are usually tiny.
CALL {
  WITH keep, drop
  MATCH (p:poi)-[r:PROMINENT_IN]->(drop)
  MERGE (p)-[:PROMINENT_IN]->(keep)
  DELETE r
  RETURN count(*) AS moved_prominent_in
}
CALL {
  WITH keep, drop
  MATCH (x:destination)-[r:IN_DESTINATION]->(drop)
  MERGE (x)-[:IN_DESTINATION]->(keep)
  DELETE r
  RETURN count(*) AS moved_in_destination
}
CALL {
  WITH keep, drop
  MATCH (drop)-[r:IN_AREA]->(a:area)
  MERGE (keep)-[:IN_AREA]->(a)
  DELETE r
  RETURN count(*) AS moved_area
}
CALL {
  WITH keep, drop
  MATCH (drop)-[r:IN_REGION]->(rg:region)
  MERGE (keep)-[:IN_REGION]->(rg)
  DELETE r
  RETURN count(*) AS moved_region
}
CALL {
  WITH keep, drop
  MATCH (drop)-[r:IN_CONTINENT]->(ct:continent)
  MERGE (keep)-[:IN_CONTINENT]->(ct)
  DELETE r
  RETURN count(*) AS moved_continent
}
CALL {
  WITH keep, drop
  MATCH (yr:yacht_route)-[r:INCLUDES_PORT]->(drop)
  MERGE (yr)-[r2:INCLUDES_PORT {order: coalesce(r.order, 0)}]->(keep)
  SET r2 += properties(r)
  DELETE r
  RETURN count(*) AS moved_routes
}

WITH row, slug, keep, drop
DETACH DELETE drop

WITH row, slug, keep
SET
  keep.name = row.canonical,
  keep.kind = "mvp_destination",
  keep.canonical_id = slug,
  keep.updated_at = datetime()

RETURN row.canonical AS canonical, row.alias AS merged_from;

