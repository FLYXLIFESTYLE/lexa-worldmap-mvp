// ============================================================================
// Supplement Schema: Client Tracking & Bidirectional Relationships
// ============================================================================
// This schema ADDS to your existing rich data:
// - Creates reverse relationships for better querying
// - Prepares client tracking structure
// - No changes to your 203k POIs - just enhances connections
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CREATE REVERSE RELATIONSHIPS (Based on Existing Data)
// ----------------------------------------------------------------------------

// A. EmotionalTag ← poi (reverse of EVOKES_EMOTION)
MATCH (poi:poi)-[e:EVOKES_EMOTION]->(et:EmotionalTag)
MERGE (et)-[r:EXPRESSED_AT]->(poi)
SET r.strength = e.strength,
    r.source = 'poi_emotions'
RETURN count(r) AS reverse_emotion_relationships;

// B. ClientArchetype ← poi (based on personality scores)
// Tag POIs with The Romantic archetype
MATCH (poi:poi)
WHERE poi.personality_romantic >= 0.85
MATCH (arch:ClientArchetype {name: 'The Romantic'})
MERGE (arch)-[r:DRAWN_TO_POI {
    fit_score: poi.personality_romantic,
    source: 'personality_score',
    created_at: datetime()
}]->(poi)
RETURN count(r) AS romantic_archetype_links;

// Tag POIs with The Connoisseur archetype
MATCH (poi:poi)
WHERE poi.personality_connoisseur >= 0.85
MATCH (arch:ClientArchetype {name: 'The Connoisseur'})
MERGE (arch)-[r:DRAWN_TO_POI {
    fit_score: poi.personality_connoisseur,
    source: 'personality_score'
}]->(poi)
RETURN count(r) AS connoisseur_archetype_links;

// Tag POIs with The Hedonist archetype
MATCH (poi:poi)
WHERE poi.personality_hedonist >= 0.85
MATCH (arch:ClientArchetype {name: 'The Hedonist'})
MERGE (arch)-[r:DRAWN_TO_POI {
    fit_score: poi.personality_hedonist,
    source: 'personality_score'
}]->(poi)
RETURN count(r) AS hedonist_archetype_links;

// Tag POIs with The Contemplative archetype
MATCH (poi:poi)
WHERE poi.personality_contemplative >= 0.85
MATCH (arch:ClientArchetype {name: 'The Contemplative'})
MERGE (arch)-[r:DRAWN_TO_POI {
    fit_score: poi.personality_contemplative,
    source: 'personality_score'
}]->(poi)
RETURN count(r) AS contemplative_archetype_links;

// Tag POIs with The Achiever archetype
MATCH (poi:poi)
WHERE poi.personality_achiever >= 0.85
MATCH (arch:ClientArchetype {name: 'The Achiever'})
MERGE (arch)-[r:DRAWN_TO_POI {
    fit_score: poi.personality_achiever,
    source: 'personality_score'
}]->(poi)
RETURN count(r) AS achiever_archetype_links;

// Tag POIs with The Adventurer archetype
MATCH (poi:poi)
WHERE poi.personality_adventurer >= 0.85
MATCH (arch:ClientArchetype {name: 'The Adventurer'})
MERGE (arch)-[r:DRAWN_TO_POI {
    fit_score: poi.personality_adventurer,
    source: 'personality_score'
}]->(poi)
RETURN count(r) AS adventurer_archetype_links;

// ----------------------------------------------------------------------------
// 2. CONNECT EXISTING EMOTIONS TO NEW EMOTIONAL TAGS
// ----------------------------------------------------------------------------

// Map POIs with "Romance" in primary_emotions to Romance EmotionalTag
MATCH (poi:poi)
WHERE 'Romance' IN poi.primary_emotions
MATCH (et:EmotionalTag {name: 'Romance'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.90,
    source: 'primary_emotions',
    discovered_through: 'poi_property'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS romance_pois_connected;

// Map POIs with "Prestige" to Prestige EmotionalTag
MATCH (poi:poi)
WHERE 'Prestige' IN poi.primary_emotions
   OR poi.prestige_factor >= 0.85
MATCH (et:EmotionalTag {name: 'Prestige'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: COALESCE(poi.prestige_factor, 0.85),
    source: 'primary_emotions'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS prestige_pois_connected;

// Map POIs with "Serenity" to Serenity EmotionalTag
MATCH (poi:poi)
WHERE 'Serenity' IN poi.primary_emotions
   OR 'Peace' IN poi.dominant_feelings
MATCH (et:EmotionalTag {name: 'Serenity'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.88,
    source: 'primary_emotions'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS serenity_pois_connected;

// Map POIs with "Indulgence" to Indulgence EmotionalTag
MATCH (poi:poi)
WHERE 'Indulgence' IN poi.primary_emotions
   OR 'Luxury' IN poi.dominant_feelings
MATCH (et:EmotionalTag {name: 'Indulgence'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.90,
    source: 'primary_emotions'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS indulgence_pois_connected;

// Map POIs with "Sophistication" to Sophistication EmotionalTag
MATCH (poi:poi)
WHERE 'Sophistication' IN poi.primary_emotions
   OR 'Elegance' IN poi.dominant_feelings
MATCH (et:EmotionalTag {name: 'Sophistication'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.87,
    source: 'primary_emotions'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS sophistication_pois_connected;

// Map POIs with "Renewal" to Renewal EmotionalTag
MATCH (poi:poi)
WHERE 'Renewal' IN poi.primary_emotions
   OR 'Restoration' IN poi.dominant_feelings
MATCH (et:EmotionalTag {name: 'Renewal'})
MERGE (poi)-[e:EVOKES_EMOTION {
    strength: 0.89,
    source: 'primary_emotions'
}]->(et)
MERGE (et)-[:EXPRESSED_AT]->(poi)
RETURN count(poi) AS renewal_pois_connected;

// ----------------------------------------------------------------------------
// 3. CLIENT TRACKING STRUCTURE (Auto-populated by client_sync_service)
// ----------------------------------------------------------------------------

// These relationship types will be created automatically when clients interact
// Just documenting the structure here - no need to create sample data

// ClientProfile → POI interactions:
// - (ClientProfile)-[:VISITED {timestamp, satisfaction, duration}]->(poi)
// - (ClientProfile)-[:INTERESTED_IN_POI {confidence, context, conversation_id}]->(poi)
// - (ClientProfile)-[:BOOKMARKED_POI {note, reminder_date}]->(poi)
// - (ClientProfile)-[:RATED_POI {rating, comment}]->(poi)

// ClientProfile → Emotion resonance:
// - (ClientProfile)-[:RESONATES_WITH {strength, manifestations}]->(EmotionalTag)
// - (ClientProfile)-[:SEEKS {urgency, context}]->(EmotionalTag)

// ClientProfile → Archetype identification:
// - (ClientProfile)-[:IDENTIFIES_AS {confidence, detected_by}]->(ClientArchetype)
// - (ClientProfile)-[:EXHIBITS_TRAITS_OF {traits, situations}]->(ClientArchetype)

// ClientProfile → Activity preferences:
// - (ClientProfile)-[:ENJOYED_ACTIVITY {rating, context}]->(activity_type)
// - (ClientProfile)-[:PREFERS_ACTIVITY {frequency, preference_score}]->(activity_type)

// ClientProfile → Destination interest:
// - (ClientProfile)-[:ATTRACTED_TO {attraction_score, ideal_season}]->(Destination)
// - (ClientProfile)-[:VISITED_DESTINATION {satisfaction, return_intent}]->(Destination)

// ----------------------------------------------------------------------------
// 4. PERFORMANCE INDEXES
// ----------------------------------------------------------------------------

// Indexes for client tracking queries
CREATE INDEX client_profile_id_idx IF NOT EXISTS FOR (cp:ClientProfile) ON (cp.id);
CREATE INDEX client_profile_email_idx IF NOT EXISTS FOR (cp:ClientProfile) ON (cp.email);
CREATE INDEX client_profile_archetype_idx IF NOT EXISTS FOR (cp:ClientProfile) ON (cp.primary_archetype);

// Indexes for POI queries with personality scores
CREATE INDEX poi_personality_romantic_idx IF NOT EXISTS FOR (p:poi) ON (p.personality_romantic);
CREATE INDEX poi_personality_connoisseur_idx IF NOT EXISTS FOR (p:poi) ON (p.personality_connoisseur);
CREATE INDEX poi_luxury_tier_idx IF NOT EXISTS FOR (p:poi) ON (p.luxury_tier);

// ----------------------------------------------------------------------------
// 5. POWERFUL QUERIES YOU CAN USE RIGHT NOW
// ----------------------------------------------------------------------------

// ============================================================================
// QUERY 1: Find ultra-personalized POI recommendations for a client
// ============================================================================
// MATCH (cp:ClientProfile {id: 'client_uuid'})
// MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// MATCH (arch)-[:DRAWN_TO_POI]->(poi:poi)
// WHERE poi.luxury_tier = 'Ultra-Premium'
// MATCH (cp)-[:RESONATES_WITH]->(et:EmotionalTag)
// MATCH (poi)-[:EVOKES_EMOTION]->(et)
// WITH poi, arch, count(DISTINCT et) AS emotion_matches, 
//      avg(arch.fit_score) AS archetype_fit
// RETURN poi.name, poi.location, poi.cinematic_hook,
//        emotion_matches, archetype_fit,
//        poi.personality_romantic AS romance_score,
//        poi.prestige_factor AS prestige_score
// ORDER BY emotion_matches DESC, archetype_fit DESC
// LIMIT 10

// ============================================================================
// QUERY 2: Find which clients to target for a specific POI (Marketing!)
// ============================================================================
// MATCH (poi:poi {name: 'Monaco Yacht Club'})
// MATCH (poi)<-[:EVOKES_EMOTION]-(et:EmotionalTag)
// MATCH (cp:ClientProfile)-[:RESONATES_WITH]->(et)
// MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// WITH cp, poi, collect(DISTINCT et.name) AS shared_emotions,
//      arch.name AS archetype
// RETURN cp.email, cp.name, archetype, shared_emotions,
//        cp.vip_status, cp.lifetime_value_eur
// ORDER BY size(shared_emotions) DESC, cp.lifetime_value_eur DESC

// ============================================================================
// QUERY 3: Discover POIs in high demand by archetype
// ============================================================================
// MATCH (arch:ClientArchetype)-[d:DRAWN_TO_POI]->(poi:poi)
// MATCH (cp:ClientProfile)-[:VISITED]->(poi)
// WITH arch.name AS archetype, poi.name AS poi_name, 
//      poi.location AS location, count(cp) AS visit_count,
//      avg(d.fit_score) AS avg_fit_score
// RETURN archetype, poi_name, location, visit_count, avg_fit_score
// ORDER BY visit_count DESC, avg_fit_score DESC
// LIMIT 50

// ============================================================================
// QUERY 4: Find POIs that match multiple emotional criteria
// ============================================================================
// MATCH (poi:poi)-[:EVOKES_EMOTION]->(et:EmotionalTag)
// WHERE et.name IN ['Romance', 'Prestige', 'Indulgence']
// WITH poi, collect(et.name) AS emotions
// WHERE size(emotions) >= 2
// RETURN poi.name, poi.location, emotions, 
//        poi.personality_romantic AS romance_fit,
//        poi.luxury_tier, poi.cinematic_hook
// ORDER BY size(emotions) DESC, poi.personality_romantic DESC

// ============================================================================
// QUERY 5: Build lookalike audience (Find similar clients)
// ============================================================================
// MATCH (seed:ClientProfile {id: 'high_value_client_uuid'})
// MATCH (seed)-[:VISITED]->(poi:poi)
// MATCH (seed)-[:RESONATES_WITH]->(et:EmotionalTag)
// MATCH (poi)-[:EVOKES_EMOTION]->(et)
// MATCH (lookalike:ClientProfile)-[:RESONATES_WITH]->(et)
// WHERE lookalike <> seed
//   AND NOT (lookalike)-[:VISITED]->(poi)
// WITH lookalike, count(DISTINCT et) AS shared_emotions,
//      count(DISTINCT poi) AS potential_interests
// RETURN lookalike.email, lookalike.name, 
//        lookalike.primary_archetype,
//        shared_emotions, potential_interests,
//        lookalike.engagement_score
// ORDER BY shared_emotions DESC, potential_interests DESC
// LIMIT 100

// ============================================================================
// QUERY 6: Ultra-personalized cruise offer builder
// ============================================================================
// MATCH (cp:ClientProfile {id: 'client_uuid'})
// MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// MATCH (arch)-[d:DRAWN_TO_POI]->(poi:poi)
// WHERE poi.luxury_tier IN ['Ultra-Premium', 'Premium']
// MATCH (cp)-[:RESONATES_WITH]->(et:EmotionalTag)
// MATCH (poi)-[:EVOKES_EMOTION]->(et)
// OPTIONAL MATCH (poi)-[:LOCATED_IN]->(city:city)
// WITH cp, poi, arch, 
//      collect(DISTINCT et.name) AS matching_emotions,
//      avg(d.fit_score) AS archetype_fit,
//      city.name AS city_name
// WHERE size(matching_emotions) >= 2
// RETURN poi.name, poi.location, city_name,
//        matching_emotions, archetype_fit,
//        poi.cinematic_hook AS hook,
//        poi.signature_moment AS highlight,
//        poi.price_point_eur AS estimated_cost
// ORDER BY size(matching_emotions) DESC, archetype_fit DESC
// LIMIT 15

// ============================================================================
// QUERY 7: Discover trending POIs by emotional resonance
// ============================================================================
// MATCH (et:EmotionalTag)<-[:EVOKES_EMOTION]-(poi:poi)
// MATCH (cp:ClientProfile)-[:RESONATES_WITH]->(et)
// WHERE cp.last_interaction > datetime() - duration({months: 3})
// WITH poi, et.name AS emotion, count(DISTINCT cp) AS interested_clients
// MATCH (poi)-[:LOCATED_IN]->(location)
// RETURN poi.name, labels(location)[0] AS location_type, 
//        location.name AS location_name,
//        emotion, interested_clients,
//        poi.luxury_tier, poi.personality_romantic
// ORDER BY interested_clients DESC
// LIMIT 30

// ============================================================================
// QUERY 8: Find complementary POIs for journey building
// ============================================================================
// MATCH (poi1:poi {name: 'Starting POI Name'})
// MATCH (poi1)-[:EVOKES_EMOTION]->(et:EmotionalTag)
// MATCH (poi2:poi)-[:EVOKES_EMOTION]->(et)
// WHERE poi1 <> poi2
// WITH poi1, poi2, collect(DISTINCT et.name) AS shared_emotions
// WHERE size(shared_emotions) >= 2
// OPTIONAL MATCH (poi2)-[:LOCATED_IN]->(location)
// RETURN poi2.name, location.name AS location,
//        shared_emotions, poi2.emotional_arc,
//        poi2.timing_in_journey AS ideal_timing
// ORDER BY size(shared_emotions) DESC

// ============================================================================
// QUERY 9: Campaign targeting: UHNW Romantics who haven't visited
// ============================================================================
// MATCH (arch:ClientArchetype {name: 'The Romantic'})
// MATCH (cp:ClientProfile)-[:IDENTIFIES_AS]->(arch)
// WHERE cp.estimated_wealth_tier = 'UHNW'
//   AND cp.engagement_score > 0.7
// MATCH (arch)-[d:DRAWN_TO_POI]->(poi:poi)
// WHERE NOT (cp)-[:VISITED]->(poi)
//   AND poi.luxury_tier = 'Ultra-Premium'
// RETURN cp.email, cp.name, cp.vip_status,
//        poi.name AS recommended_poi, poi.location,
//        d.fit_score AS match_score,
//        poi.cinematic_hook AS pitch
// ORDER BY d.fit_score DESC, cp.lifetime_value_eur DESC
// LIMIT 100

// ============================================================================
// QUERY 10: Archetype preference analysis (Learn what works!)
// ============================================================================
// MATCH (cp:ClientProfile)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// MATCH (cp)-[:VISITED]->(poi:poi)
// MATCH (poi)-[:EVOKES_EMOTION]->(et:EmotionalTag)
// WITH arch.name AS archetype, et.name AS emotion, 
//      count(DISTINCT cp) AS clients, count(DISTINCT poi) AS pois
// RETURN archetype, emotion, clients, pois
// ORDER BY archetype, clients DESC


