// ============================================================================
// NORMALIZE & COMPLETE POI PERSONALITY SCORES
// ============================================================================
// Your POIs already have personality scores, but:
// 1. Some use 0-10 scale, some use 0-1 scale (inconsistent)
// 2. Some POIs might be missing scores
// This script normalizes everything to 0-1 scale and fills gaps
// ============================================================================

// ----------------------------------------------------------------------------
// STEP 1: NORMALIZE EXISTING SCORES TO 0-1 SCALE
// ----------------------------------------------------------------------------

// Normalize personality_romantic (if > 1, divide by 10)
MATCH (poi:poi)
WHERE poi.personality_romantic IS NOT NULL 
  AND poi.personality_romantic > 1.0
SET poi.personality_romantic = poi.personality_romantic / 10.0
RETURN count(poi) AS normalized_romantic;

// Normalize personality_connoisseur
MATCH (poi:poi)
WHERE poi.personality_connoisseur IS NOT NULL 
  AND poi.personality_connoisseur > 1.0
SET poi.personality_connoisseur = poi.personality_connoisseur / 10.0
RETURN count(poi) AS normalized_connoisseur;

// Normalize personality_hedonist
MATCH (poi:poi)
WHERE poi.personality_hedonist IS NOT NULL 
  AND poi.personality_hedonist > 1.0
SET poi.personality_hedonist = poi.personality_hedonist / 10.0
RETURN count(poi) AS normalized_hedonist;

// Normalize personality_contemplative
MATCH (poi:poi)
WHERE poi.personality_contemplative IS NOT NULL 
  AND poi.personality_contemplative > 1.0
SET poi.personality_contemplative = poi.personality_contemplative / 10.0
RETURN count(poi) AS normalized_contemplative;

// Normalize personality_achiever
MATCH (poi:poi)
WHERE poi.personality_achiever IS NOT NULL 
  AND poi.personality_achiever > 1.0
SET poi.personality_achiever = poi.personality_achiever / 10.0
RETURN count(poi) AS normalized_achiever;

// Normalize personality_adventurer
MATCH (poi:poi)
WHERE poi.personality_adventurer IS NOT NULL 
  AND poi.personality_adventurer > 1.0
SET poi.personality_adventurer = poi.personality_adventurer / 10.0
RETURN count(poi) AS normalized_adventurer;

// Normalize luxury_score
MATCH (poi:poi)
WHERE poi.luxury_score IS NOT NULL 
  AND poi.luxury_score > 1.0
SET poi.luxury_score = poi.luxury_score / 10.0
RETURN count(poi) AS normalized_luxury_score;

// ----------------------------------------------------------------------------
// STEP 2: FILL MISSING PERSONALITY SCORES
// ----------------------------------------------------------------------------

// Fill missing personality_romantic based on name keywords + luxury
MATCH (poi:poi)
WHERE poi.personality_romantic IS NULL
SET poi.personality_romantic = 
  CASE 
    WHEN poi.name =~ '(?i).*(romantic|sunset|intimate|couple|honeymoon|love|candlelight|private dining|yacht|champagne).*' 
         AND poi.luxury_score >= 0.7 THEN 0.95
    WHEN poi.name =~ '(?i).*(dinner|restaurant|beach|view|spa|wellness|garden).*' 
         AND poi.luxury_score >= 0.6 THEN 0.75
    ELSE COALESCE(poi.luxury_score * 0.5, 0.3)
  END
RETURN count(poi) AS filled_romantic;

// Fill missing personality_connoisseur
MATCH (poi:poi)
WHERE poi.personality_connoisseur IS NULL
SET poi.personality_connoisseur = 
  CASE 
    WHEN poi.name =~ '(?i).*(michelin|starred|chef|sommelier|wine|artisan|master|craft|heritage|traditional|authentic).*' 
         AND poi.luxury_score >= 0.7 THEN 0.98
    WHEN poi.name =~ '(?i).*(restaurant|dining|gastro|culinary|tasting|menu|cuisine).*' 
         AND poi.luxury_score >= 0.6 THEN 0.80
    ELSE COALESCE(poi.luxury_score * 0.6, 0.4)
  END
RETURN count(poi) AS filled_connoisseur;

// Fill missing personality_hedonist
MATCH (poi:poi)
WHERE poi.personality_hedonist IS NULL
SET poi.personality_hedonist = 
  CASE 
    WHEN poi.name =~ '(?i).*(spa|massage|wellness|gourmet|indulgence|pleasure|sensory|deluxe|luxury|pamper|champagne|caviar).*' 
         AND poi.luxury_score >= 0.7 THEN 0.95
    WHEN poi.name =~ '(?i).*(restaurant|hotel|resort|beach|pool|lounge|bar|club).*' 
         AND poi.luxury_score >= 0.6 THEN 0.75
    ELSE COALESCE(poi.luxury_score * 0.7, 0.5)
  END
RETURN count(poi) AS filled_hedonist;

// Fill missing personality_contemplative
MATCH (poi:poi)
WHERE poi.personality_contemplative IS NULL
SET poi.personality_contemplative = 
  CASE 
    WHEN poi.name =~ '(?i).*(meditation|retreat|temple|monastery|museum|gallery|art|cultural|spiritual|tranquil|peaceful|zen|sanctuary).*' THEN 0.92
    WHEN poi.name =~ '(?i).*(garden|park|nature|forest|mountain|lake|spa|wellness).*' THEN 0.70
    ELSE 0.40
  END
RETURN count(poi) AS filled_contemplative;

// Fill missing personality_achiever
MATCH (poi:poi)
WHERE poi.personality_achiever IS NULL
SET poi.personality_achiever = 
  CASE 
    WHEN poi.name =~ '(?i).*(vip|exclusive|prestige|elite|premium|member|club|executive|first class|private|luxury).*' 
         AND poi.luxury_score >= 0.8 THEN 0.95
    WHEN poi.luxury_score >= 0.7 THEN 0.80
    ELSE COALESCE(poi.luxury_score * 0.8, 0.4)
  END
RETURN count(poi) AS filled_achiever;

// Fill missing personality_adventurer
MATCH (poi:poi)
WHERE poi.personality_adventurer IS NULL
SET poi.personality_adventurer = 
  CASE 
    WHEN poi.name =~ '(?i).*(adventure|extreme|safari|diving|sailing|hiking|climbing|expedition|exploration|wild|outdoor|sport).*' THEN 0.93
    WHEN poi.name =~ '(?i).*(beach|water|boat|yacht|activity|tour|excursion).*' THEN 0.65
    ELSE 0.30
  END
RETURN count(poi) AS filled_adventurer;

// ----------------------------------------------------------------------------
// STEP 3: VERIFICATION
// ----------------------------------------------------------------------------

// Check score distribution
MATCH (poi:poi)
RETURN 
  count(poi) AS total_pois,
  avg(poi.personality_romantic) AS avg_romantic,
  avg(poi.personality_connoisseur) AS avg_connoisseur,
  avg(poi.personality_hedonist) AS avg_hedonist,
  avg(poi.personality_contemplative) AS avg_contemplative,
  avg(poi.personality_achiever) AS avg_achiever,
  avg(poi.personality_adventurer) AS avg_adventurer,
  avg(poi.luxury_score) AS avg_luxury;

// Check for any remaining nulls
MATCH (poi:poi)
WHERE poi.personality_romantic IS NULL
   OR poi.personality_connoisseur IS NULL
   OR poi.personality_hedonist IS NULL
   OR poi.personality_contemplative IS NULL
   OR poi.personality_achiever IS NULL
   OR poi.personality_adventurer IS NULL
RETURN count(poi) AS pois_with_null_scores;

// Show sample scored POIs
MATCH (poi:poi)
WHERE poi.personality_romantic IS NOT NULL
RETURN poi.name, 
       poi.destination_name,
       round(poi.personality_romantic * 100) / 100 AS romantic,
       round(poi.personality_connoisseur * 100) / 100 AS connoisseur,
       round(poi.personality_hedonist * 100) / 100 AS hedonist,
       round(poi.personality_contemplative * 100) / 100 AS contemplative,
       round(poi.personality_achiever * 100) / 100 AS achiever,
       round(poi.personality_adventurer * 100) / 100 AS adventurer,
       round(poi.luxury_score * 100) / 100 AS luxury
ORDER BY poi.luxury_score DESC
LIMIT 20;


