-- LEXA user profiles (emotional profile + preferences) for long-term memory
-- Stores durable, user-level information extracted from sessions.

CREATE TABLE IF NOT EXISTS lexa_user_profiles (
  user_id UUID PRIMARY KEY,
  emotional_profile JSONB NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lexa_user_profiles_updated_at ON lexa_user_profiles(updated_at DESC);


