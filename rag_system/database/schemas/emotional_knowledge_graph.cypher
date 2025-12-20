// ============================================================================
// AIlessia Emotional Knowledge Graph - Ultra-Luxury Experience Schema
// ============================================================================
// This schema enables emotional reasoning for ultra-high-net-worth clients
// Every node and relationship must support AIlessia's emotional intelligence
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CONSTRAINTS
// ----------------------------------------------------------------------------

// Experience constraints
CREATE CONSTRAINT experience_id IF NOT EXISTS
FOR (e:Experience) REQUIRE e.id IS UNIQUE;

// Destination constraints
CREATE CONSTRAINT destination_id IF NOT EXISTS
FOR (d:Destination) REQUIRE d.id IS UNIQUE;

// Client Profile constraints
CREATE CONSTRAINT client_profile_id IF NOT EXISTS
FOR (cp:ClientProfile) REQUIRE cp.id IS UNIQUE;

// Emotional Tag constraints
CREATE CONSTRAINT emotional_tag_name IF NOT EXISTS
FOR (et:EmotionalTag) REQUIRE et.name IS UNIQUE;

// ----------------------------------------------------------------------------
// 2. INDEXES for Performance
// ----------------------------------------------------------------------------

// Experience indexes
CREATE INDEX experience_luxury_tier IF NOT EXISTS
FOR (e:Experience) ON (e.luxury_tier);

CREATE INDEX experience_exclusivity IF NOT EXISTS
FOR (e:Experience) ON (e.exclusivity_score);

CREATE INDEX experience_emotions IF NOT EXISTS
FOR (e:Experience) ON (e.primary_emotions);

// Destination indexes
CREATE INDEX destination_luxury IF NOT EXISTS
FOR (d:Destination) ON (d.luxury_reputation);

CREATE INDEX destination_wealth_tier IF NOT EXISTS
FOR (d:Destination) ON (d.typical_visitor_wealth);

// Client Profile indexes
CREATE INDEX client_archetype IF NOT EXISTS
FOR (cp:ClientProfile) ON (cp.primary_archetype);

CREATE INDEX client_wealth_tier IF NOT EXISTS
FOR (cp:ClientProfile) ON (cp.estimated_wealth_tier);

// ----------------------------------------------------------------------------
// 3. EXPERIENCE NODES (Ultra-Luxury)
// ----------------------------------------------------------------------------

// Sample Ultra-Premium Experience: Private Yacht Sunset
CREATE (exp1:Experience {
    id: "exp_private_yacht_sunset_monaco",
    name: "Private Sunset Yacht Experience - Monaco Coastline",
    
    // Luxury Positioning
    luxury_tier: "Ultra-Premium",
    exclusivity_score: 0.95,
    prestige_factor: 0.92,
    price_point_eur: 8500,
    
    // Emotional Intelligence
    primary_emotions: ["Romance", "Prestige", "Serenity", "Intimacy"],
    emotional_arc: "Anticipation → Wonder → Connection → Fulfillment",
    transformational_potential: 0.88,
    memory_intensity: 0.94,
    
    // Sensory Profile
    sensory_visual: "Golden hour light on azure water, champagne bubbles catching sunlight",
    sensory_auditory: "Gentle waves, distant yacht bells, intimate conversation",
    sensory_tactile: "Warm teak deck, cool champagne flute, sea breeze",
    sensory_olfactory: "Salt air, expensive perfume, fresh citrus",
    sensory_gustatory: "Dom Pérignon 2008, fresh oysters, Mediterranean herbs",
    
    // Cinematic Elements
    cinematic_hook: "As the Mediterranean sun melts into gold, time suspends between champagne bubbles and whispered promises...",
    signature_moment: "Toast at the exact moment sun touches horizon - captain times it perfectly",
    anticipation_builder_1: "Boarding private tender from Port Hercules",
    anticipation_builder_2: "Champagne service as engines start",
    anticipation_builder_3: "Captain reveals secret cove location",
    
    // Story-Driven Context
    narrative_theme: "Romantic Escape",
    character_archetypes: ["The Lovers", "The Celebrators"],
    ideal_story_position: "Crescendo moment",
    
    // Relationship Dynamics
    intimacy_level: 0.92,
    group_dynamics: "Couple-optimized",
    conversation_catalyst: true,
    
    // Psychological Triggers
    triggers_feeling_of: ["Freedom", "Achievement", "Romance", "Luxury", "Escape"],
    addresses_desires: ["Recognition", "Intimacy", "Adventure", "Status"],
    buying_psychology: "Experiential-Luxury",
    
    // Personality Fit Scores
    personality_romantic: 0.95,
    personality_achiever: 0.75,
    personality_adventurer: 0.60,
    personality_contemplative: 0.88,
    personality_hedonist: 0.90,
    personality_connoisseur: 0.82,
    
    // Practical Details (secondary)
    duration_hours: 3.5,
    capacity: "2-6 guests",
    optimal_time: "90 minutes before sunset",
    weather_dependent: true,
    advance_booking_days: 14,
    
    // Meta
    hidden_gem_score: 0.35,
    instagram_worthiness: 0.98,
    repeat_experience_value: 0.72,
    
    created_at: datetime(),
    updated_at: datetime()
})

// Sample Premium Experience: Michelin Private Dining
CREATE (exp2:Experience {
    id: "exp_michelin_private_dining_monaco",
    name: "Private Chef's Table at Le Louis XV",
    
    luxury_tier: "Ultra-Premium",
    exclusivity_score: 0.93,
    prestige_factor: 0.96,
    price_point_eur: 1200,
    
    primary_emotions: ["Sophistication", "Indulgence", "Discovery", "Prestige"],
    emotional_arc: "Anticipation → Delight → Sophistication → Satisfaction",
    transformational_potential: 0.75,
    memory_intensity: 0.89,
    
    sensory_visual: "Artful plating, crystal chandeliers, intimate lighting",
    sensory_auditory: "Hushed elegance, soft classical music, silver on porcelain",
    sensory_tactile: "Finest linens, Christofle silver, Baccarat crystal",
    sensory_olfactory: "Truffle essence, fresh herbs, reduction sauces",
    sensory_gustatory: "3 Michelin stars, Mediterranean haute cuisine, wine pairings",
    
    cinematic_hook: "In a room where royalty dined, your table awaits with secrets only the chef knows...",
    signature_moment: "Chef personally presents signature dish and shares its story",
    anticipation_builder_1: "Private entrance through kitchen",
    anticipation_builder_2: "Meeting the chef before service",
    anticipation_builder_3: "Sommelier presents rare vintage",
    
    narrative_theme: "Culinary Journey",
    character_archetypes: ["The Connoisseur", "The Celebrators"],
    ideal_story_position: "Building",
    
    intimacy_level: 0.88,
    group_dynamics: "Couple or Small-Group",
    conversation_catalyst: true,
    
    triggers_feeling_of: ["Sophistication", "Prestige", "Discovery", "Indulgence"],
    addresses_desires: ["Status", "Expertise", "Sensory Pleasure", "Recognition"],
    buying_psychology: "Status-Experiential",
    
    personality_romantic: 0.82,
    personality_achiever: 0.90,
    personality_adventurer: 0.65,
    personality_contemplative: 0.70,
    personality_hedonist: 0.95,
    personality_connoisseur: 0.98,
    
    duration_hours: 4.0,
    capacity: "2-8 guests",
    optimal_time: "Evening",
    weather_dependent: false,
    advance_booking_days: 30,
    
    hidden_gem_score: 0.25,
    instagram_worthiness: 0.92,
    repeat_experience_value: 0.68,
    
    created_at: datetime(),
    updated_at: datetime()
})

// Sample Experience: Spa & Wellness
CREATE (exp3:Experience {
    id: "exp_thermes_marins_wellness_monaco",
    name: "Thermes Marins Monte-Carlo - Private Wellness Journey",
    
    luxury_tier: "Premium",
    exclusivity_score: 0.82,
    prestige_factor: 0.88,
    price_point_eur: 950,
    
    primary_emotions: ["Serenity", "Renewal", "Luxury", "Self-Care"],
    emotional_arc: "Tension → Release → Tranquility → Renewal",
    transformational_potential: 0.85,
    memory_intensity: 0.78,
    
    sensory_visual: "Sea views, minimalist luxury, soft lighting, natural materials",
    sensory_auditory: "Gentle waves, soft music, peaceful silence",
    sensory_tactile: "Warm stones, expert hands, luxurious robes, heated beds",
    sensory_olfactory: "Marine minerals, essential oils, eucalyptus",
    sensory_gustatory: "Herbal infusions, fresh fruit, light refreshments",
    
    cinematic_hook: "Where the Mediterranean whispers and tension dissolves into memory...",
    signature_moment: "Private seawater pool session with sunset views",
    anticipation_builder_1: "Welcome ritual with champagne and assessment",
    anticipation_builder_2: "Personalized aromatherapy selection",
    anticipation_builder_3: "Access to private relaxation suite",
    
    narrative_theme: "Renewal & Restoration",
    character_archetypes: ["The Seeker", "The Healer"],
    ideal_story_position: "Resolution",
    
    intimacy_level: 0.75,
    group_dynamics: "Solo or Couple",
    conversation_catalyst: false,
    
    triggers_feeling_of: ["Peace", "Renewal", "Luxury", "Self-Love"],
    addresses_desires: ["Restoration", "Self-Care", "Escape", "Pampering"],
    buying_psychology: "Transformational",
    
    personality_romantic: 0.78,
    personality_achiever: 0.65,
    personality_adventurer: 0.45,
    personality_contemplative: 0.92,
    personality_hedonist: 0.85,
    personality_connoisseur: 0.75,
    
    duration_hours: 6.0,
    capacity: "1-2 guests",
    optimal_time: "Morning or Afternoon",
    weather_dependent: false,
    advance_booking_days: 7,
    
    hidden_gem_score: 0.45,
    instagram_worthiness: 0.75,
    repeat_experience_value: 0.88,
    
    created_at: datetime(),
    updated_at: datetime()
})

// ----------------------------------------------------------------------------
// 4. DESTINATION NODES (Emotional Geography)
// ----------------------------------------------------------------------------

CREATE (dest1:Destination {
    id: "dest_french_riviera",
    name: "French Riviera",
    region: "Côte d'Azur",
    country: "France",
    
    // Luxury Character
    luxury_reputation: 0.96,
    celebrity_quotient: 0.94,
    wealth_perception: "Old Money meets New Money",
    
    // Emotional Signature
    emotional_character: "Glamorous, Sensual, Timeless, Sophisticated",
    dominant_feelings: ["Prestige", "Romance", "Sophistication", "Indulgence"],
    atmosphere: "Effortlessly elegant with Mediterranean warmth",
    
    // Sensory Identity
    signature_scents: ["Lavender fields", "Sea salt", "Fresh croissants", "Expensive perfume"],
    signature_sounds: ["French conversation", "Yacht engines", "Jazz clubs", "Mediterranean waves"],
    signature_sights: ["Azure coastline", "Superyachts", "Belle Époque architecture", "Sunset over Cap Ferrat"],
    
    // Client Profiles
    attracts_personalities: ["The Romantic", "The Connoisseur", "The Status-Seeker", "The Hedonist"],
    typical_visitor_wealth: "UHNW",
    discretion_level: 0.85,
    
    // Story Potential
    narrative_themes: ["Romance", "Luxury Legacy", "Artistic Inspiration", "Celebration"],
    famous_love_stories: ["Grace Kelly & Prince Rainier", "F. Scott & Zelda Fitzgerald"],
    cultural_references: ["To Catch a Thief", "Grace Kelly mystique", "Jazz Age glamour"],
    
    // Seasonal Emotional Shifts
    spring_emotion: "Renewal",
    spring_character: "Blooming, Fresh, Optimistic",
    summer_emotion: "Indulgence",
    summer_character: "Vibrant, Glamorous, Hedonistic",
    fall_emotion: "Sophistication",
    fall_character: "Refined, Cultural, Intimate",
    winter_emotion: "Serenity",
    winter_character: "Peaceful, Exclusive, Cozy",
    
    // Practical
    best_months: ["May", "June", "September", "October"],
    peak_season: ["July", "August"],
    
    created_at: datetime(),
    updated_at: datetime()
})

// ----------------------------------------------------------------------------
// 5. EMOTIONAL TAG NODES
// ----------------------------------------------------------------------------

CREATE (et1:EmotionalTag {name: "Romance", category: "Primary Emotion", intensity: "High"})
CREATE (et2:EmotionalTag {name: "Prestige", category: "Primary Emotion", intensity: "High"})
CREATE (et3:EmotionalTag {name: "Serenity", category: "Primary Emotion", intensity: "Medium"})
CREATE (et4:EmotionalTag {name: "Indulgence", category: "Primary Emotion", intensity: "High"})
CREATE (et5:EmotionalTag {name: "Sophistication", category: "Primary Emotion", intensity: "High"})
CREATE (et6:EmotionalTag {name: "Discovery", category: "Primary Emotion", intensity: "Medium"})
CREATE (et7:EmotionalTag {name: "Renewal", category: "Primary Emotion", intensity: "Medium"})
CREATE (et8:EmotionalTag {name: "Intimacy", category: "Desire", intensity: "High"})
CREATE (et9:EmotionalTag {name: "Achievement", category: "Trigger", intensity: "High"})
CREATE (et10:EmotionalTag {name: "Freedom", category: "Trigger", intensity: "High"})

// ----------------------------------------------------------------------------
// 6. CLIENT PROFILE ARCHETYPES (Templates)
// ----------------------------------------------------------------------------

CREATE (arch1:ClientArchetype {
    name: "The Romantic",
    description: "Seeks connection, intimacy, meaning",
    primary_desires: ["Connection", "Intimacy", "Romance", "Meaning"],
    triggers: ["Exclusivity", "Personal touch", "Storytelling", "Surprise"],
    ideal_experiences: ["Romantic dinners", "Sunset experiences", "Intimate settings", "Couple activities"],
    communication_style: "Emotional, narrative-driven",
    decision_making: "Heart-led, quick when emotionally moved"
})

CREATE (arch2:ClientArchetype {
    name: "The Achiever",
    description: "Driven by success, recognition, status",
    primary_desires: ["Recognition", "Status", "Excellence", "Victory"],
    triggers: ["Best available", "Exclusive access", "Prestige brands", "Recognition"],
    ideal_experiences: ["VIP experiences", "Status symbols", "Competitive activities", "Achievement moments"],
    communication_style: "Direct, goal-oriented",
    decision_making: "Logical but status-influenced"
})

CREATE (arch3:ClientArchetype {
    name: "The Hedonist",
    description: "Pursues pleasure, indulgence, sensory experiences",
    primary_desires: ["Pleasure", "Indulgence", "Sensory delight", "Luxury"],
    triggers: ["Sensory richness", "Indulgence", "Finest quality", "Pleasure"],
    ideal_experiences: ["Michelin dining", "Spa treatments", "Wine tastings", "Sensory journeys"],
    communication_style: "Descriptive, sensory-focused",
    decision_making: "Pleasure-seeking, immediate gratification"
})

CREATE (arch4:ClientArchetype {
    name: "The Contemplative",
    description: "Seeks meaning, transformation, insight",
    primary_desires: ["Meaning", "Transformation", "Growth", "Insight"],
    triggers: ["Depth", "Authenticity", "Wisdom", "Reflection"],
    ideal_experiences: ["Transformational journeys", "Cultural immersion", "Reflective spaces", "Meaningful rituals"],
    communication_style: "Thoughtful, philosophical",
    decision_making: "Deliberate, meaning-driven"
})

CREATE (arch5:ClientArchetype {
    name: "The Connoisseur",
    description: "Values craft, authenticity, expertise",
    primary_desires: ["Expertise", "Authenticity", "Craftsmanship", "Quality"],
    triggers: ["Provenance", "Expertise", "Rarity", "Heritage"],
    ideal_experiences: ["Private tours", "Expert-led experiences", "Artisan meetings", "Behind-the-scenes"],
    communication_style: "Knowledgeable, detail-oriented",
    decision_making: "Research-driven, quality-focused"
})

CREATE (arch6:ClientArchetype {
    name: "The Adventurer",
    description: "Craves novelty, challenge, stories",
    primary_desires: ["Adventure", "Novelty", "Challenge", "Stories"],
    triggers: ["Uniqueness", "Challenge", "First experiences", "Story-worthy"],
    ideal_experiences: ["Adventure activities", "Unique experiences", "Off-beaten-path", "Physical challenges"],
    communication_style: "Energetic, story-focused",
    decision_making: "Spontaneous, excitement-driven"
})

// ----------------------------------------------------------------------------
// 7. EMOTIONAL RELATIONSHIPS
// ----------------------------------------------------------------------------

// Experiences in Destinations
CREATE (exp1)-[:LOCATED_IN {
    access_time_minutes: 15,
    access_method: "Private car or yacht tender",
    ideal_timing: "Evening"
}]->(dest1)

CREATE (exp2)-[:LOCATED_IN {
    access_time_minutes: 10,
    access_method: "Private car",
    ideal_timing: "Evening"
}]->(dest1)

CREATE (exp3)-[:LOCATED_IN {
    access_time_minutes: 5,
    access_method: "Walking from hotels",
    ideal_timing: "Morning or Afternoon"
}]->(dest1)

// Complementary Experiences (Emotional Journey)
CREATE (exp3)-[:COMPLEMENTS_EMOTIONALLY {
    journey_type: "Preparation → Celebration",
    emotional_transition: "Renewal prepares body and spirit for romantic evening",
    timing: "Morning wellness, evening yacht experience",
    combined_emotional_impact: 0.94,
    why_powerful: "Physical renewal heightens sensory awareness for intimate evening",
    user_testimonial: "The spa made me feel alive again, and the sunset felt like a rebirth",
    sequence_order: 1
}]->(exp1)

CREATE (exp1)-[:COMPLEMENTS_EMOTIONALLY {
    journey_type: "Romantic Climax → Culinary Sophistication",
    emotional_transition: "Romantic connection deepens over exquisite cuisine",
    timing: "Yacht at sunset, dinner follows naturally",
    combined_emotional_impact: 0.96,
    why_powerful: "Emotional openness from sunset enhances appreciation of culinary artistry",
    user_testimonial: "After that sunset, every bite tasted like poetry",
    sequence_order: 2
}]->(exp2)

// Emotional Contrast (Palette Cleansing)
CREATE (exp3)-[:CREATES_CONTRAST {
    contrast_type: "Contemplative → Celebratory",
    palette_cleansing: true,
    emotional_range_expansion: 0.88,
    why_matters: "Tranquility creates space for joy to burst through",
    timing_gap: "4-6 hours between experiences"
}]->(exp2)

// Transformational Sequence
CREATE (exp3)-[:PART_OF_TRANSFORMATION {
    transformation_arc: "Release → Connection → Integration",
    position_in_arc: "Release",
    cumulative_impact: 0.91,
    psychological_progression: "Letting go of tension to make space for connection"
}]->(exp1)

CREATE (exp1)-[:PART_OF_TRANSFORMATION {
    transformation_arc: "Release → Connection → Integration",
    position_in_arc: "Connection",
    cumulative_impact: 0.93,
    psychological_progression: "Deepening intimacy through shared wonder"
}]->(exp2)

// Personality Fit Relationships
CREATE (exp1)-[:IDEAL_FOR_ARCHETYPE {
    fit_score: 0.95,
    why_perfect: "Combines romance, prestige, and intimate connection",
    timing_in_journey: "Crescendo moment"
}]->(arch1)

CREATE (exp2)-[:IDEAL_FOR_ARCHETYPE {
    fit_score: 0.98,
    why_perfect: "Ultimate appreciation of culinary craft and expertise",
    timing_in_journey: "Sophisticated celebration"
}]->(arch5)

CREATE (exp3)-[:IDEAL_FOR_ARCHETYPE {
    fit_score: 0.92,
    why_perfect: "Transformational renewal and inner journey",
    timing_in_journey: "Preparation or integration"
}]->(arch4)

// Emotional Tags on Experiences
CREATE (exp1)-[:EVOKES_EMOTION {strength: 0.95, primary: true}]->(et1)
CREATE (exp1)-[:EVOKES_EMOTION {strength: 0.92, primary: true}]->(et2)
CREATE (exp1)-[:EVOKES_EMOTION {strength: 0.88, primary: false}]->(et3)
CREATE (exp1)-[:EVOKES_EMOTION {strength: 0.90, primary: true}]->(et8)

CREATE (exp2)-[:EVOKES_EMOTION {strength: 0.90, primary: true}]->(et5)
CREATE (exp2)-[:EVOKES_EMOTION {strength: 0.95, primary: true}]->(et4)
CREATE (exp2)-[:EVOKES_EMOTION {strength: 0.88, primary: true}]->(et2)

CREATE (exp3)-[:EVOKES_EMOTION {strength: 0.95, primary: true}]->(et3)
CREATE (exp3)-[:EVOKES_EMOTION {strength: 0.92, primary: true}]->(et7)

// Social Dynamics Enabler
CREATE (exp1)-[:ENABLES_CONNECTION {
    connection_type: "Creates shared vulnerability and wonder",
    intimacy_deepening: 0.92,
    conversation_catalyst_strength: 0.94,
    memory_bonding: true,
    silence_comfortable: true
}]->(exp2)

// ----------------------------------------------------------------------------
// 8. SAMPLE QUERIES FOR AIlessia
// ----------------------------------------------------------------------------

// Query: Find experiences perfect for romantic anniversary
// MATCH (e:Experience)-[:IDEAL_FOR_ARCHETYPE]->(a:ClientArchetype {name: "The Romantic"})
// WHERE e.luxury_tier = "Ultra-Premium"
// RETURN e.name, e.cinematic_hook, e.emotional_arc
// ORDER BY e.exclusivity_score DESC

// Query: Build emotional journey sequence
// MATCH path = (e1:Experience)-[:COMPLEMENTS_EMOTIONALLY*1..3]->(e2:Experience)
// WHERE e1.id = "exp_thermes_marins_wellness_monaco"
// RETURN path

// Query: Find experiences that trigger specific feelings
// MATCH (e:Experience)
// WHERE "Freedom" IN e.triggers_feeling_of AND "Romance" IN e.triggers_feeling_of
// RETURN e.name, e.primary_emotions, e.cinematic_hook
