// ============================================================================
// Neo4j Constraints & Indexes for Experience-first Graph (Milestone 1)
// ============================================================================
// Safe to run multiple times (IF NOT EXISTS).
// This does not delete or migrate data; it only adds constraints/indexes.
// ============================================================================

// --- Canonical identity (for new ingestion) ---
CREATE CONSTRAINT poi_canonical_id_unique IF NOT EXISTS
FOR (p:poi) REQUIRE p.canonical_id IS UNIQUE;

CREATE CONSTRAINT provider_canonical_id_unique IF NOT EXISTS
FOR (p:provider) REQUIRE p.canonical_id IS UNIQUE;

CREATE CONSTRAINT destination_canonical_id_unique IF NOT EXISTS
FOR (d:destination) REQUIRE d.canonical_id IS UNIQUE;

// --- Optional: ensure themes remain unique by name ---
// (You already added similar protection in the theme cleanup route.)
CREATE CONSTRAINT theme_category_name_unique IF NOT EXISTS
FOR (t:theme_category) REQUIRE t.name IS UNIQUE;

// --- Helpful indexes for retrieval ---
CREATE INDEX poi_latlon_idx IF NOT EXISTS
FOR (p:poi) ON (p.lat, p.lon);

CREATE INDEX provider_name_idx IF NOT EXISTS
FOR (p:provider) ON (p.name);

CREATE INDEX poi_name_idx IF NOT EXISTS
FOR (p:poi) ON (p.name);


