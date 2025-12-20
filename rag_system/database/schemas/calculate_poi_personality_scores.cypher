// ============================================================================
// POI Personality Score Calculator
// ============================================================================
// Calculates 6-dimensional personality scores for each POI
// Based on existing attributes: luxury_score, name patterns, activity types
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CALCULATE personality_romantic (0.0 - 1.0)
// ----------------------------------------------------------------------------

// High Romance: Keywords + luxury
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(romantic|sunset|intimate|couple|honeymoon|love|romance|candlelight|private dining|yacht|champagne).*'
  AND poi.luxury_score >= 0.7
SET poi.personality_romantic = 0.95
RETURN count(poi) AS high_romantic_pois;

// Medium Romance: Keywords only
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(dinner|restaurant|beach|view|spa|wellness|garden).*'
  AND poi.luxury_score >= 0.6
  AND poi.personality_romantic IS NULL
SET poi.personality_romantic = 0.75
RETURN count(poi) AS medium_romantic_pois;

// Low Romance: Default for others
MATCH (poi:poi)
WHERE poi.personality_romantic IS NULL
SET poi.personality_romantic = COALESCE(poi.luxury_score * 0.5, 0.3)
RETURN count(poi) AS default_romantic_pois;

// ----------------------------------------------------------------------------
// 2. CALCULATE personality_connoisseur (0.0 - 1.0)
// ----------------------------------------------------------------------------

// High Connoisseur: Expertise, craft, michelin
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(michelin|starred|chef|sommelier|wine|artisan|master|craft|heritage|traditional|authentic|provenance).*'
  AND poi.luxury_score >= 0.7
SET poi.personality_connoisseur = 0.98
RETURN count(poi) AS high_connoisseur_pois;

// Medium Connoisseur: Quality focus
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(restaurant|dining|gastro|culinary|tasting|menu|cuisine).*'
  AND poi.luxury_score >= 0.6
  AND poi.personality_connoisseur IS NULL
SET poi.personality_connoisseur = 0.80
RETURN count(poi) AS medium_connoisseur_pois;

// Low Connoisseur: Default
MATCH (poi:poi)
WHERE poi.personality_connoisseur IS NULL
SET poi.personality_connoisseur = COALESCE(poi.luxury_score * 0.6, 0.4)
RETURN count(poi) AS default_connoisseur_pois;

// ----------------------------------------------------------------------------
// 3. CALCULATE personality_hedonist (0.0 - 1.0)
// ----------------------------------------------------------------------------

// High Hedonist: Sensory pleasure
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(spa|massage|wellness|gourmet|indulgence|pleasure|sensory|deluxe|luxury|pamper|champagne|caviar).*'
  AND poi.luxury_score >= 0.7
SET poi.personality_hedonist = 0.95
RETURN count(poi) AS high_hedonist_pois;

// Medium Hedonist: Comfort focus
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(restaurant|hotel|resort|beach|pool|lounge|bar|club).*'
  AND poi.luxury_score >= 0.6
  AND poi.personality_hedonist IS NULL
SET poi.personality_hedonist = 0.75
RETURN count(poi) AS medium_hedonist_pois;

// Low Hedonist: Default
MATCH (poi:poi)
WHERE poi.personality_hedonist IS NULL
SET poi.personality_hedonist = COALESCE(poi.luxury_score * 0.7, 0.5)
RETURN count(poi) AS default_hedonist_pois;

// ----------------------------------------------------------------------------
// 4. CALCULATE personality_contemplative (0.0 - 1.0)
// ----------------------------------------------------------------------------

// High Contemplative: Reflection, meaning
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(meditation|retreat|temple|monastery|museum|gallery|art|cultural|spiritual|tranquil|peaceful|zen|sanctuary).*'
SET poi.personality_contemplative = 0.92
RETURN count(poi) AS high_contemplative_pois;

// Medium Contemplative: Nature, quiet
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(garden|park|nature|forest|mountain|lake|spa|wellness).*'
  AND poi.personality_contemplative IS NULL
SET poi.personality_contemplative = 0.70
RETURN count(poi) AS medium_contemplative_pois;

// Low Contemplative: Default
MATCH (poi:poi)
WHERE poi.personality_contemplative IS NULL
SET poi.personality_contemplative = 0.40
RETURN count(poi) AS default_contemplative_pois;

// ----------------------------------------------------------------------------
// 5. CALCULATE personality_achiever (0.0 - 1.0)
// ----------------------------------------------------------------------------

// High Achiever: Status, prestige, VIP
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(vip|exclusive|prestige|elite|premium|member|club|executive|first class|private|luxury).*'
  AND poi.luxury_score >= 0.8
SET poi.personality_achiever = 0.95
RETURN count(poi) AS high_achiever_pois;

// Medium Achiever: High-end
MATCH (poi:poi)
WHERE poi.luxury_score >= 0.7
  AND poi.personality_achiever IS NULL
SET poi.personality_achiever = 0.80
RETURN count(poi) AS medium_achiever_pois;

// Low Achiever: Default
MATCH (poi:poi)
WHERE poi.personality_achiever IS NULL
SET poi.personality_achiever = COALESCE(poi.luxury_score * 0.8, 0.4)
RETURN count(poi) AS default_achiever_pois;

// ----------------------------------------------------------------------------
// 6. CALCULATE personality_adventurer (0.0 - 1.0)
// ----------------------------------------------------------------------------

// High Adventurer: Action, adventure
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(adventure|extreme|safari|diving|sailing|hiking|climbing|expedition|exploration|wild|outdoor|sport).*'
SET poi.personality_adventurer = 0.93
RETURN count(poi) AS high_adventurer_pois;

// Medium Adventurer: Active
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(beach|water|boat|yacht|activity|tour|excursion).*'
  AND poi.personality_adventurer IS NULL
SET poi.personality_adventurer = 0.65
RETURN count(poi) AS medium_adventurer_pois;

// Low Adventurer: Default
MATCH (poi:poi)
WHERE poi.personality_adventurer IS NULL
SET poi.personality_adventurer = 0.30
RETURN count(poi) AS default_adventurer_pois;

// ----------------------------------------------------------------------------
// 7. VERIFY SCORES
// ----------------------------------------------------------------------------

// Count POIs by dominant personality
MATCH (poi:poi)
WITH poi,
     CASE 
       WHEN poi.personality_romantic >= 0.85 THEN 'Romantic'
       WHEN poi.personality_connoisseur >= 0.85 THEN 'Connoisseur'
       WHEN poi.personality_hedonist >= 0.85 THEN 'Hedonist'
       WHEN poi.personality_contemplative >= 0.85 THEN 'Contemplative'
       WHEN poi.personality_achiever >= 0.85 THEN 'Achiever'
       WHEN poi.personality_adventurer >= 0.85 THEN 'Adventurer'
       ELSE 'Mixed'
     END AS dominant_personality
RETURN dominant_personality, count(poi) AS count
ORDER BY count DESC;

// Show sample scored POIs
MATCH (poi:poi)
WHERE poi.personality_romantic IS NOT NULL
RETURN poi.name, 
       poi.personality_romantic AS romantic,
       poi.personality_connoisseur AS connoisseur,
       poi.personality_hedonist AS hedonist,
       poi.personality_contemplative AS contemplative,
       poi.personality_achiever AS achiever,
       poi.personality_adventurer AS adventurer,
       poi.luxury_score AS luxury
ORDER BY poi.personality_romantic DESC
LIMIT 10;


