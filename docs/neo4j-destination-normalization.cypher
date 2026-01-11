// Neo4j Destination Normalization (run once)
//
// Goal:
// - Make the 12 MVP yacht destinations first-class nodes (kind='mvp_destination')
// - Ensure cities like Monaco/St. Tropez are kind='city' and link into the MVP destination
// - Add lightweight indexes for lookups
//
// Safe to re-run.
//
// If you already have duplicates (same name appears multiple times), run:
// - docs/neo4j-destination-dedupe.cypher
// then add the uniqueness constraint in:
// - docs/neo4j-taxonomy-constraints.cypher

// 1) Ensure the 12 MVP destinations exist + are typed
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
  d.canonical_id = coalesce(d.canonical_id, toLower(replace(replace(name, " ", "-"), ".", ""))),
  d.updated_at = datetime();

// 2) Ensure key cities exist + link into the right MVP destination
UNWIND [
  {city:"Monaco", parent:"French Riviera"},
  {city:"St. Tropez", parent:"French Riviera"},
  {city:"Cannes", parent:"French Riviera"},
  {city:"Nice", parent:"French Riviera"}
] AS row
MERGE (c:destination {name: row.city})
SET
  c.kind = "city",
  c.canonical_id = coalesce(c.canonical_id, toLower(replace(replace(row.city, " ", "-"), ".", ""))),
  c.updated_at = datetime()
WITH row, c
MATCH (mvp:destination {name: row.parent})
MERGE (c)-[:IN_DESTINATION]->(mvp);

// 3) Normalize legacy destination nodes that match these names but have no kind
//    (If they were already merged by name above, this will just set kind.)
MATCH (d:destination)
WHERE d.name IN ["French Riviera","Amalfi Coast","Balearics","Cyclades","Adriatic North","Adriatic Central","Adriatic South","Ionian Sea","Bahamas","BVI","USVI","French Antilles"]
SET d.kind = "mvp_destination";

MATCH (d:destination)
WHERE d.name IN ["Monaco","St. Tropez","Cannes","Nice"]
SET d.kind = "city";

// 4) Indexes (safe to run even if already exist)
CREATE INDEX destination_canonical_id_index IF NOT EXISTS
FOR (d:destination)
ON (d.canonical_id);

CREATE INDEX destination_kind_index IF NOT EXISTS
FOR (d:destination)
ON (d.kind);

