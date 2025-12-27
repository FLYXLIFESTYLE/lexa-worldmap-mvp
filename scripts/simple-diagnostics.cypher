// =============================================================================
// SIMPLE DIAGNOSTIC QUERIES - Run these one at a time
// =============================================================================

// 1. TOTAL POI COUNT (Run this first)
MATCH (p:poi)
RETURN count(p) as total_pois;

// 2. UNNAMED POI COUNT
MATCH (p:poi)
WHERE p.name IS NULL OR p.name = '' OR trim(p.name) = ''
RETURN count(p) as unnamed_pois;

// 3. POIs WITHOUT LUXURY SCORES
MATCH (p:poi)
WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NULL
RETURN count(p) as missing_scores;

// 4. POIs WITH LUXURY SCORES
MATCH (p:poi)
WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NOT NULL
RETURN count(p) as have_scores,
       avg(coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore)) as avg_score;

// 5. SAMPLE UNNAMED POIs (if any exist)
MATCH (p:poi)
WHERE p.name IS NULL OR p.name = '' OR trim(p.name) = ''
RETURN p.poi_uid, p.name, p.type, p.source
LIMIT 10;

// 6. COMBINED SUMMARY (single query that always returns results)
CALL {
  MATCH (p:poi)
  RETURN count(p) as total
}
CALL {
  MATCH (p:poi)
  WHERE p.name IS NULL OR p.name = '' OR trim(p.name) = ''
  RETURN count(p) as unnamed
}
CALL {
  MATCH (p:poi)
  WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NULL
  RETURN count(p) as unscored
}
CALL {
  MATCH (p:poi)
  WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NOT NULL
  RETURN count(p) as scored
}
RETURN 
  total as total_pois,
  unnamed as unnamed_pois,
  unscored as need_scoring,
  scored as already_scored,
  round(100.0 * scored / total, 1) as percent_complete;

