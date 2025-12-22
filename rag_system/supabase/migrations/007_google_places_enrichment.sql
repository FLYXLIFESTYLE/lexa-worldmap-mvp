-- ============================================================================
-- Google Places Enrichment (paid phase; manual jobs)
-- ============================================================================
-- Goal:
-- - Track enrichment jobs (quota-capped, admin-triggered)
-- - Store raw API payloads + normalized place fields for auditing
-- - Project to Neo4j separately in the backend
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) places_enrichment_jobs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS places_enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_user_id UUID NOT NULL,

  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running',
    'completed',
    'failed'
  )),

  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_jobs_user ON places_enrichment_jobs(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_places_jobs_status ON places_enrichment_jobs(status);

-- ----------------------------------------------------------------------------
-- 2) google_places_places (normalized + raw)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS google_places_places (
  place_id TEXT PRIMARY KEY,
  display_name TEXT,
  formatted_address TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  types TEXT[] DEFAULT '{}'::text[],
  rating DOUBLE PRECISION,
  user_rating_count INTEGER,
  website_uri TEXT,
  international_phone_number TEXT,
  regular_opening_hours JSONB DEFAULT '{}'::jsonb,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_places_places_types ON google_places_places USING GIN(types);

-- ----------------------------------------------------------------------------
-- 3) places_job_places (job -> place join)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS places_job_places (
  job_id UUID NOT NULL REFERENCES places_enrichment_jobs(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES google_places_places(place_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (job_id, place_id)
);

-- ----------------------------------------------------------------------------
-- 4) RLS
-- ----------------------------------------------------------------------------

ALTER TABLE places_enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_places_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE places_job_places ENABLE ROW LEVEL SECURITY;

-- Only requester can see their jobs (service role bypasses this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'places_enrichment_jobs' AND policyname = 'places_jobs_owner_select'
  ) THEN
    CREATE POLICY places_jobs_owner_select ON places_enrichment_jobs
      FOR SELECT USING (auth.uid() = requested_by_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'places_enrichment_jobs' AND policyname = 'places_jobs_owner_write'
  ) THEN
    CREATE POLICY places_jobs_owner_write ON places_enrichment_jobs
      FOR ALL USING (auth.uid() = requested_by_user_id) WITH CHECK (auth.uid() = requested_by_user_id);
  END IF;
END $$;

-- Places data is admin/internal. For MVP, only authenticated users can read (tighten later).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'google_places_places' AND policyname = 'google_places_authenticated_read'
  ) THEN
    CREATE POLICY google_places_authenticated_read ON google_places_places
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Join table readable if authenticated (MVP)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'places_job_places' AND policyname = 'places_job_places_authenticated_read'
  ) THEN
    CREATE POLICY places_job_places_authenticated_read ON places_job_places
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;


