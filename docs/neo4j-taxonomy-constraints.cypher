// Neo4j Taxonomy Constraints (run once)
//
// Goal: stop taxonomy duplicates and enforce canonical IDs.
// Safe to re-run (IF NOT EXISTS).

// Canonical taxonomy: code-based uniqueness
CREATE CONSTRAINT emotion_code_unique IF NOT EXISTS
FOR (e:Emotion)
REQUIRE e.code IS UNIQUE;

CREATE CONSTRAINT desire_code_unique IF NOT EXISTS
FOR (d:Desire)
REQUIRE d.code IS UNIQUE;

CREATE CONSTRAINT fear_code_unique IF NOT EXISTS
FOR (f:Fear)
REQUIRE f.code IS UNIQUE;

// EmotionalTag: slug-based uniqueness (prevents duplicates like “Prestige” vs “prestige”)
CREATE CONSTRAINT emotionaltag_slug_unique IF NOT EXISTS
FOR (t:EmotionalTag)
REQUIRE t.slug IS UNIQUE;

// Helpful index for name lookups (optional)
CREATE INDEX destination_name_index IF NOT EXISTS
FOR (d:destination)
ON (d.name);

// Destination uniqueness (run AFTER you de-dupe destinations)
// Use a composite key so we can enforce uniqueness separately per destination kind (city vs mvp_destination).
CREATE CONSTRAINT destination_kind_canonical_unique IF NOT EXISTS
FOR (d:destination)
REQUIRE (d.kind, d.canonical_id) IS UNIQUE;

