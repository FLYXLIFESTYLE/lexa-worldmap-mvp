-- Add screenshot_data column to bug_reports table for storing base64 encoded screenshots
-- Date: December 18, 2025

ALTER TABLE bug_reports 
ADD COLUMN IF NOT EXISTS screenshot_data TEXT;

COMMENT ON COLUMN bug_reports.screenshot_data IS 'Base64 encoded screenshot image (max 5MB)';

