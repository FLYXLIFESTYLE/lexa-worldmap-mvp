-- ============================================================================
-- Conversation Summaries System
-- Stores AI-generated summaries of conversations for fast access
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: conversation_summaries
-- AI-generated summaries of conversations (session, experience_dna, preferences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES lexa_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('session', 'experience_dna', 'preferences')),
  content TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ai_model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session_id ON conversation_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_type ON conversation_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_generated_at ON conversation_summaries(generated_at DESC);

-- Unique constraint: one summary per type per session
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_summaries_session_type 
  ON conversation_summaries(session_id, summary_type);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE conversation_summaries IS 'AI-generated summaries of conversations for fast loading and user-friendly display';

COMMENT ON COLUMN conversation_summaries.summary_type IS 
'Type of summary:
- session: Full conversation summary (what was discussed)
- experience_dna: Extracted Story + Emotion + Trigger
- preferences: Discovered preferences during conversation';

COMMENT ON COLUMN conversation_summaries.content IS 
'Human-readable summary text for display to user';

COMMENT ON COLUMN conversation_summaries.extracted_data IS 
'Structured data extracted from conversation:

For experience_dna type:
{
  "story": {
    "narrative": "Reconnection after months of distance",
    "celebration": "Anniversary weekend",
    "transformation": "Rediscovering intimacy"
  },
  "emotion": {
    "core": "connection",
    "secondary": ["peace", "luxury"],
    "intensity": 0.9
  },
  "trigger": {
    "scents": ["lavender", "sea_salt"],
    "tastes": ["champagne", "truffle"],
    "sounds": ["ocean_waves"],
    "visuals": ["sunset", "candlelight"],
    "textures": ["soft_linen"]
  }
}

For preferences type:
{
  "destination_hints": ["French Riviera", "Amalfi Coast"],
  "budget_range": "luxury",
  "travel_style": "romantic",
  "companion": "partner",
  "discovered_themes": ["Romance & Intimacy", "Culinary Excellence"],
  "seasonal_preference": "spring"
}';

COMMENT ON COLUMN conversation_summaries.ai_model IS 
'AI model used to generate summary (for tracking quality over time)';

-- ============================================================================
-- FUNCTION: Auto-generate summaries when session completes
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_summary_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if session is moving to COMPLETE stage
  IF NEW.stage = 'COMPLETE' AND OLD.stage != 'COMPLETE' THEN
    -- Insert a placeholder summary that will be populated by backend
    INSERT INTO conversation_summaries (session_id, user_id, summary_type, content, extracted_data)
    VALUES 
      (NEW.id, NEW.user_id, 'session', 'Summary pending generation...', '{}'::jsonb),
      (NEW.id, NEW.user_id, 'experience_dna', 'Experience DNA pending extraction...', '{}'::jsonb)
    ON CONFLICT (session_id, summary_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create summary placeholders when session completes
DROP TRIGGER IF EXISTS on_session_complete ON lexa_sessions;
CREATE TRIGGER on_session_complete
  AFTER UPDATE ON lexa_sessions
  FOR EACH ROW
  WHEN (NEW.stage = 'COMPLETE')
  EXECUTE FUNCTION trigger_summary_generation();
