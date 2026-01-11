-- 024_extracted_pois_generated_source.sql
--
-- Purpose:
-- Allow importing “generated” POIs (OSM/Wikidata/Overture) into extracted_pois
-- for the Captain review workflow, with idempotency.
--
-- We add nullable columns to track the upstream source record, and a unique
-- constraint so imports are safe to re-run.

ALTER TABLE extracted_pois
  ADD COLUMN IF NOT EXISTS generated_source TEXT,
  ADD COLUMN IF NOT EXISTS generated_source_id TEXT,
  ADD COLUMN IF NOT EXISTS generated_entity_id UUID,
  ADD COLUMN IF NOT EXISTS generated_destination_id UUID;

-- Keep destination/source imports idempotent (nulls do not conflict).
CREATE UNIQUE INDEX IF NOT EXISTS uq_extracted_pois_generated_source
  ON extracted_pois (generated_source, generated_source_id);

CREATE INDEX IF NOT EXISTS idx_extracted_pois_generated_entity_id
  ON extracted_pois (generated_entity_id);

CREATE INDEX IF NOT EXISTS idx_extracted_pois_generated_destination_id
  ON extracted_pois (generated_destination_id);

