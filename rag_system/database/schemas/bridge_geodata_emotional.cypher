// ============================================================================
// Bridge Schema: Connect Geodata ↔ Emotional Intelligence ↔ Clients
// ============================================================================
// This schema creates bidirectional relationships between:
// - Your 203k POIs (existing geodata)
// - Emotional Knowledge Graph (experiences, emotions, archetypes)
// - Client Profiles (from AIlessia conversations)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. POI ↔ EMOTIONAL TAG RELATIONSHIPS
// ----------------------------------------------------------------------------
// Tag POIs with emotions they evoke (for emotional discovery)

// Example: Tag some POIs with emotional attributes
// You'll do this for all 203k POIs based on their characteristics

// Find romantic restaurants and tag them
MATCH (poi:poi)
WHERE poi.type IN ['restaurant', 'fine_dining', 'michelin'] 
  AND (poi.tags CONTAINS 'romantic' OR poi.atmosphere CONTAINS 'intimate')
MATCH (et:EmotionalTag {name: 'Romance'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.85,
    discovered_through: 'poi_attributes',
    confidence: 0.80
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS romantic_pois_tagged;

// Tag luxury/prestige POIs
MATCH (poi:poi)
WHERE poi.type IN ['luxury_hotel', 'five_star', 'michelin'] 
  OR poi.price_level >= 4
MATCH (et:EmotionalTag {name: 'Prestige'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.90,
    discovered_through: 'luxury_indicators'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS prestige_pois_tagged;

// Tag wellness/spa POIs
MATCH (poi:poi)
WHERE poi.type IN ['spa', 'wellness', 'massage', 'yoga']
MATCH (et:EmotionalTag {name: 'Serenity'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.92,
    discovered_through: 'poi_category'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS serene_pois_tagged;

// ----------------------------------------------------------------------------
// 2. POI ↔ CLIENT ARCHETYPE RELATIONSHIPS
// ----------------------------------------------------------------------------
// Tag POIs with archetypes they attract

// Romantic restaurants → The Romantic
MATCH (poi:poi)
WHERE poi.type IN ['restaurant', 'fine_dining'] 
  AND (poi.tags CONTAINS 'romantic' OR poi.ambiance = 'intimate')
MATCH (arch:ClientArchetype {name: 'The Romantic'})
MERGE (poi)-[a:ATTRACTS_ARCHETYPE {
    fit_score: 0.88,
    reason: 'Intimate dining experiences'
}]->(arch)
MERGE (arch)-[:DRAWN_TO]->(poi)
RETURN count(poi) AS romantic_archetype_pois;

// Michelin/Fine dining → The Connoisseur
MATCH (poi:poi)
WHERE poi.type IN ['michelin', 'fine_dining', 'winery']
  OR poi.stars >= 1
MATCH (arch:ClientArchetype {name: 'The Connoisseur'})
MERGE (poi)-[a:ATTRACTS_ARCHETYPE {
    fit_score: 0.95,
    reason: 'Culinary excellence and expertise'
}]->(arch)
MERGE (arch)-[:DRAWN_TO]->(poi)
RETURN count(poi) AS connoisseur_pois;

// Adventure activities → The Adventurer
MATCH (poi:poi)
WHERE poi.type IN ['adventure', 'outdoor', 'sports', 'hiking']
MATCH (arch:ClientArchetype {name: 'The Adventurer'})
MERGE (poi)-[a:ATTRACTS_ARCHETYPE {
    fit_score: 0.92,
    reason: 'Adventure and challenge'
}]->(arch)
MERGE (arch)-[:DRAWN_TO]->(poi)
RETURN count(poi) AS adventure_pois;

// Spa/Wellness → The Contemplative
MATCH (poi:poi)
WHERE poi.type IN ['spa', 'wellness', 'meditation', 'retreat']
MATCH (arch:ClientArchetype {name: 'The Contemplative'})
MERGE (poi)-[a:ATTRACTS_ARCHETYPE {
    fit_score: 0.90,
    reason: 'Reflection and renewal'
}]->(arch)
MERGE (arch)-[:DRAWN_TO]->(poi)
RETURN count(poi) AS contemplative_pois;

// ----------------------------------------------------------------------------
// 3. POI ↔ EXPERIENCE RELATIONSHIPS
// ----------------------------------------------------------------------------
// Connect luxury experiences to relevant POIs

// Connect yacht experience to marina/port POIs
MATCH (exp:Experience {id: 'exp_private_yacht_sunset_monaco'})
MATCH (poi:poi)
WHERE poi.type IN ['marina', 'port', 'yacht_club']
  AND (poi.location CONTAINS 'Monaco' OR poi.city = 'Monaco')
MERGE (exp)-[l:HAPPENS_AT {
    access_method: 'Private car or walking',
    ideal_timing: 'Evening',
    booking_through_poi: true
}]->(poi)
MERGE (poi)-[:HOSTS_EXPERIENCE]->(exp)
RETURN count(poi) AS yacht_experience_pois;

// Connect dining experience to restaurant POIs
MATCH (exp:Experience {id: 'exp_michelin_private_dining_monaco'})
MATCH (poi:poi)
WHERE poi.name CONTAINS 'Louis XV' 
   OR (poi.type = 'restaurant' AND poi.stars >= 3)
MERGE (exp)-[l:HAPPENS_AT {
    reservation_required: true,
    advance_days: 30
}]->(poi)
MERGE (poi)-[:HOSTS_EXPERIENCE]->(exp)
RETURN count(poi) AS dining_experience_pois;

// Connect wellness experience to spa POIs
MATCH (exp:Experience {id: 'exp_thermes_marins_wellness_monaco'})
MATCH (poi:poi)
WHERE poi.name CONTAINS 'Thermes Marins'
   OR (poi.type IN ['spa', 'wellness'] AND poi.location CONTAINS 'Monte-Carlo')
MERGE (exp)-[l:HAPPENS_AT]->(poi)
MERGE (poi)-[:HOSTS_EXPERIENCE]->(exp)
RETURN count(poi) AS wellness_experience_pois;

// ----------------------------------------------------------------------------
// 4. ACTIVITY_TYPE ↔ EMOTIONAL TAG RELATIONSHIPS
// ----------------------------------------------------------------------------
// Tag activities with emotions they evoke

// Romantic activities
MATCH (act:activity_type)
WHERE act.name IN ['Fine Dining', 'Sunset Cruise', 'Couples Spa', 'Wine Tasting']
MATCH (et:EmotionalTag {name: 'Romance'})
MERGE (act)-[e:EVOKES_EMOTION {strength: 0.90}]->(et)
MERGE (et)-[:FULFILLED_BY_ACTIVITY]->(act)
RETURN count(act) AS romantic_activities;

// Adventure activities
MATCH (act:activity_type)
WHERE act.name IN ['Hiking', 'Sailing', 'Diving', 'Mountain Biking']
MATCH (et:EmotionalTag {name: 'Freedom'})
MERGE (act)-[e:EVOKES_EMOTION {strength: 0.88}]->(et)
MERGE (et)-[:FULFILLED_BY_ACTIVITY]->(act)
RETURN count(act) AS adventure_activities;

// Wellness activities
MATCH (act:activity_type)
WHERE act.name IN ['Spa', 'Yoga', 'Meditation', 'Wellness']
MATCH (et:EmotionalTag {name: 'Serenity'})
MERGE (act)-[e:EVOKES_EMOTION {strength: 0.95}]->(et)
MERGE (et)-[:FULFILLED_BY_ACTIVITY]->(act)
RETURN count(act) AS wellness_activities;

// Prestige activities
MATCH (act:activity_type)
WHERE act.name IN ['Michelin Dining', 'Private Jet', 'Yacht Charter', 'Luxury Shopping']
MATCH (et:EmotionalTag {name: 'Prestige'})
MERGE (act)-[e:EVOKES_EMOTION {strength: 0.92}]->(et)
MERGE (et)-[:FULFILLED_BY_ACTIVITY]->(act)
RETURN count(act) AS prestige_activities;

// ----------------------------------------------------------------------------
// 5. ACTIVITY_TYPE ↔ CLIENT ARCHETYPE RELATIONSHIPS
// ----------------------------------------------------------------------------
// Tag activities with archetypes they attract

// Cultural activities → The Connoisseur
MATCH (act:activity_type)
WHERE act.name IN ['Museum', 'Art Gallery', 'Opera', 'Wine Tasting', 'Culinary Tour']
MATCH (arch:ClientArchetype {name: 'The Connoisseur'})
MERGE (act)-[a:APPEALS_TO_ARCHETYPE {fit_score: 0.92}]->(arch)
MERGE (arch)-[:ENJOYS_ACTIVITY]->(act)
RETURN count(act) AS connoisseur_activities;

// Romantic activities → The Romantic
MATCH (act:activity_type)
WHERE act.name IN ['Sunset Cruise', 'Fine Dining', 'Couples Spa', 'Beach Picnic']
MATCH (arch:ClientArchetype {name: 'The Romantic'})
MERGE (act)-[a:APPEALS_TO_ARCHETYPE {fit_score: 0.95}]->(arch)
MERGE (arch)-[:ENJOYS_ACTIVITY]->(act)
RETURN count(act) AS romantic_activities;

// Adventure activities → The Adventurer
MATCH (act:activity_type)
WHERE act.name IN ['Hiking', 'Diving', 'Sailing', 'Rock Climbing']
MATCH (arch:ClientArchetype {name: 'The Adventurer'})
MERGE (act)-[a:APPEALS_TO_ARCHETYPE {fit_score: 0.93}]->(arch)
MERGE (arch)-[:ENJOYS_ACTIVITY]->(act)
RETURN count(act) AS adventurer_activities;

// ----------------------------------------------------------------------------
// 6. DESTINATION ↔ POI RELATIONSHIPS
// ----------------------------------------------------------------------------
// Connect your destination nodes to POIs in those areas

// Connect French Riviera destination to Monaco/Nice/Cannes POIs
MATCH (dest:Destination {id: 'dest_french_riviera'})
MATCH (poi:poi)
WHERE poi.region IN ['Côte d\'Azur', 'French Riviera', 'Monaco', 'Nice', 'Cannes']
   OR poi.country = 'France' AND poi.location CONTAINS 'Riviera'
MERGE (dest)-[c:CONTAINS_POI {
    destination_strength: 0.95,
    typical_visit_time: 'May-October'
}]->(poi)
MERGE (poi)-[:PART_OF_DESTINATION]->(dest)
RETURN count(poi) AS riviera_pois;

// ----------------------------------------------------------------------------
// 7. CLIENT TRACKING RELATIONSHIPS (Prepared for Real Usage)
// ----------------------------------------------------------------------------
// These relationships will be created automatically when clients interact

// Example structure (will be created by client_sync_service):
// 
// (ClientProfile)-[:VISITED]->(poi)
// (ClientProfile)-[:INTERESTED_IN_POI]->(poi)
// (ClientProfile)-[:ENJOYED_ACTIVITY]->(activity_type)
// (ClientProfile)-[:RESONATES_WITH]->(EmotionalTag)
// (ClientProfile)-[:IDENTIFIES_AS]->(ClientArchetype)
//
// This enables queries like:
// "Which POIs do Romantic archetypes visit?"
// "Which activities resonate with clients who love Monaco?"
// "Find similar clients based on POI preferences"

// ----------------------------------------------------------------------------
// 8. CO-OCCURRENCE RELATIONSHIPS (Behavioral Patterns)
// ----------------------------------------------------------------------------
// Track which POIs/activities are often experienced together

// Create OFTEN_COMBINED_WITH relationships between POIs
// This will be built from actual client behavior data
// Example:
// MATCH (cp:ClientProfile)-[:VISITED]->(poi1:poi)
// MATCH (cp)-[:VISITED]->(poi2:poi)
// WHERE poi1 <> poi2
// WITH poi1, poi2, count(cp) AS co_visits
// WHERE co_visits >= 5
// MERGE (poi1)-[r:OFTEN_COMBINED_WITH]->(poi2)
// SET r.frequency = co_visits,
//     r.confidence = co_visits * 1.0 / total_visits

// ----------------------------------------------------------------------------
// 9. INDEXES FOR PERFORMANCE
// ----------------------------------------------------------------------------

// Create indexes for efficient querying
CREATE INDEX poi_type_idx IF NOT EXISTS FOR (p:poi) ON (p.type);
CREATE INDEX poi_location_idx IF NOT EXISTS FOR (p:poi) ON (p.location);
CREATE INDEX poi_city_idx IF NOT EXISTS FOR (p:poi) ON (p.city);
CREATE INDEX activity_name_idx IF NOT EXISTS FOR (a:activity_type) ON (a.name);

// ----------------------------------------------------------------------------
// 10. SAMPLE QUERIES FOR LEXA
// ----------------------------------------------------------------------------

// Query 1: Find POIs that match a client's emotional profile
// MATCH (cp:ClientProfile {id: 'victoria_uuid'})
// MATCH (cp)-[r:RESONATES_WITH]->(et:EmotionalTag)
// WHERE r.strength > 0.85
// MATCH (poi:poi)-[:EVOKES_EMOTION]->(et)
// RETURN poi.name, poi.type, poi.location, 
//        collect(et.name) AS matching_emotions
// ORDER BY r.strength DESC
// LIMIT 20

// Query 2: Find activities popular with specific archetype
// MATCH (arch:ClientArchetype {name: 'The Romantic'})
// MATCH (arch)<-[:APPEALS_TO_ARCHETYPE]-(act:activity_type)
// MATCH (act)<-[:OFFERS_ACTIVITY]-(poi:poi)
// RETURN act.name, count(poi) AS available_pois, 
//        collect(poi.name)[0..5] AS sample_locations
// ORDER BY available_pois DESC

// Query 3: Discover POIs in demand (by archetype preferences)
// MATCH (cp:ClientProfile)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// MATCH (arch)-[:DRAWN_TO]->(poi:poi)
// WITH poi, arch.name AS archetype, count(cp) AS client_count
// RETURN poi.name, poi.location, archetype, client_count
// ORDER BY client_count DESC
// LIMIT 50

// Query 4: Find proven destinations for similar attributes
// MATCH (cp1:ClientProfile)-[:VISITED]->(poi1:poi)
// MATCH (poi1)-[:EVOKES_EMOTION]->(et:EmotionalTag)
// MATCH (poi2:poi)-[:EVOKES_EMOTION]->(et)
// WHERE poi1 <> poi2 AND NOT (cp1)-[:VISITED]->(poi2)
// WITH cp1, poi2, count(et) AS shared_emotions
// WHERE shared_emotions >= 2
// RETURN cp1.email, poi2.name, poi2.location, shared_emotions
// ORDER BY shared_emotions DESC

// Query 5: Which clients are connected to a POI (for targeted campaigns)
// MATCH (poi:poi {name: 'Le Louis XV'})
// MATCH (cp:ClientProfile)-[r]->(poi)
// WHERE type(r) IN ['VISITED', 'INTERESTED_IN_POI', 'BOOKMARKED_POI']
// MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// RETURN cp.email, cp.name, arch.name AS archetype, 
//        type(r) AS interaction_type, r.timestamp AS when
// ORDER BY r.timestamp DESC

// Query 6: Discover which archetypes love which activities
// MATCH (cp:ClientProfile)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// MATCH (cp)-[:ENJOYED_ACTIVITY]->(act:activity_type)
// WITH arch.name AS archetype, act.name AS activity, count(cp) AS clients
// RETURN archetype, activity, clients
// ORDER BY clients DESC

// Query 7: Ultra-personalized cruise offer (POI + Activity + Emotion match)
// MATCH (cp:ClientProfile {id: 'client_uuid'})
// MATCH (cp)-[:RESONATES_WITH]->(et:EmotionalTag)
// MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// MATCH (poi:poi)-[:EVOKES_EMOTION]->(et)
// MATCH (poi)-[:ATTRACTS_ARCHETYPE]->(arch)
// MATCH (poi)-[:OFFERS_ACTIVITY]->(act:activity_type)
// MATCH (act)-[:APPEALS_TO_ARCHETYPE]->(arch)
// RETURN DISTINCT poi.name, poi.location, 
//        collect(DISTINCT et.name) AS matching_emotions,
//        collect(DISTINCT act.name) AS matching_activities,
//        arch.name AS their_archetype
// ORDER BY size(matching_emotions) DESC, size(matching_activities) DESC
// LIMIT 10


