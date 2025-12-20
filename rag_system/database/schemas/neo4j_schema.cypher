// ============================================================================
// LEXA RAG System - Neo4j Graph Schema
// ============================================================================
// This file defines the complete graph structure for the travel chatbot.
// It includes nodes for regions, activities, tags, users, conversations,
// and security incidents.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CONSTRAINTS (Ensure data integrity)
// ----------------------------------------------------------------------------

// Region constraints
CREATE CONSTRAINT region_id IF NOT EXISTS
FOR (r:Region) REQUIRE r.id IS UNIQUE;

// Activity constraints
CREATE CONSTRAINT activity_id IF NOT EXISTS
FOR (a:Activity) REQUIRE a.id IS UNIQUE;

// Tag constraints
CREATE CONSTRAINT tag_name IF NOT EXISTS
FOR (t:Tag) REQUIRE t.name IS UNIQUE;

// User constraints
CREATE CONSTRAINT user_id IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

// Chat session constraints
CREATE CONSTRAINT chat_id IF NOT EXISTS
FOR (c:Chat) REQUIRE c.id IS UNIQUE;

// Question constraints
CREATE CONSTRAINT question_id IF NOT EXISTS
FOR (q:Question) REQUIRE q.id IS UNIQUE;

// Answer constraints
CREATE CONSTRAINT answer_id IF NOT EXISTS
FOR (a:Answer) REQUIRE a.id IS UNIQUE;

// TrendData constraints
CREATE CONSTRAINT trend_id IF NOT EXISTS
FOR (t:TrendData) REQUIRE t.id IS UNIQUE;

// SecurityIncident constraints
CREATE CONSTRAINT incident_id IF NOT EXISTS
FOR (s:SecurityIncident) REQUIRE s.id IS UNIQUE;

// ----------------------------------------------------------------------------
// 2. INDEXES (Improve query performance)
// ----------------------------------------------------------------------------

// Region indexes
CREATE INDEX region_name IF NOT EXISTS
FOR (r:Region) ON (r.name);

CREATE INDEX region_bundesland IF NOT EXISTS
FOR (r:Region) ON (r.bundesland);

// Activity indexes
CREATE INDEX activity_name IF NOT EXISTS
FOR (a:Activity) ON (a.name);

CREATE INDEX activity_category IF NOT EXISTS
FOR (a:Activity) ON (a.category);

CREATE INDEX activity_season IF NOT EXISTS
FOR (a:Activity) ON (a.season);

// Tag indexes
CREATE INDEX tag_category IF NOT EXISTS
FOR (t:Tag) ON (t.category);

// Chat indexes
CREATE INDEX chat_session_id IF NOT EXISTS
FOR (c:Chat) ON (c.session_id);

CREATE INDEX chat_timestamp IF NOT EXISTS
FOR (c:Chat) ON (c.timestamp);

// Question indexes
CREATE INDEX question_timestamp IF NOT EXISTS
FOR (q:Question) ON (q.timestamp);

// Answer indexes
CREATE INDEX answer_confidence IF NOT EXISTS
FOR (a:Answer) ON (a.confidence_score);

CREATE INDEX answer_type IF NOT EXISTS
FOR (a:Answer) ON (a.answer_type);

// TrendData indexes
CREATE INDEX trend_date IF NOT EXISTS
FOR (t:TrendData) ON (t.date);

// SecurityIncident indexes
CREATE INDEX incident_timestamp IF NOT EXISTS
FOR (s:SecurityIncident) ON (s.timestamp);

CREATE INDEX incident_violation_type IF NOT EXISTS
FOR (s:SecurityIncident) ON (s.violation_type);

CREATE INDEX incident_severity IF NOT EXISTS
FOR (s:SecurityIncident) ON (s.severity);

// ----------------------------------------------------------------------------
// 3. SAMPLE DATA (For testing - remove in production)
// ----------------------------------------------------------------------------

// Create sample regions
CREATE (r1:Region {
    id: 'region_stuttgart',
    name: 'Stuttgart',
    bundesland: 'Baden-Württemberg',
    coords: point({latitude: 48.7758, longitude: 9.1829}),
    population: 635911,
    description: 'Capital of Baden-Württemberg, known for automotive industry and wine culture'
})

CREATE (r2:Region {
    id: 'region_munich',
    name: 'Munich',
    bundesland: 'Bavaria',
    coords: point({latitude: 48.1351, longitude: 11.5820}),
    population: 1471508,
    description: 'Capital of Bavaria, famous for Oktoberfest, beer gardens, and culture'
})

CREATE (r3:Region {
    id: 'region_black_forest',
    name: 'Black Forest',
    bundesland: 'Baden-Württemberg',
    coords: point({latitude: 48.0, longitude: 8.0}),
    area_km2: 6009,
    description: 'Mountain range famous for hiking, cuckoo clocks, and Black Forest cake'
});

// Create sample activities
CREATE (a1:Activity {
    id: 'activity_wine_tour',
    name: 'Wine Tour',
    category: 'Culinary',
    season: ['Spring', 'Summer', 'Fall'],
    duration_hours: 4,
    difficulty: 'Easy',
    popularity: 0.85,
    description: 'Guided tour through vineyards with wine tasting'
})

CREATE (a2:Activity {
    id: 'activity_hiking',
    name: 'Mountain Hiking',
    category: 'Outdoor',
    season: ['Spring', 'Summer', 'Fall'],
    duration_hours: 6,
    difficulty: 'Medium',
    popularity: 0.92,
    description: 'Scenic hiking trails through forests and mountains'
})

CREATE (a3:Activity {
    id: 'activity_museum',
    name: 'Museum Visit',
    category: 'Culture',
    season: ['Winter', 'Spring', 'Summer', 'Fall'],
    duration_hours: 3,
    difficulty: 'Easy',
    popularity: 0.78,
    description: 'Explore local history and art museums'
})

CREATE (a4:Activity {
    id: 'activity_christmas_market',
    name: 'Christmas Market',
    category: 'Events',
    season: ['Winter'],
    duration_hours: 3,
    difficulty: 'Easy',
    popularity: 0.95,
    description: 'Traditional Christmas markets with crafts and mulled wine'
});

// Create sample tags
CREATE (t1:Tag {name: 'Wine Tourism', category: 'Activity Type'})
CREATE (t2:Tag {name: 'Outdoor', category: 'Activity Type'})
CREATE (t3:Tag {name: 'Culture', category: 'Activity Type'})
CREATE (t4:Tag {name: 'Family Friendly', category: 'Audience'})
CREATE (t5:Tag {name: 'Romantic', category: 'Atmosphere'})
CREATE (t6:Tag {name: 'Nature', category: 'Theme'})
CREATE (t7:Tag {name: 'Urban', category: 'Setting'})
CREATE (t8:Tag {name: 'Rural', category: 'Setting'})
CREATE (t9:Tag {name: 'Winter Activities', category: 'Season'})
CREATE (t10:Tag {name: 'Bavarian Culture', category: 'Regional'});

// ----------------------------------------------------------------------------
// 4. RELATIONSHIPS (Connect the data)
// ----------------------------------------------------------------------------

// Regions have activities
MATCH (r:Region {id: 'region_stuttgart'}), (a:Activity {id: 'activity_wine_tour'})
CREATE (r)-[:HAS_ACTIVITY {featured: true, last_updated: datetime()}]->(a);

MATCH (r:Region {id: 'region_stuttgart'}), (a:Activity {id: 'activity_museum'})
CREATE (r)-[:HAS_ACTIVITY {featured: false, last_updated: datetime()}]->(a);

MATCH (r:Region {id: 'region_black_forest'}), (a:Activity {id: 'activity_hiking'})
CREATE (r)-[:HAS_ACTIVITY {featured: true, last_updated: datetime()}]->(a);

MATCH (r:Region {id: 'region_munich'}), (a:Activity {id: 'activity_museum'})
CREATE (r)-[:HAS_ACTIVITY {featured: true, last_updated: datetime()}]->(a);

MATCH (r:Region {id: 'region_munich'}), (a:Activity {id: 'activity_christmas_market'})
CREATE (r)-[:HAS_ACTIVITY {featured: true, last_updated: datetime()}]->(a);

// Activities and regions tagged
MATCH (a:Activity {id: 'activity_wine_tour'}), (t:Tag {name: 'Wine Tourism'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_wine_tour'}), (t:Tag {name: 'Romantic'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_hiking'}), (t:Tag {name: 'Outdoor'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_hiking'}), (t:Tag {name: 'Nature'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_hiking'}), (t:Tag {name: 'Family Friendly'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_museum'}), (t:Tag {name: 'Culture'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_museum'}), (t:Tag {name: 'Family Friendly'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_christmas_market'}), (t:Tag {name: 'Winter Activities'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (a:Activity {id: 'activity_christmas_market'}), (t:Tag {name: 'Family Friendly'})
CREATE (a)-[:TAGGED_AS]->(t);

MATCH (r:Region {id: 'region_stuttgart'}), (t:Tag {name: 'Urban'})
CREATE (r)-[:TAGGED_AS]->(t);

MATCH (r:Region {id: 'region_munich'}), (t:Tag {name: 'Urban'})
CREATE (r)-[:TAGGED_AS]->(t);

MATCH (r:Region {id: 'region_munich'}), (t:Tag {name: 'Bavarian Culture'})
CREATE (r)-[:TAGGED_AS]->(t);

MATCH (r:Region {id: 'region_black_forest'}), (t:Tag {name: 'Rural'})
CREATE (r)-[:TAGGED_AS]->(t);

MATCH (r:Region {id: 'region_black_forest'}), (t:Tag {name: 'Nature'})
CREATE (r)-[:TAGGED_AS]->(t);

// Create a sample trend data point
CREATE (trend:TrendData {
    id: 'trend_2024_winter',
    ref_to_vector_db: 'vector_id_12345',
    summary: 'Christmas markets in Bavaria show 30% increase in bookings for Winter 2024',
    date: date('2024-12-01'),
    confidence: 0.89,
    source: 'Booking Analytics Q4 2024'
})

WITH trend
MATCH (t:Tag {name: 'Winter Activities'}), (r:Region {id: 'region_munich'})
CREATE (trend)-[:RELATES_TO]->(t)
CREATE (trend)-[:MENTIONS_REGION]->(r);

