-- ============================================================================
-- AIlessia Personal Script Space - Client Account & Experience Script Storage
-- ============================================================================
-- This migration creates the account system for ultra-luxury clients,
-- enabling AIlessia to learn from each interaction and build lasting relationships.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CLIENT ACCOUNTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    
    -- Wealth Indicators (discretely tracked)
    estimated_wealth_tier TEXT CHECK (estimated_wealth_tier IN ('HNW', 'UHNW', 'Billionaire')),
    luxury_brand_relationship TEXT CHECK (luxury_brand_relationship IN ('VIP', 'Ambassador', 'General')),
    
    -- AIlessia's Learning (JSON for flexibility)
    personality_archetype TEXT,
    communication_preferences JSONB DEFAULT '{}'::jsonb,
    emotional_profile JSONB DEFAULT '{}'::jsonb,
    buying_patterns JSONB DEFAULT '{}'::jsonb,
    
    -- Engagement Metrics
    total_scripts_created INT DEFAULT 0,
    total_experiences_booked INT DEFAULT 0,
    lifetime_value DECIMAL(12, 2) DEFAULT 0,
    vip_status TEXT DEFAULT 'General',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_accounts_email ON client_accounts(email);
CREATE INDEX IF NOT EXISTS idx_client_accounts_archetype ON client_accounts(personality_archetype);
CREATE INDEX IF NOT EXISTS idx_client_accounts_vip ON client_accounts(vip_status);
CREATE INDEX IF NOT EXISTS idx_client_accounts_last_interaction ON client_accounts(last_interaction);

COMMENT ON TABLE client_accounts IS 'Ultra-luxury client accounts with emotional intelligence profiles';
COMMENT ON COLUMN client_accounts.personality_archetype IS 'Detected personality: The Romantic, The Achiever, etc.';
COMMENT ON COLUMN client_accounts.emotional_profile IS 'Learned emotional patterns, triggers, desires';
COMMENT ON COLUMN client_accounts.buying_patterns IS 'Purchase behavior, preferences, decision patterns';

-- ----------------------------------------------------------------------------
-- 2. EXPERIENCE SCRIPTS (Personal Script Space)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS experience_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    
    -- Script Core Content
    title TEXT NOT NULL,
    cinematic_hook TEXT,
    emotional_arc TEXT,
    story_theme TEXT,
    transformational_promise TEXT,
    
    -- Experience Composition
    signature_experiences JSONB DEFAULT '[]'::jsonb,  -- Array of experience details
    sensory_journey JSONB DEFAULT '{}'::jsonb,
    anticipation_moments JSONB DEFAULT '[]'::jsonb,
    personalized_rituals JSONB DEFAULT '[]'::jsonb,
    
    -- Journey Details
    destination TEXT,
    travel_dates DATERANGE,
    duration_days INT,
    total_investment DECIMAL(12, 2),
    included_elements JSONB DEFAULT '[]'::jsonb,
    
    -- Status Tracking
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'booked', 'completed', 'archived')),
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- AIlessia's Intelligence
    client_archetype TEXT,
    primary_emotions_addressed JSONB DEFAULT '[]'::jsonb,
    hidden_desires_fulfilled JSONB DEFAULT '[]'::jsonb,
    ailessia_insights JSONB DEFAULT '{}'::jsonb,  -- What AIlessia learned about client
    refinement_suggestions JSONB DEFAULT '[]'::jsonb,
    
    -- Full Content
    full_narrative TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_experience_scripts_client ON experience_scripts(client_id);
CREATE INDEX IF NOT EXISTS idx_experience_scripts_status ON experience_scripts(status);
CREATE INDEX IF NOT EXISTS idx_experience_scripts_destination ON experience_scripts(destination);
CREATE INDEX IF NOT EXISTS idx_experience_scripts_created ON experience_scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experience_scripts_dates ON experience_scripts USING GIST (travel_dates);

COMMENT ON TABLE experience_scripts IS 'Story-driven Experience Scripts composed by AIlessia';
COMMENT ON COLUMN experience_scripts.signature_experiences IS 'Array of curated experiences with emotional details';
COMMENT ON COLUMN experience_scripts.ailessia_insights IS 'What AIlessia learned about this client from composing this script';

-- ----------------------------------------------------------------------------
-- 3. CONVERSATION SESSIONS (tied to scripts)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    script_id UUID REFERENCES experience_scripts(id) ON DELETE SET NULL,
    
    -- AIlessia's Observations
    detected_emotions JSONB DEFAULT '[]'::jsonb,  -- Emotions detected throughout conversation
    personality_insights JSONB DEFAULT '{}'::jsonb,
    desires_anticipated JSONB DEFAULT '[]'::jsonb,
    tone_used TEXT,  -- Primary tone used (therapeutic, sophisticated_friend, etc.)
    tone_changes JSONB DEFAULT '[]'::jsonb,  -- Track tone adaptations during conversation
    
    -- Conversation Data
    messages JSONB DEFAULT '[]'::jsonb,  -- Full conversation history
    key_moments JSONB DEFAULT '[]'::jsonb,  -- Breakthrough moments in conversation
    conversation_stage TEXT DEFAULT 'opening',  -- opening, discovery, recommendation, refinement, closing
    
    -- Session Metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INT,
    
    -- Quality Metrics
    client_satisfaction_score DECIMAL(3, 2),  -- 0-1 if provided
    emotional_resonance_score DECIMAL(3, 2),  -- AIlessia's assessment of connection quality
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_client ON conversation_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_script ON conversation_sessions(script_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_started ON conversation_sessions(started_at DESC);

COMMENT ON TABLE conversation_sessions IS 'AIlessia conversation sessions with emotional intelligence tracking';
COMMENT ON COLUMN conversation_sessions.key_moments IS 'Breakthrough moments where deep understanding occurred';

-- ----------------------------------------------------------------------------
-- 4. SCRIPT UPSELLS (AIlessia's Intelligence for Enhancements)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS script_upsells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID REFERENCES experience_scripts(id) ON DELETE CASCADE,
    
    -- Upsell Details
    experience_id TEXT,  -- Neo4j experience ID
    experience_name TEXT,
    upsell_type TEXT CHECK (upsell_type IN ('complementary', 'upgrade', 'enhancement', 'extension')),
    emotional_rationale TEXT,  -- Why this enhances the emotional journey
    
    -- Positioning
    suggested_position TEXT,  -- Where in journey (beginning, middle, end, extension)
    confidence_score DECIMAL(3, 2),  -- AIlessia's confidence this will resonate
    
    -- Performance Tracking
    presented_at TIMESTAMP WITH TIME ZONE,
    client_response TEXT CHECK (client_response IN ('accepted', 'rejected', 'considering', 'not_presented')),
    response_at TIMESTAMP WITH TIME ZONE,
    additional_value DECIMAL(12, 2),
    
    -- Learning
    why_accepted TEXT,  -- If accepted, what resonated
    why_rejected TEXT,  -- If rejected, what didn't work
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_script_upsells_script ON script_upsells(script_id);
CREATE INDEX IF NOT EXISTS idx_script_upsells_type ON script_upsells(upsell_type);
CREATE INDEX IF NOT EXISTS idx_script_upsells_response ON script_upsells(client_response);

COMMENT ON TABLE script_upsells IS 'Intelligent upsell opportunities identified by AIlessia';
COMMENT ON COLUMN script_upsells.emotional_rationale IS 'How this enhances the emotional journey';

-- ----------------------------------------------------------------------------
-- 5. CLIENT FEEDBACK (Learning Loop)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    script_id UUID REFERENCES experience_scripts(id) ON DELETE SET NULL,
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,
    
    -- Feedback Content
    feedback_type TEXT CHECK (feedback_type IN ('script_quality', 'ailessia_interaction', 'experience_outcome', 'general')),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    
    -- Specific Aspects
    emotional_resonance_rating INT CHECK (emotional_resonance_rating >= 1 AND emotional_resonance_rating <= 5),
    personalization_rating INT CHECK (personalization_rating >= 1 AND personalization_rating <= 5),
    value_rating INT CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- AIlessia's Learning
    key_learnings JSONB DEFAULT '[]'::jsonb,  -- What to improve
    patterns_identified JSONB DEFAULT '[]'::jsonb,  -- Patterns for this archetype
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_feedback_client ON client_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_script ON client_feedback(script_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_type ON client_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_client_feedback_rating ON client_feedback(rating);

COMMENT ON TABLE client_feedback IS 'Client feedback for AIlessia learning loop';

-- ----------------------------------------------------------------------------
-- 6. FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to update client's last interaction timestamp
CREATE OR REPLACE FUNCTION update_client_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE client_accounts
    SET last_interaction = NOW()
    WHERE id = NEW.client_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on conversation sessions
DROP TRIGGER IF EXISTS trigger_update_client_interaction ON conversation_sessions;
CREATE TRIGGER trigger_update_client_interaction
    AFTER INSERT ON conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_client_last_interaction();

-- Function to update script count when finalized
CREATE OR REPLACE FUNCTION update_client_script_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'finalized' AND (OLD.status IS NULL OR OLD.status != 'finalized') THEN
        UPDATE client_accounts
        SET total_scripts_created = total_scripts_created + 1
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on experience scripts
DROP TRIGGER IF EXISTS trigger_update_script_count ON experience_scripts;
CREATE TRIGGER trigger_update_script_count
    AFTER INSERT OR UPDATE ON experience_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_client_script_count();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on experience scripts
DROP TRIGGER IF EXISTS trigger_update_experience_scripts_updated_at ON experience_scripts;
CREATE TRIGGER trigger_update_experience_scripts_updated_at
    BEFORE UPDATE ON experience_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. VIEWS FOR COMMON QUERIES
-- ----------------------------------------------------------------------------

-- View: Client dashboard summary
CREATE OR REPLACE VIEW client_dashboard_summary AS
SELECT 
    ca.id,
    ca.email,
    ca.name,
    ca.personality_archetype,
    ca.vip_status,
    ca.total_scripts_created,
    ca.total_experiences_booked,
    ca.lifetime_value,
    COUNT(DISTINCT es.id) as scripts_count,
    COUNT(DISTINCT cs.id) as conversations_count,
    MAX(cs.started_at) as last_conversation,
    AVG(cf.rating) as avg_feedback_rating
FROM client_accounts ca
LEFT JOIN experience_scripts es ON ca.id = es.client_id
LEFT JOIN conversation_sessions cs ON ca.id = cs.client_id
LEFT JOIN client_feedback cf ON ca.id = cf.client_id
GROUP BY ca.id, ca.email, ca.name, ca.personality_archetype, ca.vip_status,
         ca.total_scripts_created, ca.total_experiences_booked, ca.lifetime_value;

COMMENT ON VIEW client_dashboard_summary IS 'Summary view of client engagement and activity';

-- View: Script performance analytics
CREATE OR REPLACE VIEW script_performance_analytics AS
SELECT 
    es.id,
    es.title,
    es.client_archetype,
    es.story_theme,
    es.status,
    es.total_investment,
    es.created_at,
    es.finalized_at,
    COUNT(DISTINCT su.id) as upsells_presented,
    COUNT(DISTINCT su.id) FILTER (WHERE su.client_response = 'accepted') as upsells_accepted,
    SUM(su.additional_value) FILTER (WHERE su.client_response = 'accepted') as upsell_revenue,
    AVG(cf.rating) as avg_rating,
    AVG(cf.emotional_resonance_rating) as avg_emotional_resonance
FROM experience_scripts es
LEFT JOIN script_upsells su ON es.id = su.script_id
LEFT JOIN client_feedback cf ON es.id = cf.script_id
GROUP BY es.id, es.title, es.client_archetype, es.story_theme, es.status,
         es.total_investment, es.created_at, es.finalized_at;

COMMENT ON VIEW script_performance_analytics IS 'Analytics on script performance and client satisfaction';

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (Optional - enable when adding auth)
-- ----------------------------------------------------------------------------

-- Enable RLS on tables (commented out for now, enable when Supabase Auth is integrated)
-- ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE experience_scripts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE script_upsells ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;

-- Example policies (create when enabling RLS):
-- CREATE POLICY "Clients can view own data" ON client_accounts
--     FOR SELECT USING (auth.uid() = id);

COMMENT ON SCHEMA public IS 'AIlessia Personal Script Space - Emotional Intelligence for Ultra-Luxury Experiences';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AIlessia Personal Script Space migration completed successfully!';
    RAISE NOTICE 'Created tables: client_accounts, experience_scripts, conversation_sessions, script_upsells, client_feedback';
    RAISE NOTICE 'Created views: client_dashboard_summary, script_performance_analytics';
END $$;

