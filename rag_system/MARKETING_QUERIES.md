# Marketing Campaign Queries - Neo4j Client Engagement Graph

## Overview
With clients now connected to Neo4j, you can create hyper-personalized marketing campaigns!

---

## 1. Find All Clients Interested in a Specific Experience

**Use Case:** Someone wants to book a yacht experience - send targeted campaign

```cypher
MATCH (cp:ClientProfile)-[i:INTERESTED_IN]->(e:Experience)
WHERE e.name CONTAINS "Yacht" 
  AND i.confidence > 0.7
RETURN cp.name, cp.email, cp.vip_status, 
       i.confidence, i.emotional_resonance
ORDER BY i.confidence DESC, cp.lifetime_value_eur DESC
```

---

## 2. Segment by Personality + Emotion + Wealth

**Use Case:** Campaign for "Romantic UHNW Clients" interested in intimate experiences

```cypher
MATCH (cp:ClientProfile)-[:IDENTIFIES_AS]->(arch:ClientArchetype {name: "The Romantic"})
WHERE cp.estimated_wealth_tier = "UHNW"
  AND cp.engagement_score > 0.7
MATCH (cp)-[r:RESONATES_WITH]->(et:EmotionalTag {name: "Romance"})
WHERE r.strength > 0.85
RETURN cp.name, cp.email, cp.lifetime_value_eur, 
       r.strength AS romance_resonance
ORDER BY cp.lifetime_value_eur DESC
LIMIT 100
```

---

## 3. Re-targeting: Viewed But Didn't Book

**Use Case:** Follow-up campaign for "interested but didn't convert"

```cypher
MATCH (cp:ClientProfile)-[v:VIEWED]->(e:Experience)
WHERE NOT (cp)-[:BOOKED]->(e)
  AND v.timestamp > datetime() - duration({days: 30})
  AND v.response = "interested"
RETURN cp.name, cp.email, e.name AS experience,
       v.timestamp AS last_viewed,
       v.emotional_state AS their_mood
ORDER BY cp.engagement_score DESC
```

---

## 4. Find High-Value Clients Who Haven't Engaged Recently

**Use Case:** Re-engagement campaign for dormant VIPs

```cypher
MATCH (cp:ClientProfile)
WHERE cp.estimated_wealth_tier IN ["UHNW", "HNW"]
  AND cp.lifetime_value_eur > 100000
  AND cp.last_interaction < datetime() - duration({months: 3})
  AND NOT (cp)-[:BOOKED]->()
RETURN cp.name, cp.email, cp.primary_archetype,
       cp.lifetime_value_eur, cp.last_interaction
ORDER BY cp.lifetime_value_eur DESC
```

---

## 5. Lookalike Audience (Find Similar High-Value Clients)

**Use Case:** Expand targeting based on best customers

```cypher
// First, find characteristics of high-value converters
MATCH (converter:ClientProfile)-[:BOOKED]->(e:Experience)
WHERE converter.lifetime_value_eur > 150000
WITH converter.primary_archetype AS top_archetype, 
     converter.estimated_wealth_tier AS top_tier
MATCH (lookalike:ClientProfile)
WHERE lookalike.primary_archetype = top_archetype
  AND lookalike.estimated_wealth_tier = top_tier
  AND NOT (lookalike)-[:BOOKED]->()
  AND lookalike.engagement_score > 0.6
RETURN lookalike.name, lookalike.email, 
       lookalike.primary_archetype, lookalike.engagement_score
ORDER BY lookalike.engagement_score DESC
LIMIT 100
```

---

## 6. Upsell Opportunities (Completed → Suggest Complementary)

**Use Case:** Clients who completed an experience, suggest next one

```cypher
MATCH (cp:ClientProfile)-[:COMPLETED]->(e1:Experience)
WHERE cp.engagement_score > 0.75
MATCH (e1)-[:COMPLEMENTS_EMOTIONALLY]->(e2:Experience)
WHERE NOT (cp)-[:BOOKED]->(e2)
RETURN cp.name, cp.email, 
       e1.name AS completed_experience,
       e2.name AS suggest_next,
       e2.price_point_eur AS price,
       cp.lifetime_value_eur
ORDER BY cp.lifetime_value_eur DESC
```

---

## 7. Seasonal Campaigns by Emotion

**Use Case:** Spring romance campaign for couples

```cypher
MATCH (cp:ClientProfile)-[r:RESONATES_WITH]->(et:EmotionalTag)
WHERE et.name IN ["Romance", "Serenity"]
  AND r.strength > 0.80
WITH cp, count(et) AS emotion_matches
WHERE emotion_matches >= 2
  AND cp.engagement_score > 0.7
MATCH (cp)-[:IDENTIFIES_AS]->(arch:ClientArchetype)
WHERE arch.name IN ["The Romantic", "The Contemplative"]
RETURN cp.name, cp.email, cp.primary_archetype,
       emotion_matches, cp.vip_status
ORDER BY cp.lifetime_value_eur DESC
LIMIT 100
```

---

## 8. Find Brand Ambassadors (High Satisfaction + Influencers)

**Use Case:** Identify clients for referral program

```cypher
MATCH (cp:ClientProfile)-[c:COMPLETED]->(e:Experience)
WHERE c.satisfaction_rating >= 5
  AND c.would_recommend = true
WITH cp, count(c) AS perfect_experiences
WHERE perfect_experiences >= 2
MATCH (cp)-[inf:INFLUENCES]->()
WITH cp, perfect_experiences, count(inf) AS referrals
WHERE referrals > 0
RETURN cp.name, cp.email, perfect_experiences,
       referrals, cp.vip_status, cp.lifetime_value_eur
ORDER BY referrals DESC, cp.lifetime_value_eur DESC
```

---

## 9. Geographic Expansion (Interested in Destination but Haven't Visited)

**Use Case:** Target clients for new destination launch

```cypher
MATCH (cp:ClientProfile)-[a:ATTRACTED_TO]->(d:Destination {id: "dest_french_riviera"})
WHERE NOT (cp)-[:VISITED]->(d)
  AND a.visit_intent IN ["strong", "considering"]
RETURN cp.name, cp.email, cp.primary_archetype,
       a.attraction_score, a.ideal_season,
       cp.estimated_wealth_tier
ORDER BY a.attraction_score DESC, cp.lifetime_value_eur DESC
```

---

## 10. Behavioral Pattern Targeting

**Use Case:** Target clients exhibiting specific buying patterns

```cypher
MATCH (cp:ClientProfile)-[e:EXHIBITS_PATTERN]->(p:BehaviorPattern)
WHERE p.name = "romantic_sunset_seeker"
  AND e.confidence > 0.85
  AND NOT (cp)-[:BOOKED]->(:Experience {signature_moment: "sunset"})
RETURN cp.name, cp.email, cp.primary_archetype,
       e.confidence AS pattern_confidence,
       p.conversion_likelihood, p.average_booking_value
ORDER BY e.confidence DESC, cp.lifetime_value_eur DESC
```

---

## Python Integration Examples

### Track Interest During Conversation

```python
from database.client_sync_service import client_sync_service

# When AIlessia detects interest during conversation
await client_sync_service.track_experience_interest(
    account_id="8a1c5f08-ef9d-476f-9381-267b407f2ab6",
    experience_id="exp_private_yacht_sunset_monaco",
    confidence=0.92,
    trigger_words=["romantic", "escape", "intimate"],
    emotional_resonance=0.89,
    conversation_id="89673919-d70f-4968-9047-c022f8b9f1f3"
)
```

### Track Emotional Resonance

```python
# When AIlessia identifies strong emotional resonance
await client_sync_service.track_emotional_resonance(
    account_id="8a1c5f08-ef9d-476f-9381-267b407f2ab6",
    emotion_name="Romance",
    strength=0.95,
    discovered_through="conversation_analysis",
    manifestations=[
        "seeks_romantic_experiences",
        "values_intimacy",
        "attracted_to_sunset_imagery"
    ]
)
```

### Get Marketing Segment

```python
# Get all Romantics for a campaign
clients = await client_sync_service.get_marketing_segment(
    archetype="The Romantic",
    emotions=["Romance", "Intimacy"],
    wealth_tier="UHNW",
    min_engagement=0.7,
    limit=100
)

# Send personalized emails
for client in clients:
    send_campaign_email(
        to=client["email"],
        template="spring_romance_2025",
        personalization={
            "name": client["name"],
            "archetype": client["archetype"],
            "vip_status": client["vip_status"]
        }
    )
```

### Find Interested Clients for Specific Experience

```python
# Get everyone interested in the yacht experience
interested_clients = await client_sync_service.get_interested_clients_for_experience(
    experience_id="exp_private_yacht_sunset_monaco",
    min_confidence=0.7
)

print(f"Found {len(interested_clients)} interested clients!")
```

---

## Campaign ROI Tracking

Track campaign performance directly in Neo4j:

```cypher
// Create campaign and track conversions
MATCH (cp:ClientProfile {email: "victoria.sterling@example.com"})
MATCH (campaign:Campaign {id: "spring_romance_monaco_2025"})
MERGE (cp)-[t:TARGETED_BY_CAMPAIGN]->(campaign)
SET t.targeting_date = datetime(),
    t.personalization_score = 0.91,
    t.message_variant = "intimate_renewal",
    t.channel = "email",
    t.sent = true,
    t.opened = true,
    t.clicked = true,
    t.converted = true,
    t.conversion_value_eur = 9700

// Calculate campaign ROI
MATCH (campaign:Campaign {id: "spring_romance_monaco_2025"})
MATCH (cp)-[t:TARGETED_BY_CAMPAIGN]->(campaign)
WHERE t.converted = true
WITH campaign, sum(t.conversion_value_eur) AS revenue
SET campaign.actual_revenue_eur = revenue,
    campaign.roi = (revenue - campaign.budget_eur) / campaign.budget_eur
RETURN campaign.name, campaign.roi, revenue
```

---

## Export for Marketing Tools

Export segments for use in email marketing platforms:

```cypher
MATCH (cp:ClientProfile)-[:RESONATES_WITH]->(:EmotionalTag {name: "Romance"})
WHERE cp.vip_status IN ["Platinum", "Gold"]
  AND cp.engagement_score > 0.7
RETURN cp.email AS email,
       cp.name AS name,
       cp.primary_archetype AS archetype,
       cp.vip_status AS vip_level,
       cp.estimated_wealth_tier AS wealth_tier
ORDER BY cp.lifetime_value_eur DESC
```

Export as CSV and import into your email platform!

---

## Summary

You now have:
- ✅ **Clients connected to Neo4j** for behavioral tracking
- ✅ **Emotional resonance tracking** for personalization
- ✅ **Interest & booking tracking** for conversion analysis
- ✅ **Marketing segmentation** by personality + emotion + wealth
- ✅ **Campaign attribution** and ROI measurement
- ✅ **Behavioral pattern recognition** for predictive targeting

**Next Steps:**
1. Run the emotional knowledge graph schema in Neo4j
2. Run the client engagement graph schema in Neo4j
3. Sync existing Supabase clients to Neo4j
4. Start tracking interactions during conversations
5. Build your first marketing campaign!


