-- Company Brain Insights Table
-- Stores extracted insights from historical ChatGPT conversations
-- Documents are NOT stored - only the extracted intelligence

CREATE TABLE IF NOT EXISTS company_brain_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  category TEXT NOT NULL,  -- company_brain, product_vision, experience_design, etc.
  knowledge_category TEXT,  -- product_vision, experience_design, technical_architecture, business_strategy
  
  -- Extracted Content
  summary TEXT,  -- What this conversation was about
  script_examples JSONB DEFAULT '[]',  -- Experience script ideas for AIlessia training
  features_worth_discussing JSONB DEFAULT '[]',  -- Ideas to consider implementing
  design_philosophy JSONB DEFAULT '[]',  -- Principles and rationale
  company_dna JSONB DEFAULT '{}',  -- Mission, vision, values
  training_insights JSONB DEFAULT '[]',  -- For AIlessia/AIbert training
  
  -- Metadata
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',  -- source_file, conversation_date, extraction_confidence
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_company_brain_insights_category ON company_brain_insights(category);
CREATE INDEX IF NOT EXISTS idx_company_brain_insights_knowledge_category ON company_brain_insights(knowledge_category);
CREATE INDEX IF NOT EXISTS idx_company_brain_insights_analyzed_at ON company_brain_insights(analyzed_at DESC);

-- Comments
COMMENT ON TABLE company_brain_insights IS 'Extracted insights from 5 years of historical ChatGPT conversations about SYCC and LEXA. Documents not stored - only intelligence extracted.';
COMMENT ON COLUMN company_brain_insights.script_examples IS 'Experience script ideas for training AIlessia Script Composer';
COMMENT ON COLUMN company_brain_insights.features_worth_discussing IS 'Feature ideas from history worth considering for roadmap';
COMMENT ON COLUMN company_brain_insights.training_insights IS 'Patterns and techniques for AIlessia/AIbert to learn';
