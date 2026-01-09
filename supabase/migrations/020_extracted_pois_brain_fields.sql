-- 020_extracted_pois_brain_fields.sql
-- Add investor-grade Brain fields to extracted_pois so key intelligence is queryable and indexable
-- (instead of living only inside metadata.raw).
--
-- MVP policy:
-- - no Foursquare ingestion until enterprise contract
-- - free/open + scraping + manual enrichment
-- - avoid unnamed POIs (handled by ingestion filters + quality checks)

ALTER TABLE extracted_pois
  ADD COLUMN IF NOT EXISTS emotional_map JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sensory_triggers TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS client_archetypes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS conversation_triggers TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_refs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS enrichment JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS emotion_confidence INTEGER CHECK (emotion_confidence >= 0 AND emotion_confidence <= 100),
  ADD COLUMN IF NOT EXISTS luxury_score_confidence INTEGER CHECK (luxury_score_confidence >= 0 AND luxury_score_confidence <= 100);

-- Helpful indexes for filtering/ops dashboards
CREATE INDEX IF NOT EXISTS idx_extracted_pois_emotion_confidence ON extracted_pois(emotion_confidence);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_luxury_score_confidence ON extracted_pois(luxury_score_confidence);

-- JSONB indexes for containment queries (optional but useful)
CREATE INDEX IF NOT EXISTS idx_extracted_pois_emotional_map_gin ON extracted_pois USING GIN (emotional_map);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_source_refs_gin ON extracted_pois USING GIN (source_refs);

