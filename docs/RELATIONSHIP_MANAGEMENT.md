# Relationship Management in LEXA

## Overview

LEXA's Neo4j graph database contains **14 different relationship types** that connect POIs, destinations, themes, activities, and psychological nodes (emotions, desires, fears, needs). This document explains when, where, and how each relationship is created.

---

## Relationship Categories

### 1. **Geographic Relationships** (Structural)

These relationships form the geographic hierarchy and are created during **initial data import** from Cypher files.

| Relationship | From | To | When Created | Example |
|--------------|------|-----|--------------|---------|
| `LOCATED_IN` | POI | Destination | Import | `(Hotel du Cap)-[:LOCATED_IN]->(French Riviera)` |
| `IN_AREA` | Destination | Area | Import | `(French Riviera)-[:IN_AREA]->(Côte d'Azur)` |
| `IN_REGION` | Area | Region | Import | `(Côte d'Azur)-[:IN_REGION]->(Mediterranean)` |
| `IN_CONTINENT` | Region | Continent | Import | `(Mediterranean)-[:IN_CONTINENT]->(Europe)` |

**Who creates them:**
- Initial import: Cypher files (`cypher/*.cypher`)
- Data Quality Agent: Fills gaps for orphaned nodes (runs daily + on-demand)

**Properties:**
```cypher
{
  created_at: datetime(),
  verified: true
}
```

---

### 2. **Activity & Theme Relationships** (Content-Based)

These relationships define what activities a POI supports and what themes it relates to.

| Relationship | From | To | When Created | Example |
|--------------|------|-----|--------------|---------|
| `SUPPORTS_ACTIVITY` | POI | Activity Type | Import + Enrichment + AI Inference | `(Marina)-[:SUPPORTS_ACTIVITY]->(Sailing)` |
| `HAS_THEME` | POI | Theme Category | Import + Enrichment + AI Inference | `(Michelin Restaurant)-[:HAS_THEME]->(Culinary)` |
| `FEATURED_IN` | POI | Experience Category | AI Inference | `(Luxury Villa)-[:FEATURED_IN]->(Romantic Getaway)` |
| `BELONGS_TO` | POI | Experience Category | Data Quality Agent | `(Spa)-[:BELONGS_TO]->(Wellness)` |

**Who creates them:**
1. **Import**: Initial Cypher files based on POI type
2. **Enrichment Agent**: Adds relationships based on Google Places categories, Wikipedia content
3. **AI Inference**: LEXA infers from user conversations
4. **Data Quality Agent**: Fills gaps based on POI properties

**Properties:**
```cypher
{
  confidence: 0.0-1.0,
  evidence: 'type_match' | 'user_input' | 'enrichment',
  created_at: datetime(),
  inferred_by: 'ai' | 'enrichment' | 'import'
}
```

---

### 3. **Psychological Relationships** (AI-Inferred)

These relationships capture the emotional and psychological aspects of travel experiences. They are **exclusively created by AI** during LEXA conversations.

| Relationship | From | To | When Created | Example |
|--------------|------|-----|--------------|---------|
| `EVOKES` | POI | Emotion | AI Inference (User Input) | `(Sunset Beach)-[:EVOKES]->(Peace)` |
| `AMPLIFIES_DESIRE` | POI | Desire | AI Inference (User Input) | `(Hidden Cove)-[:AMPLIFIES_DESIRE]->(Discovery)` |
| `MITIGATES_FEAR` | POI | Fear | AI Inference (User Input) | `(Private Beach)-[:MITIGATES_FEAR]->(Crowds)` |
| `RELATES_TO` | POI | Need/Constraint | AI Inference (User Input) | `(Spa Resort)-[:RELATES_TO]->(Relaxation)` |

**Who creates them:**
- **LEXA AI** during conversations when users express:
  - Emotions: "I felt so peaceful there..."
  - Desires: "I want to discover hidden gems..."
  - Fears: "I'm afraid of crowded places..."
  - Needs: "I need complete relaxation..."

**When:**
- Real-time during user conversations
- After each user message in the intake phase
- When creating personalized travel experiences

**Properties:**
```cypher
{
  confidence: 0.6-1.0,
  evidence: 'user explicitly mentioned X',
  created_at: datetime(),
  inferred_by: 'ai',
  user_id: 'user_123' // Track which user contributed this insight
}
```

**Implementation:**
```typescript
// In LEXA conversation handler
import { inferAndCreateRelationships } from '@/lib/neo4j/relationship-inference';

// After each user message
const result = await inferAndCreateRelationships(
  userMessage,
  {
    currentPOIs: conversation.mentionedPOIs,
    destination: conversation.destination,
    themes: conversation.selectedThemes
  }
);

console.log(`Inferred ${result.inferred} relationships, created ${result.created}`);
```

---

### 4. **Time & Context Relationships** (Seasonal/Dynamic)

These relationships capture when and where experiences are best suited.

| Relationship | From | To | When Created | Example |
|--------------|------|-----|--------------|---------|
| `AVAILABLE_IN` | POI | Season/Month | Data Quality Agent + AI | `(Beach Club)-[:AVAILABLE_IN {months: ['Jun', 'Jul', 'Aug']}]->()` |
| `PROMINENT_IN` | POI | Destination | Data Quality Agent (luxury_score >= 85) | `(Eiffel Tower)-[:PROMINENT_IN]->(Paris)` |

**Who creates them:**
1. **Data Quality Agent**: Infers based on POI type and location
2. **AI Inference**: From user input about best visit times
3. **Enrichment**: From external data sources

**Properties:**
```cypher
// AVAILABLE_IN
{
  season: 'summer' | 'winter' | 'spring' | 'fall',
  months: ['May', 'June', 'July'],
  confidence: 0.0-1.0,
  reason: 'beach_seasonal_inference'
}

// PROMINENT_IN
{
  confidence: 0.0-1.0,
  reason: 'high_luxury_score' | 'user_popular' | 'editorial',
  prominence_score: 85-100
}
```

---

### 5. **Cross-Reference Relationships** (Semantic)

| Relationship | From | To | When Created | Example |
|--------------|------|-----|--------------|---------|
| `RELATES_TO` | POI | POI | AI Inference + Data Analysis | `(Vineyard)-[:RELATES_TO]->(Restaurant)` |

**Who creates them:**
- AI analysis of POI proximity and theme similarity
- User behavior patterns (users who liked X also liked Y)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   RELATIONSHIP CREATION FLOW                 │
└─────────────────────────────────────────────────────────────┘

1. INITIAL IMPORT (Cypher Files)
   ├─ LOCATED_IN, IN_AREA, IN_REGION, IN_CONTINENT
   ├─ SUPPORTS_ACTIVITY, HAS_THEME (basic)
   └─ BELONGS_TO (explicit categorization)

2. DATA QUALITY AGENT (Runs Daily at Midnight + On-Demand)
   ├─ Validates existing relationships
   ├─ Creates missing geographic hierarchy
   ├─ Infers SUPPORTS_ACTIVITY from POI type
   ├─ Creates PROMINENT_IN for high luxury_score POIs
   ├─ Adds AVAILABLE_IN for seasonal POIs
   └─ Fills gaps in BELONGS_TO

3. ENRICHMENT AGENT (During POI Enrichment)
   ├─ Google Places categories → SUPPORTS_ACTIVITY, HAS_THEME
   ├─ Wikipedia content → HAS_THEME, FEATURED_IN
   └─ OSM tags → SUPPORTS_ACTIVITY

4. AI INFERENCE (Real-time during LEXA conversations)
   ├─ User emotions → EVOKES
   ├─ User desires → AMPLIFIES_DESIRE
   ├─ User fears → MITIGATES_FEAR
   ├─ User needs → RELATES_TO
   ├─ User activity mentions → SUPPORTS_ACTIVITY
   └─ User theme interests → HAS_THEME, FEATURED_IN

5. USER BEHAVIOR (Future: Recommendation Engine)
   └─ Collaborative filtering → RELATES_TO (POI to POI)
```

---

## Implementation Guide

### Adding Relationships During Import

```cypher
// In your Cypher import files
MATCH (p:poi {poi_uid: 'hotel_123'})
MATCH (d:destination {name: 'French Riviera'})
MERGE (p)-[:LOCATED_IN {created_at: datetime()}]->(d)

MATCH (p)-[:LOCATED_IN]->(d)
MATCH (at:activity_type {name: 'Fine Dining'})
MERGE (p)-[:SUPPORTS_ACTIVITY {
  confidence: 0.9,
  evidence: 'verified_amenity'
}]->(at)
```

### AI-Powered Inference in LEXA Conversations

```typescript
// app/api/lexa/route.ts (or conversation handler)
import { inferAndCreateRelationships } from '@/lib/neo4j/relationship-inference';

export async function POST(req: Request) {
  const { message, conversationContext } = await req.json();
  
  // 1. Get LEXA response
  const lexaResponse = await generateLexaResponse(message);
  
  // 2. Infer and create relationships from user input
  const relationshipResult = await inferAndCreateRelationships(
    message,
    {
      currentPOIs: conversationContext.mentionedPOIs,
      destination: conversationContext.selectedDestination,
      themes: conversationContext.selectedThemes
    }
  );
  
  console.log(`AI inferred ${relationshipResult.inferred} relationships`);
  
  return Response.json({
    response: lexaResponse,
    relationshipsCreated: relationshipResult.created
  });
}
```

### Data Quality Agent Integration

```typescript
// lib/neo4j/data-quality-agent.ts
import { addSeasonalAvailability } from './relationship-inference';

export async function runFullCheck() {
  // ... (existing duplicate, unnamed POI checks)
  
  // Ensure all relationship types
  const relationStats = await ensureRelations();
  
  // Add seasonal availability
  const seasonalCount = await addSeasonalAvailability();
  
  // ... (rest of the checks)
}
```

---

## Relationship Priorities & Confidence Scores

When multiple sources create the same relationship, use **confidence scores** to determine which to keep:

| Source | Base Confidence | When to Boost |
|--------|----------------|---------------|
| Import | 0.9 | Always trusted (human-curated) |
| Enrichment (Google Places) | 0.8 | Multiple category matches |
| Enrichment (Wikipedia) | 0.7 | Explicit mention in content |
| AI Inference (Explicit) | 0.85-0.95 | User explicitly states emotion/desire |
| AI Inference (Implicit) | 0.6-0.75 | Inferred from context |
| Data Quality (Type Match) | 0.7 | Exact type match |

**Merge Strategy:**
```cypher
MERGE (p)-[r:EVOKES]->(e)
ON CREATE SET
  r.confidence = $confidence,
  r.evidence = $evidence
ON MATCH SET
  r.confidence = CASE
    WHEN $confidence > r.confidence THEN $confidence
    ELSE r.confidence
  END,
  r.updated_at = datetime()
```

---

## Querying Relationships

### Find POIs that evoke specific emotions
```cypher
MATCH (p:poi)-[r:EVOKES {confidence: >= 0.8}]->(e:Emotion {name: 'Peace'})
RETURN p, r, e
```

### Find activities supported by high-luxury POIs
```cypher
MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(at:activity_type)
WHERE p.luxury_score >= 80
RETURN at.name, count(p) as poi_count
ORDER BY poi_count DESC
```

### Find destinations best visited in summer
```cypher
MATCH (d:destination)<-[:LOCATED_IN]-(p:poi)-[av:AVAILABLE_IN]->()
WHERE 'June' IN av.months OR 'July' IN av.months
RETURN d.name, count(p) as summer_pois
ORDER BY summer_pois DESC
```

### Get personalized recommendations based on user desires
```cypher
// User wants "discovery" and "adventure"
MATCH (p:poi)-[:AMPLIFIES_DESIRE]->(d:Desire)
WHERE d.name IN ['Discovery', 'Adventure']
WITH p, count(d) as desire_matches
WHERE desire_matches >= 2
MATCH (p)-[:EVOKES]->(e:Emotion)
RETURN p, collect(e.name) as emotions, desire_matches
ORDER BY desire_matches DESC, p.luxury_score DESC
LIMIT 10
```

---

## Best Practices

1. **Always include confidence scores** (0.0-1.0) for non-import relationships
2. **Include evidence** explaining why the relationship was created
3. **Use ON MATCH logic** to update confidence if a better source provides the same relationship
4. **Tag AI-inferred relationships** with `inferred_by: 'ai'`
5. **Store user_id** for psychological relationships to enable personalization
6. **Validate relationship targets exist** before creating (use MERGE for target nodes)
7. **Use lowercase labels** (`poi`, `destination`, not `POI`, `Destination`)

---

## Unstructured Data Handling

When LEXA receives unstructured user input (free text, voice transcription), the AI inference system automatically:

1. **Extracts entities**: POIs, emotions, desires, fears, activities
2. **Matches to existing nodes**: Uses fuzzy matching and context
3. **Creates missing nodes**: If emotion/desire/fear doesn't exist, create it
4. **Infers relationships**: With confidence scores and evidence
5. **Stores user context**: Links relationships to user preferences

**Example Flow:**
```
User Input: "I went to Santorini last year and the sunset at Oia made me feel so peaceful. I'd love to find more places like that where I can just disconnect from the world."

AI Inference:
1. Entities: Santorini (destination), Oia (POI), Peace (emotion), Disconnect (need)
2. Relationships:
   - (Oia)-[:EVOKES {confidence: 0.95, evidence: 'user explicitly stated feeling'}]->(Peace)
   - (Oia)-[:RELATES_TO {confidence: 0.85, evidence: 'inferred from disconnect desire'}]->(Solitude)
   - (Oia)-[:AMPLIFIES_DESIRE {confidence: 0.8, evidence: 'user wants similar experiences'}]->(Tranquility)
3. Store: Link to user profile for future recommendations
```

---

## Summary: Who Creates What

| Relationship Type | Import | Quality Agent | Enrichment | AI Inference |
|-------------------|--------|---------------|------------|--------------|
| LOCATED_IN | ✓ Primary | ✓ Fill gaps | - | - |
| IN_AREA | ✓ Primary | ✓ Fill gaps | - | - |
| IN_REGION | ✓ Primary | ✓ Fill gaps | - | - |
| IN_CONTINENT | ✓ Primary | ✓ Fill gaps | - | - |
| SUPPORTS_ACTIVITY | ✓ Basic | ✓ Type inference | ✓ Categories | ✓ User mentions |
| HAS_THEME | ✓ Basic | ✓ Luxury inference | ✓ Content analysis | ✓ User interests |
| FEATURED_IN | - | - | - | ✓ Primary |
| BELONGS_TO | ✓ Explicit | ✓ Type matching | - | - |
| EVOKES | - | - | - | ✓ Primary |
| AMPLIFIES_DESIRE | - | - | - | ✓ Primary |
| MITIGATES_FEAR | - | - | - | ✓ Primary |
| RELATES_TO | - | - | - | ✓ Primary |
| AVAILABLE_IN | - | ✓ Seasonal inference | ✓ Operating hours | ✓ User feedback |
| PROMINENT_IN | - | ✓ Luxury score | - | - |

**Legend:**
- ✓ Primary: Main creator of this relationship type
- ✓ Fill gaps: Creates missing relationships
- ✓ Type inference: Infers based on POI type/properties
- - : Not responsible for this relationship type

---

## Next Steps

1. ✅ Implement comprehensive relationship creation in Data Quality Agent
2. ✅ Create AI-powered relationship inference system
3. **TODO**: Integrate inference into LEXA conversation flow
4. **TODO**: Add relationship validation to admin UI
5. **TODO**: Create user-specific relationship tracking
6. **TODO**: Build recommendation engine based on psychological relationships


