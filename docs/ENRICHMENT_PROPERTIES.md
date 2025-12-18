# 📋 POI Enrichment Properties Documentation

## 🔍 Currently Enriched Properties

When a POI is enriched with Google Places data, the following properties are added/updated:

### **From Google Places API:**

| Property | Description | Example | Notes |
|----------|-------------|---------|-------|
| `google_place_id` | Unique Google identifier | `ChIJN1t_tDeuEmsRUsoyG83frY4` | Used to reference Google data |
| `google_rating` | Average rating (0-5 stars) | `4.6` | From user reviews |
| `google_reviews_count` | Number of reviews | `1247` | Popularity indicator |
| `google_price_level` | Price level (1-4) | `3` ($$$ out of $$$$) | 1=cheap, 4=very expensive |
| `google_website` | Official website URL | `https://club55.fr` | When available |
| `google_phone` | Phone number | `+33 4 94 55 55 55` | Formatted by Google |

### **Calculated by LEXA:**

| Property | Description | Example | Formula |
|----------|-------------|---------|---------|
| `luxury_score` | Luxury rating (0-10) | `8.5` | Rating + Price Level + Type + Reviews |
| `luxury_confidence` | Confidence in score (0-1) | `0.8` | Based on data completeness |
| `luxury_evidence` | Reasoning for score | `Excellent rating: 4.6★ \| Price level: $$$ \| Popular venue: 500+ reviews` | Human-readable explanation |

### **Metadata:**

| Property | Description | Example |
|----------|-------------|---------|
| `enriched_at` | When enriched | `2025-12-17T10:30:00Z` |
| `enriched_source` | Source of data | `google_places` |

---

## ❌ NOT Currently Enriched (But Could Be)

### **Available from Google Places but Not Captured:**

| Property | Why Not? | Should We Add? |
|----------|----------|----------------|
| `formatted_address` | Not requested in API call | ✅ YES - Very useful |
| `opening_hours` | Not requested | ✅ YES - Important for planning |
| `photos` | Cost extra | ⚠️ MAYBE - Expensive |
| `reviews` (text) | Cost extra, large data | ❌ NO - Too expensive |
| `business_status` | Not requested | ✅ YES - Check if open |
| `user_ratings_total` | Actually captured! | ✅ Already doing this |

### **Not Available from Google:**

| Property | Source | Status |
|----------|--------|--------|
| `description` | Not in Google Places API | Need Captain input |
| `luxury_category` | LEXA proprietary | Need to create |
| `emotional_tags` | LEXA proprietary | Need relationship inference |
| `best_for` (couples, families, solo) | LEXA proprietary | Need Captain input |
| `dress_code` | Not standardized | Need Captain input |
| `booking_url` | Varies by venue | Need manual input |

---

## 🎯 Luxury Score Calculation

The `luxury_score` is calculated using this algorithm:

```typescript
let score = 0;

// 1. Rating Component (0-3 points)
if (rating >= 4.5) score += 3;
else if (rating >= 4.0) score += 2;
else if (rating >= 3.5) score += 1;

// 2. Price Level Component (0-4 points)
score += price_level; // 1-4

// 3. Review Volume Component (0-1 point)
if (reviews >= 500) score += 1;

// 4. Type-Based Component (0-2 points)
if (hasLuxuryType(['spa', 'resort', 'fine_dining', 'beach_club', etc.]))
  score += 2;

// Normalize to 0-10 scale
luxury_score = min(10, (score / 10) * 10);
```

**Examples:**
- **Cheval Blanc St-Tropez:** 4.6★ + $$$$ (4) + 500+ reviews + resort type = **10/10**
- **Local cafe:** 4.2★ + $$ (2) + 50 reviews = **4/10**

---

## 🧠 Emotional Relationships

### **Current Status:**

❌ **POIs do NOT automatically get emotional relationships during enrichment.**

Emotional relationships like `EVOKES`, `AMPLIFIES_DESIRE`, `MITIGATES_FEAR` are created separately by:

1. **Manual Captain Input** (via Knowledge Portal)
2. **AI Inference** (via relationship-inference scripts)
3. **Data Quality Agent** (runs nightly)

### **Emotional Relationship Schema:**

```cypher
// Examples of emotional relationships
(poi:poi)-[:EVOKES]->(emotion:Emotion)
(poi:poi)-[:AMPLIFIES_DESIRE]->(desire:Desire)
(poi:poi)-[:MITIGATES_FEAR]->(fear:Fear)
```

### **How to Create Emotional Relationships:**

**Option 1: Run Inference Script**
```bash
# This would need to be created
npx ts-node scripts/infer-emotional-relationships.ts
```

**Option 2: Manual Captain Input**
- Use Knowledge Portal
- Add comments with emotional keywords
- AI extracts and creates relationships

**Option 3: Automated (Future)**
- Use Claude to analyze POI type, name, reviews
- Infer likely emotions
- Create relationships with confidence scores

---

## 🚀 Recommended Improvements

### **Add Address to Enrichment:**

Update `scripts/enrich-all-pois.ts` to request `formatted_address`:

```typescript
// Change this line:
const detailsUrl = `...&fields=place_id,name,rating,...,formatted_address&key=...`;

// Add to update query:
SET p.google_address = $address,

// Add to parameters:
address: googleData.formatted_address || null,
```

**Benefit:** Users can see where POI is located  
**Cost:** No additional cost (same API call)

### **Add Opening Hours:**

```typescript
fields: 'place_id,name,rating,...,opening_hours,business_status'
```

**Benefit:** Know when venue is open  
**Cost:** No additional cost

### **Add Photos (Optional):**

```typescript
fields: 'place_id,name,rating,...,photos'
// Then fetch photo URLs separately
```

**Benefit:** Visual appeal  
**Cost:** $7 per 1,000 photos (expensive!)

---

## 📊 Enrichment Coverage by Destination

You can check which POIs are enriched:

```cypher
// Enrichment rate by destination
MATCH (p:poi)
WITH p.destination_name as dest, count(p) as total
MATCH (p:poi {destination_name: dest})
WHERE p.luxury_score IS NOT NULL
WITH dest, total, count(p) as enriched
RETURN dest, total, enriched, 
       round(100.0 * enriched / total, 2) as percent_enriched
ORDER BY percent_enriched DESC
LIMIT 20
```

---

## 💡 Next Steps

1. ✅ **Add `formatted_address` to enrichment** (easy, no extra cost)
2. ✅ **Add `opening_hours` and `business_status`** (easy, no extra cost)
3. 🔄 **Create emotional relationship inference script** (complex, high value)
4. ⚠️ **Consider photos** (expensive, but visual appeal)
5. 📝 **Captain descriptions** (manual, but authentic)

---

## 🎯 Aggressive French Riviera Enrichment Plan

See: `docs/AGGRESSIVE_FRENCH_RIVIERA_PLAN.md`

