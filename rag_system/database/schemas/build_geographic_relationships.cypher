// ============================================================================
// Geographic Hierarchy & Relationship Builder
// ============================================================================
// Creates bidirectional relationships between POIs and geographic nodes
// Establishes the full hierarchy: poi → country → region → area → continent
// Connects POIs to destinations and activity types
// ============================================================================

// ----------------------------------------------------------------------------
// PART 1: INDEXES FOR PERFORMANCE (Run First)
// ----------------------------------------------------------------------------

// Create indexes on geographic nodes
CREATE INDEX poi_name_index IF NOT EXISTS FOR (p:poi) ON (p.name);
CREATE INDEX poi_location_index IF NOT EXISTS FOR (p:poi) ON (p.location);
CREATE INDEX country_name_index IF NOT EXISTS FOR (c:country) ON (c.name);
CREATE INDEX region_name_index IF NOT EXISTS FOR (r:region) ON (r.name);
CREATE INDEX area_name_index IF NOT EXISTS FOR (a:area) ON (a.name);
CREATE INDEX continent_name_index IF NOT EXISTS FOR (c:continent) ON (c.name);
CREATE INDEX destination_name_index IF NOT EXISTS FOR (d:destination) ON (d.name);
CREATE INDEX activity_type_name_index IF NOT EXISTS FOR (a:activity_type) ON (a.name);

// ----------------------------------------------------------------------------
// PART 2: CONNECT POIs TO COUNTRIES (if not already connected)
// ----------------------------------------------------------------------------

// This assumes your POIs have location or address information
// Adjust the property name based on your actual data structure

// Option A: If POIs have a 'country' property
MATCH (poi:poi)
WHERE poi.country IS NOT NULL
MATCH (c:country)
WHERE c.name = poi.country
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(*) AS pois_connected_to_countries;

// Option B: If POIs have 'destination_name' that matches country names
MATCH (poi:poi)
WHERE poi.destination_name IS NOT NULL
MATCH (c:country)
WHERE poi.destination_name CONTAINS c.name
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(*) AS pois_connected_via_destination;

// ----------------------------------------------------------------------------
// PART 3: BUILD COUNTRY → REGION → AREA → CONTINENT HIERARCHY
// ----------------------------------------------------------------------------

// Connect countries to regions (bidirectional)
// You'll need to define which countries belong to which regions
// Example mappings (adjust based on your data):

// French Riviera region
MATCH (c:country) WHERE c.name IN ['Monaco', 'France']
MATCH (r:region) WHERE r.name = 'French Riviera'
MERGE (c)-[:PART_OF]->(r)
MERGE (r)-[:CONTAINS_COUNTRY]->(c)
RETURN count(*) AS french_riviera_countries;

// Connect regions to areas
MATCH (r:region) WHERE r.name IN ['French Riviera', 'Tuscany', 'Amalfi Coast']
MATCH (a:area) WHERE a.name = 'Western Europe'
MERGE (r)-[:PART_OF]->(a)
MERGE (a)-[:CONTAINS_REGION]->(r)
RETURN count(*) AS western_europe_regions;

// Connect areas to continents
MATCH (a:area) WHERE a.name IN ['Western Europe', 'Northern Europe', 'Southern Europe', 'Eastern Europe']
MATCH (c:continent) WHERE c.name = 'Europe'
MERGE (a)-[:PART_OF]->(c)
MERGE (c)-[:CONTAINS_AREA]->(a)
RETURN count(*) AS europe_areas;

// ----------------------------------------------------------------------------
// PART 4: CONNECT POIs TO DESTINATIONS (Experience Packages)
// ----------------------------------------------------------------------------

// Connect POIs to destination nodes based on emotional/geographic matching
// This creates the "experience package" concept

// Example: French Riviera POIs to romantic coastline destinations
MATCH (poi:poi)-[:LOCATED_IN]->(c:country)
WHERE c.name IN ['Monaco', 'France']
  AND poi.personality_romantic > 0.75
  AND poi.location =~ '(?i).*(monaco|nice|cannes|eze|cap ferrat|antibes).*'
MATCH (d:destination)
WHERE d.name =~ '(?i).*monaco.*romantic.*'
   OR d.emotional_character =~ '(?i).*romance.*'
MERGE (d)-[:INCLUDES_POI]->(poi)
MERGE (poi)-[:PART_OF_DESTINATION]->(d)
RETURN count(*) AS romantic_riviera_pois;

// Connect all destinations to their geographic regions
MATCH (d:destination)
MATCH (r:region)
WHERE d.region = r.name 
   OR d.name CONTAINS r.name
   OR d.location CONTAINS r.name
MERGE (d)-[:LOCATED_IN]->(r)
MERGE (r)-[:CONTAINS_DESTINATION]->(d)
RETURN count(*) AS destinations_in_regions;

// ----------------------------------------------------------------------------
// PART 5: CONNECT POIs TO ACTIVITY TYPES
// ----------------------------------------------------------------------------

// Connect POIs to activity types based on name keywords
// Fine Dining
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(restaurant|dining|bistro|brasserie|cuisine|michelin|chef).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*dining.*'
   OR a.name =~ '(?i).*restaurant.*'
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(*) AS dining_pois;

// Spa & Wellness
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(spa|wellness|massage|treatment|therapy|relaxation).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*spa.*'
   OR a.name =~ '(?i).*wellness.*'
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(*) AS spa_pois;

// Yacht & Sailing
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(yacht|sailing|boat|cruise|charter|maritime).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*yacht.*'
   OR a.name =~ '(?i).*sailing.*'
   OR a.name =~ '(?i).*boat.*'
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(*) AS yacht_pois;

// Museums & Culture
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(museum|gallery|art|cultural|exhibition|heritage).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*museum.*'
   OR a.name =~ '(?i).*culture.*'
   OR a.name =~ '(?i).*art.*'
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(*) AS culture_pois;

// Adventure Activities
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(adventure|hiking|climbing|diving|safari|expedition).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*adventure.*'
   OR a.name =~ '(?i).*sport.*'
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(*) AS adventure_pois;

// ----------------------------------------------------------------------------
// PART 6: CONNECT DESTINATIONS TO EMOTIONAL TAGS
// ----------------------------------------------------------------------------

// Connect destinations to EmotionalTag nodes based on emotional_character
MATCH (d:destination)
WHERE d.emotional_character IS NOT NULL
MATCH (e:EmotionalTag)
WHERE d.emotional_character CONTAINS e.name
MERGE (d)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY]->(d)
RETURN count(*) AS destination_emotion_links;

// ----------------------------------------------------------------------------
// PART 7: CONNECT DESTINATIONS TO CLIENT ARCHETYPES
// ----------------------------------------------------------------------------

// Match destinations to archetypes they appeal to
MATCH (d:destination)
MATCH (ca:ClientArchetype)
WHERE (ca.name = 'The Romantic' AND d.emotional_character =~ '(?i).*romance.*')
   OR (ca.name = 'The Connoisseur' AND d.emotional_character =~ '(?i).*sophistication.*')
   OR (ca.name = 'The Hedonist' AND d.emotional_character =~ '(?i).*indulgence.*')
   OR (ca.name = 'The Contemplative' AND d.emotional_character =~ '(?i).*serenity.*')
   OR (ca.name = 'The Achiever' AND d.emotional_character =~ '(?i).*prestige.*')
   OR (ca.name = 'The Adventurer' AND d.emotional_character =~ '(?i).*(adventure|discovery|freedom).*')
MERGE (d)-[:APPEALS_TO]->(ca)
MERGE (ca)-[:DRAWN_TO_DESTINATION]->(d)
RETURN count(*) AS destination_archetype_links;

// ----------------------------------------------------------------------------
// PART 8: VERIFICATION QUERIES
// ----------------------------------------------------------------------------

// Check geographic hierarchy completeness
MATCH path = (poi:poi)-[:LOCATED_IN]->(country:country)-[:PART_OF]->(region:region)-[:PART_OF]->(area:area)-[:PART_OF]->(continent:continent)
RETURN count(DISTINCT poi) AS pois_with_full_hierarchy,
       count(DISTINCT country) AS connected_countries,
       count(DISTINCT region) AS connected_regions,
       count(DISTINCT area) AS connected_areas,
       count(DISTINCT continent) AS connected_continents;

// Check POI connections summary
MATCH (poi:poi)
OPTIONAL MATCH (poi)-[:LOCATED_IN]->(country:country)
OPTIONAL MATCH (poi)-[:PART_OF_DESTINATION]->(destination:destination)
OPTIONAL MATCH (poi)-[:OFFERS]->(activity:activity_type)
WITH poi,
     country IS NOT NULL AS has_country,
     destination IS NOT NULL AS has_destination,
     activity IS NOT NULL AS has_activity
RETURN 
  count(poi) AS total_pois,
  sum(CASE WHEN has_country THEN 1 ELSE 0 END) AS pois_with_country,
  sum(CASE WHEN has_destination THEN 1 ELSE 0 END) AS pois_with_destination,
  sum(CASE WHEN has_activity THEN 1 ELSE 0 END) AS pois_with_activity;

// Show sample connected POI
MATCH (poi:poi)-[:LOCATED_IN]->(country:country)-[:PART_OF]->(region:region)
OPTIONAL MATCH (poi)-[:PART_OF_DESTINATION]->(destination:destination)
OPTIONAL MATCH (poi)-[:OFFERS]->(activity:activity_type)
RETURN poi.name AS poi_name,
       country.name AS country,
       region.name AS region,
       collect(DISTINCT destination.name) AS destinations,
       collect(DISTINCT activity.name) AS activities
LIMIT 10;

// ----------------------------------------------------------------------------
// PART 9: REVERSE QUERIES FOR MARKETING
// ----------------------------------------------------------------------------

// Find all POIs in a specific emotion + location
// Example: "Romantic experiences in French Riviera"
MATCH (e:EmotionalTag {name: 'Romance'})-[:EVOKED_BY]->(d:destination)-[:INCLUDES_POI]->(poi:poi)
MATCH (poi)-[:LOCATED_IN]->(c:country)-[:PART_OF]->(r:region {name: 'French Riviera'})
RETURN poi.name, poi.personality_romantic, d.name AS destination
ORDER BY poi.personality_romantic DESC
LIMIT 20;

// Find all clients interested in a specific POI type
// (This will work once client tracking is implemented)
MATCH (poi:poi)-[:OFFERS]->(a:activity_type {name: 'Fine Dining'})
WHERE poi.personality_connoisseur > 0.85
OPTIONAL MATCH (client:ClientProfile)-[:INTERESTED_IN]->(poi)
RETURN poi.name, poi.personality_connoisseur, count(client) AS interested_clients
ORDER BY interested_clients DESC, poi.personality_connoisseur DESC
LIMIT 20;


