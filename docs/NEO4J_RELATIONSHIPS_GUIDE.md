# 🔗 LEXA Neo4j Relationships Guide

## 📋 **Overview**

This document explains all relationship types in the LEXA graph database and their meanings.

**Important:** Neo4j relationship types are **CASE-SENSITIVE**. We use UPPERCASE as the standard convention.

---

## 🏗️ **Relationship Categories**

### **1. Geographic & Location Relationships**

#### **LOCATED_IN**
- **Pattern:** `(poi:poi)-[:LOCATED_IN]->(destination:destination)`
- **Meaning:** POI is physically located in this destination
- **Example:** `(Club 55)-[:LOCATED_IN]->(St. Tropez)`
- **Properties:**
  - `confidence` (0-1): How certain we are about this location
  - `source`: Where this data came from (e.g., 'osm', 'google_places', 'captain')
  - `created_at`: When relationship was created

#### **IN_REGION**
- **Pattern:** `(destination:destination)-[:IN_REGION]->(region:region)`
- **Meaning:** Destination is part of this geographic region
- **Example:** `(St. Tropez)-[:IN_REGION]->(French Riviera)`

#### **IN_COUNTRY**
- **Pattern:** `(destination:destination)-[:IN_COUNTRY]->(country:country)`
- **Meaning:** Destination is in this country
- **Example:** `(Monaco)-[:IN_COUNTRY]->(France)`

#### **IN_CONTINENT**
- **Pattern:** `(country:country)-[:IN_CONTINENT]->(continent:continent)`
- **Meaning:** Country is in this continent
- **Example:** `(France)-[:IN_CONTINENT]->(Europe)`

#### **IN_AREA**
- **Pattern:** `(destination:destination)-[:IN_AREA]->(area:area)`
- **Meaning:** Destination is in this area/region
- **Example:** `(St. Tropez)-[:IN_AREA]->(Mediterranean)`

---

### **2. Activity & Experience Relationships**

#### **SUPPORTS_ACTIVITY**
- **Pattern:** `(poi:poi)-[:SUPPORTS_ACTIVITY]->(activity:activity_type)`
- **Meaning:** This POI enables or supports this activity
- **Example:** `(Beach Club)-[:SUPPORTS_ACTIVITY]->(swimming)`
- **Properties:**
  - `confidence` (0-1): How well this POI supports the activity
  - `seasonal`: Boolean or month range (e.g., 'May-September')
  - `equipment_provided`: Boolean
  - `skill_level_required`: 'beginner', 'intermediate', 'expert'

#### **HAS_THEME**
- **Pattern:** `(poi:poi)-[:HAS_THEME]->(theme:theme)`
- **Meaning:** POI offers experiences related to this theme
- **Example:** `(Luxury Spa)-[:HAS_THEME]->(wellness)`

#### **FEATURED_IN**
- **Pattern:** `(poi:poi)-[:FEATURED_IN]->(theme:theme)`
- **Meaning:** POI is prominently featured in this theme
- **Example:** `(Club 55)-[:FEATURED_IN]->(luxury_dining)`

#### **AVAILABLE_IN**
- **Pattern:** `(theme:theme)-[:AVAILABLE_IN]->(destination:destination)`
- **Meaning:** This theme/experience is available in this destination
- **Example:** `(Snorkeling)-[:AVAILABLE_IN]->(Maldives)`

---

### **3. Emotional Intelligence Relationships** ⭐ **LEXA's Unique Value**

#### **EVOKES**
- **Pattern:** 
  - `(poi:poi)-[:EVOKES]->(emotion:Emotion)`
  - `(activity:activity_type)-[:EVOKES]->(emotion:Emotion)`
- **Meaning:** This POI or activity triggers/creates this emotion
- **Examples:**
  - `(Beach Sunset Bar)-[:EVOKES]->(tranquility)`
  - `(Skydiving)-[:EVOKES]->(excitement)`
  - `(Romantic Restaurant)-[:EVOKES]->(romance)`
- **Properties:**
  - `confidence` (0.6-1.0): How strongly it evokes this emotion
  - `reason`: Human-readable explanation
  - `source`: 'ai_inference', 'activity_inheritance', 'captain_input'
  - `inherited_from`: If inherited from activity, which activity
  - `created_at`: Timestamp

**Common Emotions:**
- `joy`, `excitement`, `tranquility`, `romance`, `wonder`, `freedom`, `satisfaction`

#### **AMPLIFIES_DESIRE**
- **Pattern:**
  - `(poi:poi)-[:AMPLIFIES_DESIRE]->(desire:Desire)`
  - `(activity:activity_type)-[:AMPLIFIES_DESIRE]->(desire:Desire)`
- **Meaning:** This POI or activity increases desire for this
- **Examples:**
  - `(5-Star Hotel)-[:AMPLIFIES_DESIRE]->(luxury)`
  - `(Exclusive Beach Club)-[:AMPLIFIES_DESIRE]->(social_status)`
  - `(Adventure Tour)-[:AMPLIFIES_DESIRE]->(adventure)`
- **Properties:**
  - `confidence` (0.6-1.0): How strongly it amplifies this desire
  - `reason`: Why it amplifies this desire
  - `source`: Origin of this relationship
  - `inherited_from`: If inherited from activity
  - `created_at`: Timestamp

**Common Desires:**
- `luxury`, `adventure`, `freedom`, `social_status`, `indulgence`, `comfort`, `authenticity`, `novelty`

#### **MITIGATES_FEAR**
- **Pattern:**
  - `(poi:poi)-[:MITIGATES_FEAR]->(fear:Fear)`
  - `(activity:activity_type)-[:MITIGATES_FEAR]->(fear:Fear)`
- **Meaning:** This POI or activity reduces/eliminates this fear
- **Examples:**
  - `(World-Class Resort)-[:MITIGATES_FEAR]->(mediocrity)`
  - `(Must-Visit Venue)-[:MITIGATES_FEAR]->(missing_out)`
  - `(Exclusive Experience)-[:MITIGATES_FEAR]->(boredom)`
- **Properties:**
  - `confidence` (0.6-1.0): How effectively it mitigates the fear
  - `reason`: How it addresses the fear
  - `source`: Origin of this relationship
  - `inherited_from`: If inherited from activity
  - `created_at`: Timestamp

**Common Fears:**
- `mediocrity`, `missing_out`, `boredom`, `discomfort`, `disappointment`, `regret`

---

### **4. Categorical & Organizational Relationships**

#### **BELONGS_TO**
- **Pattern:** `(poi:poi)-[:BELONGS_TO]->(category:category)`
- **Meaning:** POI belongs to this category
- **Example:** `(Restaurant)-[:BELONGS_TO]->(dining)`

#### **RELATES_TO**
- **Pattern:** `(poi:poi)-[:RELATES_TO]->(other_poi:poi)`
- **Meaning:** POIs are related (e.g., same owner, nearby, similar)
- **Example:** `(Beach Club Bar)-[:RELATES_TO]->(Beach Club Restaurant)`

#### **PROMINENT_IN**
- **Pattern:** `(poi:poi)-[:PROMINENT_IN]->(destination:destination)`
- **Meaning:** POI is particularly prominent/famous in this destination
- **Example:** `(Club 55)-[:PROMINENT_IN]->(St. Tropez)`

---

## 🔄 **Inheritance Pattern: Activities → POIs**

One of LEXA's key features is **emotion inheritance**:

```
1. Activities have emotional relationships:
   (swimming)-[:EVOKES]->(joy)
   (swimming)-[:AMPLIFIES_DESIRE]->(freedom)

2. POIs support activities:
   (Beach Club)-[:SUPPORTS_ACTIVITY]->(swimming)

3. Therefore, POIs inherit emotions:
   (Beach Club)-[:EVOKES]->(joy)              [inherited]
   (Beach Club)-[:AMPLIFIES_DESIRE]->(freedom) [inherited]
```

**Inherited relationships have:**
- `confidence`: 0.8 × original confidence (slightly lower)
- `source`: 'activity_inheritance'
- `inherited_from`: Name of the activity
- `reason`: 'Inherited from activity: swimming'

---

## 📊 **Relationship Properties**

### **Common Properties Across All Relationships:**

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `confidence` | Float (0-1) | Certainty/strength of relationship | `0.85` |
| `source` | String | Where data came from | `'ai_inference'`, `'captain'`, `'osm'` |
| `created_at` | DateTime | When created | `2025-12-17T21:00:00Z` |
| `updated_at` | DateTime | Last update | `2025-12-17T21:30:00Z` |

### **Emotional Relationship Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `reason` | String | Human-readable explanation |
| `inherited_from` | String | Source activity (if inherited) |
| `validated_by_captain` | Boolean | Captain verified this |
| `captain_notes` | String | Captain's comments |

### **Activity Relationship Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `seasonal` | String | When available (e.g., 'May-Sep') |
| `equipment_provided` | Boolean | Equipment included |
| `skill_level` | String | Required skill level |
| `cost` | String | Cost level ($, $$, $$$) |

---

## 🚨 **CRITICAL: Case Sensitivity**

### **The Problem:**

Neo4j is **CASE-SENSITIVE** for relationship types!

```cypher
// These are DIFFERENT relationships:
(poi)-[:located_in]->(dest)     // lowercase
(poi)-[:LOCATED_IN]->(dest)     // UPPERCASE
(poi)-[:Located_In]->(dest)     // Mixed case
```

### **The Solution:**

**Always use UPPERCASE for relationship types** (Neo4j convention):

```cypher
✅ CORRECT:
(poi)-[:LOCATED_IN]->(dest)
(poi)-[:SUPPORTS_ACTIVITY]->(activity)
(poi)-[:EVOKES]->(emotion)

❌ WRONG:
(poi)-[:located_in]->(dest)
(poi)-[:supports_activity]->(activity)
(poi)-[:evokes]->(emotion)
```

### **Migrating Existing Data:**

If you have mixed-case relationships, run:

```bash
npx ts-node scripts/standardize-relationship-names.ts
```

This will:
1. Find all lowercase relationships
2. Create UPPERCASE equivalents
3. Copy all properties
4. Delete old lowercase relationships

---

## 🎯 **Query Examples**

### **Find POIs by Emotion:**

```cypher
// POIs that evoke joy
MATCH (p:poi)-[:EVOKES]->(e:Emotion)
WHERE toLower(e.name) CONTAINS 'joy'
RETURN p.name, p.destination_name, p.luxury_score
ORDER BY p.luxury_score DESC
LIMIT 50
```

### **Find POIs by Desire:**

```cypher
// POIs that amplify desire for luxury
MATCH (p:poi)-[:AMPLIFIES_DESIRE]->(d:Desire)
WHERE toLower(d.name) CONTAINS 'luxury'
RETURN p.name, p.type, p.destination_name
LIMIT 50
```

### **Find POIs by Activity:**

```cypher
// POIs that support snorkeling
MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)
WHERE toLower(a.name) CONTAINS 'snorkel'
RETURN p.name, p.destination_name, p.luxury_score
ORDER BY p.luxury_score DESC
LIMIT 50
```

### **Find POIs with Inherited Emotions:**

```cypher
// POIs with emotions inherited from activities
MATCH (p:poi)-[r:EVOKES]->(e:Emotion)
WHERE r.source = 'activity_inheritance'
RETURN p.name, e.name, r.inherited_from, r.confidence
LIMIT 50
```

### **Analyze Emotional Profile of a Destination:**

```cypher
// What emotions does St. Tropez evoke?
MATCH (p:poi)-[:LOCATED_IN]->(d:destination {name: 'St. Tropez'})
MATCH (p)-[:EVOKES]->(e:Emotion)
RETURN e.name, count(p) as poi_count, avg(p.luxury_score) as avg_luxury
ORDER BY poi_count DESC
```

---

## 📈 **Relationship Statistics**

Run this to see your database health:

```cypher
// Count all relationship types
CALL db.relationshipTypes() YIELD relationshipType
MATCH ()-[r]->()
WHERE type(r) = relationshipType
RETURN relationshipType, count(r) as count
ORDER BY count DESC
```

---

## ✅ **Best Practices**

1. **Always use UPPERCASE** for relationship names
2. **Include confidence scores** for AI-generated relationships
3. **Add reason/explanation** for emotional relationships
4. **Track source** of data (osm, google, captain, ai)
5. **Timestamp everything** (created_at, updated_at)
6. **Validate with Captains** when possible
7. **Inherit from activities** to POIs for consistency
8. **Use consistent property names** across similar relationships

---

## 🎓 **Understanding LEXA's Emotional Intelligence**

The **EVOKES**, **AMPLIFIES_DESIRE**, and **MITIGATES_FEAR** relationships are what make LEXA unique:

1. **Google Maps:** Has POIs, no emotions ❌
2. **TripAdvisor:** Has reviews, no emotions ❌
3. **LEXA:** Has **emotional intelligence** ✅

This enables:
- Query by emotion: "Show me POIs that evoke tranquility"
- Personality matching: "Find POIs for thrill-seekers"
- Emotional journey design: "Balance excitement with relaxation"
- Desire-based filtering: "Amplifies desire for luxury"
- Fear mitigation: "Reduces fear of mediocrity"

**This is LEXA's billion-dollar moat!** 💎

---

## 📚 **Related Documentation:**

- **Database Schema:** See `docs/LEXA_ARCHITECTURE.md`
- **Enrichment Process:** See `docs/SUPER_ENRICHMENT_GUIDE.md`
- **ChatNeo4j Queries:** See `app/api/neo4j/chat/route.ts`
- **Today's Achievements:** See `docs/TODAY_ACHIEVEMENTS.md`

---

**Last Updated:** December 17, 2025  
**Total Relationships in LEXA:** ~1,250,000+ (including 1M+ emotional relationships!)

