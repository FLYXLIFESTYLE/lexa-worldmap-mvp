// ============================================================================
// FINAL CLASSIFICATION PASS - Italian Geographic & Cultural Keywords
// ============================================================================
// Classifies remaining "General Luxury Experience" POIs using Italian patterns
// Many have incorrect luxury_score due to "Base type 'null': 10 pts" artifact
// ============================================================================

// ----------------------------------------------------------------------------
// STEP 1: RECLASSIFY MOUNTAINS & HILLS TO HIKING
// ----------------------------------------------------------------------------

// Mountains, hills, peaks (Italian geographic features)
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(monte|colle|montagna|cima|picco|vetta|altura).*'
DELETE old
WITH poi
MATCH (hiking:activity_type {name: 'Hiking'})
MERGE (poi)-[:OFFERS]->(hiking)
MERGE (hiking)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS mountains_to_hiking;

// ----------------------------------------------------------------------------
// STEP 2: RECLASSIFY COASTAL FEATURES TO NATURE & SCENIC VIEWS
// ----------------------------------------------------------------------------

// Capes, points, coastal features
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(punta|capo|promontorio|scoglio|faraglione).*'
DELETE old
WITH poi
MATCH (nature:activity_type {name: 'Nature & Scenic Views'})
MERGE (poi)-[:OFFERS]->(nature)
MERGE (nature)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS coastal_features_to_nature;

// Mountain passes and saddles
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(forcella|passo|valico|sella).*'
DELETE old
WITH poi
MATCH (nature:activity_type {name: 'Nature & Scenic Views'})
MERGE (poi)-[:OFFERS]->(nature)
MERGE (nature)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS mountain_passes_to_nature;

// ----------------------------------------------------------------------------
// STEP 3: RECLASSIFY ANCIENT ROMAN SITES TO MUSEUM VISIT
// ----------------------------------------------------------------------------

// Roman buildings, workshops (Latin names ending in -vm, -vm)
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(vm|officina.*livi|fabbrica|domus|thermae|insulae).*'
   OR poi.name =~ '^[A-Z]{2,}$'  // All-caps Latin abbreviations like MSEXINM
DELETE old
WITH poi
MATCH (museum:activity_type {name: 'Museum visit'})
MERGE (poi)-[:OFFERS]->(museum)
MERGE (museum)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS roman_sites_to_museum;

// Historic workshops and factories
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(fabbrica|officina|bottega|laboratorio).*'
DELETE old
WITH poi
MATCH (museum:activity_type {name: 'Museum visit'})
MERGE (poi)-[:OFFERS]->(museum)
MERGE (museum)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS historic_buildings_to_museum;

// ----------------------------------------------------------------------------
// STEP 4: RECLASSIFY CHURCHES & RELIGIOUS SITES TO MUSEUM VISIT
// ----------------------------------------------------------------------------

// Religious sites with Madonna, Sant, Santa
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(madonna|sant[ao]?\\s|san\\s|chiesa|cappella|convento|monastero|abbazia).*'
DELETE old
WITH poi
MATCH (museum:activity_type {name: 'Museum visit'})
MERGE (poi)-[:OFFERS]->(museum)
MERGE (museum)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS religious_sites_to_museum;

// ----------------------------------------------------------------------------
// STEP 5: RECLASSIFY CAFÉS & SMALL BARS TO NIGHTLIFE
// ----------------------------------------------------------------------------

// Cafés, bars (small venues)
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(café|caffè|cafè|cafe|bar|blues.*caf|old.*caf|bocadillo).*'
DELETE old
WITH poi
MATCH (nightlife:activity_type {name: 'Nightlife'})
MERGE (poi)-[:OFFERS]->(nightlife)
MERGE (nightlife)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS cafes_to_nightlife;

// ----------------------------------------------------------------------------
// STEP 6: DOWNGRADE STREETS & INFRASTRUCTURE TO STANDARD EXPERIENCE
// ----------------------------------------------------------------------------

// Streets (Via, Strada, etc.) - these shouldn't be "luxury" POIs
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i)^via\\s.*'
   OR poi.name =~ '(?i)^strada\\s.*'
   OR poi.name =~ '(?i)^corso\\s.*'
   OR poi.name =~ '(?i)^piazza\\s.*'
DELETE old
WITH poi
// Lower their luxury score since they're just streets
SET poi.luxury_score = 0.3
WITH poi
MATCH (standard:activity_type {name: 'Standard Experience'})
MERGE (poi)-[:OFFERS]->(standard)
MERGE (standard)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS streets_to_standard;

// ----------------------------------------------------------------------------
// STEP 7: RECLASSIFY GENERIC RESTAURANTS/TRATTORIAS
// ----------------------------------------------------------------------------

// Small trattorias, osterias that weren't caught before
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(trattoria|osteria|fratanza|tavola|cucina).*'
DELETE old
WITH poi
MATCH (dining:activity_type {name: 'Fine dining'})
MERGE (poi)-[:OFFERS]->(dining)
MERGE (dining)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS restaurants_to_dining;

// ----------------------------------------------------------------------------
// STEP 8: RECLASSIFY VALLEYS & NATURAL FEATURES
// ----------------------------------------------------------------------------

// Valleys, gorges, natural features
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(valle|vallone|gola|canyon|grotta|spelonca).*'
DELETE old
WITH poi
MATCH (nature:activity_type {name: 'Nature & Scenic Views'})
MERGE (poi)-[:OFFERS]->(nature)
MERGE (nature)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS natural_features_to_nature;

// ----------------------------------------------------------------------------
// STEP 9: RECLASSIFY GENERIC BOUTIQUES/SHOPS WITH "KLEIN"
// ----------------------------------------------------------------------------

// Small shops, boutiques
MATCH (poi:poi)-[old:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
WHERE poi.name =~ '(?i).*(klein|piccolo|bottega|negozio).*'
DELETE old
WITH poi
MATCH (shopping:activity_type {name: 'Shopping'})
MERGE (poi)-[:OFFERS]->(shopping)
MERGE (shopping)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS boutiques_to_shopping;

// ----------------------------------------------------------------------------
// STEP 10: FINAL STATISTICS
// ----------------------------------------------------------------------------

// Count remaining "General Luxury Experience"
MATCH (poi:poi)-[:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
RETURN count(poi) AS remaining_general_luxury;

// Updated activity distribution
MATCH (a:activity_type)<-[:OFFERS]-(poi:poi)
RETURN a.name AS activity,
       count(poi) AS poi_count,
       round(avg(poi.luxury_score) * 100) / 100 AS avg_luxury_score
ORDER BY poi_count DESC
LIMIT 30;

// Check luxury POIs with specific activities
MATCH (poi:poi)
WHERE poi.luxury_score >= 0.5
OPTIONAL MATCH (poi)-[:OFFERS]->(a:activity_type)
WITH a.name AS activity,
     count(poi) AS luxury_poi_count
WHERE activity IS NOT NULL
  AND activity <> 'General Luxury Experience'
  AND activity <> 'Standard Experience'
RETURN activity, luxury_poi_count
ORDER BY luxury_poi_count DESC;

// Verify complete chain for newly classified POIs
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.luxury_score >= 0.5
  AND a.name <> 'General Luxury Experience'
RETURN 
  count(DISTINCT poi) AS specific_luxury_pois_with_complete_chain,
  count(DISTINCT a) AS activities_used,
  count(DISTINCT e) AS emotions_connected,
  count(DISTINCT ca) AS archetypes_connected;

// Sample improved French Riviera POIs
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)
WHERE poi.destination_name = 'French Riviera'
  AND poi.luxury_score >= 0.7
  AND NOT a.name IN ['General Luxury Experience', 'Standard Experience']
MATCH (a)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WITH poi, a,
     collect(DISTINCT e.name)[0..3] AS emotions,
     collect(DISTINCT ca.name)[0..3] AS archetypes
RETURN poi.name,
       a.name AS activity,
       emotions,
       archetypes,
       round(poi.luxury_score * 100) / 100 AS luxury
ORDER BY poi.luxury_score DESC
LIMIT 20;


