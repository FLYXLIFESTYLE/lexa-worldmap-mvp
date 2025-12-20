// ============================================================================
// Client Engagement & Marketing Intelligence Graph
// ============================================================================
// This schema connects Supabase client accounts to Neo4j emotional graph
// Enables hyper-personalized marketing and behavioral insights
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CLIENT PROFILE NODES (Individual Clients from Supabase)
// ----------------------------------------------------------------------------

// Each client from Supabase gets a ClientProfile node in Neo4j
// This is created/updated when they interact with AIlessia

// Example Client Profile (synced from Supabase)
CREATE (cp1:ClientProfile {
    id: "8a1c5f08-ef9d-476f-9381-267b407f2ab6",  // Matches Supabase UUID
    email: "victoria.sterling@example.com",
    name: "Victoria Sterling",
    
    // Personality & Emotional Intelligence
    primary_archetype: "The Romantic",
    secondary_archetype: "The Connoisseur",
    archetype_confidence: 0.87,
    
    // Wealth & Status Indicators (discrete)
    estimated_wealth_tier: "UHNW",
    vip_status: "Platinum",
    lifetime_value_eur: 125000,
    
    // Emotional Profile (learned by AIlessia)
    detected_emotions: ["seeking_escape", "romantic_longing", "achievement_celebration"],
    emotional_triggers: ["intimacy", "prestige", "exclusivity"],
    hidden_desires: ["reconnection", "feeling_alive", "being_seen"],
    vulnerability_index: 0.68,
    
    // Preferences (learned over time)
    preferred_destinations: ["French Riviera", "Amalfi Coast", "Santorini"],
    preferred_experiences: ["romantic", "culinary", "wellness"],
    preferred_luxury_tier: "Ultra-Premium",
    
    // Communication Style
    communication_preferences: {
        tone: "sophisticated_friend",
        detail_level: "story-driven",
        decision_speed: "quick_when_moved"
    },
    
    // Engagement Metrics
    total_conversations: 3,
    total_scripts_created: 1,
    total_bookings: 0,
    engagement_score: 0.78,
    
    // Timestamps
    first_interaction: datetime("2025-12-19T20:51:13Z"),
    last_interaction: datetime("2025-12-19T20:57:32Z"),
    
    // Sync Status
    supabase_synced: true,
    last_sync: datetime(),
    
    created_at: datetime(),
    updated_at: datetime()
})

// ----------------------------------------------------------------------------
// 2. INTERACTION TRACKING RELATIONSHIPS
// ----------------------------------------------------------------------------

// VIEWED: Client saw/was presented with an experience
CREATE (cp1)-[:VIEWED {
    timestamp: datetime(),
    context: "AIlessia recommendation",
    conversation_id: "89673919-d70f-4968-9047-c022f8b9f1f3",
    emotional_state: "seeking_escape",
    response: "interested",
    dwell_time_seconds: 45
}]->(exp1:Experience {id: "exp_private_yacht_sunset_monaco"})

// INTERESTED_IN: Client showed positive interest
CREATE (cp1)-[:INTERESTED_IN {
    timestamp: datetime(),
    confidence: 0.92,
    trigger_words: ["romantic", "escape", "reignite"],
    emotional_resonance: 0.89,
    conversation_id: "89673919-d70f-4968-9047-c022f8b9f1f3",
    source: "AIlessia conversation analysis"
}]->(exp1)

// BOOKMARKED: Client saved for later
CREATE (cp1)-[:BOOKMARKED {
    timestamp: datetime(),
    note: "For anniversary",
    reminder_date: date("2025-06-15"),
    priority: "high"
}]->(exp1)

// REQUESTED_INFO: Client asked for more details
CREATE (cp1)-[:REQUESTED_INFO {
    timestamp: datetime(),
    questions: ["What time exactly?", "Can we extend to 4 hours?", "Wine pairing options?"],
    urgency: "medium",
    follow_up_needed: true
}]->(exp1)

// BOOKED: Client made a booking
CREATE (cp1)-[:BOOKED {
    timestamp: datetime(),
    booking_id: "book_12345",
    booking_date: date("2025-06-20"),
    party_size: 2,
    total_value_eur: 8500,
    payment_status: "confirmed",
    
    // Booking Psychology
    decision_trigger: "AIlessia's emotional narrative",
    decision_time_minutes: 25,
    hesitation_points: ["price", "weather_concern"],
    closing_factor: "signature_moment_description",
    
    // Upsells Accepted
    upsells: ["champagne_upgrade", "photographer"],
    upsell_value_eur: 1200,
    
    // Marketing Attribution
    attributed_to: "AIlessia_conversation",
    campaign_id: "romantic_escape_q2_2025",
    referral_source: "organic"
}]->(exp1)

// COMPLETED: Client experienced it
CREATE (cp1)-[:COMPLETED {
    timestamp: datetime(),
    completion_date: date("2025-06-20"),
    
    // Experience Outcome
    satisfaction_rating: 5,
    emotional_resonance_rating: 5,
    exceeded_expectations: true,
    transformational_impact: 0.94,
    
    // Feedback
    testimonial: "The most perfect evening of our lives. Time stood still.",
    would_repeat: true,
    would_recommend: true,
    instagram_shared: true,
    
    // Emotional Journey Validation
    expected_emotions: ["Romance", "Prestige", "Intimacy"],
    experienced_emotions: ["Romance", "Wonder", "Connection", "Joy"],
    emotional_surprise: ["Wonder", "Timelessness"],
    
    // Future Implications
    interest_in_similar: true,
    emotional_appetite_increased: true,
    trust_in_ailessia: 0.98
}]->(exp1)

// RATED: Client provided rating
CREATE (cp1)-[:RATED {
    timestamp: datetime(),
    overall_rating: 5,
    value_rating: 5,
    emotional_resonance: 5,
    personalization: 5,
    comment: "AIlessia understood us perfectly"
}]->(exp1)

// REVIEWED: Client left detailed review
CREATE (cp1)-[:REVIEWED {
    timestamp: datetime(),
    rating: 5,
    title: "A Moment Suspended in Gold",
    review_text: "Words can't capture what we felt. The sunset, the champagne, the perfect timing of everything. AIlessia knew exactly what we needed.",
    helpfulness_votes: 47,
    verified_booking: true,
    photos_attached: 3
}]->(exp1)

// ----------------------------------------------------------------------------
// 3. EMOTIONAL AFFINITY RELATIONSHIPS
// ----------------------------------------------------------------------------

// RESONATES_WITH: Client deeply connects with emotion
CREATE (cp1)-[:RESONATES_WITH {
    strength: 0.95,
    discovered_through: ["conversation_analysis", "behavior_patterns"],
    manifestations: ["seeks_romantic_experiences", "values_intimacy", "attracted_to_sunset_imagery"],
    confidence: 0.91,
    first_detected: datetime("2025-12-19T20:51:13Z"),
    reinforced_count: 7
}]->(et1:EmotionalTag {name: "Romance"})

CREATE (cp1)-[:RESONATES_WITH {
    strength: 0.88,
    discovered_through: ["luxury_brand_associations", "status_indicators"],
    manifestations: ["seeks_exclusive_experiences", "responds_to_prestige_cues"],
    confidence: 0.84
}]->(et2:EmotionalTag {name: "Prestige"})

// AVOIDS: Client shows negative response to emotion
CREATE (cp1)-[:AVOIDS {
    strength: 0.76,
    reason: "Overwhelm avoidance",
    context: "Prefers intimate over crowded",
    discovered_through: "conversation_cues"
}]->(et_chaos:EmotionalTag {name: "High Energy"})

// ----------------------------------------------------------------------------
// 4. DESTINATION RELATIONSHIPS
// ----------------------------------------------------------------------------

// ATTRACTED_TO: Client shows interest in destination
CREATE (cp1)-[:ATTRACTED_TO {
    attraction_score: 0.93,
    reasons: ["romantic_reputation", "luxury_character", "intimate_scale"],
    discovered_through: "conversation_analysis",
    visit_intent: "strong",
    ideal_season: "spring",
    ideal_duration_days: 4
}]->(dest1:Destination {id: "dest_french_riviera"})

// VISITED: Client has been there
CREATE (cp1)-[:VISITED {
    visit_date: date("2025-06-20"),
    duration_days: 3,
    satisfaction: 0.96,
    memorable_moments: ["yacht_sunset", "le_louis_xv_dinner"],
    will_return: true,
    return_interest: 0.89
}]->(dest1)

// ----------------------------------------------------------------------------
// 5. ARCHETYPE RELATIONSHIPS
// ----------------------------------------------------------------------------

// IDENTIFIES_AS: Primary personality archetype
CREATE (cp1)-[:IDENTIFIES_AS {
    confidence: 0.87,
    detected_by: "AIlessia_emotion_analysis",
    manifestations: ["seeks_connection", "emotionally_driven_decisions", "values_meaning"],
    stability: "high",
    first_detected: datetime("2025-12-19T20:51:13Z")
}]->(arch1:ClientArchetype {name: "The Romantic"})

// EXHIBITS_TRAITS_OF: Secondary archetype
CREATE (cp1)-[:EXHIBITS_TRAITS_OF {
    confidence: 0.72,
    traits: ["appreciates_quality", "values_expertise", "detail_oriented"],
    situations: ["culinary_experiences", "wine_selection"]
}]->(arch5:ClientArchetype {name: "The Connoisseur"})

// ----------------------------------------------------------------------------
// 6. SOCIAL & INFLUENCE RELATIONSHIPS
// ----------------------------------------------------------------------------

// INFLUENCED_BY: Client was influenced by another client
CREATE (cp1)-[:INFLUENCED_BY {
    influence_type: "testimonial",
    strength: 0.78,
    context: "Read review before booking",
    timestamp: datetime()
}]->(cp_influencer:ClientProfile {id: "other_client_uuid"})

// INFLUENCES: Client influences others
CREATE (cp1)-[:INFLUENCES {
    influence_type: "referral",
    referred_count: 2,
    conversion_rate: 1.0,
    influence_value_eur: 15000
}]->(cp_referred:ClientProfile {id: "referred_client_uuid"})

// TRAVELS_WITH: Regular travel companion
CREATE (cp1)-[:TRAVELS_WITH {
    relationship: "partner",
    frequency: "always",
    dynamics: "romantic_couple",
    decision_maker: "shared",
    complementary_preferences: true
}]->(cp_partner:ClientProfile {id: "partner_uuid"})

// ----------------------------------------------------------------------------
// 7. MARKETING CAMPAIGN RELATIONSHIPS
// ----------------------------------------------------------------------------

// BELONGS_TO_SEGMENT: Marketing segmentation
CREATE (segment1:MarketingSegment {
    id: "romantic_escapists_q2_2025",
    name: "Romantic Escapists - Spring Collection",
    description: "UHNW couples seeking romantic renewal",
    criteria: {
        archetypes: ["The Romantic"],
        emotions: ["seeking_escape", "romantic_longing"],
        wealth_tier: "UHNW",
        engagement_min: 0.7
    },
    size: 347,
    average_ltv: 125000,
    conversion_rate: 0.68,
    created_date: date("2025-03-01")
})

CREATE (cp1)-[:BELONGS_TO_SEGMENT {
    added_date: datetime(),
    fit_score: 0.94,
    auto_segmented: true
}]->(segment1)

// TARGETED_BY_CAMPAIGN: Active marketing campaign
CREATE (campaign1:Campaign {
    id: "spring_romance_monaco_2025",
    name: "French Riviera Spring Romance Collection",
    description: "Curated romantic experiences for spring season",
    target_segment: "romantic_escapists_q2_2025",
    start_date: date("2025-03-01"),
    end_date: date("2025-05-31"),
    budget_eur: 50000,
    target_bookings: 30,
    actual_bookings: 0,
    roi: 0
})

CREATE (cp1)-[:TARGETED_BY_CAMPAIGN {
    targeting_date: datetime(),
    personalization_score: 0.91,
    message_variant: "intimate_renewal",
    channel: "email",
    sent: true,
    opened: true,
    clicked: true,
    converted: true,
    conversion_value_eur: 9700
}]->(campaign1)

// ----------------------------------------------------------------------------
// 8. BEHAVIORAL PATTERN NODES
// ----------------------------------------------------------------------------

CREATE (pattern1:BehaviorPattern {
    id: "romantic_sunset_seeker",
    name: "Romantic Sunset Seeker",
    description: "Gravitates toward sunset experiences with intimate settings",
    triggers: ["golden_hour", "intimate_settings", "champagne", "views"],
    common_emotions: ["Romance", "Serenity", "Connection"],
    typical_archetypes: ["The Romantic", "The Contemplative"],
    conversion_likelihood: 0.84,
    average_booking_value: 7500
})

CREATE (cp1)-[:EXHIBITS_PATTERN {
    confidence: 0.89,
    frequency: "consistent",
    detected_date: datetime(),
    evidence: ["viewed_3_sunset_experiences", "romantic_conversation_themes"]
}]->(pattern1)

// ----------------------------------------------------------------------------
// 9. LIFETIME VALUE & PREDICTION RELATIONSHIPS
// ----------------------------------------------------------------------------

CREATE (prediction1:ValuePrediction {
    client_id: "8a1c5f08-ef9d-476f-9381-267b407f2ab6",
    predicted_ltv_5yr: 500000,
    confidence: 0.82,
    factors: ["archetype_fit", "engagement_level", "wealth_tier", "satisfaction_trend"],
    churn_risk: 0.12,
    upsell_potential: 0.91,
    referral_likelihood: 0.87,
    predicted_date: datetime()
})

CREATE (cp1)-[:HAS_PREDICTION]->(prediction1)

// ----------------------------------------------------------------------------
// 10. SAMPLE MARKETING QUERIES
// ----------------------------------------------------------------------------

// Query 1: Find all clients interested in romantic yacht experiences
// MATCH (cp:ClientProfile)-[:INTERESTED_IN]->(e:Experience)
// WHERE e.id CONTAINS "yacht" AND "Romance" IN e.primary_emotions
// RETURN cp.name, cp.email, cp.engagement_score
// ORDER BY cp.estimated_wealth_tier DESC, cp.engagement_score DESC

// Query 2: Find UHNW Romantics who haven't booked in 6 months
// MATCH (cp:ClientProfile)-[:IDENTIFIES_AS]->(a:ClientArchetype {name: "The Romantic"})
// WHERE cp.estimated_wealth_tier = "UHNW"
//   AND cp.last_interaction < datetime() - duration({months: 6})
//   AND NOT (cp)-[:BOOKED]->()
// RETURN cp.name, cp.email, cp.last_interaction, cp.lifetime_value_eur
// ORDER BY cp.lifetime_value_eur DESC

// Query 3: Build lookalike audience for high-value converters
// MATCH (converter:ClientProfile)-[:BOOKED]->(e:Experience)
// WHERE converter.lifetime_value_eur > 100000
// WITH converter.primary_archetype AS archetype, 
//      converter.detected_emotions AS emotions,
//      converter.preferred_luxury_tier AS tier
// MATCH (lookalike:ClientProfile)
// WHERE lookalike.primary_archetype = archetype
//   AND lookalike.preferred_luxury_tier = tier
//   AND NOT (lookalike)-[:BOOKED]->()
// RETURN lookalike.name, lookalike.email, lookalike.engagement_score
// ORDER BY lookalike.engagement_score DESC
// LIMIT 100

// Query 4: Find clients who viewed but didn't book - retargeting list
// MATCH (cp:ClientProfile)-[v:VIEWED]->(e:Experience)
// WHERE NOT (cp)-[:BOOKED]->(e)
//   AND v.timestamp > datetime() - duration({days: 30})
// RETURN cp.name, cp.email, e.name, v.context, v.response
// ORDER BY cp.engagement_score DESC

// Query 5: Find clients resonating with specific emotion for themed campaign
// MATCH (cp:ClientProfile)-[r:RESONATES_WITH]->(et:EmotionalTag {name: "Romance"})
// WHERE r.strength > 0.85
//   AND cp.estimated_wealth_tier IN ["UHNW", "HNW"]
// MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// RETURN cp.name, cp.email, arch.name, r.strength, cp.lifetime_value_eur
// ORDER BY r.strength DESC, cp.lifetime_value_eur DESC
// LIMIT 50

// Query 6: Identify clients ready for upsell based on behavior
// MATCH (cp:ClientProfile)-[:COMPLETED]->(e1:Experience)
// WHERE cp.engagement_score > 0.75
//   AND NOT (cp)-[:BOOKED]->(:Experience {luxury_tier: "Ultra-Premium"})
// MATCH (e1)-[:COMPLEMENTS_EMOTIONALLY]->(e2:Experience {luxury_tier: "Ultra-Premium"})
// RETURN cp.name, cp.email, e1.name AS completed, e2.name AS suggest, 
//        cp.lifetime_value_eur, cp.primary_archetype
// ORDER BY cp.lifetime_value_eur DESC

// Query 7: Find brand ambassadors (high satisfaction + high influence)
// MATCH (cp:ClientProfile)-[c:COMPLETED]->(e:Experience)
// WHERE c.satisfaction_rating >= 5
//   AND c.would_recommend = true
//   AND exists((cp)-[:INFLUENCES]->())
// WITH cp, count(c) AS perfect_experiences
// WHERE perfect_experiences >= 2
// MATCH (cp)-[inf:INFLUENCES]->()
// WITH cp, perfect_experiences, count(inf) AS referrals
// RETURN cp.name, cp.email, perfect_experiences, referrals,
//        cp.vip_status, cp.lifetime_value_eur
// ORDER BY referrals DESC, cp.lifetime_value_eur DESC

// Query 8: Create dynamic segment for seasonal campaign
// MATCH (cp:ClientProfile)-[:RESONATES_WITH]->(et:EmotionalTag)
// WHERE et.name IN ["Romance", "Serenity", "Luxury"]
// WITH cp, count(et) AS emotion_matches
// WHERE emotion_matches >= 2
//   AND cp.engagement_score > 0.7
//   AND NOT (cp)-[:BOOKED]->(:Experience)-[:LOCATED_IN]->(:Destination {id: "dest_french_riviera"})
// MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
// WHERE arch.name IN ["The Romantic", "The Hedonist", "The Contemplative"]
// RETURN cp.name, cp.email, cp.primary_archetype, 
//        cp.estimated_wealth_tier, emotion_matches, cp.engagement_score
// ORDER BY cp.lifetime_value_eur DESC
// LIMIT 100


