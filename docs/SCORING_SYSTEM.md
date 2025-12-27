# LEXA Scoring System

## Overview

LEXA uses **two distinct scoring systems** to measure quality and certainty in the travel database:

1. **Luxury Score** (0-100): Measures how luxurious a POI is
2. **Confidence Score** (0.0-1.0): Measures certainty of relationships

> **New convention (going forward):** our canonical product fields use **0.0 → 1.0** for `luxury_score_base`, `luxury_score_verified`, `confidence_score`, and theme-fit (`theme_fit`). See `docs/SCORE_CONVENTIONS.md`.

---

## 1. Luxury Score (POI Property)

### **What It Measures**
How "luxury" a Point of Interest is, on a scale of 0-100.

### **Applied To**
- POI nodes (hotels, restaurants, attractions, etc.)
- Stored as: `poi.luxury_score`

### **When It's Calculated**

| Scenario | When | How |
|----------|------|-----|
| **Initial Import** | During Cypher file import | Manual curation or script calculation |
| **Data Quality Check** | Every night at midnight | Automatic calculation for missing scores |
| **New POI Creation** | When user adds POI via LEXA | Real-time AI calculation |
| **On-Demand** | Admin trigger | Manual recalculation |

---

### **Scoring Algorithm**

```typescript
Luxury Score = Base Type (0-40)
             + Price Level (0-30)
             + Ratings (0-20)
             + Luxury Keywords (0-25)
             + Prestige Awards (0-30)
             + Amenities (0-15)
             + Destination Prestige (0-10)
             
Maximum: 130 points → normalized to 100
```

#### **1. Base Type Score (0-40 points)**

| POI Type | Score | Examples |
|----------|-------|----------|
| **Ultra Premium** | 40 | Michelin restaurant, 5-star hotel, private villa, yacht club |
| **High-End** | 30 | Fine dining, boutique hotel, golf club, marina |
| **Upscale** | 20 | Restaurant, hotel, spa, beach club, museum |
| **Standard** | 10 | Cafe, bar, beach, park, viewpoint |
| **Basic** | 5 | Attraction, shop, market |

```cypher
// Example in database
CREATE (p:poi {
  name: 'Hotel du Cap-Eden-Roc',
  type: 'five_star_hotel',
  luxury_score: 95
})
```

#### **2. Price Level (0-30 points)**

```
$ (1/5)    = 6 points   (Budget)
$$ (2/5)   = 12 points  (Moderate)
$$$ (3/5)  = 18 points  (Upscale)
$$$$ (4/5) = 24 points  (Luxury)
$$$$$ (5/5) = 30 points (Ultra-luxury)
```

#### **3. Ratings & Reviews (0-20 points)**

```typescript
if (rating >= 4.5) {
  score += (rating - 4.5) * 40 // Max 20 points for 5.0 rating
}

if (review_count > 100) {
  score += log10(review_count) * 3 // Validation bonus (max 10 pts)
}
```

**Why?** High ratings + many reviews = validated quality

#### **4. Luxury Keywords (0-25 points)**

Scans `name` and `description` for luxury indicators:

```javascript
luxuryKeywords = [
  'michelin', 'starred', 'exclusive', 'private', 'luxury', 'premium',
  'five-star', 'boutique', 'haute', 'gourmet', 'fine dining',
  'concierge', 'butler', 'suite', 'penthouse', 'villa', 'yacht',
  'champagne', 'caviar', 'truffle', 'vintage', 'bespoke', 'artisan'
]

score += min(25, keywordMatches * 5)
```

**Example:**
```
Name: "The Ritz-Carlton Yacht Collection"
Description: "Exclusive ultra-luxury yacht experiences with private butler service"

Keywords found: exclusive, luxury, yacht, private, butler
Score: 5 keywords × 5 points = 25 points
```

#### **5. Prestige Awards (0-30 points)**

```typescript
Michelin Stars: 1★ = 15 pts, 2★ = 30 pts, 3★ = 45 pts
Forbes Stars: 1★ = 10 pts each (max 50 pts for 5★)
```

**Example:**
```cypher
CREATE (p:poi {
  name: 'Le Louis XV - Alain Ducasse',
  michelin_stars: 3,
  luxury_score: 98 // Guaranteed high score
})
```

#### **6. Luxury Amenities (0-15 points)**

```javascript
luxuryAmenities = [
  'spa', 'pool', 'concierge', 'valet', 'butler', 'helipad',
  'private beach', 'wine cellar', 'infinity pool', 'rooftop',
  'michelin restaurant', 'private chef', 'yacht', 'golf course'
]

score += min(15, amenityMatches * 3)
```

#### **7. Destination Prestige (0-10 points)**

```typescript
if (destination.luxury_score >= 70) {
  score += 10 // "Halo effect" from prestigious location
}
```

**Example:** A boutique hotel in Monaco gets +10 points vs. same hotel elsewhere

---

### **Luxury Score Ranges**

| Range | Category | Description | Examples |
|-------|----------|-------------|----------|
| **90-100** | Ultra-Luxury | Top 1% experiences | Michelin 3★, Forbes 5★, private islands |
| **80-89** | High Luxury | Premium exclusive | Michelin 1-2★, Forbes 4★, luxury resorts |
| **70-79** | Upscale | Premium quality | Fine dining, 5★ hotels, exclusive venues |
| **60-69** | Upper-Midscale | Quality experiences | Good restaurants, 4★ hotels |
| **50-59** | Comfortable | Standard good quality | 3★ hotels, popular restaurants |
| **40-49** | Mid-Range | Decent experiences | Tourist attractions, cafes |
| **30-39** | Budget-Friendly | Basic quality | Markets, public beaches |
| **0-29** | Basic/Standard | Functional | Public parks, viewpoints |

---

### **AI-Powered Luxury Scoring**

For complex cases, LEXA uses Claude AI to analyze POIs:

```typescript
import { aiLuxuryScoring } from '@/lib/neo4j/scoring-engine';

const result = await aiLuxuryScoring({
  name: 'Château de la Messardière',
  type: 'hotel',
  description: 'Perched on the hills overlooking Saint-Tropez, this belle époque palace offers panoramic Mediterranean views, Michelin-starred dining, and an exclusive spa.',
  amenities: ['spa', 'michelin restaurant', 'infinity pool', 'helipad'],
  price_level: 5,
  rating: 4.8
});

// Result:
{
  luxury_score: 92,
  confidence: 0.95,
  reasoning: "Belle époque palace with Michelin dining, exclusive location in Saint-Tropez, top-tier amenities including helipad. Clear ultra-luxury positioning."
}
```

---

## 2. Confidence Score (Relationship Property)

### **What It Measures**
How certain we are that a relationship exists, on a scale of 0.0-1.0.

### **Applied To**
- Relationships (edges between nodes)
- Stored as: `relationship.confidence`

### **Why It Exists**
Not all relationships are equally certain:
- ✅ **High Confidence (0.9)**: "This hotel is in Paris" (imported data)
- ⚠️ **Medium Confidence (0.7)**: "This beach evokes peace" (inferred from reviews)
- ❓ **Low Confidence (0.6)**: "This POI might support sailing" (weak signal)

---

### **Confidence Calculation**

```typescript
Confidence = Base Source Reliability (0.5-0.9)
           + Agreement Boost (0.0-0.15)
           + Evidence Quality (+0.05)
           - Recency Penalty (-0.05 if old)
```

#### **Source Reliability (Base Score)**

| Source | Base Confidence | When Used |
|--------|----------------|-----------|
| **Import** | 0.9 | Human-curated Cypher files |
| **Enrichment (API)** | 0.8 | Google Places, Wikipedia, OSM |
| **AI (Explicit)** | 0.85 | User explicitly stated: "I felt peaceful here" |
| **AI (Implicit)** | 0.65 | AI inferred from context: "secluded beach" → peace |

#### **Agreement Boost (+0.0 to +0.15)**

When multiple sources agree on the same relationship:

```typescript
1 source:  +0.00 (base confidence)
2 sources: +0.05 boost
3 sources: +0.10 boost
4+ sources: +0.15 boost (capped at 0.95 total)
```

**Example:**
```cypher
// Source 1: Import (confidence: 0.9)
(Hotel)-[:SUPPORTS_ACTIVITY {confidence: 0.9}]->(Spa)

// Source 2: Google Places confirms "spa" category (confidence: 0.8)
// Agreement detected! Boost confidence:
(Hotel)-[:SUPPORTS_ACTIVITY {confidence: 0.95}]->(Spa)
```

#### **Evidence Quality (+0.05)**

Strong evidence keywords: "explicitly", "stated", "confirmed", "verified"

```typescript
evidence: "User explicitly stated they felt romantic here"
confidence: 0.85 + 0.05 = 0.90
```

#### **Recency Penalty (-0.05)**

Data older than 1 year gets slight penalty:

```typescript
if (dataAge > 365 days) {
  confidence -= 0.05
}
```

---

### **Confidence Score Ranges**

| Range | Meaning | Action | Examples |
|-------|---------|--------|----------|
| **0.9-1.0** | Very High | Use in recommendations | Imported data, verified facts |
| **0.8-0.89** | High | Use confidently | API enrichment, multiple sources |
| **0.7-0.79** | Good | Use with context | Single API source, good inference |
| **0.6-0.69** | Moderate | Use cautiously | Weak AI inference, old data |
| **0.5-0.59** | Low | Flag for review | Speculative connections |
| **<0.5** | Very Low | Don't use | Rejected (below threshold) |

---

## How the Systems Work Together

### **Example: Adding a New Restaurant**

#### **Step 1: Create POI with Luxury Score**

```typescript
import { calculateLuxuryScore } from '@/lib/neo4j/scoring-engine';

const poiData = {
  name: 'La Pergola',
  type: 'fine_dining',
  michelin_stars: 3,
  price_level: 5,
  rating: 4.9,
  review_count: 1247,
  description: 'Rome\'s only three Michelin-starred restaurant with panoramic views',
  amenities: ['rooftop', 'wine cellar', 'private dining']
};

const scoring = await calculateLuxuryScore(poiData);
// Result:
{
  luxury_score: 96,
  confidence: 0.95,
  evidence: [
    "Base type 'fine_dining': 30 pts",
    "Price level 5/5: 30 pts",
    "High rating 4.9: 16 pts",
    "3 Michelin star(s): 45 pts",
    "Luxury keywords (4): 20 pts",
    "Luxury amenities (3): 9 pts"
  ]
}

// Create in Neo4j
CREATE (p:poi {
  name: 'La Pergola',
  type: 'fine_dining',
  luxury_score: 96,
  luxury_confidence: 0.95,
  luxury_evidence: 'Base type fine_dining: 30 pts; Price level 5/5: 30 pts...',
  scored_at: datetime()
})
```

#### **Step 2: Create Relationships with Confidence Scores**

```typescript
import { inferAndCreateRelationships } from '@/lib/neo4j/relationship-inference';

const userInput = "La Pergola is absolutely magical - the sunset views while dining made me feel so romantic and special. Perfect for proposals!";

const result = await inferAndCreateRelationships(userInput, {
  currentPOIs: ['La Pergola'],
  destination: 'Rome'
});

// Creates relationships:
```

```cypher
// Geographic (high confidence - location fact)
(La Pergola)-[:LOCATED_IN {confidence: 0.9}]->(Rome)

// Psychological (very high confidence - explicit user statement)
(La Pergola)-[:EVOKES {
  confidence: 0.95,
  evidence: 'user explicitly stated romantic feeling'
}]->(Romance)

// Theme (high confidence - explicit mention)
(La Pergola)-[:FEATURED_IN {
  confidence: 0.9,
  evidence: 'user mentioned perfect for proposals'
}]->(Romantic Experiences)

// Desire (good confidence - implicit)
(La Pergola)-[:AMPLIFIES_DESIRE {
  confidence: 0.75,
  evidence: 'inferred from special feeling and romantic context'
}]->(Connection)
```

#### **Step 3: Enrichment Adds More Relationships**

```typescript
// Google Places API enrichment
(La Pergola)-[:SUPPORTS_ACTIVITY {
  confidence: 0.8,
  evidence: 'google_places_category',
  source: 'enrichment'
}]->(Fine Dining)

// Multiple sources now agree → boost confidence
// Original import: 0.9
// Google confirms: 0.8
// Agreement boost: +0.05
// Final: 0.95
```

---

## Where Scores Are Used

### **Luxury Score Applications**

1. **Search & Filtering**
   ```cypher
   // Find ultra-luxury hotels in French Riviera
   MATCH (p:poi)-[:LOCATED_IN]->(d:destination {name: 'French Riviera'})
   WHERE p.type = 'hotel' AND p.luxury_score >= 90
   RETURN p ORDER BY p.luxury_score DESC
   ```

2. **Recommendations**
   ```cypher
   // Recommend similar luxury level
   MATCH (liked:poi)<-[:LIKED]-(user)
   WITH avg(liked.luxury_score) as userAvgScore
   MATCH (p:poi)
   WHERE abs(p.luxury_score - userAvgScore) < 10
   RETURN p
   ```

3. **PROMINENT_IN Relationships**
   ```cypher
   // Auto-create for high-luxury POIs
   MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
   WHERE p.luxury_score >= 85
   MERGE (p)-[:PROMINENT_IN {
     confidence: 0.8,
     reason: 'high_luxury_score'
   }]->(d)
   ```

### **Confidence Score Applications**

1. **Filtering Uncertain Data**
   ```cypher
   // Only use high-confidence emotional connections
   MATCH (p:poi)-[r:EVOKES]->(e:Emotion)
   WHERE r.confidence >= 0.8
   RETURN p, e
   ```

2. **Weighted Recommendations**
   ```typescript
   // Weight recommendations by confidence
   const score = poi.luxury_score * relationship.confidence;
   ```

3. **Data Quality Reporting**
   ```cypher
   // Find relationships needing validation
   MATCH ()-[r]->()
   WHERE r.confidence < 0.7
   RETURN type(r), count(r) as low_confidence_count
   ORDER BY low_confidence_count DESC
   ```

---

## Automatic Scoring in Data Quality Agent

The Data Quality Agent (runs nightly at midnight) automatically:

### **1. Score Unscored POIs**
```typescript
// In verifyScoring() function
const result = await scoreAllUnscored();
// Scores up to 500 POIs per run
console.log(`Scored ${result.scored} POIs, avg score: ${result.avgScore}`);
```

### **2. Add Default Confidence**
```cypher
// Add confidence to legacy relationships
MATCH ()-[r]->()
WHERE r.confidence IS NULL
SET r.confidence = 0.7, r.evidence = 'legacy_data'
```

### **3. Update Confidence for Agreements**
```typescript
// Boost confidence when multiple sources agree
const updated = await recalculateRelationshipConfidence();
```

---

## Manual Scoring Tools

### **Score a Single POI**

```typescript
import { calculateLuxuryScore } from '@/lib/neo4j/scoring-engine';

const scoring = await calculateLuxuryScore({
  name: 'Hotel Splendido',
  type: 'luxury_resort',
  price_level: 5,
  rating: 4.7,
  description: 'Iconic luxury resort overlooking Portofino harbor',
  amenities: ['spa', 'pool', 'fine dining', 'private beach']
});

console.log(scoring);
// {
//   luxury_score: 87,
//   confidence: 0.85,
//   evidence: [...]
// }
```

### **Score All Unscored POIs**

```typescript
import { scoreAllUnscored } from '@/lib/neo4j/scoring-engine';

const result = await scoreAllUnscored();
console.log(`Scored: ${result.scored}, Failed: ${result.failed}, Avg: ${result.avgScore}`);
```

### **Calculate Relationship Confidence**

```typescript
import { calculateRelationshipConfidence } from '@/lib/neo4j/scoring-engine';

const confidence = calculateRelationshipConfidence({
  source: 'ai_explicit',
  evidence: 'User explicitly stated feeling peaceful',
  agreementCount: 2 // Another source also detected this
});

console.log(confidence); // 0.90
```

---

## Best Practices

### **For Luxury Scores:**

1. ✅ **Always include evidence** for traceability
2. ✅ **Recalculate periodically** as ratings/reviews change
3. ✅ **Use AI scoring for ambiguous cases** (unique/complex POIs)
4. ✅ **Store `scored_at` timestamp** to track freshness
5. ⚠️ **Don't over-trust initial scores** - validate with user feedback

### **For Confidence Scores:**

1. ✅ **Never go below 0.6** (reject low-confidence relationships)
2. ✅ **Boost on agreement** (multiple sources = higher confidence)
3. ✅ **Include evidence field** explaining why this confidence level
4. ✅ **Use explicit > implicit** (user statements > AI inference)
5. ⚠️ **Decay over time** for time-sensitive relationships

---

## Summary for Beginners

### **Simple Mental Model:**

**Luxury Score** = "How fancy is this place?"
- 90-100: Ultra-luxury (Michelin stars, Forbes 5-star)
- 70-89: Premium (fine dining, luxury hotels)
- 50-69: Good quality (nice restaurants, good hotels)
- Below 50: Standard (budget, basic)

**Confidence Score** = "How sure are we about this connection?"
- 0.9-1.0: Very certain (facts from trusted sources)
- 0.7-0.89: Pretty confident (API data, good AI inference)
- 0.6-0.69: Somewhat confident (weak signals, old data)
- Below 0.6: Don't use (too uncertain)

### **You Don't Need to Worry About Scoring!**

The system does it automatically:
- ✅ Import POIs → Luxury scores calculated
- ✅ Users chat → Confidence scores added to relationships
- ✅ Nightly check → Missing scores filled in
- ✅ Multiple sources → Confidence boosted

---

## Files

- **Scoring Engine**: `lib/neo4j/scoring-engine.ts`
- **Integration**: `lib/neo4j/data-quality-agent.ts` (verifyScoring function)
- **Relationship Inference**: `lib/neo4j/relationship-inference.ts` (uses confidence)
- **Documentation**: This file


