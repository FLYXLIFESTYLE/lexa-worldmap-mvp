// ============================================================================
// CONNECT POIs TO EXISTING SPECIFIC ACTIVITY TYPES
// ============================================================================
// Uses your existing 70+ specific activity_type nodes
// Focuses on luxury POIs (luxury_score >= 0.5)
// Leaves low-quality POIs as Standard Experience
// ============================================================================

// ----------------------------------------------------------------------------
// STEP 1: REMOVE GENERIC FALLBACK ASSIGNMENTS FOR LUXURY POIs
// ----------------------------------------------------------------------------

// Remove generic assignments ONLY for luxury POIs (we'll keep them for low-quality POIs)
MATCH (poi:poi)-[r:OFFERS]->(a:activity_type)
WHERE a.name IN ['General Luxury Experience', 'Standard Experience']
  AND poi.luxury_score >= 0.5
DELETE r
RETURN count(*) AS removed_generic_for_luxury_pois;

// ----------------------------------------------------------------------------
// STEP 2: MATCH TO EXISTING SPECIFIC ACTIVITIES
// ----------------------------------------------------------------------------

// Fine dining (restaurants)
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(restaurant|ristorante|trattoria|bistro|taverna|taberna|osteria|pizzeria|dining|gastro|brasserie|auberge).*'
       OR poi.luxury_evidence =~ '(?i).*(restaurant|dining|gastro|cuisine|food|chef|michelin).*'
       OR poi.google_website =~ '(?i).*(restaurant|ristorante|dining).*')
MATCH (activity:activity_type {name: 'Fine dining'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS fine_dining_connected;

// Beach time
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(beach|plage|spiaggia|shore|coast|bay|cove|lido|bagno|stabilimento).*'
       OR poi.luxury_evidence =~ '(?i).*(beach|shore|coastal|waterfront|seaside).*'
       OR poi.google_website =~ '(?i).*(plage|beach|spiaggia).*')
MATCH (activity:activity_type {name: 'Beach time'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS beach_time_connected;

// Museum visit (cultural/historical)
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(museo|museum|musée|galleria|gallery|galerie|chiesa|church|église|cattedrale|cathedral|basilica|duomo|tempio|temple|villa|palazzo|palace|palais|castello|castle|château|anfiteatro|teatro|forum|casa|domus|terme|thermes|scavi|ruins|archeologico|archaeological|monumento|monument).*'
       OR poi.luxury_evidence =~ '(?i).*(museum|gallery|historic|cultural|heritage|ancient|archaeological|art).*')
MATCH (activity:activity_type {name: 'Museum visit'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS museum_visit_connected;

// Spa treatment
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(spa|wellness|massage|terme|thermes|thermal|centro benessere|hammam|sauna|thalasso).*'
       OR poi.luxury_evidence =~ '(?i).*(spa|wellness|massage|therapy|relaxation).*')
MATCH (activity:activity_type {name: 'Spa treatment'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS spa_treatment_connected;

// Sailing
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(yacht|sailing|voile|vela|charter|boat|bateau|barca|cruise|crociera|croisière|marina|porto turistico).*'
       OR poi.luxury_evidence =~ '(?i).*(yacht|sailing|charter|boat|cruise|maritime).*')
MATCH (activity:activity_type {name: 'Sailing'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS sailing_connected;

// Diving
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(diving|dive|scuba|immersione).*'
       OR poi.luxury_evidence =~ '(?i).*diving.*')
MATCH (activity:activity_type {name: 'Diving'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS diving_connected;

// Snorkeling
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*snorkel.*'
       OR poi.luxury_evidence =~ '(?i).*snorkel.*')
MATCH (activity:activity_type {name: 'Snorkeling'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS snorkeling_connected;

// Wine tasting
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(wine|vin|vino|vineyard|vignoble|vigneto|cantina|cellar|cave|winery|domaine|château.*vin|enoteca).*'
       OR poi.luxury_evidence =~ '(?i).*(wine|vineyard|winery|tasting).*')
MATCH (activity:activity_type {name: 'Wine tasting'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS wine_tasting_connected;

// Hiking
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(hiking|hike|trail|sentiero|sentier|trekking|trek).*'
       OR poi.luxury_evidence =~ '(?i).*(hiking|trail|trek).*')
MATCH (activity:activity_type {name: 'Hiking'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS hiking_connected;

// Shopping (use existing "Shopping" not "Luxury Shopping")
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(shop|boutique|store|negozio|magasin|market|mercato|marché).*'
       OR poi.luxury_evidence =~ '(?i).*(shopping|boutique|retail).*')
MATCH (activity:activity_type {name: 'Shopping'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS shopping_connected;

// Photography (scenic viewpoints)
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(viewpoint|belvedere|panorama|vista|scenic|mirador|lookout).*'
       OR poi.luxury_evidence =~ '(?i).*(view|panoramic|scenic).*')
MATCH (activity:activity_type {name: 'Photography'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS photography_connected;

// Yoga/Meditation (wellness centers)
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(yoga|meditation|zen|retreat|ashram).*'
       OR poi.luxury_evidence =~ '(?i).*(yoga|meditation|mindfulness).*')
MATCH (activity:activity_type {name: 'Yoga'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS yoga_connected;

// Helicopter tour (heliports, scenic flights)
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(helicopter|helico|heliport|helipad).*'
       OR poi.luxury_evidence =~ '(?i).*helicopter.*')
MATCH (activity:activity_type {name: 'Helicopter tour'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS helicopter_connected;

// Nightlife
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(club|nightclub|disco|lounge|bar|pub|cabaret|casino).*'
       OR poi.luxury_evidence =~ '(?i).*(nightlife|club|bar|casino).*')
MATCH (activity:activity_type {name: 'Nightlife'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS nightlife_connected;

// ----------------------------------------------------------------------------
// STEP 3: ASSIGN REMAINING LUXURY POIs TO LUXURY ACCOMMODATION
// ----------------------------------------------------------------------------

// Hotels, villas, resorts for remaining luxury POIs
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.7
  AND (poi.name =~ '(?i).*(hotel|hôtel|albergo|resort|lodge|villa|palazzo|château).*'
       OR poi.luxury_evidence =~ '(?i).*(hotel|accommodation|resort|stay).*')
MATCH (activity:activity_type {name: 'Luxury Accommodation'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS luxury_accommodation_connected;

// ----------------------------------------------------------------------------
// STEP 4: ASSIGN REMAINING LUXURY POIs TO NATURE & SCENIC VIEWS
// ----------------------------------------------------------------------------

// Parks, gardens, natural sites
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
  AND (poi.name =~ '(?i).*(park|parco|parc|garden|giardino|jardin|nature|natura|natural|mountain|montagna|valley|valle|lake|lago|waterfall|cascata|grotto|grotta|cave).*'
       OR poi.luxury_evidence =~ '(?i).*(nature|scenic|garden|park).*')
MATCH (activity:activity_type {name: 'Nature & Scenic Views'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS nature_connected;

// ----------------------------------------------------------------------------
// STEP 5: FINAL FALLBACK FOR REMAINING LUXURY POIs
// ----------------------------------------------------------------------------

// Any remaining luxury POIs get General Luxury Experience
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
MATCH (activity:activity_type {name: 'General Luxury Experience'})
MERGE (poi)-[:OFFERS]->(activity)
MERGE (activity)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS final_luxury_fallback;

// ----------------------------------------------------------------------------
// STEP 6: VERIFICATION & STATISTICS
// ----------------------------------------------------------------------------

// Count POIs by activity type (top 30)
MATCH (a:activity_type)<-[:OFFERS]-(poi:poi)
RETURN a.name AS activity,
       count(poi) AS poi_count,
       round(avg(poi.luxury_score) * 100) / 100 AS avg_luxury_score
ORDER BY poi_count DESC
LIMIT 30;

// Count luxury vs non-luxury split
MATCH (poi:poi)
OPTIONAL MATCH (poi)-[:OFFERS]->(a:activity_type)
WITH poi, a,
     CASE 
       WHEN poi.luxury_score >= 0.7 THEN 'High Luxury (0.7+)'
       WHEN poi.luxury_score >= 0.5 THEN 'Moderate Luxury (0.5-0.7)'
       ELSE 'Standard (<0.5)'
     END AS luxury_tier
RETURN luxury_tier,
       count(poi) AS total_pois,
       count(a) AS pois_with_activity,
       round(100.0 * count(a) / count(poi)) AS percent_with_activity
ORDER BY luxury_tier;

// Verify complete chain for luxury POIs
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.luxury_score >= 0.5
RETURN 
  count(DISTINCT poi) AS luxury_pois_with_complete_chain,
  count(DISTINCT a) AS activities,
  count(DISTINCT e) AS emotions,
  count(DISTINCT ca) AS archetypes;

// Sample improved results
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.destination_name = 'French Riviera'
  AND poi.luxury_score >= 0.7
  AND a.name <> 'General Luxury Experience'
WITH poi, a,
     collect(DISTINCT e.name) AS emotions,
     collect(DISTINCT ca.name) AS archetypes
RETURN poi.name,
       a.name AS activity,
       emotions,
       archetypes,
       round(poi.luxury_score * 100) / 100 AS luxury
ORDER BY poi.luxury_score DESC
LIMIT 20;


