-- 026_poi_url_sources_freshness.sql
--
-- Purpose: Track URL sources + freshness for POI enrichment (Brain v2 Task #8)
--
-- Why:
-- - Provenance: show which URL contributed which POI field (investor-grade traceability)
-- - Freshness: track when POI was last enriched and when it should be re-checked
-- - Citations: link POIs to the specific web pages that verified/enriched them
--
-- This supports:
-- - "Show me the source" feature (click POI field → see URL that provided it)
-- - Auto-refresh stale POIs (cron checks if source URLs have new content)
-- - Legal compliance (attributing third-party data to source URLs)

-- -----------------------------------------------------------------------------
-- 1) Add freshness tracking fields to extracted_pois
-- -----------------------------------------------------------------------------
ALTER TABLE extracted_pois
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_refresh_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrichment_count INT DEFAULT 0;

COMMENT ON COLUMN extracted_pois.last_enriched_at IS 'Timestamp when POI was last enriched (via Tavily/Claude or manual Captain edit)';
COMMENT ON COLUMN extracted_pois.next_refresh_at IS 'Timestamp when POI should be re-enriched (e.g., 90 days after last enrichment for freshness)';
COMMENT ON COLUMN extracted_pois.enrichment_count IS 'Number of times this POI has been enriched (helps identify quality vs. stale)';

CREATE INDEX IF NOT EXISTS idx_extracted_pois_next_refresh ON extracted_pois(next_refresh_at) WHERE next_refresh_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2) POI ↔ URL source links (field-level provenance)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poi_url_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poi_id UUID NOT NULL REFERENCES extracted_pois(id) ON DELETE CASCADE,
  
  -- Source URL
  url TEXT NOT NULL,
  url_title TEXT,
  url_domain TEXT,
  
  -- Which POI fields did this URL contribute to?
  contributed_fields JSONB NOT NULL DEFAULT '[]',
  -- Example: ["description", "luxury_score", "best_time", "pricing"]
  
  -- Metadata
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_count INT NOT NULL DEFAULT 1,
  
  -- Content fingerprint (detect if URL content changed)
  content_hash TEXT,
  
  -- Provider metadata (Tavily, manual scrape, etc.)
  provider TEXT,
  provider_metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (poi_id, url)
);

CREATE INDEX IF NOT EXISTS idx_poi_url_sources_poi ON poi_url_sources(poi_id);
CREATE INDEX IF NOT EXISTS idx_poi_url_sources_url ON poi_url_sources(url);
CREATE INDEX IF NOT EXISTS idx_poi_url_sources_domain ON poi_url_sources(url_domain);
CREATE INDEX IF NOT EXISTS idx_poi_url_sources_last_checked ON poi_url_sources(last_checked_at);

COMMENT ON TABLE poi_url_sources IS 'Tracks which URLs enriched which POI fields (provenance + freshness)';
COMMENT ON COLUMN poi_url_sources.contributed_fields IS 'Array of POI field names this URL contributed to (e.g., ["description", "pricing"])';
COMMENT ON COLUMN poi_url_sources.content_hash IS 'Hash of URL content; if it changes, POI may need re-enrichment';
COMMENT ON COLUMN poi_url_sources.provider IS 'Source of URL (tavily, manual_scrape, captain_upload, etc.)';

-- -----------------------------------------------------------------------------
-- 3) Helper function: mark POI as enriched (sets timestamps)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_poi_enriched(
  p_poi_id UUID,
  p_refresh_days INT DEFAULT 90
) RETURNS VOID AS $$
BEGIN
  UPDATE extracted_pois
  SET
    last_enriched_at = NOW(),
    next_refresh_at = NOW() + (p_refresh_days || ' days')::INTERVAL,
    enrichment_count = COALESCE(enrichment_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_poi_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_poi_enriched IS 'Updates POI enrichment timestamps (call after enrichment API succeeds)';

-- -----------------------------------------------------------------------------
-- 4) Helper function: find stale POIs (for refresh cron)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_stale_pois(
  p_limit INT DEFAULT 100
) RETURNS TABLE (
  id UUID,
  name TEXT,
  destination TEXT,
  last_enriched_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  days_since_enrichment INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ep.id,
    ep.name,
    ep.destination,
    ep.last_enriched_at,
    ep.next_refresh_at,
    EXTRACT(DAY FROM (NOW() - ep.last_enriched_at))::INT AS days_since_enrichment
  FROM extracted_pois ep
  WHERE
    ep.next_refresh_at IS NOT NULL
    AND ep.next_refresh_at <= NOW()
    AND ep.verified = true  -- Only refresh verified POIs (quality gate)
  ORDER BY ep.next_refresh_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_stale_pois IS 'Returns POIs that need re-enrichment (next_refresh_at passed)';
