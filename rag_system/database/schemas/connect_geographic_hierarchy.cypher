// ============================================================================
// COMPLETE GEOGRAPHIC RELATIONSHIPS (Custom for Your Data)
// ============================================================================
// Connects your 203k POIs to the geographic hierarchy
// Uses YOUR existing relationship types: LOCATED_IN, IN_REGION, IN_AREA
// ============================================================================

// ----------------------------------------------------------------------------
// PART 1: CREATE PERFORMANCE INDEXES
// ----------------------------------------------------------------------------

CREATE INDEX poi_name_idx IF NOT EXISTS FOR (p:poi) ON (p.name);
CREATE INDEX poi_destination_name_idx IF NOT EXISTS FOR (p:poi) ON (p.destination_name);
CREATE INDEX poi_uid_idx IF NOT EXISTS FOR (p:poi) ON (p.poi_uid);
CREATE INDEX country_name_idx IF NOT EXISTS FOR (c:country) ON (c.name);
CREATE INDEX region_name_idx IF NOT EXISTS FOR (r:region) ON (r.name);
CREATE INDEX area_name_idx IF NOT EXISTS FOR (a:area) ON (a.name);
CREATE INDEX continent_name_idx IF NOT EXISTS FOR (c:continent) ON (c.name);
CREATE INDEX destination_name_idx IF NOT EXISTS FOR (d:destination) ON (d.name);
CREATE INDEX activity_type_name_idx IF NOT EXISTS FOR (a:activity_type) ON (a.name);

// Wait for indexes to be built
CALL db.awaitIndexes(300);

// ----------------------------------------------------------------------------
// PART 2: CONNECT POIs TO REGIONS (based on destination_name property)
// ----------------------------------------------------------------------------

// Direct match: POI destination_name = region name
MATCH (poi:poi)
WHERE poi.destination_name IS NOT NULL
MATCH (r:region)
WHERE poi.destination_name = r.name
MERGE (poi)-[:IN_REGION]->(r)
MERGE (r)-[:CONTAINS_POI]->(poi)
RETURN count(DISTINCT poi) AS pois_connected_to_regions;

// ----------------------------------------------------------------------------
// PART 3: CONNECT POIs TO COUNTRIES (for the 188k missing connections)
// ----------------------------------------------------------------------------

// Strategy: Use destination_name to infer country
// French Riviera → France
MATCH (poi:poi)
WHERE poi.destination_name IN ['French Riviera', 'Corsica']
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'France'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS french_pois_connected;

// Amalfi Coast, Adriatic → Italy
MATCH (poi:poi)
WHERE poi.destination_name IN ['Amalfi Coast', 'Adriatic']
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'Italy'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS italian_pois_connected;

// Cyclades, Dodecanese → Greece
MATCH (poi:poi)
WHERE poi.destination_name IN ['Cyclades', 'Dodecanese']
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'Greece'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS greek_pois_connected;

// Balearics, Canary Islands → Spain
MATCH (poi:poi)
WHERE poi.destination_name IN ['Balearics', 'Canary Islands']
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'Spain'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS spanish_pois_connected;

// BVI, Dutch Antilles, French Antilles → Caribbean
MATCH (poi:poi)
WHERE poi.destination_name IN ['BVI', 'Dutch Antilles', 'French Antilles']
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country)
WHERE c.name IN ['British Virgin Islands', 'Netherlands Antilles', 'French West Indies']
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS caribbean_pois_connected;

// Arabian Gulf → UAE/Qatar/Bahrain
MATCH (poi:poi)
WHERE poi.destination_name = 'Arabian Gulf'
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country)
WHERE c.name IN ['United Arab Emirates', 'Qatar', 'Bahrain']
WITH poi, c
ORDER BY c.name
LIMIT 1
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS arabian_gulf_pois_connected;

// Great Barrier Reef → Australia
MATCH (poi:poi)
WHERE poi.destination_name = 'Great Barrier Reef'
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'Australia'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS australian_pois_connected;

// Galapagos → Ecuador
MATCH (poi:poi)
WHERE poi.destination_name = 'Galapagos'
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'Ecuador'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS ecuador_pois_connected;

// Alaska, East Coast USA, Florida Keys → USA
MATCH (poi:poi)
WHERE poi.destination_name IN ['Alaska', 'East Coast USA', 'Florida Keys']
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country)
WHERE c.name IN ['United States', 'USA', 'United States of America']
WITH poi, c
LIMIT 1
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS usa_pois_connected;

// Indonesia → Indonesia
MATCH (poi:poi)
WHERE poi.destination_name = 'Indonesia'
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'Indonesia'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS indonesia_pois_connected;

// Eastern Africa → Kenya/Tanzania/Seychelles
MATCH (poi:poi)
WHERE poi.destination_name = 'Eastern Africa'
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country)
WHERE c.name IN ['Kenya', 'Tanzania', 'Seychelles', 'Mauritius']
WITH poi, c
ORDER BY c.name
LIMIT 1
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS east_africa_pois_connected;

// Aeolian Islands → Italy (Sicily)
MATCH (poi:poi)
WHERE poi.destination_name = 'Aeolian Islands'
  AND NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
MATCH (c:country {name: 'Italy'})
MERGE (poi)-[:LOCATED_IN]->(c)
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(poi) AS aeolian_pois_connected;

// ----------------------------------------------------------------------------
// PART 4: ADD REVERSE RELATIONSHIPS FOR COUNTRIES
// ----------------------------------------------------------------------------

// Add reverse CONTAINS_POI relationships where missing
MATCH (poi:poi)-[:LOCATED_IN]->(c:country)
WHERE NOT EXISTS((c)-[:CONTAINS_POI]->(poi))
MERGE (c)-[:CONTAINS_POI]->(poi)
RETURN count(*) AS reverse_country_relations_added;

// ----------------------------------------------------------------------------
// PART 5: COMPLETE COUNTRY → REGION HIERARCHY
// ----------------------------------------------------------------------------

// Add reverse relationships for IN_REGION
MATCH (c:country)-[:IN_REGION]->(r:region)
WHERE NOT EXISTS((r)-[:CONTAINS_COUNTRY]->(c))
MERGE (r)-[:CONTAINS_COUNTRY]->(c)
RETURN count(*) AS reverse_region_relations_added;

// Connect regions to areas if not already done
// French Riviera, Corsica, Amalfi Coast, Adriatic → Mediterranean (if exists)
MATCH (r:region)
WHERE r.name IN ['French Riviera', 'Corsica', 'Amalfi Coast', 'Adriatic', 'Cyclades', 'Dodecanese', 'Balearics']
  AND NOT EXISTS((r)-[:IN_AREA]->(:area))
MATCH (a:area)
WHERE a.name =~ '(?i).*(mediterranean|europe|western europe).*'
WITH r, a
LIMIT 1
MERGE (r)-[:IN_AREA]->(a)
MERGE (a)-[:CONTAINS_REGION]->(r)
RETURN count(r) AS mediterranean_regions_connected;

// Caribbean regions → Caribbean area
MATCH (r:region)
WHERE r.name IN ['BVI', 'Dutch Antilles', 'French Antilles']
  AND NOT EXISTS((r)-[:IN_AREA]->(:area))
MATCH (a:area)
WHERE a.name =~ '(?i).*caribbean.*'
WITH r, a
LIMIT 1
MERGE (r)-[:IN_AREA]->(a)
MERGE (a)-[:CONTAINS_REGION]->(r)
RETURN count(r) AS caribbean_regions_connected;

// ----------------------------------------------------------------------------
// PART 6: COMPLETE AREA → CONTINENT HIERARCHY
// ----------------------------------------------------------------------------

// Add reverse relationships for IN_AREA
MATCH (a:area)-[:IN_CONTINENT]->(c:continent)
WHERE NOT EXISTS((c)-[:CONTAINS_AREA]->(a))
MERGE (c)-[:CONTAINS_AREA]->(a)
RETURN count(*) AS reverse_continent_relations_added;

// Connect areas to continents if missing
MATCH (a:area)
WHERE NOT EXISTS((a)-[:IN_CONTINENT]->(:continent))
  AND (a.name =~ '(?i).*(europe).*' OR a.name =~ '(?i).*(mediterranean).*')
MATCH (c:continent {name: 'Europe'})
MERGE (a)-[:IN_CONTINENT]->(c)
MERGE (c)-[:CONTAINS_AREA]->(a)
RETURN count(a) AS european_areas_connected;

// ----------------------------------------------------------------------------
// PART 7: CONNECT POIs TO ACTIVITY TYPES
// ----------------------------------------------------------------------------

// Sailing & Yachting
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(yacht|sailing|boat|charter|marina|anchorage|harbor|harbour).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(yacht|sailing|boat).*'
WITH poi, a
LIMIT 1
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(DISTINCT poi) AS sailing_pois_connected;

// Diving & Snorkeling
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(diving|dive|snorkel|reef|underwater|scuba).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(diving|snorkel).*'
WITH poi, a
LIMIT 1
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(DISTINCT poi) AS diving_pois_connected;

// Beaches
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(beach|shore|coast|cove|bay).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*beach.*'
WITH poi, a
LIMIT 1
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(DISTINCT poi) AS beach_pois_connected;

// Restaurants & Dining
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(restaurant|dining|bistro|cafe|tavern|trattoria|ristorante).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(dining|restaurant).*'
WITH poi, a
LIMIT 1
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(DISTINCT poi) AS dining_pois_connected;

// Cultural Sites
MATCH (poi:poi)
WHERE poi.name =~ '(?i).*(museum|gallery|church|cathedral|temple|monastery|palace|castle|ruins).*'
MATCH (a:activity_type)
WHERE a.name =~ '(?i).*(culture|museum|historic).*'
WITH poi, a
LIMIT 1
MERGE (poi)-[:OFFERS]->(a)
MERGE (a)-[:AVAILABLE_AT]->(poi)
RETURN count(DISTINCT poi) AS culture_pois_connected;

// ----------------------------------------------------------------------------
// PART 8: CONNECT POIs TO DESTINATION NODES (Experience Packages)
// ----------------------------------------------------------------------------

// Match POIs to destination nodes based on destination_name + emotional fit
MATCH (poi:poi)
WHERE poi.destination_name IS NOT NULL
  AND poi.personality_romantic > 0.80
MATCH (d:destination)
WHERE d.name =~ '(?i).*romantic.*'
  AND (d.region = poi.destination_name OR d.name CONTAINS poi.destination_name)
MERGE (d)-[:INCLUDES_POI]->(poi)
MERGE (poi)-[:PART_OF_DESTINATION]->(d)
RETURN count(DISTINCT poi) AS romantic_destination_pois;

// ----------------------------------------------------------------------------
// PART 9: CONNECT DESTINATIONS TO EMOTIONAL TAGS
// ----------------------------------------------------------------------------

// Connect destination nodes to EmotionalTag nodes
MATCH (d:destination)
WHERE d.emotional_character IS NOT NULL
UNWIND split(d.emotional_character, '+') AS emotion_name
WITH d, trim(emotion_name) AS clean_emotion
MATCH (e:EmotionalTag)
WHERE e.name = clean_emotion
MERGE (d)-[:EVOKES]->(e)
MERGE (e)-[:EVOKED_BY]->(d)
RETURN count(DISTINCT d) AS destinations_with_emotions;

// ----------------------------------------------------------------------------
// PART 10: VERIFICATION QUERIES
// ----------------------------------------------------------------------------

// Count POIs with full geographic hierarchy
MATCH (poi:poi)-[:LOCATED_IN]->(c:country)-[:IN_REGION]->(r:region)
RETURN count(DISTINCT poi) AS pois_with_hierarchy;

// Count POIs still missing country connections
MATCH (poi:poi)
WHERE NOT EXISTS((poi)-[:LOCATED_IN]->(:country))
RETURN count(poi) AS pois_without_country;

// Summary statistics
MATCH (poi:poi)
OPTIONAL MATCH (poi)-[:LOCATED_IN]->(country:country)
OPTIONAL MATCH (poi)-[:IN_REGION]->(region:region)
OPTIONAL MATCH (poi)-[:OFFERS]->(activity:activity_type)
OPTIONAL MATCH (poi)-[:PART_OF_DESTINATION]->(destination:destination)
RETURN 
  count(poi) AS total_pois,
  count(DISTINCT country) AS connected_countries,
  count(DISTINCT region) AS connected_regions,
  count(DISTINCT activity) AS connected_activities,
  count(DISTINCT destination) AS connected_destinations,
  sum(CASE WHEN country IS NOT NULL THEN 1 ELSE 0 END) AS pois_with_country,
  sum(CASE WHEN region IS NOT NULL THEN 1 ELSE 0 END) AS pois_with_region,
  sum(CASE WHEN activity IS NOT NULL THEN 1 ELSE 0 END) AS pois_with_activity;

// Show sample fully connected POI
MATCH (poi:poi)-[:LOCATED_IN]->(c:country)
OPTIONAL MATCH (c)-[:IN_REGION]->(r:region)
OPTIONAL MATCH (poi)-[:OFFERS]->(a:activity_type)
OPTIONAL MATCH (poi)-[:PART_OF_DESTINATION]->(d:destination)
WHERE poi.luxury_score > 0.7
RETURN poi.name AS poi,
       poi.destination_name AS destination_property,
       c.name AS country,
       r.name AS region,
       collect(DISTINCT a.name)[0..3] AS activities,
       collect(DISTINCT d.name)[0..2] AS destination_experiences,
       round(poi.personality_romantic * 100) / 100 AS romantic,
       round(poi.luxury_score * 100) / 100 AS luxury
LIMIT 10;


