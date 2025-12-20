// ============================================================================
// MANDATORY ACTIVITY & EMOTION CONNECTIONS
// ============================================================================
// Ensures EVERY POI has at least 1 activity_type
// Ensures EVERY activity_type connects to emotions and archetypes
// Creates the complete linkage: POI → activity → emotion → archetype
// ============================================================================

// ----------------------------------------------------------------------------
// PART 1: MAP ACTIVITY TYPES TO EMOTIONS
// ----------------------------------------------------------------------------

// Fine Dining → Romance, Sophistication, Indulgence
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(dining|restaurant|gastro|culinary).*'
MATCH (e:EmotionalTag)
WHERE e.name IN ['Romance', 'Sophistication', 'Indulgence']
MERGE (a)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(a)
RETURN a.name, collect(e.name) AS emotions;

// Yacht/Sailing → Freedom, Prestige, Discovery
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(yacht|sailing|boat|charter).*'
MATCH (e:EmotionalTag)
WHERE e.name IN ['Freedom', 'Prestige', 'Discovery']
MERGE (a)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(a)
RETURN a.name, collect(e.name) AS emotions;

// Spa/Wellness → Serenity, Renewal, Indulgence
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(spa|wellness|massage|therapy).*'
MATCH (e:EmotionalTag)
WHERE e.name IN ['Serenity', 'Renewal', 'Indulgence']
MERGE (a)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(a)
RETURN a.name, collect(e.name) AS emotions;

// Cultural/Museums → Sophistication, Discovery, Contemplation (if exists)
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(museum|culture|art|gallery|historic).*'
MATCH (e:EmotionalTag)
WHERE e.name IN ['Sophistication', 'Discovery']
MERGE (a)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(a)
RETURN a.name, collect(e.name) AS emotions;

// Beach/Water → Freedom, Serenity, Indulgence
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(beach|swimming|water).*'
MATCH (e:EmotionalTag)
WHERE e.name IN ['Freedom', 'Serenity', 'Indulgence']
MERGE (a)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(a)
RETURN a.name, collect(e.name) AS emotions;

// Adventure/Sport → Discovery, Freedom, Achievement
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(adventure|sport|diving|hiking|climbing).*'
MATCH (e:EmotionalTag)
WHERE e.name IN ['Discovery', 'Freedom', 'Achievement']
MERGE (a)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(a)
RETURN a.name, collect(e.name) AS emotions;

// Shopping → Prestige, Indulgence
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(shopping|boutique|retail).*'
MATCH (e:EmotionalTag)
WHERE e.name IN ['Prestige', 'Indulgence']
MERGE (a)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(a)
RETURN a.name, collect(e.name) AS emotions;

// ----------------------------------------------------------------------------
// PART 2: MAP ACTIVITY TYPES TO CLIENT ARCHETYPES
// ----------------------------------------------------------------------------

// Fine Dining → The Romantic, The Connoisseur, The Hedonist
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(dining|restaurant|gastro|culinary).*'
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Romantic', 'The Connoisseur', 'The Hedonist']
MERGE (a)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(a)
RETURN a.name, collect(ca.name) AS archetypes;

// Yacht/Sailing → The Achiever, The Adventurer, The Romantic
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(yacht|sailing|boat|charter).*'
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Achiever', 'The Adventurer', 'The Romantic']
MERGE (a)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(a)
RETURN a.name, collect(ca.name) AS archetypes;

// Spa/Wellness → The Hedonist, The Contemplative, The Romantic
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(spa|wellness|massage|therapy).*'
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Hedonist', 'The Contemplative', 'The Romantic']
MERGE (a)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(a)
RETURN a.name, collect(ca.name) AS archetypes;

// Cultural/Museums → The Connoisseur, The Contemplative
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(museum|culture|art|gallery|historic).*'
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Connoisseur', 'The Contemplative']
MERGE (a)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(a)
RETURN a.name, collect(ca.name) AS archetypes;

// Beach/Water → The Romantic, The Hedonist, The Contemplative
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(beach|swimming|water).*'
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Romantic', 'The Hedonist', 'The Contemplative']
MERGE (a)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(a)
RETURN a.name, collect(ca.name) AS archetypes;

// Adventure/Sport → The Adventurer, The Achiever
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(adventure|sport|diving|hiking|climbing).*'
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Adventurer', 'The Achiever']
MERGE (a)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(a)
RETURN a.name, collect(ca.name) AS archetypes;

// Shopping → The Achiever, The Hedonist, The Connoisseur
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(shopping|boutique|retail).*'
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Achiever', 'The Hedonist', 'The Connoisseur']
MERGE (a)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(a)
RETURN a.name, collect(ca.name) AS archetypes;

// ----------------------------------------------------------------------------
// PART 3: ENSURE EVERY POI HAS AT LEAST ONE ACTIVITY TYPE
// ----------------------------------------------------------------------------

// First, check how many POIs have NO activity connections
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
RETURN count(poi) AS pois_without_activity;

// Create a default "General Luxury Experience" activity if it doesn't exist
MERGE (default:activity_type {name: 'General Luxury Experience'})
ON CREATE SET 
  default.description = 'Default category for luxury experiences',
  default.created_at = datetime()
RETURN default.name;

// Connect default activity to emotions (Prestige + Indulgence)
MATCH (default:activity_type {name: 'General Luxury Experience'})
MATCH (e:EmotionalTag)
WHERE e.name IN ['Prestige', 'Indulgence']
MERGE (default)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(default)
RETURN count(*) AS default_emotion_links;

// Connect default activity to archetypes (Achiever + Hedonist)
MATCH (default:activity_type {name: 'General Luxury Experience'})
MATCH (ca:ClientArchetype)
WHERE ca.name IN ['The Achiever', 'The Hedonist']
MERGE (default)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:ENJOYS_ACTIVITY]->(default)
RETURN count(*) AS default_archetype_links;

// Now assign the default activity to all POIs without an activity
// BUT only if they have a luxury_score >= 0.5
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
  AND poi.luxury_score >= 0.5
MATCH (default:activity_type {name: 'General Luxury Experience'})
MERGE (poi)-[:OFFERS]->(default)
MERGE (default)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS pois_assigned_default;

// For POIs with luxury_score < 0.5, create a "Standard Experience" activity
MERGE (standard:activity_type {name: 'Standard Experience'})
ON CREATE SET 
  standard.description = 'Standard travel experiences',
  standard.created_at = datetime()
RETURN standard.name;

// Connect standard to generic emotions
MATCH (standard:activity_type {name: 'Standard Experience'})
MATCH (e:EmotionalTag)
WHERE e.name IN ['Discovery', 'Freedom']
MERGE (standard)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY_ACTIVITY]->(standard)
RETURN count(*) AS standard_emotion_links;

// Assign standard activity to remaining POIs
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:OFFERS]->(:activity_type))
MATCH (standard:activity_type {name: 'Standard Experience'})
MERGE (poi)-[:OFFERS]->(standard)
MERGE (standard)-[:AVAILABLE_AT]->(poi)
RETURN count(poi) AS pois_assigned_standard;

// ----------------------------------------------------------------------------
// PART 4: VERIFICATION - CHECK ALL MANDATORY CONNECTIONS
// ----------------------------------------------------------------------------

// Verify: Every POI has at least 1 activity
MATCH (poi:poi)
OPTIONAL MATCH (poi)-[:OFFERS]->(a:activity_type)
WITH poi, count(a) AS activity_count
WHERE activity_count = 0
RETURN count(poi) AS pois_still_without_activity;
// Should return 0!

// Verify: Every activity_type has at least 1 emotion
MATCH (a:activity_type)
OPTIONAL MATCH (a)-[:EVOKES]->(e:EmotionalTag)
WITH a, count(e) AS emotion_count
WHERE emotion_count = 0
RETURN a.name, emotion_count
ORDER BY a.name;
// Should return empty!

// Verify: Every activity_type has at least 1 archetype
MATCH (a:activity_type)
OPTIONAL MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WITH a, count(ca) AS archetype_count
WHERE archetype_count = 0
RETURN a.name, archetype_count
ORDER BY a.name;
// Should return empty!

// ----------------------------------------------------------------------------
// PART 5: SUMMARY STATISTICS
// ----------------------------------------------------------------------------

// Complete linkage summary
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
RETURN 
  count(DISTINCT poi) AS pois_with_complete_linkage,
  count(DISTINCT a) AS activity_types,
  count(DISTINCT e) AS emotions_linked,
  count(DISTINCT ca) AS archetypes_linked;

// Activity distribution
MATCH (a:activity_type)<-[:OFFERS]-(poi:poi)
RETURN a.name AS activity,
       count(poi) AS poi_count
ORDER BY poi_count DESC
LIMIT 20;

// Sample complete chain: POI → Activity → Emotion → Archetype
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
WHERE poi.luxury_score > 0.8
WITH poi, a, 
     collect(DISTINCT e.name) AS emotions,
     collect(DISTINCT ca.name) AS archetypes
RETURN poi.name AS poi,
       poi.destination_name AS destination,
       a.name AS activity,
       emotions,
       archetypes,
       round(poi.personality_romantic * 100) / 100 AS romantic,
       round(poi.personality_connoisseur * 100) / 100 AS connoisseur,
       round(poi.luxury_score * 100) / 100 AS luxury
LIMIT 10;

// ----------------------------------------------------------------------------
// PART 6: CREATE INDEXES FOR RELATIONSHIP QUERIES
// ----------------------------------------------------------------------------

CREATE INDEX activity_type_name_idx IF NOT EXISTS FOR (a:activity_type) ON (a.name);
CREATE INDEX emotional_tag_name_idx IF NOT EXISTS FOR (e:EmotionalTag) ON (e.name);
CREATE INDEX client_archetype_name_idx IF NOT EXISTS FOR (ca:ClientArchetype) ON (ca.name);


