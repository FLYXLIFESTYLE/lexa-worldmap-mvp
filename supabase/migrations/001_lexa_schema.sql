-- LEXA UI Agent Database Schema
-- Creates tables for sessions, messages, preferences, and experience briefs

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: lexa_sessions
-- Stores conversation sessions with state machine data
-- ============================================================================
CREATE TABLE lexa_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'WELCOME',
    state JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX idx_lexa_sessions_user_id ON lexa_sessions(user_id);
CREATE INDEX idx_lexa_sessions_updated_at ON lexa_sessions(updated_at DESC);

-- ============================================================================
-- TABLE: lexa_messages
-- Stores individual messages in conversations
-- ============================================================================
CREATE TABLE lexa_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES lexa_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_lexa_messages_session_id ON lexa_messages(session_id);
CREATE INDEX idx_lexa_messages_user_id ON lexa_messages(user_id);
CREATE INDEX idx_lexa_messages_created_at ON lexa_messages(created_at DESC);

-- ============================================================================
-- TABLE: lexa_preferences
-- Stores user preferences for voice and language settings
-- ============================================================================
CREATE TABLE lexa_preferences (
    user_id TEXT PRIMARY KEY,
    voice_reply_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    language TEXT NOT NULL DEFAULT 'en',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: experience_briefs
-- Stores completed experience briefs for Operations Agent consumption
-- ============================================================================
CREATE TABLE experience_briefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES lexa_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- Core trio (when/where/theme)
    when_at JSONB,
    where_at JSONB,
    theme TEXT,
    
    -- Additional required fields
    budget JSONB,
    duration JSONB,
    emotional_goals JSONB,
    must_haves JSONB DEFAULT '[]',
    best_experiences JSONB DEFAULT '[]',
    worst_experiences JSONB DEFAULT '[]',
    bucket_list JSONB DEFAULT '[]',
    
    -- Metadata
    additional_context JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete', 'in_progress', 'delivered')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Operations Agent queries
CREATE INDEX idx_experience_briefs_user_id ON experience_briefs(user_id);
CREATE INDEX idx_experience_briefs_session_id ON experience_briefs(session_id);
CREATE INDEX idx_experience_briefs_status ON experience_briefs(status);
CREATE INDEX idx_experience_briefs_created_at ON experience_briefs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- NOTE: RLS is DISABLED for Clerk integration
-- Security is handled by Clerk authentication in API routes
-- ============================================================================

-- RLS is NOT enabled because:
-- 1. We use Clerk (not Supabase Auth), so auth.uid() doesn't work
-- 2. user_id is TEXT (Clerk IDs), not UUID (Supabase Auth)
-- 3. API routes verify authentication with Clerk's await auth()
-- 4. All database queries go through authenticated API routes

-- If you need RLS with Clerk, you must:
-- 1. Use Supabase service role key (bypasses RLS) in API routes ✅ Already doing this
-- 2. Or implement custom RLS with Clerk JWT validation (complex)

-- Security layers:
-- ✅ Clerk middleware protects routes
-- ✅ API routes verify userId with await auth()
-- ✅ Database accessed only via authenticated API routes
-- ✅ Service role key used server-side only (never exposed to client)

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_lexa_sessions_updated_at
    BEFORE UPDATE ON lexa_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lexa_preferences_updated_at
    BEFORE UPDATE ON lexa_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_briefs_updated_at
    BEFORE UPDATE ON experience_briefs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (documentation)
-- ============================================================================

COMMENT ON TABLE lexa_sessions IS 'Stores conversation sessions with full state machine data';
COMMENT ON TABLE lexa_messages IS 'Individual messages in conversations';
COMMENT ON TABLE lexa_preferences IS 'User preferences for voice and language settings';
COMMENT ON TABLE experience_briefs IS 'Completed experience briefs for Operations Agent to consume';

COMMENT ON COLUMN experience_briefs.status IS 'Workflow status: draft (collecting) -> complete (ready) -> in_progress (Ops Agent working) -> delivered';

