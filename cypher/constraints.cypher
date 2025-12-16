// Neo4j Constraints Setup
// Generated: 2025-12-14T23:09:06.860570+00:00
// IMPORTANT: Run this file ONCE before importing any POI data
// This ensures constraints are created on an empty database for better performance

// Create unique constraint for POI nodes
// Run this ONCE before importing any POI data
CREATE CONSTRAINT poi_uid_unique IF NOT EXISTS
FOR (p:poi) REQUIRE p.poi_uid IS UNIQUE;
