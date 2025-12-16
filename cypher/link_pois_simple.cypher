// 1) Index for destination lookup
CREATE INDEX destination_name_idx IF NOT EXISTS
FOR (d:destination) ON (d.name);

// 2) Ensure destination nodes exist
MATCH (p:poi)
WITH DISTINCT p.destination_name AS dn
WHERE dn IS NOT NULL AND trim(dn) <> ""
MERGE (:destination {name: dn});

// 3) Link POIs -> destination in batches
CALL () {
  MATCH (p:poi)
  MATCH (d:destination {name: p.destination_name})
  MERGE (p)-[:LOCATED_IN]->(d)
} IN TRANSACTIONS OF 1000 ROWS;
