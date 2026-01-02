-- Captain Portal Database Schema
-- Migration: 011_captain_portal_tables.sql
-- Description: Creates all tables for Captain Portal functionality

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CAPTAIN UPLOADS TABLE
-- Tracks all file uploads by captains
-- ============================================================================

CREATE TABLE IF NOT EXISTS captain_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_by_email TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'word', 'excel', 'image', 'text', 'paste')),
    file_size BIGINT,
    file_url TEXT,
    keep_file BOOLEAN DEFAULT true,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status TEXT NOT NULL DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed')),
    extracted_text_length INTEGER,
    pois_discovered INTEGER DEFAULT 0,
    relationships_discovered INTEGER DEFAULT 0,
    confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE captain_uploads IS 'Tracks all file uploads by captains with processing status';
COMMENT ON COLUMN captain_uploads.file_type IS 'Type of file: pdf, word, excel, image, text, or paste';
COMMENT ON COLUMN captain_uploads.keep_file IS 'Whether to keep the original file in cloud storage';
COMMENT ON COLUMN captain_uploads.processing_status IS 'Status: processing, completed, or failed';
COMMENT ON COLUMN captain_uploads.pois_discovered IS 'Number of POIs extracted from this upload';

-- ============================================================================
-- EXTRACTED POIS TABLE
-- POIs extracted from uploads (before verification and promotion to main)
-- ============================================================================

CREATE TABLE IF NOT EXISTS extracted_pois (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    scrape_id UUID,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    destination TEXT,
    category TEXT,
    description TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    luxury_score INTEGER CHECK (luxury_score >= 0 AND luxury_score <= 10),
    price_level INTEGER CHECK (price_level >= 0 AND price_level <= 4),
    themes TEXT[] DEFAULT ARRAY[]::TEXT[],
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    luxury_indicators TEXT[] DEFAULT ARRAY[]::TEXT[],
    insider_tips TEXT,
    best_time TEXT,
    booking_info TEXT,
    yacht_accessible BOOLEAN DEFAULT false,
    marina_distance TEXT,
    source_file TEXT,
    verified BOOLEAN DEFAULT false,
    enhanced BOOLEAN DEFAULT false,
    promoted_to_main BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE extracted_pois IS 'POIs extracted from uploads, before verification and promotion to main POI database';
COMMENT ON COLUMN extracted_pois.confidence_score IS 'Data quality confidence (0-100%). Default 80%, captain approval required for >80%';
COMMENT ON COLUMN extracted_pois.luxury_score IS 'Luxury rating 0-10 based on indicators';
COMMENT ON COLUMN extracted_pois.verified IS 'Whether a captain has verified this POI';
COMMENT ON COLUMN extracted_pois.enhanced IS 'Whether a captain has enhanced the description';
COMMENT ON COLUMN extracted_pois.promoted_to_main IS 'Whether this POI has been promoted to the main POIs table and Neo4j';

-- ============================================================================
-- SCRAPED URLS TABLE
-- Tracks all URLs scraped by captains (shared view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraped_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    entered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entered_by_email TEXT NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scraped TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scraping_status TEXT NOT NULL DEFAULT 'processing' CHECK (scraping_status IN ('processing', 'success', 'failed')),
    content_length INTEGER,
    pois_discovered INTEGER DEFAULT 0,
    relationships_discovered INTEGER DEFAULT 0,
    subpages_discovered INTEGER DEFAULT 0,
    subpages JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE scraped_urls IS 'All URLs scraped by captains - shared view for collaboration';
COMMENT ON COLUMN scraped_urls.scraping_status IS 'Status: processing, success, or failed';
COMMENT ON COLUMN scraped_urls.subpages IS 'Array of discovered subpage URLs';

-- ============================================================================
-- KEYWORDS TABLE
-- Keywords for monitoring (Google Alerts style)
-- ============================================================================

CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scanned TIMESTAMP WITH TIME ZONE,
    total_articles_found INTEGER DEFAULT 0
);

COMMENT ON TABLE keywords IS 'Keywords for daily monitoring (Google Alerts style for travel)';
COMMENT ON COLUMN keywords.active IS 'Whether this keyword is actively monitored';
COMMENT ON COLUMN keywords.last_scanned IS 'Last time this keyword was scanned for articles';

-- ============================================================================
-- KEYWORD ARTICLES TABLE
-- Articles discovered from keyword monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT,
    author TEXT,
    published_date TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    content_preview TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'selected', 'scraped', 'deleted')),
    selected_by UUID REFERENCES auth.users(id),
    selected_at TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE,
    pois_extracted INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE keyword_articles IS 'Articles discovered from keyword monitoring';
COMMENT ON COLUMN keyword_articles.status IS 'Status: new (just discovered), selected (queued for scraping), scraped (processed), deleted (not relevant)';

-- ============================================================================
-- SCRAPING QUEUE TABLE
-- Articles selected for scraping
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraping_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES keyword_articles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

COMMENT ON TABLE scraping_queue IS 'Queue of articles selected for scraping';
COMMENT ON COLUMN scraping_queue.priority IS 'Higher priority = processed first';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Captain uploads indexes
CREATE INDEX IF NOT EXISTS idx_captain_uploads_user ON captain_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_captain_uploads_status ON captain_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_captain_uploads_date ON captain_uploads(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_captain_uploads_filetype ON captain_uploads(file_type);

-- Extracted POIs indexes
CREATE INDEX IF NOT EXISTS idx_extracted_pois_upload ON extracted_pois(upload_id);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_scrape ON extracted_pois(scrape_id);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_destination ON extracted_pois(destination);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_category ON extracted_pois(category);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_verified ON extracted_pois(verified);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_enhanced ON extracted_pois(enhanced);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_promoted ON extracted_pois(promoted_to_main);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_confidence ON extracted_pois(confidence_score);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_luxury ON extracted_pois(luxury_score);

-- Scraped URLs indexes
CREATE INDEX IF NOT EXISTS idx_scraped_urls_domain ON scraped_urls(domain);
CREATE INDEX IF NOT EXISTS idx_scraped_urls_status ON scraped_urls(scraping_status);
CREATE INDEX IF NOT EXISTS idx_scraped_urls_date ON scraped_urls(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_urls_entered_by ON scraped_urls(entered_by);

-- Keywords indexes
CREATE INDEX IF NOT EXISTS idx_keywords_active ON keywords(active);
CREATE INDEX IF NOT EXISTS idx_keywords_created_by ON keywords(created_by);

-- Keyword articles indexes
CREATE INDEX IF NOT EXISTS idx_keyword_articles_keyword ON keyword_articles(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_status ON keyword_articles(status);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_date ON keyword_articles(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_published ON keyword_articles(published_date DESC);

-- Scraping queue indexes
CREATE INDEX IF NOT EXISTS idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_priority ON scraping_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_added ON scraping_queue(added_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE captain_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CAPTAIN UPLOADS POLICIES
-- Personal data: Captains see only their own uploads, Admins see all
-- ============================================================================

CREATE POLICY "Captains see own uploads" ON captain_uploads
    FOR SELECT USING (
        uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Captains insert own uploads" ON captain_uploads
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Captains update own uploads" ON captain_uploads
    FOR UPDATE USING (
        uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Captains delete own uploads" ON captain_uploads
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- EXTRACTED POIS POLICIES
-- Personal data: Captains see only their own extractions, Admins see all
-- ============================================================================

CREATE POLICY "Captains see own extracted POIs" ON extracted_pois
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Captains insert POIs" ON extracted_pois
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Captains update own POIs" ON extracted_pois
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Captains delete own POIs" ON extracted_pois
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- SCRAPED URLS POLICIES
-- Shared data: ALL captains see ALL URLs for collaboration
-- ============================================================================

CREATE POLICY "Captains see all scraped URLs" ON scraped_urls
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert URLs" ON scraped_urls
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains update URLs" ON scraped_urls
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains delete URLs" ON scraped_urls
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

-- ============================================================================
-- KEYWORDS POLICIES
-- Shared data: ALL captains manage ALL keywords
-- ============================================================================

CREATE POLICY "Captains manage keywords" ON keywords
    FOR ALL USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

-- ============================================================================
-- KEYWORD ARTICLES POLICIES
-- Shared data: ALL captains see ALL articles
-- ============================================================================

CREATE POLICY "Captains manage articles" ON keyword_articles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

-- ============================================================================
-- SCRAPING QUEUE POLICIES
-- Shared data: ALL captains manage scraping queue
-- ============================================================================

CREATE POLICY "Captains manage scraping queue" ON scraping_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_captain_uploads_updated_at BEFORE UPDATE ON captain_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extracted_pois_updated_at BEFORE UPDATE ON extracted_pois
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKET FOR CAPTAIN UPLOADS
-- ============================================================================

-- Create storage bucket for captain uploads (if not exists)
-- Note: This is done via Supabase dashboard or API, not SQL
-- Bucket name: 'captain-uploads'
-- Public: false (private files)
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, application/vnd.*, text/*, image/*

COMMENT ON TABLE captain_uploads IS 'File uploads from captains stored in Supabase Storage bucket: captain-uploads';
