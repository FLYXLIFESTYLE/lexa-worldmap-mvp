-- 021_knowledge_nuggets.sql
-- Store valuable unstructured "nuggets" that are NOT POIs.
-- Examples:
-- - sentence fragments from docs/URLs ("by the French family behind Pernod Ricard...")
-- - event mentions, brand signals, opening announcements, seasonal notes
--
-- These are used for RAG + planning intelligence without polluting `extracted_pois`.

CREATE TABLE IF NOT EXISTS knowledge_nuggets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link back to Captain Portal sources when possible
  upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
  scrape_id UUID REFERENCES scraped_urls(id) ON DELETE SET NULL,

  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What kind of nugget is this?
  nugget_type TEXT NOT NULL DEFAULT 'note' CHECK (nugget_type IN (
    'note',
    'poi_fragment',
    'brand_signal',
    'event',
    'opening_update',
    'pricing_signal',
    'restriction',
    'other'
  )),

  destination TEXT,

  -- The actual unstructured text (keep it short; do not store full articles)
  text TEXT NOT NULL,

  -- Provenance (same model as extracted_pois brain fields)
  source_refs JSONB DEFAULT '[]'::jsonb,
  citations JSONB DEFAULT '[]'::jsonb,

  -- Structured enrichment (optional)
  enrichment JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE knowledge_nuggets IS 'Unstructured knowledge snippets (NOT POIs) with provenance; used for RAG + planning intelligence';

CREATE INDEX IF NOT EXISTS idx_knowledge_nuggets_created_by ON knowledge_nuggets(created_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_nuggets_destination ON knowledge_nuggets(destination);
CREATE INDEX IF NOT EXISTS idx_knowledge_nuggets_type ON knowledge_nuggets(nugget_type);

-- Enable RLS
ALTER TABLE knowledge_nuggets ENABLE ROW LEVEL SECURITY;

-- Captains see their own nuggets; admins see all via captain_profiles role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'knowledge_nuggets' AND policyname = 'knowledge_nuggets_owner_select'
  ) THEN
    CREATE POLICY knowledge_nuggets_owner_select ON knowledge_nuggets
      FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM captain_profiles
          WHERE captain_profiles.user_id = auth.uid()
            AND captain_profiles.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'knowledge_nuggets' AND policyname = 'knowledge_nuggets_owner_write'
  ) THEN
    CREATE POLICY knowledge_nuggets_owner_write ON knowledge_nuggets
      FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM captain_profiles
          WHERE captain_profiles.user_id = auth.uid()
            AND captain_profiles.role = 'admin'
        )
      ) WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM captain_profiles
          WHERE captain_profiles.user_id = auth.uid()
            AND captain_profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- updated_at trigger (reuse existing function if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_knowledge_nuggets_updated_at ON knowledge_nuggets;
    CREATE TRIGGER update_knowledge_nuggets_updated_at BEFORE UPDATE ON knowledge_nuggets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

