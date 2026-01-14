-- 027_poi_script_contribution_scoring.sql
--
-- Purpose: Add post-enrichment quality scoring (enrich-first architecture)
--
-- Why:
-- - Pre-import keyword filtering is superficial (can't judge value without context)
-- - Better approach: Import → Enrich → Score → Keep/Reject based on enriched scores
-- - Claude evaluates "Can this POI contribute to experience scripts?" with full context
--
-- New fields for post-enrichment evaluation:
-- - script_contribution_score: 0-100 (how useful for RAG/scripts?)
-- - emotion_potential: Array of emotions this POI can evoke
-- - activity_types: Array of activities this POI supports
-- - theme_alignments: Array of themes this POI fits

-- -----------------------------------------------------------------------------
-- 1) Add script contribution scoring fields
-- -----------------------------------------------------------------------------
ALTER TABLE extracted_pois
ADD COLUMN IF NOT EXISTS script_contribution_score INT CHECK (script_contribution_score >= 0 AND script_contribution_score <= 100),
ADD COLUMN IF NOT EXISTS emotion_potential JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS activity_types JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS theme_alignments JSONB DEFAULT '[]';

COMMENT ON COLUMN extracted_pois.script_contribution_score IS 'Claude-evaluated score (0-100): how useful is this POI for experience scripts? Based on semantic richness, emotional resonance, activity potential.';
COMMENT ON COLUMN extracted_pois.emotion_potential IS 'Array of emotions this POI can evoke (e.g., ["peace", "connection", "awe"])';
COMMENT ON COLUMN extracted_pois.activity_types IS 'Array of activities this POI supports (e.g., ["dining", "sailing", "cultural_immersion"])';
COMMENT ON COLUMN extracted_pois.theme_alignments IS 'Array of themes this POI fits (e.g., ["Mediterranean_Indulgence", "Wellness_Retreat"])';

CREATE INDEX IF NOT EXISTS idx_extracted_pois_script_score ON extracted_pois(script_contribution_score) WHERE script_contribution_score IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2) Helper function: Auto-delete low-value POIs (post-enrichment cleanup)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_low_value_pois(
  p_min_script_score INT DEFAULT 40,
  p_min_luxury_score INT DEFAULT 4,
  p_limit INT DEFAULT 1000
) RETURNS TABLE (
  deleted_count INT,
  sample_deleted JSONB
) AS $$
DECLARE
  v_deleted_count INT;
  v_sample JSONB;
BEGIN
  -- Find POIs that were enriched but scored too low for experience scripts
  WITH to_delete AS (
    SELECT id, name, destination, script_contribution_score, luxury_score
    FROM extracted_pois
    WHERE
      enhanced = true
      AND verified = false  -- Don't auto-delete Captain-verified POIs
      AND (
        (script_contribution_score IS NOT NULL AND script_contribution_score < p_min_script_score)
        OR (luxury_score IS NOT NULL AND luxury_score < p_min_luxury_score)
      )
    LIMIT p_limit
  ),
  deleted AS (
    DELETE FROM extracted_pois
    WHERE id IN (SELECT id FROM to_delete)
    RETURNING id, name, destination, script_contribution_score, luxury_score
  )
  SELECT
    COUNT(*)::INT,
    jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'destination', destination,
      'script_score', script_contribution_score,
      'luxury_score', luxury_score
    ))
  INTO v_deleted_count, v_sample
  FROM deleted;
  
  RETURN QUERY SELECT v_deleted_count, COALESCE(v_sample, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_low_value_pois IS 'Auto-deletes POIs that were enriched but scored too low for experience scripts (quality gate)';

-- -----------------------------------------------------------------------------
-- 3) View: Low-value POIs needing cleanup
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW low_value_pois AS
SELECT
  id,
  name,
  destination,
  category,
  script_contribution_score,
  luxury_score,
  confidence_score,
  enhanced,
  verified,
  created_at,
  last_enriched_at
FROM extracted_pois
WHERE
  enhanced = true
  AND verified = false
  AND (
    (script_contribution_score IS NOT NULL AND script_contribution_score < 40)
    OR (luxury_score IS NOT NULL AND luxury_score < 4)
  )
ORDER BY script_contribution_score ASC NULLS FIRST, luxury_score ASC NULLS FIRST;

COMMENT ON VIEW low_value_pois IS 'POIs that were enriched but scored too low for experience scripts (candidates for deletion)';
