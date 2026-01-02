-- Captain Portal Intelligence Database Schema
-- Migration: 012_intelligence_extraction_tables.sql
-- Description: Stores business intelligence beyond POIs for LEXA script enhancement

-- ============================================================================
-- EXPERIENCE IDEAS TABLE
-- Creative concepts that inspire LEXA scripts
-- ============================================================================

CREATE TABLE IF NOT EXISTS extracted_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    scrape_id UUID REFERENCES scraped_urls(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core experience data
    experience_title TEXT NOT NULL,
    experience_type TEXT, -- romantic getaway, adventure, wellness, etc.
    target_audience TEXT, -- couples, solo, families, groups
    emotional_goal TEXT, -- transformation, connection, discovery
    narrative_arc TEXT, -- story structure
    key_moments TEXT[], -- array of sensory moments
    duration TEXT,
    estimated_budget TEXT,
    unique_elements TEXT,
    inspiration_source TEXT,
    
    -- Metadata
    confidence_score INTEGER DEFAULT 80,
    usage_count INTEGER DEFAULT 0, -- how many times LEXA used this
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_extracted_experiences_type ON extracted_experiences(experience_type);
CREATE INDEX idx_extracted_experiences_audience ON extracted_experiences(target_audience);
CREATE INDEX idx_extracted_experiences_upload ON extracted_experiences(upload_id);
CREATE INDEX idx_extracted_experiences_usage ON extracted_experiences(usage_count DESC);

COMMENT ON TABLE extracted_experiences IS 'Experience ideas that inspire LEXA script creation';
COMMENT ON COLUMN extracted_experiences.usage_count IS 'Tracks how often LEXA references this experience';

-- ============================================================================
-- MARKET TRENDS TABLE
-- Luxury travel patterns and opportunities
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    scrape_id UUID REFERENCES scraped_urls(id) ON DELETE CASCADE,
    discovered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Trend data
    trend_name TEXT NOT NULL,
    trend_category TEXT, -- destinations, activities, demographics, technology
    description TEXT,
    target_demographic TEXT,
    growth_indicator TEXT, -- emerging, growing, mainstream, declining
    geographical_focus TEXT,
    seasonality TEXT,
    price_impact TEXT,
    business_opportunity TEXT, -- how LEXA can capitalize
    
    -- Tracking
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    relevance_score INTEGER DEFAULT 5 CHECK (relevance_score >= 0 AND relevance_score <= 10),
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_trends_category ON market_trends(trend_category);
CREATE INDEX idx_market_trends_growth ON market_trends(growth_indicator);
CREATE INDEX idx_market_trends_verified ON market_trends(verified);
CREATE INDEX idx_market_trends_relevance ON market_trends(relevance_score DESC);

COMMENT ON TABLE market_trends IS 'Luxury travel trends for LEXA market positioning';

-- ============================================================================
-- CLIENT INSIGHTS TABLE
-- Understanding luxury traveler psychology
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    scrape_id UUID REFERENCES scraped_urls(id) ON DELETE CASCADE,
    discovered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Insight data
    insight_category TEXT, -- desires, pain_points, buying_behavior, decision_factors
    client_segment TEXT, -- UHNW, HNW, Millennials, Gen X, etc.
    insight_description TEXT NOT NULL,
    emotional_drivers TEXT,
    decision_criteria TEXT,
    price_sensitivity TEXT,
    booking_timeline TEXT,
    information_sources TEXT[],
    pain_points TEXT,
    unmet_needs TEXT,
    
    -- Application
    applied_to_prompts BOOLEAN DEFAULT false, -- integrated into LEXA's system prompt
    usage_count INTEGER DEFAULT 0,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_insights_category ON client_insights(insight_category);
CREATE INDEX idx_client_insights_segment ON client_insights(client_segment);
CREATE INDEX idx_client_insights_applied ON client_insights(applied_to_prompts);
CREATE INDEX idx_client_insights_usage ON client_insights(usage_count DESC);

COMMENT ON TABLE client_insights IS 'Luxury traveler psychology for improving LEXA recommendations';
COMMENT ON COLUMN client_insights.applied_to_prompts IS 'Whether this insight is integrated into LEXA AI prompts';

-- ============================================================================
-- PRICE INTELLIGENCE TABLE
-- Pricing patterns for budgeting
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    scrape_id UUID REFERENCES scraped_urls(id) ON DELETE CASCADE,
    discovered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Price data
    experience_type TEXT NOT NULL,
    destination TEXT,
    low_price DECIMAL(12, 2),
    high_price DECIMAL(12, 2),
    average_price DECIMAL(12, 2),
    currency TEXT DEFAULT 'USD',
    value_drivers TEXT, -- what justifies premium pricing
    price_sensitivity_factors TEXT,
    competitive_positioning TEXT, -- budget, mid-range, luxury, ultra-luxury
    hidden_costs TEXT,
    
    -- Metadata
    season TEXT, -- peak, off-peak
    year_collected INTEGER,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_price_intelligence_type ON price_intelligence(experience_type);
CREATE INDEX idx_price_intelligence_destination ON price_intelligence(destination);
CREATE INDEX idx_price_intelligence_avg_price ON price_intelligence(average_price);

COMMENT ON TABLE price_intelligence IS 'Pricing patterns to help users budget and position LEXA services';

-- ============================================================================
-- COMPETITOR ANALYSIS TABLE
-- Learn from competitors
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    scrape_id UUID REFERENCES scraped_urls(id) ON DELETE CASCADE,
    discovered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Competitor data
    competitor_name TEXT NOT NULL,
    competitor_type TEXT, -- travel agency, concierge, platform, direct provider
    website TEXT,
    strengths TEXT,
    weaknesses TEXT,
    pricing_model TEXT,
    target_market TEXT,
    differentiation TEXT,
    lessons_for_lexa TEXT,
    
    -- Tracking
    relevance_score INTEGER DEFAULT 5 CHECK (relevance_score >= 0 AND relevance_score <= 10),
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_competitor_analysis_name ON competitor_analysis(competitor_name);
CREATE INDEX idx_competitor_analysis_type ON competitor_analysis(competitor_type);
CREATE INDEX idx_competitor_analysis_relevance ON competitor_analysis(relevance_score DESC);

COMMENT ON TABLE competitor_analysis IS 'Competitive intelligence for LEXA positioning';

-- ============================================================================
-- OPERATIONAL LEARNINGS TABLE
-- Practical knowledge
-- ============================================================================

CREATE TABLE IF NOT EXISTS operational_learnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    scrape_id UUID REFERENCES scraped_urls(id) ON DELETE CASCADE,
    discovered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Learning data
    topic TEXT NOT NULL,
    category TEXT, -- logistics, seasons, regulations, bookings, safety, customs
    destination TEXT,
    learning TEXT NOT NULL,
    actionable TEXT, -- how LEXA can use this
    
    -- Metadata
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    usage_count INTEGER DEFAULT 0,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_operational_learnings_category ON operational_learnings(category);
CREATE INDEX idx_operational_learnings_destination ON operational_learnings(destination);
CREATE INDEX idx_operational_learnings_verified ON operational_learnings(verified);

COMMENT ON TABLE operational_learnings IS 'Practical knowledge for captains and LEXA recommendations';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- All intelligence is shared across captains for collaboration
-- ============================================================================

ALTER TABLE extracted_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_learnings ENABLE ROW LEVEL SECURITY;

-- All captains can view all intelligence (shared knowledge base)
CREATE POLICY "Captains view all experiences" ON extracted_experiences
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert experiences" ON extracted_experiences
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Captains view all trends" ON market_trends
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert trends" ON market_trends
    FOR INSERT WITH CHECK (discovered_by = auth.uid());

CREATE POLICY "Captains view all insights" ON client_insights
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert insights" ON client_insights
    FOR INSERT WITH CHECK (discovered_by = auth.uid());

CREATE POLICY "Captains view all prices" ON price_intelligence
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert prices" ON price_intelligence
    FOR INSERT WITH CHECK (discovered_by = auth.uid());

CREATE POLICY "Captains view all competitors" ON competitor_analysis
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert competitors" ON competitor_analysis
    FOR INSERT WITH CHECK (discovered_by = auth.uid());

CREATE POLICY "Captains view all learnings" ON operational_learnings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert learnings" ON operational_learnings
    FOR INSERT WITH CHECK (discovered_by = auth.uid());
