-- ============================================================================
-- Community Scripts System
-- Enables users to share scripts to community with moderation
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: community_scripts
-- Published scripts shared to community (anonymized)
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_script_id UUID NOT NULL REFERENCES experience_briefs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anonymized_version JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_notes TEXT,
  view_count INT DEFAULT 0,
  use_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(original_script_id)
);

CREATE INDEX IF NOT EXISTS idx_community_scripts_original_id ON community_scripts(original_script_id);
CREATE INDEX IF NOT EXISTS idx_community_scripts_creator_id ON community_scripts(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_scripts_status ON community_scripts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_community_scripts_featured ON community_scripts(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_community_scripts_published_at ON community_scripts(published_at DESC);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_community_scripts_updated_at
  BEFORE UPDATE ON community_scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: community_script_likes
-- Track which users liked which community scripts
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_script_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_script_id UUID NOT NULL REFERENCES community_scripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_script_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_script_likes_script_id ON community_script_likes(community_script_id);
CREATE INDEX IF NOT EXISTS idx_community_script_likes_user_id ON community_script_likes(user_id);

-- ============================================================================
-- TABLE: community_script_reports
-- User reports for inappropriate content
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_script_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_script_id UUID NOT NULL REFERENCES community_scripts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_script_reports_script_id ON community_script_reports(community_script_id);
CREATE INDEX IF NOT EXISTS idx_community_script_reports_status ON community_script_reports(status);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE community_scripts IS 
'Scripts published to community with anonymization and moderation';

COMMENT ON COLUMN community_scripts.anonymized_version IS 
'Anonymized version of script stored as JSONB:
{
  "title": "A Romantic Coastal Escape",
  "theme": "Romance & Intimacy",
  "duration": "3 days",
  "experience_dna": {
    "story": "Reconnection with partner",
    "emotion": "Intimate connection",
    "trigger": "Ocean breeze and candlelight"
  },
  "highlights": [
    "Private beachfront dining",
    "Couples spa experience",
    "Sunset sailing"
  ],
  "tags": ["romantic", "coastal", "luxury", "weekend"],
  "difficulty_level": "easy",
  "budget_range": "luxury",
  "general_location": "Mediterranean Coast"
}';

COMMENT ON COLUMN community_scripts.moderation_status IS 
'Moderation status:
- pending: Awaiting review
- approved: Visible in community
- rejected: Not suitable for community
- flagged: User reports require review';

COMMENT ON TABLE community_script_likes IS 
'Tracks user likes on community scripts (for popularity ranking)';

COMMENT ON TABLE community_script_reports IS 
'User reports for inappropriate or problematic community scripts';

-- ============================================================================
-- FUNCTION: Increment like count
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_community_script_likes()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment like_count on the community_scripts table
  UPDATE community_scripts
  SET like_count = like_count + 1
  WHERE id = NEW.community_script_id;
  
  -- Also update the original experience_briefs
  UPDATE experience_briefs
  SET like_count = like_count + 1
  WHERE id = (SELECT original_script_id FROM community_scripts WHERE id = NEW.community_script_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_community_script_liked ON community_script_likes;
CREATE TRIGGER on_community_script_liked
  AFTER INSERT ON community_script_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_community_script_likes();

-- ============================================================================
-- FUNCTION: Decrement like count
-- ============================================================================
CREATE OR REPLACE FUNCTION decrement_community_script_likes()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement like_count on the community_scripts table
  UPDATE community_scripts
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.community_script_id;
  
  -- Also update the original experience_briefs
  UPDATE experience_briefs
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = (SELECT original_script_id FROM community_scripts WHERE id = OLD.community_script_id);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_community_script_unliked ON community_script_likes;
CREATE TRIGGER on_community_script_unliked
  AFTER DELETE ON community_script_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_community_script_likes();

-- ============================================================================
-- FUNCTION: Auto-flag scripts with multiple reports
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_flag_reported_scripts()
RETURNS TRIGGER AS $$
DECLARE
  report_count INT;
BEGIN
  -- Count pending reports for this script
  SELECT COUNT(*) INTO report_count
  FROM community_script_reports
  WHERE community_script_id = NEW.community_script_id
    AND status = 'pending';
  
  -- If 3+ reports, auto-flag for review
  IF report_count >= 3 THEN
    UPDATE community_scripts
    SET moderation_status = 'flagged',
        moderation_notes = 'Auto-flagged: ' || report_count || ' user reports'
    WHERE id = NEW.community_script_id
      AND moderation_status = 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_script_reported ON community_script_reports;
CREATE TRIGGER on_script_reported
  AFTER INSERT ON community_script_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_reported_scripts();
