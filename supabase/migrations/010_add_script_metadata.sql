-- ============================================================================
-- Migration: Add Script Metadata Fields
-- Description: Add theme_category, hook, and description to experience_briefs
-- Created: 2025-12-31
-- ============================================================================

-- Add new fields to experience_briefs for better mobile UX
ALTER TABLE experience_briefs
ADD COLUMN IF NOT EXISTS theme_category TEXT,
ADD COLUMN IF NOT EXISTS hook TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_experience_briefs_theme_category ON experience_briefs(theme_category);

-- Comments for documentation
COMMENT ON COLUMN experience_briefs.theme_category IS 'High-level category of the experience theme (e.g., "Romance", "Adventure", "Wellness")';
COMMENT ON COLUMN experience_briefs.hook IS 'Short, compelling hook that captures the essence of the experience';
COMMENT ON COLUMN experience_briefs.description IS 'Detailed description of what makes this experience special';
