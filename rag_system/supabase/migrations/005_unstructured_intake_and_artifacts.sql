-- ============================================================================
-- Unstructured Intake + Conversation Artifacts (MVP)
-- ============================================================================
-- Goal:
-- - Store raw unstructured text (menus, transcripts, itineraries, notes)
-- - Store derived artifacts (context extractions, rag_payloads, scripts) per session
--
-- This is intentionally minimal and flexible (JSONB).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Unstructured Documents
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS unstructured_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES client_accounts(id) ON DELETE SET NULL,
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,

    source_type TEXT NOT NULL DEFAULT 'text' CHECK (source_type IN (
      'text',
      'zoom_transcript',
      'menu',
      'itinerary',
      'email',
      'note',
      'other'
    )),
    source_name TEXT,
    title TEXT,
    raw_text TEXT NOT NULL,

    -- Optional lightweight extraction snapshot (so we can evolve without schema changes)
    extracted JSONB DEFAULT '{}'::jsonb,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unstructured_documents_client ON unstructured_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_unstructured_documents_session ON unstructured_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_unstructured_documents_source_type ON unstructured_documents(source_type);

COMMENT ON TABLE unstructured_documents IS 'Raw unstructured inputs (transcripts, menus, notes) plus optional lightweight extraction JSON';

-- ----------------------------------------------------------------------------
-- 2) Conversation Artifacts (session-level JSON payloads)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversation_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,

    artifact_type TEXT NOT NULL CHECK (artifact_type IN (
      'context_extraction',
      'rag_payload',
      'wow_script'
    )),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_artifacts_client ON conversation_artifacts(client_id);
CREATE INDEX IF NOT EXISTS idx_conversation_artifacts_session ON conversation_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_artifacts_type ON conversation_artifacts(artifact_type);

COMMENT ON TABLE conversation_artifacts IS 'Saved structured artifacts produced during a conversation session (extractions, rag payloads, scripts)';


