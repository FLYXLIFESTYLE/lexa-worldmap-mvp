// Link POIs to Destinations
// This script creates destination nodes and links POIs to them efficiently
// Run this after importing POI data

// Step 1: Check which destinations have POIs without LOCATED_IN relationships
MATCH (p:poi)
WHERE NOT EXISTS((p)-[:LOCATED_IN]->())
RETURN p.destination_name AS destination, count(p) AS unlinked_pois
ORDER BY unlinked_pois DESC;

// Step 2: Create index for destination lookup (for performance)
CREATE INDEX destination_name_idx IF NOT EXISTS
FOR (d:destination) ON (d.name);

// Step 3: Ensure destination nodes exist
MATCH (p:poi)
WITH DISTINCT p.destination_name AS dn
WHERE dn IS NOT NULL AND trim(dn) <> ""
MERGE (d:destination {name: dn})
SET d.created_at = datetime(),
    d.source = 'OSM_IMPORT'
RETURN d.name AS created_destination, labels(d) AS labels;

// Step 4: Link POIs -> destination in batches (efficient batch processing)
// Only process POIs that don't already have LOCATED_IN relationship
// Using smaller batches (100 rows) to avoid connection timeouts
CALL () {
  MATCH (p:poi)
  WHERE NOT EXISTS((p)-[:LOCATED_IN]->())
  MATCH (d:destination {name: p.destination_name})
  MERGE (p)-[:LOCATED_IN]->(d)
} IN TRANSACTIONS OF 100 ROWS;

// Step 5: Verify all POIs are now linked
MATCH (p:poi)
OPTIONAL MATCH (p)-[r:LOCATED_IN]->(d:destination)
RETURN 
    count(p) AS total_pois,
    count(r) AS linked_pois,
    count(p) - count(r) AS unlinked_pois,
    CASE 
        WHEN count(r) = count(p) THEN 'All POIs linked ✓'
        ELSE 'Some POIs still unlinked'
    END AS status;

// Step 6: Show destination nodes and their POI counts
MATCH (d:destination)<-[:LOCATED_IN]-(p:poi)
RETURN d.name AS destination,
       labels(d) AS node_type,
       count(p) AS poi_count
ORDER BY poi_count DESC;

