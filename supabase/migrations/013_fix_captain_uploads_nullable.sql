-- Fix captain_uploads table to allow NULL for uploaded_by until auth is implemented
-- This allows uploads to work without authentication

ALTER TABLE captain_uploads 
  ALTER COLUMN uploaded_by DROP NOT NULL,
  ALTER COLUMN uploaded_by_email DROP NOT NULL;

-- Add columns for extraction counts that were missing
ALTER TABLE captain_uploads 
  ADD COLUMN IF NOT EXISTS pois_extracted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experiences_extracted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trends_extracted INTEGER DEFAULT 0;

COMMENT ON COLUMN captain_uploads.uploaded_by IS 'User ID who uploaded (nullable until auth implemented)';
COMMENT ON COLUMN captain_uploads.uploaded_by_email IS 'Email of user who uploaded (nullable until auth implemented)';
COMMENT ON COLUMN captain_uploads.pois_extracted IS 'Number of POIs extracted from this upload';
COMMENT ON COLUMN captain_uploads.experiences_extracted IS 'Number of experiences extracted from this upload';
COMMENT ON COLUMN captain_uploads.trends_extracted IS 'Number of trends extracted from this upload';
