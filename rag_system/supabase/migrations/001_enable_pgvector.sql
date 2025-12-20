-- Enable pgvector extension for vector similarity search
-- This allows storing embeddings and doing semantic search in Supabase

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing trend data with vector embeddings
CREATE TABLE IF NOT EXISTS travel_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    embedding VECTOR(384),  -- 384 dimensions for sentence-transformers/all-MiniLM-L6-v2
    
    -- Metadata
    date DATE,
    source TEXT,
    regions TEXT[],
    tags TEXT[],
    confidence FLOAT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS travel_trends_embedding_idx 
ON travel_trends 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS travel_trends_date_idx ON travel_trends(date DESC);
CREATE INDEX IF NOT EXISTS travel_trends_regions_idx ON travel_trends USING GIN(regions);
CREATE INDEX IF NOT EXISTS travel_trends_tags_idx ON travel_trends USING GIN(tags);

-- Add RLS policies (Row Level Security)
ALTER TABLE travel_trends ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow read access to all users" 
ON travel_trends FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for service role" 
ON travel_trends FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_travel_trends_updated_at 
BEFORE UPDATE ON travel_trends 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO travel_trends (text, date, source, regions, tags, confidence) VALUES
(
    'Christmas markets in Bavaria see 30% increase in bookings for Winter 2024. Munich and Nuremberg are the most popular destinations, with average stay duration of 3 days.',
    '2024-12-01',
    'Booking Analytics Q4 2024',
    ARRAY['Munich', 'Bavaria'],
    ARRAY['Winter Activities', 'Christmas Markets'],
    0.89
),
(
    'Wine tourism in Baden-Württemberg peaks in September and October. Stuttgart region vineyards report 45% occupancy increase during harvest season.',
    '2024-09-15',
    'Tourism Board Q3 2024',
    ARRAY['Stuttgart', 'Baden-Württemberg'],
    ARRAY['Wine Tourism', 'Culinary'],
    0.92
),
(
    'Black Forest hiking trails experience highest traffic in July and August. Family-friendly routes are booked 2 months in advance on average.',
    '2024-07-20',
    'Outdoor Activity Report Summer 2024',
    ARRAY['Black Forest', 'Baden-Württemberg'],
    ARRAY['Hiking', 'Outdoor', 'Family Friendly'],
    0.87
),
(
    'Cultural museum visits in Stuttgart increase by 20% during winter months. Indoor activities show strong correlation with rainy weather patterns.',
    '2024-11-10',
    'Culture Tourism Analysis 2024',
    ARRAY['Stuttgart', 'Baden-Württemberg'],
    ARRAY['Culture', 'Museums', 'Indoor Activities'],
    0.85
);

COMMENT ON TABLE travel_trends IS 'Stores market trends and insights with vector embeddings for semantic search';
COMMENT ON COLUMN travel_trends.embedding IS 'Vector embedding (384 dimensions) for semantic similarity search';
COMMENT ON COLUMN travel_trends.text IS 'The full text of the trend/insight';
COMMENT ON COLUMN travel_trends.regions IS 'Array of region names this trend relates to';
COMMENT ON COLUMN travel_trends.tags IS 'Array of tags/categories for this trend';

