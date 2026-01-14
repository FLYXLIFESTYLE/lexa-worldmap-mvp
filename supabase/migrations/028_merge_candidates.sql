-- 028_merge_candidates.sql
--
-- Purpose: Store merge candidates for POI deduplication (Task #9)
--
-- Why:
-- - We have 2.17M canonical POIs from multiple sources (OSM, Overture, Wikidata)
-- - Many are duplicates (same hotel in both OSM and Overture)
-- - Need Captain review before merging (safety + quality control)
--
-- Flow:
-- 1. Script generates merge candidates (same name + close distance)
-- 2. Candidates stored in this table with similarity scores
-- 3. Captain reviews in UI, approves/rejects
-- 4. Approved merges executed via API (combines sources into one canonical POI)

-- -----------------------------------------------------------------------------
-- 1) Merge candidates table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poi_merge_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- The two POIs that might be duplicates
  poi_a_id UUID NOT NULL REFERENCES experience_entities(id) ON DELETE CASCADE,
  poi_b_id UUID NOT NULL REFERENCES experience_entities(id) ON DELETE CASCADE,
  
  -- Which sources are we merging?
  source_a TEXT NOT NULL,
  source_b TEXT NOT NULL,
  
  -- Match quality scores
  name_similarity FLOAT NOT NULL CHECK (name_similarity >= 0 AND name_similarity <= 1),
  distance_meters FLOAT NOT NULL,
  overall_confidence FLOAT NOT NULL CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  
  -- Metadata
  destination_id UUID REFERENCES destinations_geo(id) ON DELETE CASCADE,
  match_reason TEXT, -- "exact_name_close_distance", "similar_name_same_address", etc.
  
  -- Review status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Merge result (if merged)
  merged_into UUID REFERENCES experience_entities(id) ON DELETE SET NULL,
  merged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (poi_a_id, poi_b_id)
);

CREATE INDEX IF NOT EXISTS idx_poi_merge_candidates_poi_a ON poi_merge_candidates(poi_a_id);
CREATE INDEX IF NOT EXISTS idx_poi_merge_candidates_poi_b ON poi_merge_candidates(poi_b_id);
CREATE INDEX IF NOT EXISTS idx_poi_merge_candidates_status ON poi_merge_candidates(status);
CREATE INDEX IF NOT EXISTS idx_poi_merge_candidates_destination ON poi_merge_candidates(destination_id);
CREATE INDEX IF NOT EXISTS idx_poi_merge_candidates_confidence ON poi_merge_candidates(overall_confidence DESC);

COMMENT ON TABLE poi_merge_candidates IS 'Merge candidates for POI deduplication (Captain reviews before merging)';
COMMENT ON COLUMN poi_merge_candidates.name_similarity IS 'Token Jaccard similarity (0-1); 1.0 = identical names';
COMMENT ON COLUMN poi_merge_candidates.distance_meters IS 'Distance between POIs in meters; <50m = very likely same place';
COMMENT ON COLUMN poi_merge_candidates.overall_confidence IS 'Merge confidence (0-1); 0.9+ = auto-merge safe, 0.7-0.9 = Captain review, <0.7 = likely false positive';

-- -----------------------------------------------------------------------------
-- 2) Helper function: Find high-confidence merge candidates
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_high_confidence_merges(
  p_min_confidence FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 100
) RETURNS TABLE (
  id UUID,
  poi_a_name TEXT,
  poi_b_name TEXT,
  source_a TEXT,
  source_b TEXT,
  distance_meters FLOAT,
  name_similarity FLOAT,
  overall_confidence FLOAT,
  destination TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    ea.name AS poi_a_name,
    eb.name AS poi_b_name,
    mc.source_a,
    mc.source_b,
    mc.distance_meters,
    mc.name_similarity,
    mc.overall_confidence,
    d.name AS destination
  FROM poi_merge_candidates mc
  JOIN experience_entities ea ON ea.id = mc.poi_a_id
  JOIN experience_entities eb ON eb.id = mc.poi_b_id
  LEFT JOIN destinations_geo d ON d.id = mc.destination_id
  WHERE
    mc.status = 'pending'
    AND mc.overall_confidence >= p_min_confidence
  ORDER BY mc.overall_confidence DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_high_confidence_merges IS 'Returns high-confidence merge candidates for Captain review (confidence >= threshold)';

-- -----------------------------------------------------------------------------
-- 3) View: Pending merges for Captain review
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW pending_merges AS
SELECT
  mc.id,
  ea.name AS poi_a_name,
  ea.lat AS poi_a_lat,
  ea.lon AS poi_a_lon,
  mc.source_a,
  eb.name AS poi_b_name,
  eb.lat AS poi_b_lat,
  eb.lon AS poi_b_lon,
  mc.source_b,
  mc.distance_meters,
  mc.name_similarity,
  mc.overall_confidence,
  d.name AS destination,
  mc.match_reason,
  mc.created_at
FROM poi_merge_candidates mc
JOIN experience_entities ea ON ea.id = mc.poi_a_id
JOIN experience_entities eb ON eb.id = mc.poi_b_id
LEFT JOIN destinations_geo d ON d.id = mc.destination_id
WHERE mc.status = 'pending'
ORDER BY mc.overall_confidence DESC, mc.created_at ASC;

COMMENT ON VIEW pending_merges IS 'Pending merge candidates for Captain review (ordered by confidence)';
