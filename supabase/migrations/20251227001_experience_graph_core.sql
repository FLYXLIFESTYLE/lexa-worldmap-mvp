-- ============================================================================
-- Experience-first Canonical Store (Milestone 1)
-- ============================================================================
-- Goal:
-- - Store a compliant, long-term canonical base for POIs + service Providers
-- - Track multiple open sources (Foursquare OS, Overture, OSM, Wikidata, etc.)
-- - Track conflation/matching evidence (why we believe records are the same)
-- - Store proprietary experience artifacts (packs/cards/playbooks/scripts)
-- - Store all "fit" scores as 0.0 -> 1.0
--
-- Notes:
-- - This schema is intentionally simple and idempotent (safe to run multiple times)
-- - RLS is not enabled here (this project uses Clerk + server-side service role)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable updated_at trigger function (already exists in 001_lexa_schema.sql, but safe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1) destinations_geo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destinations_geo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'city' CHECK (kind IN ('city', 'region', 'country', 'route', 'other')),

  -- GeoJSON-ish storage (keeps it simple; no PostGIS dependency)
  bbox JSONB,       -- { "minLon":..., "minLat":..., "maxLon":..., "maxLat":... }
  polygon JSONB,    -- GeoJSON polygon or multipolygon
  centroid_lat DOUBLE PRECISION,
  centroid_lon DOUBLE PRECISION,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destinations_geo_name ON destinations_geo(name);
CREATE INDEX IF NOT EXISTS idx_destinations_geo_kind ON destinations_geo(kind);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_destinations_geo_updated_at'
  ) THEN
    CREATE TRIGGER trg_destinations_geo_updated_at
      BEFORE UPDATE ON destinations_geo
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2) experience_entities (POI + Provider)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('poi', 'provider')),

  name TEXT NOT NULL,
  normalized_name TEXT,

  destination_id UUID REFERENCES destinations_geo(id) ON DELETE SET NULL,

  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,

  address TEXT,
  locality TEXT,
  region TEXT,
  country TEXT,
  postal_code TEXT,

  website TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,

  categories JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  source_hints JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Canonical scoring fields (ALL 0..1)
  luxury_score_base DOUBLE PRECISION CHECK (luxury_score_base IS NULL OR (luxury_score_base >= 0 AND luxury_score_base <= 1)),
  luxury_score_verified DOUBLE PRECISION CHECK (luxury_score_verified IS NULL OR (luxury_score_verified >= 0 AND luxury_score_verified <= 1)),
  confidence_score DOUBLE PRECISION CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  score_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Risk flags and operational notes (tourist_trap, privacy_risk, noise_risk, etc.)
  risk_flags JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_entities_kind ON experience_entities(kind);
CREATE INDEX IF NOT EXISTS idx_experience_entities_destination ON experience_entities(destination_id);
CREATE INDEX IF NOT EXISTS idx_experience_entities_country ON experience_entities(country);
CREATE INDEX IF NOT EXISTS idx_experience_entities_scores ON experience_entities(luxury_score_base DESC, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_experience_entities_tags ON experience_entities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_experience_entities_categories ON experience_entities USING GIN(categories);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_experience_entities_updated_at'
  ) THEN
    CREATE TRIGGER trg_experience_entities_updated_at
      BEFORE UPDATE ON experience_entities
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) experience_entity_sources (source-of-truth + raw payload audit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_entity_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  source TEXT NOT NULL CHECK (source IN (
    'foursquare_os',
    'overture',
    'osm',
    'wikidata',
    'wikipedia',
    'manual',
    'other'
  )),
  source_id TEXT NOT NULL,

  entity_id UUID REFERENCES experience_entities(id) ON DELETE SET NULL,

  -- Normalized snapshot (optional) + full raw payload (auditing)
  normalized JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,

  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_experience_entity_sources_source ON experience_entity_sources(source, source_id);
CREATE INDEX IF NOT EXISTS idx_experience_entity_sources_entity ON experience_entity_sources(entity_id);
CREATE INDEX IF NOT EXISTS idx_experience_entity_sources_source ON experience_entity_sources(source);

-- ----------------------------------------------------------------------------
-- 4) experience_conflation_links (why we matched a source record to a canonical entity)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_conflation_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  entity_id UUID NOT NULL REFERENCES experience_entities(id) ON DELETE CASCADE,

  match_confidence DOUBLE PRECISION NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_experience_conflation_links_entity ON experience_conflation_links(entity_id);

-- ----------------------------------------------------------------------------
-- 5) experience_artifacts (proprietary RAG surface)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  artifact_type TEXT NOT NULL CHECK (artifact_type IN (
    'destination_pack',
    'poi_experience_card',
    'provider_playbook',
    'moment_template',
    'script_template',
    'note'
  )),

  destination_id UUID REFERENCES destinations_geo(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES experience_entities(id) ON DELETE SET NULL,

  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Optional confidence about this artifact’s correctness (0..1)
  confidence_score DOUBLE PRECISION CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),

  source_type TEXT NOT NULL DEFAULT 'generated' CHECK (source_type IN ('generated', 'curated', 'import', 'user_feedback')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_artifacts_type ON experience_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_experience_artifacts_destination ON experience_artifacts(destination_id);
CREATE INDEX IF NOT EXISTS idx_experience_artifacts_entity ON experience_artifacts(entity_id);
CREATE INDEX IF NOT EXISTS idx_experience_artifacts_metadata ON experience_artifacts USING GIN(metadata);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_experience_artifacts_updated_at'
  ) THEN
    CREATE TRIGGER trg_experience_artifacts_updated_at
      BEFORE UPDATE ON experience_artifacts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6) experience_ingestion_jobs (pipeline orchestration + auditing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  job_type TEXT NOT NULL CHECK (job_type IN (
    'import_foursquare_os',
    'import_overture',
    'import_osm',
    'import_wikidata',
    'conflation',
    'scoring',
    'artifact_generation',
    'neo4j_projection'
  )),

  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),

  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_ingestion_jobs_type ON experience_ingestion_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_experience_ingestion_jobs_status ON experience_ingestion_jobs(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_experience_ingestion_jobs_updated_at'
  ) THEN
    CREATE TRIGGER trg_experience_ingestion_jobs_updated_at
      BEFORE UPDATE ON experience_ingestion_jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


