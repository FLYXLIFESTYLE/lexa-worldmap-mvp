// ============================================================================
// DESTINATION DATA QUALITY ANALYSIS
// ============================================================================
// Analyzes which destinations have the best data for testing LEXA
// ============================================================================

// ----------------------------------------------------------------------------
// 1. POI COUNT BY DESTINATION
// ----------------------------------------------------------------------------

MATCH (poi:poi)
WHERE poi.destination_name IS NOT NULL
RETURN poi.destination_name AS destination,
       count(poi) AS total_pois,
       sum(CASE WHEN poi.luxury_score >= 0.5 THEN 1 ELSE 0 END) AS luxury_pois,
       sum(CASE WHEN poi.luxury_score >= 0.7 THEN 1 ELSE 0 END) AS high_luxury_pois,
       round(100.0 * sum(CASE WHEN poi.luxury_score >= 0.5 THEN 1 ELSE 0 END) / count(poi)) AS luxury_percentage
ORDER BY luxury_pois DESC
LIMIT 20;

// ----------------------------------------------------------------------------
// 2. ACTIVITY DIVERSITY BY DESTINATION
// ----------------------------------------------------------------------------

MATCH (poi:poi)-[:OFFERS]->(a:activity_type)
WHERE poi.destination_name IS NOT NULL
  AND poi.luxury_score >= 0.5
  AND a.name NOT IN ['Standard Experience', 'General Luxury Experience']
WITH poi.destination_name AS destination,
     count(DISTINCT poi) AS luxury_pois_with_specific_activities,
     count(DISTINCT a) AS unique_activities,
     collect(DISTINCT a.name)[0..10] AS activity_samples
RETURN destination,
       luxury_pois_with_specific_activities,
       unique_activities,
       activity_samples
ORDER BY luxury_pois_with_specific_activities DESC
LIMIT 15;

// ----------------------------------------------------------------------------
// 3. COMPLETE CHAIN COVERAGE BY DESTINATION
// ----------------------------------------------------------------------------

MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.destination_name IS NOT NULL
  AND poi.luxury_score >= 0.5
WITH poi.destination_name AS destination,
     count(DISTINCT poi) AS pois_with_complete_chain,
     count(DISTINCT a) AS activities_used,
     count(DISTINCT e) AS emotions_connected,
     count(DISTINCT ca) AS archetypes_connected
RETURN destination,
       pois_with_complete_chain,
       activities_used,
       emotions_connected,
       archetypes_connected
ORDER BY pois_with_complete_chain DESC
LIMIT 15;

// ----------------------------------------------------------------------------
// 4. GOOGLE ENRICHMENT COVERAGE BY DESTINATION
// ----------------------------------------------------------------------------

MATCH (poi:poi)
WHERE poi.destination_name IS NOT NULL
  AND poi.luxury_score >= 0.5
WITH poi.destination_name AS destination,
     count(poi) AS total_luxury_pois,
     sum(CASE WHEN poi.google_place_id IS NOT NULL THEN 1 ELSE 0 END) AS google_enriched,
     sum(CASE WHEN poi.google_rating IS NOT NULL THEN 1 ELSE 0 END) AS with_ratings,
     sum(CASE WHEN poi.google_reviews_count IS NOT NULL THEN 1 ELSE 0 END) AS with_reviews
RETURN destination,
       total_luxury_pois,
       google_enriched,
       round(100.0 * google_enriched / total_luxury_pois) AS google_coverage_percent,
       with_ratings,
       with_reviews
ORDER BY google_enriched DESC
LIMIT 15;

// ----------------------------------------------------------------------------
// 5. BEST DESTINATION FOR TESTING (Combined Score)
// ----------------------------------------------------------------------------

MATCH (poi:poi)
WHERE poi.destination_name IS NOT NULL
WITH poi.destination_name AS destination,
     count(poi) AS total_pois,
     sum(CASE WHEN poi.luxury_score >= 0.5 THEN 1 ELSE 0 END) AS luxury_pois,
     sum(CASE WHEN poi.google_place_id IS NOT NULL AND poi.luxury_score >= 0.5 THEN 1 ELSE 0 END) AS google_luxury_pois

MATCH (poi:poi)-[:OFFERS]->(a:activity_type)
WHERE poi.destination_name = destination
  AND poi.luxury_score >= 0.5
  AND a.name NOT IN ['Standard Experience', 'General Luxury Experience']
WITH destination, total_pois, luxury_pois, google_luxury_pois,
     count(DISTINCT a) AS activity_diversity

MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.destination_name = destination
  AND poi.luxury_score >= 0.5
WITH destination, total_pois, luxury_pois, google_luxury_pois, activity_diversity,
     count(DISTINCT poi) AS complete_chain_pois

RETURN destination,
       total_pois,
       luxury_pois,
       google_luxury_pois,
       activity_diversity,
       complete_chain_pois,
       // Combined quality score (weighted)
       round(
         (luxury_pois * 0.3) +
         (google_luxury_pois * 0.3) +
         (activity_diversity * 10) +
         (complete_chain_pois * 0.4)
       ) AS quality_score
ORDER BY quality_score DESC
LIMIT 10;

// ----------------------------------------------------------------------------
// 6. SAMPLE HIGH-QUALITY POIs FROM TOP DESTINATION
// ----------------------------------------------------------------------------

// This will show after you identify the best destination
// Replace 'DESTINATION_NAME' with the winner from query 5

MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.destination_name = 'French Riviera'  // Replace with top destination
  AND poi.luxury_score >= 0.7
  AND a.name NOT IN ['Standard Experience', 'General Luxury Experience']
WITH poi, a,
     collect(DISTINCT e.name)[0..3] AS emotions,
     collect(DISTINCT ca.name)[0..3] AS archetypes
RETURN poi.name,
       poi.luxury_score,
       poi.google_rating,
       a.name AS activity,
       emotions,
       archetypes
ORDER BY poi.google_rating DESC, poi.luxury_score DESC
LIMIT 30;


