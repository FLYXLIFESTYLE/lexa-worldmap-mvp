# 🚀 Super Enrichment Guide - Complete POI Enhancement

## 🎯 Overview

**Super Enrichment** is a comprehensive 3-phase pipeline that enriches POIs with:
1. **Google Places data** (ratings, price, address, website)
2. **Website scraping** (description, highlights, ambiance) 
3. **Emotional relationships** (EVOKES, AMPLIFIES_DESIRE, MITIGATES_FEAR)

**Key Benefit:** Touch each POI only **ONCE** instead of 3 separate times!

---

## 📦 What Gets Enriched?

### Phase 1: Google Places

| Property | Description | Example |
|----------|-------------|---------|
| `google_place_id` | Unique Google ID | `ChIJN1t_...` |
| `google_rating` | User rating (0-5★) | `4.6` |
| `google_reviews_count` | Number of reviews | `1,247` |
| `google_price_level` | Price (1-4) | `3` ($$$) |
| `google_website` | Official website | `https://club55.fr` |
| `google_phone` | Phone number | `+33 4 94 55 55 55` |
| `google_address` | Full address | `43 Bd Patch, 83350 Ramatuelle` |
| `google_business_status` | Open/closed | `OPERATIONAL` |
| `luxury_score` | LEXA score (0-10) | `8.5` |
| `luxury_confidence` | Confidence (0-1) | `0.8` |
| `luxury_evidence` | Reasoning | `Excellent rating: 4.6★ \| Price: $$$` |

### Phase 2: Website Scraping (If Website Found + Score ≥ 7)

| Property | Description | Example |
|----------|-------------|---------|
| `website_description` | 1-2 sentence overview | `Iconic beachfront restaurant...` |
| `website_highlights` | Key features (array) | `["Beachfront dining", "Live music"]` |
| `website_ambiance` | Mood tags (array) | `["elegant", "relaxed", "romantic"]` |

### Phase 3: Emotional Relationships (If Score ≥ 6)

Creates Neo4j relationships:

```cypher
(poi:poi)-[:EVOKES]->(emotion:Emotion)
  // Examples: joy, excitement, tranquility, romance
  
(poi:poi)-[:AMPLIFIES_DESIRE]->(desire:Desire)
  // Examples: luxury, social_status, freedom, adventure
  
(poi:poi)-[:MITIGATES_FEAR]->(fear:Fear)
  // Examples: missing_out, mediocrity, boredom
```

Each relationship includes:
- `confidence` (0.6-1.0)
- `reason` (why this emotion/desire/fear applies)
- `inferred_at` (timestamp)
- `source` ('ai_inference')

---

## 💰 Cost Breakdown

| Phase | Cost per POI | When It Runs |
|-------|--------------|--------------|
| **Google Places** | $0.017 | Every POI |
| **Website Scraping** | $0.002 | If website exists & score ≥ 7 |
| **Emotional Inference** | $0.01 | If score ≥ 6 |
| **Total (all phases)** | ~$0.029 | Varies by POI |
| **Total (basic)** | ~$0.017 | If no website or low score |

**French Riviera Estimate:**
- 6,000 POIs × $0.025 average = **$150 total**
- This includes ~30% with full enrichment, 70% basic

---

## 🚀 Running Super Enrichment

### **Manual Run (For Testing):**

```bash
# Run one batch of 50 POIs
npx ts-node scripts/super-enrich-french-riviera.ts
```

**Expected Output:**

```
🇫🇷 Super Enrichment: French Riviera

📦 3-Phase Pipeline:
  Phase 1: Google Places enrichment
  Phase 2: Website scraping (if available)
  Phase 3: Emotional relationship inference

[1/50] Club 55 Beach Bar (St. Tropez)
  📍 Phase 1: Google Places...
  ✅ Score: 8.5/10 | 4.6★ | $$$
  🌐 Phase 2: Website scraping...
  ✅ Extracted: 5 highlights
  🧠 Phase 3: Emotional inference...
  ✅ Found: 3 emotions, 3 desires
  ✅ Complete!

🎉 Super Enrichment Complete!
✅ Enriched: 45
🌐 With websites: 12
🧠 With emotions: 38
❌ Not found: 5
💰 Cost: ~$1.20
```

---

## 🤖 Automated Enrichment Options

### **Option 1: Continuous Loop (Day + Night)**

Run this in a PowerShell window (keeps running):

```powershell
# Run 120 batches (6,000 POIs) with 30-minute delays
.\scripts\auto-french-riviera-loop.ps1 -MaxBatches 120 -DelayMinutes 30
```

**This will:**
- Run 1 batch every 30 minutes
- Continue until 120 batches complete
- Total time: ~60 hours (2.5 days)
- Cost: ~$150

**Perfect for:** Weekend blitz enrichment

### **Option 2: Overnight Automation (Scheduled Tasks)**

Set up Windows Task Scheduler to run automatically every night:

```powershell
# Run as Administrator!
.\scripts\setup-overnight-enrichment.ps1
```

**This creates 4 scheduled tasks:**
- 11:00 PM - Batch 1
- 1:00 AM - Batch 2  
- 3:00 AM - Batch 3
- 5:00 AM - Batch 4

**Result:**
- 200 POIs enriched per night
- ~30 nights to complete 6,000 POIs
- $5-6 per night
- ~$150 total

**Perfect for:** Set it and forget it

### **Option 3: Manual Batch Processing**

Run manually throughout the day:

```bash
# Run this 20 times today (every 30 mins)
npx ts-node scripts/super-enrich-french-riviera.ts
```

**Result:**
- 1,000 POIs per day
- ~6 days to complete
- $25 per day
- ~$150 total

**Perfect for:** Active monitoring and control

---

## 🎯 Unnamed POI Handling

### **Problem:**
~30% of POIs are "Unnamed POI (osm:osm_node_XXXXX)" and can't be enriched with name-based search.

### **Solution (Implemented):**

The super enrichment script now:
1. **First tries:** Name-based search (`keyword=name`)
2. **If fails:** Tries reverse lookup (coordinates only, 50m radius)
3. **Updates POI name** if Google returns a better name

**Example:**
```
Before: Unnamed POI (osm:osm_node_251221719)
After: Le Bateau Ivre (enriched from Google Places)
```

### **Additional Solutions (Backlog):**

1. **Reverse Geocoding** - Use Google Geocoding API
2. **OSM Overpass API** - Query OSM directly with coordinates
3. **Captain Review Queue** - Flag for manual naming
4. **Nearest Neighbor** - Use nearby named POIs as hints

---

## 🧠 Emotional Relationship Examples

### **High-End Beach Club (Club 55):**

```json
{
  "evokes": [
    {"emotion": "joy", "confidence": 0.9, "reason": "beachfront setting with live atmosphere"},
    {"emotion": "excitement", "confidence": 0.85, "reason": "celebrity hotspot and exclusive venue"}
  ],
  "amplifies_desire": [
    {"desire": "social_status", "confidence": 0.95, "reason": "iconic luxury destination"},
    {"desire": "freedom", "confidence": 0.8, "reason": "relaxed beachfront experience"},
    {"desire": "indulgence", "confidence": 0.9, "reason": "fine dining and premium service"}
  ],
  "mitigates_fear": [
    {"fear": "mediocrity", "confidence": 0.85, "reason": "world-renowned establishment"},
    {"fear": "missing_out", "confidence": 0.9, "reason": "must-visit French Riviera experience"}
  ]
}
```

### **Boutique Hotel (Luxury Score 7.5):**

```json
{
  "evokes": [
    {"emotion": "tranquility", "confidence": 0.85, "reason": "intimate boutique setting"},
    {"emotion": "romance", "confidence": 0.8, "reason": "elegant atmosphere and personalized service"}
  ],
  "amplifies_desire": [
    {"desire": "luxury", "confidence": 0.8, "reason": "high-end amenities and exclusivity"},
    {"desire": "comfort", "confidence": 0.9, "reason": "premium accommodations"}
  ],
  "mitigates_fear": [
    {"fear": "discomfort", "confidence": 0.8, "reason": "high ratings and luxury standards"}
  ]
}
```

---

## 📊 Progress Tracking

### **Check Progress in ChatNeo4j:**

```
"Show me French Riviera enrichment stats"
"How many POIs have emotional relationships?"
"Show me POIs in St. Tropez with EVOKES relationships"
"What emotions do luxury beach clubs evoke?"
```

### **Manual Cypher Queries:**

```cypher
// Total enriched POIs
MATCH (p:poi)
WHERE p.destination_name CONTAINS 'Riviera' 
  AND p.luxury_score IS NOT NULL
RETURN count(p) as enriched

// POIs with emotional relationships
MATCH (p:poi)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
WHERE p.destination_name CONTAINS 'Riviera'
RETURN count(DISTINCT p) as pois_with_emotions

// Top emotions evoked by French Riviera POIs
MATCH (p:poi)-[r:EVOKES]->(e:Emotion)
WHERE p.destination_name CONTAINS 'Riviera'
RETURN e.name, count(*) as count, avg(r.confidence) as avg_confidence
ORDER BY count DESC
LIMIT 10
```

---

## 🎛️ Customization Options

### **Adjust Batch Size:**

Edit `scripts/super-enrich-french-riviera.ts`:

```typescript
const BATCH_SIZE = 100; // Change from 50 to 100 for faster processing
```

### **Change Delay Between Requests:**

```typescript
const DELAY_MS = 100; // Faster: 100ms (10 req/sec)
const DELAY_MS = 500; // Safer: 500ms (2 req/sec)
```

### **Adjust Thresholds:**

```typescript
// Website scraping threshold
if (googleData.website && scoring.luxury_score >= 7) {
  // Change 7 to 5 for more websites, 8 for fewer
}

// Emotional inference threshold
if (scoring.luxury_score >= 6) {
  // Change 6 to 5 for more emotions, 7 for fewer
}
```

---

## ⚠️ Important Notes

### **Website Scraping:**

- ✅ Only scrapes POIs with score ≥ 7 (high value)
- ✅ 10-second timeout per website
- ⚠️ Some websites block scraping (graceful failure)
- ⚠️ Uses Claude AI (~$0.002 per scrape)

### **Emotional Inference:**

- ✅ Only for POIs with score ≥ 6 (reasonable quality)
- ✅ Creates relationships with confidence scores
- ✅ Can be queried and filtered by confidence
- ⚠️ Uses Claude AI (~$0.01 per inference)

### **API Rate Limits:**

- Google Places: No hard limit, but be reasonable
- Claude AI: 10 RPM (requests per minute) on standard tier
- **Solution:** Built-in delays prevent rate limit issues

---

## 🚨 Troubleshooting

### **"Missing API keys" Error:**

Check your `.env` file has:
```
GOOGLE_PLACES_API_KEY=AIzaSy...
ANTHROPIC_API_KEY=sk-ant-...
NEO4J_URI=neo4j+s://...
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
```

### **"Rate limit exceeded" Error:**

Increase delay:
```typescript
const DELAY_MS = 500; // Slow down to 2 requests/second
```

### **Scheduled tasks not running:**

1. Open Task Scheduler (`taskschd.msc`)
2. Find tasks starting with `LEXA_`
3. Check "Last Run Result" - should be `0x0` (success)
4. Ensure laptop is:
   - Plugged in (not on battery)
   - Not in sleep mode
   - Connected to internet

---

## 📈 Expected Results

### **After 1 Day (20 manual batches):**
- ✅ 1,000 POIs enriched
- 🌐 ~200 with website data
- 🧠 ~800 with emotional relationships
- 💰 Cost: ~$25

### **After 1 Week (140 overnight batches):**
- ✅ 7,000 POIs enriched (French Riviera complete!)
- 🌐 ~1,400 with website data
- 🧠 ~5,600 with emotional relationships
- 💰 Cost: ~$175

### **French Riviera Complete:**
- ✅ 100% enrichment coverage
- 🧠 Thousands of emotional relationships
- 🎯 Ready for LEXA recommendations
- 💎 World-class destination data

---

## ✅ Next Steps

1. **Test the super enrichment:**
   ```bash
   npx ts-node scripts/super-enrich-french-riviera.ts
   ```

2. **Choose your automation strategy:**
   - Continuous loop (fastest)
   - Overnight scheduling (hands-off)
   - Manual batches (most control)

3. **Set it up:**
   ```powershell
   # For overnight automation (run as Admin):
   .\scripts\setup-overnight-enrichment.ps1
   ```

4. **Monitor progress:**
   - Check ChatNeo4j daily
   - Review emotional relationships
   - Verify data quality

5. **Celebrate milestones:**
   - 1,000 POIs enriched
   - 50% French Riviera complete
   - First emotional relationships live
   - 100% French Riviera complete! 🎉

---

**🚀 Let's build the emotional intelligence layer that makes LEXA worth billions!**

