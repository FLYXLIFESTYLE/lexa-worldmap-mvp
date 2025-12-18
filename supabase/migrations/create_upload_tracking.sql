-- Create upload_tracking table to track all file uploads and extractions
-- Date: December 18, 2025

CREATE TABLE IF NOT EXISTS upload_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- chatgpt, transcript, text, pdf, docx
  file_size BIGINT, -- bytes
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Extraction results
  pois_extracted INTEGER DEFAULT 0,
  relationships_created INTEGER DEFAULT 0,
  wisdom_created INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Extracted entities (for preview)
  extracted_destinations TEXT[], -- Array of destination names
  extracted_activities TEXT[], -- Array of activity names
  extracted_themes TEXT[], -- Array of themes
  
  -- File storage (optional)
  keep_file BOOLEAN DEFAULT FALSE,
  file_path TEXT, -- Path in Supabase Storage if kept
  file_url TEXT, -- Public URL if kept
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  neo4j_node_ids TEXT[], -- IDs of created nodes for tracking
  extraction_summary JSONB -- Detailed extraction results
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_tracking_uploaded_by ON upload_tracking(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_tracking_uploaded_at ON upload_tracking(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_tracking_status ON upload_tracking(processing_status);

-- Enable Row Level Security
ALTER TABLE upload_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own uploads
CREATE POLICY "Users can view own uploads"
  ON upload_tracking
  FOR SELECT
  USING (uploaded_by = auth.uid());

-- Policy: Captains and Admins can view all uploads
CREATE POLICY "Captains and Admins can view all uploads"
  ON upload_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE user_id = auth.uid()
      AND role IN ('captain', 'admin')
    )
  );

-- Policy: Users can insert their own uploads
CREATE POLICY "Users can insert own uploads"
  ON upload_tracking
  FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update own uploads"
  ON upload_tracking
  FOR UPDATE
  USING (uploaded_by = auth.uid());

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own uploads"
  ON upload_tracking
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_upload_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column
ALTER TABLE upload_tracking ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger
DROP TRIGGER IF EXISTS upload_tracking_updated_at ON upload_tracking;
CREATE TRIGGER upload_tracking_updated_at
  BEFORE UPDATE ON upload_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_tracking_updated_at();

-- Create storage bucket for uploaded files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-uploads', 'knowledge-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-uploads');

CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Captains can view all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-uploads' AND
  EXISTS (
    SELECT 1 FROM captain_profiles
    WHERE user_id = auth.uid()
    AND role IN ('captain', 'admin')
  )
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

COMMENT ON TABLE upload_tracking IS 'Tracks all file uploads and their extraction results';

