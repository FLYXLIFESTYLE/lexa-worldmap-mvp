# 🎯 Occasion Categories Schema

**Filter/discovery categories for POIs and activities**

**Based on competitor analysis (GetYourGuide-style categories)**

---

## 📊 **Category Hierarchy**

### **Current LEXA Schema:**

```
theme_category (High-level)
    ↓ broader than
activity_type (Specific actions)
    ↓ related to
poi (Individual locations)
```

### **NEW: Occasion Categories (Middle layer)**

```
theme_category (Broadest)
    ↓ relates to
🆕 occasion_type (Filtering/Discovery)
    ↓ relates to
activity_type (Specific)
    ↓ supports
poi (Individual)
```

---

## 🏗️ **Schema Design**

### **New Node Type: `occasion_type`**

```cypher
CREATE (o:occasion_type {
  name: String,              // "Family-friendly", "High Gastronomy"
  slug: String,              // "family-friendly", "high-gastronomy"
  description: String,       // "Perfect for families with children"
  icon: String,              // "👨‍👩‍👧‍👦", "🍽️"
  color: String,             // "#FF6B6B", "#4ECDC4"
  display_order: Integer,    // For UI sorting
  is_active: Boolean,        // Enable/disable category
  created_at: DateTime
})
```

### **New Relationships:**

1. **POI → Occasion**
   ```cypher
   (poi)-[:SUITS_OCCASION {
     confidence: Float,       // 0.0-1.0
     why: String             // "Family-friendly activities, kids menu"
   }]->(occasion_type)
   ```

2. **Activity → Occasion**
   ```cypher
   (activity_type)-[:FITS_OCCASION {
     confidence: Float,
     typical: Boolean         // Is this a typical use case?
   }]->(occasion_type)
   ```

3. **Theme → Occasion** (optional)
   ```cypher
   (theme_category)-[:INCLUDES_OCCASION]->(occasion_type)
   ```

---

## 📋 **Occasion Categories List**

### **From Competitor (GetYourGuide):**

| Category | Type | LEXA Use Case |
|----------|------|---------------|
| **High Gastronomy** | Dining | Filter for fine dining experiences |
| **Art and Culture** | Cultural | Museums, galleries, cultural events |
| **Adventure** | Active | Thrilling, outdoor, adrenaline |
| **Family-friendly** | Social | Kid-appropriate activities |
| **Romance** | Social | Couples, intimate, romantic |
| **Wellness** | Self-care | Spa, yoga, meditation |
| **Sports** | Active | Sporting activities, events |
| **Performers** | Entertainment | Shows, concerts, performers |
| **Fashion** | Shopping | Fashion events, shopping |
| **History** | Educational | Historical sites, tours |
| **Celebrations** | Events | Weddings, birthdays, special occasions |
| **Pre / Post Charter** | Yacht-specific | Before/after yacht charter |
| **Ticketed Events** | Entertainment | Concerts, shows, sports events |
| **Fully Curated** | Premium | Complete itinerary, concierge |
| **NEW** | Discovery | Recently added experiences |
| **Local Food Experiences** | Culinary | Authentic local dining |
| **Vineyards & Wine Tasting** | Culinary | Wine experiences |

---

## 🎯 **LEXA-Specific Additions**

### **Luxury-Focused Occasions:**

| Category | Icon | Description |
|----------|------|-------------|
| **Ultra-Luxury** | 💎 | Top-tier, exclusive, VIP |
| **Intimate & Private** | 🔒 | Private tours, exclusive access |
| **Bespoke & Custom** | ✨ | Fully customized experiences |
| **Once-in-a-Lifetime** | 🌟 | Bucket list, rare experiences |
| **Multi-Generational** | 👨‍👩‍👧‍👦 | Grandparents to grandchildren |
| **Milestone Celebrations** | 🎉 | Anniversaries, proposals, birthdays |
| **Wellness & Rejuvenation** | 🧘 | Spa, detox, mindfulness |
| **Educational & Enrichment** | 📚 | Learn new skills, culture |
| **Culinary Journey** | 🍷 | Food-focused experiences |
| **Outdoor & Nature** | 🌲 | Hiking, nature, outdoor |
| **Water-Based** | 🌊 | Beach, yacht, sailing, diving |
| **Nightlife & Entertainment** | 🎭 | Clubs, shows, bars |
| **Shopping & Fashion** | 👗 | Personal shopping, boutiques |
| **Photography-Worthy** | 📸 | Instagram-able locations |
| **Accessible** | ♿ | Wheelchair-friendly, inclusive |

---

## 💻 **Implementation**

### **Step 1: Create Occasion Nodes**

```cypher
// Create occasion_type nodes
CREATE (o1:occasion_type {
  name: 'Family-friendly',
  slug: 'family-friendly',
  description: 'Activities perfect for families with children',
  icon: '👨‍👩‍👧‍👦',
  color: '#FF6B6B',
  display_order: 1,
  is_active: true,
  created_at: datetime()
}),
(o2:occasion_type {
  name: 'High Gastronomy',
  slug: 'high-gastronomy',
  description: 'Fine dining and culinary excellence',
  icon: '🍽️',
  color: '#4ECDC4',
  display_order: 2,
  is_active: true,
  created_at: datetime()
}),
(o3:occasion_type {
  name: 'Romance',
  slug: 'romance',
  description: 'Intimate experiences for couples',
  icon: '💕',
  color: '#FF69B4',
  display_order: 3,
  is_active: true,
  created_at: datetime()
})
// ... etc
```

### **Step 2: Link Activities to Occasions**

```cypher
// Fine Dining → High Gastronomy
MATCH (a:activity_type {name: 'Fine Dining'})
MATCH (o:occasion_type {slug: 'high-gastronomy'})
MERGE (a)-[:FITS_OCCASION {confidence: 0.95, typical: true}]->(o)

// Beach Lounging → Family-friendly
MATCH (a:activity_type {name: 'Beach Lounging'})
MATCH (o:occasion_type {slug: 'family-friendly'})
MERGE (a)-[:FITS_OCCASION {confidence: 0.75, typical: true}]->(o)

// Spa → Wellness
MATCH (a:activity_type {name: 'Spa'})
MATCH (o:occasion_type {slug: 'wellness'})
MERGE (a)-[:FITS_OCCASION {confidence: 0.98, typical: true}]->(o)
```

### **Step 3: Infer POI → Occasion from Activity**

```cypher
// POIs inherit occasions from their activities
MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[:FITS_OCCASION]->(o:occasion_type)
WHERE NOT (p)-[:SUITS_OCCASION]->(o)
MERGE (p)-[:SUITS_OCCASION {
  confidence: 0.80,
  why: 'Inherited from activity: ' + a.name,
  inferred: true
}]->(o)
```

---

## 🔍 **RAG Reasoning Examples**

### **Use Case 1: Family Travel**

**User Input:** "I'm traveling with my 2 kids (ages 5 and 8)"

**LEXA Reasoning:**
```cypher
// Find family-friendly POIs
MATCH (p:poi)-[:SUITS_OCCASION]->(o:occasion_type {slug: 'family-friendly'})
WHERE p.luxury_score >= 6
RETURN p
ORDER BY p.luxury_score DESC
LIMIT 10
```

**Why it helps:** Direct filter instead of keyword matching

---

### **Use Case 2: Special Occasion**

**User Input:** "Planning my anniversary"

**LEXA Reasoning:**
```cypher
// Find romantic + milestone celebration POIs
MATCH (p:poi)-[:SUITS_OCCASION]->(o1:occasion_type {slug: 'romance'})
MATCH (p)-[:SUITS_OCCASION]->(o2:occasion_type {slug: 'milestone-celebrations'})
WHERE p.luxury_score >= 8
RETURN p
ORDER BY p.luxury_score DESC
```

**Why it helps:** Combines multiple occasions for precision

---

### **Use Case 3: Discovery**

**User Input:** "What can I do in St. Tropez?"

**LEXA UI:**
```
Browse by Occasion:
🍽️ High Gastronomy (24 experiences)
🌊 Water-Based (18 experiences)
👨‍👩‍👧‍👦 Family-friendly (12 experiences)
💕 Romance (31 experiences)
🧘 Wellness (8 experiences)
```

**Why it helps:** Better discovery UX than generic lists

---

## 📊 **Database Queries**

### **Create All Occasions Script:**

```typescript
// scripts/create-occasion-categories.ts

const occasions = [
  { name: 'High Gastronomy', slug: 'high-gastronomy', icon: '🍽️', color: '#4ECDC4' },
  { name: 'Art and Culture', slug: 'art-culture', icon: '🎨', color: '#9B59B6' },
  { name: 'Adventure', slug: 'adventure', icon: '🏔️', color: '#E74C3C' },
  { name: 'Family-friendly', slug: 'family-friendly', icon: '👨‍👩‍👧‍👦', color: '#FF6B6B' },
  { name: 'Romance', slug: 'romance', icon: '💕', color: '#FF69B4' },
  { name: 'Wellness', slug: 'wellness', icon: '🧘', color: '#2ECC71' },
  { name: 'Sports', slug: 'sports', icon: '⚽', color: '#3498DB' },
  { name: 'Performers', slug: 'performers', icon: '🎭', color: '#9B59B6' },
  { name: 'Fashion', slug: 'fashion', icon: '👗', color: '#E91E63' },
  { name: 'History', slug: 'history', icon: '🏛️', color: '#795548' },
  { name: 'Celebrations', slug: 'celebrations', icon: '🎉', color: '#FF9800' },
  { name: 'Pre / Post Charter', slug: 'charter', icon: '⛵', color: '#00BCD4' },
  { name: 'Ticketed Events', slug: 'ticketed-events', icon: '🎫', color: '#673AB7' },
  { name: 'Fully Curated', slug: 'fully-curated', icon: '✨', color: '#FFD700' },
  { name: 'Local Food Experiences', slug: 'local-food', icon: '🍜', color: '#FF5722' },
  { name: 'Vineyards & Wine Tasting', slug: 'wine', icon: '🍷', color: '#8E24AA' },
  // LEXA-specific
  { name: 'Ultra-Luxury', slug: 'ultra-luxury', icon: '💎', color: '#FFD700' },
  { name: 'Intimate & Private', slug: 'intimate', icon: '🔒', color: '#424242' },
  { name: 'Once-in-a-Lifetime', slug: 'once-lifetime', icon: '🌟', color: '#FFC107' },
  { name: 'Water-Based', slug: 'water-based', icon: '🌊', color: '#03A9F4' },
  { name: 'Outdoor & Nature', slug: 'outdoor', icon: '🌲', color: '#4CAF50' }
];
```

### **Auto-Link Activities to Occasions:**

```typescript
// Mapping activity_type → occasion_type
const activityOccasionMap = {
  'Fine Dining': ['high-gastronomy', 'romance'],
  'Beach Lounging': ['family-friendly', 'water-based', 'wellness'],
  'Snorkeling': ['adventure', 'family-friendly', 'water-based'],
  'Spa': ['wellness', 'romance'],
  'Yacht Charter': ['ultra-luxury', 'romance', 'charter'],
  'Wine Tasting': ['wine', 'high-gastronomy'],
  'Museum Visit': ['art-culture', 'history', 'family-friendly'],
  'Hiking': ['adventure', 'outdoor', 'wellness'],
  'Shopping': ['fashion', 'family-friendly'],
  'Nightclub': ['celebrations', 'performers'],
  // ... etc
};
```

---

## 🎯 **Benefits for LEXA**

### **1. Better Filtering**
```
User: "Show me family-friendly restaurants in Monaco"
Query: (poi)-[:SUITS_OCCASION]->({slug: 'family-friendly'})
       AND (poi.type = 'restaurant')
       AND (poi)-[:LOCATED_IN]->({name: 'Monaco'})
```

### **2. Improved RAG**
```
User: "I'm traveling with elderly parents"
LEXA infers: family-friendly + accessible + wellness
Finds: POIs with wheelchair access, gentle activities, spa options
```

### **3. Discovery UI**
```
Browse St. Tropez by Occasion:
- High Gastronomy (24)
- Water-Based (18)
- Romance (31)
- Wellness (8)
```

### **4. Emotional Intelligence**
```
occasion_type: Romance
  ↓ implies
Desire: Intimacy, Connection
Fear mitigated: Being alone, Boredom

occasion_type: Family-friendly
  ↓ implies
Desire: Family bonding, Creating memories
Fear mitigated: Kids bored, Unsafe activities
```

---

## ✅ **Implementation Steps**

### **Week 1: Create Schema**
1. ✅ Create `occasion_type` node definition
2. ✅ Create relationship types
3. ✅ Add to Neo4j

### **Week 2: Populate Data**
1. ✅ Create all occasion nodes (20-25 categories)
2. ✅ Link activities to occasions (manual mapping)
3. ✅ Infer POI occasions from activities

### **Week 3: UI Integration**
1. ✅ Add occasion filters to search
2. ✅ Add occasion browsing to destination pages
3. ✅ Add occasion tags to POI cards

### **Week 4: RAG Integration**
1. ✅ Update LEXA prompts to use occasions
2. ✅ Add occasion-based recommendations
3. ✅ Test emotional intelligence with occasions

---

## 📊 **Success Metrics**

**You're successful when:**

✅ All occasions created in Neo4j  
✅ 80%+ activities linked to occasions  
✅ 60%+ POIs have occasion tags  
✅ Users can filter by occasion  
✅ LEXA uses occasions in recommendations  
✅ Improved conversion (filtered results → bookings)

---

## 💡 **Recommendation**

**YES, add these as `occasion_type` nodes!**

**Why:**
1. ✅ Better than tags (relationships are queryable)
2. ✅ Better than properties (flexible, extensible)
3. ✅ Better than theme_category (too broad)
4. ✅ Better than activity_type (too specific)
5. ✅ Perfect middle layer for filtering & discovery
6. ✅ Competitor-proven (GetYourGuide uses them)
7. ✅ Improves RAG reasoning significantly

**Start implementing this week!** 🚀

---

**Last Updated:** December 18, 2025  
**Status:** Ready to implement  
**Next:** Create occasion nodes in Neo4j

