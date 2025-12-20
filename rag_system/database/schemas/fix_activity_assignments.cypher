// ============================================================================
// ENHANCED ACTIVITY DETECTION & RE-ASSIGNMENT
// ============================================================================
// Fixes activity assignments using ALL available POI data:
// - luxury_evidence text analysis
// - google_website URL patterns
// - Multilingual keyword detection (Italian, French, English)
// - Contextual name patterns
// ============================================================================

// ----------------------------------------------------------------------------
// STEP 1: REMOVE OLD "General Luxury Experience" ASSIGNMENTS
// ----------------------------------------------------------------------------

// Remove the generic fallback connections so we can reassign properly
MATCH (poi:poi)-[r:OFFERS]->(a:activity_type {name: 'General Luxury Experience'})
DELETE r
RETURN count(*) AS removed_generic_connections;

MATCH (poi:poi)-[r:OFFERS]->(a:activity_type {name: 'Standard Experience'})
DELETE r
RETURN count(*) AS removed_standard_connections;

// ----------------------------------------------------------------------------
// STEP 2: ENHANCED RESTAURANT/DINING DETECTION
// ----------------------------------------------------------------------------

// Detect restaurants using luxury_evidence
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.luxury_evidence =~ '(?i).*(restaurant|dining|gastro|cuisine|food|chef|michelin).*'
       OR poi.google_website =~ '(?i).*(restaurant|ristorante|trattoria|bistro).*'
       OR poi.name =~ '(?i).*(restaurant|ristorante|trattoria|bistro|taverna|taberna|osteria|pizzeria|café|cafe|bar|brasserie|auberge).*')
MATCH (dining:activity_type)
WHERE dining.name =~ '(?i).*(dining|restaurant).*'
WITH poi, dining
LIMIT 1
MERGE (poi)-[:OFFERS]->(dining)
MERGE (dining)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS restaurants_detected;

// ----------------------------------------------------------------------------
// STEP 3: ENHANCED HOTEL/ACCOMMODATION DETECTION
// ----------------------------------------------------------------------------

// Detect hotels using multiple signals
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(hotel|hôtel|albergo|pensione|resort|lodge|villa|palazzo|château|castle.*hotel).*'
       OR poi.luxury_evidence =~ '(?i).*(hotel|accommodation|stay|resort).*'
       OR poi.google_website =~ '(?i).*(hotel|albergo|resort).*')
MERGE (hotel:activity_type {name: 'Luxury Accommodation'})
ON CREATE SET hotel.description = 'Hotels, resorts, villas, and luxury stays'
MERGE (poi)-[:OFFERS]->(hotel)
MERGE (hotel)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS hotels_detected;

// Connect Luxury Accommodation to emotions and archetypes
MATCH (hotel:activity_type {name: 'Luxury Accommodation'})
MATCH (e:EmotionalTag)
WHERE e.name IN ['Indulgence', 'Serenity', 'Prestige']
MERGE (hotel)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(hotel);

MATCH (hotel:activity_type {name: 'Luxury Accommodation'})
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Hedonist', 'The Achiever', 'The Romantic']
MERGE (hotel)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(hotel);

// ----------------------------------------------------------------------------
// STEP 4: ENHANCED CULTURAL/HISTORICAL SITES DETECTION
// ----------------------------------------------------------------------------

// Detect cultural sites using Italian/Latin patterns
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(museo|museum|musée|galleria|gallery|galerie|chiesa|church|église|cattedrale|cathedral|cathédrale|basilica|basilique|duomo|tempio|temple|villa|palazzo|palace|palais|castello|castle|château|anfiteatro|amphitheatre|teatro|theatre|forum|foro|casa|domus|terme|thermes|baths|scavi|ruins|ruines|excavation|archeologico|archaeological|archéologique|monumento|monument).*'
       OR poi.luxury_evidence =~ '(?i).*(museum|gallery|historic|cultural|heritage|ancient|archaeological|art).*'
       OR poi.google_website =~ '(?i).*(museum|museo|gallery|galleria|heritage|cultura).*')
MATCH (culture:activity_type)
WHERE culture.name =~ '(?i).*(culture|museum|historic).*'
WITH poi, culture
LIMIT 1
MERGE (poi)-[:OFFERS]->(culture)
MERGE (culture)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS cultural_sites_detected;

// ----------------------------------------------------------------------------
// STEP 5: ENHANCED BEACH/WATER ACTIVITIES DETECTION
// ----------------------------------------------------------------------------

// Detect beach/water activities
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(beach|plage|spiaggia|shore|coast|bay|cove|marina|port|porto|harbour|lido|bagno|stabilimento).*'
       OR poi.luxury_evidence =~ '(?i).*(beach|shore|coastal|waterfront|seaside).*'
       OR poi.google_website =~ '(?i).*(plage|beach|spiaggia|mare|sea).*')
MATCH (beach:activity_type)
WHERE beach.name =~ '(?i).*beach.*'
WITH poi, beach
LIMIT 1
MERGE (poi)-[:OFFERS]->(beach)
MERGE (beach)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS beaches_detected;

// ----------------------------------------------------------------------------
// STEP 6: ENHANCED SPA/WELLNESS DETECTION
// ----------------------------------------------------------------------------

// Detect spa/wellness
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(spa|wellness|massage|terme|thermes|thermal|centro benessere|hammam|sauna|thalasso).*'
       OR poi.luxury_evidence =~ '(?i).*(spa|wellness|massage|therapy|relaxation).*'
       OR poi.google_website =~ '(?i).*(spa|wellness|thermes|terme).*')
MATCH (spa:activity_type)
WHERE spa.name =~ '(?i).*(spa|wellness).*'
WITH poi, spa
LIMIT 1
MERGE (poi)-[:OFFERS]->(spa)
MERGE (spa)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS spas_detected;

// ----------------------------------------------------------------------------
// STEP 7: ENHANCED YACHT/SAILING DETECTION
// ----------------------------------------------------------------------------

// Detect yacht/sailing
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(yacht|sailing|voile|vela|charter|boat|bateau|barca|cruise|crociera|croisière|marina|porto turistico).*'
       OR poi.luxury_evidence =~ '(?i).*(yacht|sailing|charter|boat|cruise|maritime).*'
       OR poi.google_website =~ '(?i).*(yacht|charter|sailing|boat|bateau).*')
MATCH (yacht:activity_type)
WHERE yacht.name =~ '(?i).*(yacht|sailing|boat).*'
WITH poi, yacht
LIMIT 1
MERGE (poi)-[:OFFERS]->(yacht)
MERGE (yacht)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS yacht_activities_detected;

// ----------------------------------------------------------------------------
// STEP 8: SHOPPING/BOUTIQUE DETECTION
// ----------------------------------------------------------------------------

// Detect shopping
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(shop|boutique|store|negozio|magasin|market|mercato|marché|galleria.*commerci|mall|centro.*commercial).*'
       OR poi.luxury_evidence =~ '(?i).*(shopping|boutique|retail|luxury.*brand).*'
       OR poi.google_website =~ '(?i).*(shop|boutique|store|negozio).*')
MERGE (shopping:activity_type {name: 'Luxury Shopping'})
ON CREATE SET shopping.description = 'High-end shopping and boutiques'
MERGE (poi)-[:OFFERS]->(shopping)
MERGE (shopping)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS shopping_detected;

// Connect Luxury Shopping to emotions and archetypes
MATCH (shopping:activity_type {name: 'Luxury Shopping'})
MATCH (e:EmotionalTag)
WHERE e.name IN ['Prestige', 'Indulgence']
MERGE (shopping)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(shopping);

MATCH (shopping:activity_type {name: 'Luxury Shopping'})
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Achiever', 'The Hedonist', 'The Connoisseur']
MERGE (shopping)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(shopping);

// ----------------------------------------------------------------------------
// STEP 9: WINE/VINEYARD DETECTION
// ----------------------------------------------------------------------------

// Detect wine-related activities
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(wine|vin|vino|vineyard|vignoble|vigneto|cantina|cellar|cave|winery|domaine|château.*vin|enoteca).*'
       OR poi.luxury_evidence =~ '(?i).*(wine|vineyard|winery|tasting).*'
       OR poi.google_website =~ '(?i).*(wine|vin|vino|vineyard|cantina|winery).*')
MERGE (wine:activity_type {name: 'Wine Tasting & Vineyards'})
ON CREATE SET wine.description = 'Wine tasting, vineyards, and oenology experiences'
MERGE (poi)-[:OFFERS]->(wine)
MERGE (wine)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS wine_activities_detected;

// Connect Wine Tasting to emotions and archetypes
MATCH (wine:activity_type {name: 'Wine Tasting & Vineyards'})
MATCH (e:EmotionalTag)
WHERE e.name IN ['Sophistication', 'Indulgence', 'Discovery']
MERGE (wine)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(wine);

MATCH (wine:activity_type {name: 'Wine Tasting & Vineyards'})
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Connoisseur', 'The Hedonist', 'The Romantic']
MERGE (wine)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(wine);

// ----------------------------------------------------------------------------
// STEP 10: NATURE/SCENIC VIEWS DETECTION
// ----------------------------------------------------------------------------

// Detect nature/scenic locations
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND (poi.name =~ '(?i).*(park|parco|parc|garden|giardino|jardin|belvedere|viewpoint|panorama|vista|scenic|nature|natura|natural|mountain|montagna|montagne|valley|valle|vallée|lake|lago|lac|waterfall|cascata|cascade|grotto|grotta|grotte|cave).*'
       OR poi.luxury_evidence =~ '(?i).*(nature|scenic|view|panoramic|garden|park).*')
MERGE (nature:activity_type {name: 'Nature & Scenic Views'})
ON CREATE SET nature.description = 'Natural beauty, gardens, viewpoints, and scenic locations'
MERGE (poi)-[:OFFERS]->(nature)
MERGE (nature)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS nature_sites_detected;

// Connect Nature to emotions and archetypes
MATCH (nature:activity_type {name: 'Nature & Scenic Views'})
MATCH (e:EmotionalTag)
WHERE e.name IN ['Serenity', 'Discovery', 'Freedom']
MERGE (nature)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(nature);

MATCH (nature:activity_type {name: 'Nature & Scenic Views'})
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Contemplative', 'The Romantic', 'The Adventurer']
MERGE (nature)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(nature);

// ----------------------------------------------------------------------------
// STEP 11: ASSIGN FALLBACK FOR REMAINING POIs
// ----------------------------------------------------------------------------

// For high-luxury POIs without specific category
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
MATCH (default:activity_type {name: 'General Luxury Experience'})
MERGE (poi)-[:OFFERS]->(default)
MERGE (default)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS fallback_luxury_assigned;

// For standard POIs
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
MATCH (standard:activity_type {name: 'Standard Experience'})
MERGE (poi)-[:OFFERS]->(standard)
MERGE (standard)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS fallback_standard_assigned;

// ----------------------------------------------------------------------------
// STEP 12: VERIFICATION & STATISTICS
// ----------------------------------------------------------------------------

// Count POIs by activity type
MATCH (a:activity_type)<-[:OFFERS]-(poi:poi)
RETURN a.name AS activity,
       count(poi) AS poi_count
ORDER BY poi_count DESC;

// Verify complete chain
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
RETURN 
  count(DISTINCT poi) AS pois_with_complete_chain,
  count(DISTINCT a) AS activities,
  count(DISTINCT e) AS emotions,
  count(DISTINCT ca) AS archetypes;

// Show improved sample from French Riviera
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.destination_name = 'French Riviera'
  AND poi.luxury_score > 0.7
WITH poi, a,
     collect(DISTINCT e.name) AS emotions,
     collect(DISTINCT ca.name) AS archetypes
RETURN poi.name,
       a.name AS activity,
       emotions,
       archetypes,
       round(poi.personality_romantic * 100) / 100 AS romantic,
       round(poi.luxury_score * 100) / 100 AS luxury
ORDER BY poi.luxury_score DESC
LIMIT 20;


