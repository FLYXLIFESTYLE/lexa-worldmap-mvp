-- Create RPC function for vector similarity search
-- This allows efficient semantic search using pgvector

CREATE OR REPLACE FUNCTION search_travel_trends(
    query_embedding VECTOR(384),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    text TEXT,
    date DATE,
    source TEXT,
    regions TEXT[],
    tags TEXT[],
    confidence FLOAT,
    distance FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        travel_trends.id,
        travel_trends.text,
        travel_trends.date,
        travel_trends.source,
        travel_trends.regions,
        travel_trends.tags,
        travel_trends.confidence,
        (travel_trends.embedding <=> query_embedding) AS distance
    FROM travel_trends
    WHERE (travel_trends.embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY distance ASC
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_travel_trends TO authenticated;
GRANT EXECUTE ON FUNCTION search_travel_trends TO service_role;

COMMENT ON FUNCTION search_travel_trends IS 
'Performs vector similarity search on travel trends using cosine distance. 
Returns trends most similar to the query embedding.';

