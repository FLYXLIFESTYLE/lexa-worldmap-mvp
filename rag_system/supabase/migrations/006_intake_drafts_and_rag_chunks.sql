-- ============================================================================
-- Private Intake Drafts + RAG Chunks (store now, embed later)
-- ============================================================================
-- Goal:
-- - Private-by-default ingestion pipeline for files/urls/images
-- - Review/edit/verify before publishing to Neo4j
-- - Store unstructured text chunks in Supabase for later embedding (pgvector)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) intake_uploads (private)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intake_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id UUID NOT NULL,

  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded',
    'screened',
    'extracted',
    'published',
    'failed'
  )),

  keep_raw BOOLEAN NOT NULL DEFAULT FALSE,
  storage_path TEXT,

  source_type TEXT NOT NULL DEFAULT 'other' CHECK (source_type IN (
    'text',
    'document',
    'image',
    'url',
    'other'
  )),
  source_name TEXT,
  title TEXT,
  source_url TEXT,
  raw_text TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  screening JSONB NOT NULL DEFAULT '{}'::jsonb,

  draft_id UUID,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_intake_uploads_user ON intake_uploads(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_intake_uploads_status ON intake_uploads(status);
CREATE INDEX IF NOT EXISTS idx_intake_uploads_source_type ON intake_uploads(source_type);

-- ----------------------------------------------------------------------------
-- 2) intake_drafts (private)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intake_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES intake_uploads(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'extracted' CHECK (status IN (
    'extracted',
    'published'
  )),

  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_edits JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_drafts_upload ON intake_drafts(upload_id);

-- ----------------------------------------------------------------------------
-- 3) rag_chunks (shared after publish)
-- ----------------------------------------------------------------------------
-- We store chunks now; embeddings can be generated later by a job.
-- We choose vector(384) to match MiniLM (default embedding_model in this repo).

CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES intake_uploads(id) ON DELETE SET NULL,

  text TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  embedding vector(384),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_upload ON rag_chunks(upload_id);

-- ----------------------------------------------------------------------------
-- 4) RLS policies
-- ----------------------------------------------------------------------------

ALTER TABLE intake_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

-- Private: uploader can manage their uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'intake_uploads' AND policyname = 'intake_uploads_owner_select'
  ) THEN
    CREATE POLICY intake_uploads_owner_select ON intake_uploads
      FOR SELECT USING (auth.uid() = uploaded_by_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'intake_uploads' AND policyname = 'intake_uploads_owner_write'
  ) THEN
    CREATE POLICY intake_uploads_owner_write ON intake_uploads
      FOR ALL USING (auth.uid() = uploaded_by_user_id) WITH CHECK (auth.uid() = uploaded_by_user_id);
  END IF;
END $$;

-- Private: uploader can access drafts via upload ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'intake_drafts' AND policyname = 'intake_drafts_owner_select'
  ) THEN
    CREATE POLICY intake_drafts_owner_select ON intake_drafts
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM intake_uploads u
          WHERE u.id = intake_drafts.upload_id AND u.uploaded_by_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'intake_drafts' AND policyname = 'intake_drafts_owner_write'
  ) THEN
    CREATE POLICY intake_drafts_owner_write ON intake_drafts
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM intake_uploads u
          WHERE u.id = intake_drafts.upload_id AND u.uploaded_by_user_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM intake_uploads u
          WHERE u.id = intake_drafts.upload_id AND u.uploaded_by_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Shared: anyone authenticated can read chunks from published uploads.
-- Owners can also read their own chunks even before publish.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rag_chunks' AND policyname = 'rag_chunks_published_or_owner_select'
  ) THEN
    CREATE POLICY rag_chunks_published_or_owner_select ON rag_chunks
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM intake_uploads u
          WHERE u.id = rag_chunks.upload_id
            AND (u.status = 'published' OR u.uploaded_by_user_id = auth.uid())
        )
      );
  END IF;
END $$;


