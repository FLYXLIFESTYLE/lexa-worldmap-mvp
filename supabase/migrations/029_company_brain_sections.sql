-- 029_company_brain_sections.sql
--
-- Purpose: Section-level curation for company brain (5 years of chat history)
--
-- Why:
-- - Historic chats contain valuable insights BUT also outdated content
-- - Need to approve/reject at section level (not whole document)
-- - Some sections are gold (script examples), others are noise (old tech discussions)
--
-- New approach:
-- - Each upload → multiple sections
-- - Each section → individual keep/outdated flag
-- - Only "keep" sections used in retrieval
-- - Admin can review and curate section-by-section

-- -----------------------------------------------------------------------------
-- 1) Company brain uploads (track uploaded documents)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_brain_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  filename TEXT NOT NULL,
  file_size INT,
  document_type TEXT DEFAULT 'historic_chat', -- 'historic_chat', 'script_template', 'client_brief'
  
  extraction_summary TEXT, -- Claude's 1-2 sentence summary
  total_sections INT DEFAULT 0,
  
  metadata JSONB DEFAULT '{}', -- date_range, main_themes, extraction_confidence
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_brain_uploads_user ON company_brain_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_company_brain_uploads_created ON company_brain_uploads(created_at DESC);

COMMENT ON TABLE company_brain_uploads IS 'Tracks uploaded documents for company brain extraction';

-- -----------------------------------------------------------------------------
-- 2) Company brain sections (extracted knowledge, section-by-section)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_brain_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES company_brain_uploads(id) ON DELETE CASCADE,
  
  section_type TEXT NOT NULL CHECK (section_type IN (
    'script_example',
    'client_insight',
    'design_principle',
    'feature_idea',
    'outdated_content',
    'vendor_relationship',
    'pricing_strategy',
    'successful_pattern',
    'conversation_example'
  )),
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  date_context TEXT, -- "2021-2022" or "Q1 2023"
  
  -- Curation status
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN (
    'needs_review',
    'approved',
    'rejected'
  )),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Quality/confidence
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Retrieval control
  include_in_retrieval BOOLEAN DEFAULT false,  -- Only true if status='approved'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_brain_sections_upload ON company_brain_sections(upload_id);
CREATE INDEX IF NOT EXISTS idx_company_brain_sections_type ON company_brain_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_company_brain_sections_status ON company_brain_sections(status);
CREATE INDEX IF NOT EXISTS idx_company_brain_sections_retrieval ON company_brain_sections(include_in_retrieval) WHERE include_in_retrieval = true;
CREATE INDEX IF NOT EXISTS idx_company_brain_sections_tags ON company_brain_sections USING GIN (tags);

COMMENT ON TABLE company_brain_sections IS 'Extracted sections from company brain uploads (section-level curation for retrieval)';
COMMENT ON COLUMN company_brain_sections.include_in_retrieval IS 'Only approved sections (status=approved) are included in Script Engine retrieval';

-- -----------------------------------------------------------------------------
-- 3) View: Sections needing review
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sections_needing_review AS
SELECT
  s.id,
  s.section_type,
  s.title,
  s.content,
  s.tags,
  s.date_context,
  s.confidence,
  u.filename,
  u.created_at AS uploaded_at
FROM company_brain_sections s
JOIN company_brain_uploads u ON u.id = s.upload_id
WHERE s.status = 'needs_review'
ORDER BY s.confidence DESC, s.created_at ASC;

COMMENT ON VIEW sections_needing_review IS 'Sections awaiting admin review (ordered by confidence)';

-- -----------------------------------------------------------------------------
-- 4) View: Approved knowledge (retrieval-ready)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW approved_company_knowledge AS
SELECT
  s.id,
  s.section_type,
  s.title,
  s.content,
  s.tags,
  s.date_context,
  s.confidence,
  u.filename AS source_document,
  s.reviewed_at,
  s.created_at
FROM company_brain_sections s
JOIN company_brain_uploads u ON u.id = s.upload_id
WHERE s.status = 'approved' AND s.include_in_retrieval = true
ORDER BY s.section_type, s.confidence DESC;

COMMENT ON VIEW approved_company_knowledge IS 'Approved sections ready for Script Engine retrieval';

-- -----------------------------------------------------------------------------
-- 5) Helper function: Approve section (sets include_in_retrieval)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_company_brain_section(
  p_section_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE company_brain_sections
  SET
    status = 'approved',
    include_in_retrieval = true,
    reviewed_by = p_user_id,
    reviewed_at = NOW(),
    review_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_section_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_company_brain_section IS 'Approves a section for Script Engine retrieval';

-- -----------------------------------------------------------------------------
-- 6) Helper function: Reject section (excludes from retrieval)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_company_brain_section(
  p_section_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE company_brain_sections
  SET
    status = 'rejected',
    include_in_retrieval = false,
    reviewed_by = p_user_id,
    reviewed_at = NOW(),
    review_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_section_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reject_company_brain_section IS 'Rejects a section (outdated/irrelevant)';
