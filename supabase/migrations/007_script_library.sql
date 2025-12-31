-- ============================================================================
-- Script Library & Community Sharing
-- Extends experience_briefs for library management and community features
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EXTEND: experience_briefs
-- Add fields for script library management and community sharing
-- ============================================================================

ALTER TABLE experience_briefs 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sharing_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS use_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IS NULL OR difficulty_level IN ('easy', 'moderate', 'challenging', 'expert')),
  ADD COLUMN IF NOT EXISTS estimated_budget_range TEXT;

-- Add indexes for library queries
CREATE INDEX IF NOT EXISTS idx_experience_briefs_is_private ON experience_briefs(is_private);
CREATE INDEX IF NOT EXISTS idx_experience_briefs_sharing_enabled ON experience_briefs(sharing_enabled);
CREATE INDEX IF NOT EXISTS idx_experience_briefs_tags ON experience_briefs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_experience_briefs_difficulty ON experience_briefs(difficulty_level);

-- ============================================================================
-- TABLE: user_script_library
-- Personal script library with favorites and notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_script_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  script_id UUID NOT NULL REFERENCES experience_briefs(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  custom_notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, script_id)
);

CREATE INDEX IF NOT EXISTS idx_user_script_library_user_id ON user_script_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_script_library_script_id ON user_script_library(script_id);
CREATE INDEX IF NOT EXISTS idx_user_script_library_favorite ON user_script_library(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_script_library_archived ON user_script_library(user_id, is_archived) WHERE is_archived = false;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_user_script_library_updated_at
  BEFORE UPDATE ON user_script_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON COLUMN experience_briefs.is_private IS 
'If true, script is only visible to creator. If false, can be shared to community';

COMMENT ON COLUMN experience_briefs.is_template IS 
'If true, this script is a template that can be duplicated and customized';

COMMENT ON COLUMN experience_briefs.sharing_enabled IS 
'If true, script has been shared to community (requires is_private = false)';

COMMENT ON COLUMN experience_briefs.view_count IS 
'Number of times this script has been viewed (incremented on view)';

COMMENT ON COLUMN experience_briefs.like_count IS 
'Number of likes/favorites from community';

COMMENT ON COLUMN experience_briefs.use_count IS 
'Number of times this script has been used/duplicated by others';

COMMENT ON COLUMN experience_briefs.tags IS 
'Array of tags for filtering: ["romantic", "weekend", "luxury", "coastal", etc.]';

COMMENT ON COLUMN experience_briefs.difficulty_level IS 
'Planning difficulty: easy (straightforward), moderate (some planning), challenging (complex logistics), expert (extensive coordination)';

COMMENT ON COLUMN experience_briefs.estimated_budget_range IS 
'Budget estimate: budget, moderate, luxury, ultra_luxury, or specific range like "$5000-$10000"';

COMMENT ON TABLE user_script_library IS 
'Personal script library with favorites, notes, and access tracking';

-- ============================================================================
-- FUNCTION: Auto-add script to user library
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_add_to_library()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically add created scripts to user's library
  INSERT INTO user_script_library (user_id, script_id, added_at, last_accessed)
  VALUES (NEW.user_id, NEW.id, NOW(), NOW())
  ON CONFLICT (user_id, script_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add scripts to library when created
DROP TRIGGER IF EXISTS on_experience_brief_created ON experience_briefs;
CREATE TRIGGER on_experience_brief_created
  AFTER INSERT ON experience_briefs
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_to_library();

-- ============================================================================
-- FUNCTION: Update last_accessed on script view
-- ============================================================================
CREATE OR REPLACE FUNCTION update_script_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_accessed timestamp when script is viewed
  UPDATE user_script_library
  SET last_accessed = NOW()
  WHERE user_id = NEW.user_id AND script_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
