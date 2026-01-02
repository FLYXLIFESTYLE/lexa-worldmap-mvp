# Intelligence Storage & Retrieval Architecture

## 📊 Complete Flow: Upload → Extract → Store → Use

### **PART 1: Data Collection** (What Captains Do)

```
Captain uploads document/URL
         ↓
   Extract intelligence (7 types)
         ↓
   Store in Supabase (6 new tables)
         ↓
   Available for LEXA to use
```

---

## 🗄️ **Database Tables** (Migration 012)

### **6 New Intelligence Tables:**

| Table | Purpose | Used By LEXA For |
|-------|---------|------------------|
| `extracted_experiences` | Creative experience concepts | Script inspiration, narrative ideas |
| `market_trends` | Luxury travel patterns | Trending recommendations |
| `client_insights` | Traveler psychology | Understanding user needs |
| `price_intelligence` | Pricing patterns | Budget recommendations |
| `competitor_analysis` | What competitors do | Differentiation, ideas |
| `operational_learnings` | Practical knowledge | Logistics, timing, tips |

---

## 💾 **Storage Flow**

### **When Captain Uploads:**

1. **File is processed** → Extract text
2. **Claude AI analyzes** → Extract 7 intelligence types
3. **Storage service saves** → All data to database

```python
# In captain_upload.py API
intelligence = await extract_all_intelligence(text, filename)

counts = await save_intelligence_to_db(
    intelligence=intelligence,
    upload_id=upload_record['id'],
    user_id=current_user['id']
)

# Returns: {'pois': 15, 'experiences': 3, 'trends': 5, ...}
```

### **What Gets Saved:**

```json
{
  "pois": [
    {"name": "Hotel du Cap-Eden-Roc", "luxury_score": 10, ...}
  ],
  "experiences": [
    {
      "experience_title": "Sunset Yacht Proposal Experience",
      "experience_type": "romantic",
      "target_audience": "couples",
      "emotional_goal": "Create unforgettable proposal moment",
      "key_moments": ["Private yacht departure", "Sunset timing", "Champagne moment"],
      "estimated_budget": "$50,000-$75,000"
    }
  ],
  "trends": [
    {
      "trend_name": "Experiential Luxury Over Material Goods",
      "target_demographic": "Millennial/Gen Z HNW",
      "business_opportunity": "Focus on unique memories, not just luxury venues"
    }
  ],
  "client_insights": [
    {
      "insight_category": "decision_factors",
      "client_segment": "UHNW couples",
      "insight_description": "Book 12+ months ahead for peak season yachts",
      "unmet_needs": "Last-minute availability for spontaneous trips"
    }
  ]
}
```

---

## 🔄 **Retrieval Flow** (How LEXA Uses It)

### **When User Chats with LEXA:**

```
User: "Create a romantic yacht experience in Monaco for my anniversary"
         ↓
   LEXA analyzes request
         ↓
   Query intelligence database for:
   - destination: "Monaco"
   - themes: ["Romance"]
   - target_audience: "couples"
         ↓
   Retrieve relevant intelligence
         ↓
   Enhance script with real-world knowledge
         ↓
   Return personalized experience script
```

### **API Function:**

```python
# In LEXA chat endpoint
intelligence = await get_intelligence_for_script_creation(
    destination="Monaco",
    themes=["Romance", "Luxury"],
    target_audience="couples",
    budget_range=(50000, 100000)
)

# Returns:
{
  'experiences': [
    {experience_title: "Private Villa Sunset Dinner", usage_count: 45},
    {experience_title: "Yacht Proposal Experience", usage_count: 32}
  ],
  'trends': [
    {trend_name: "Privacy-First Luxury", growth_indicator: "growing"}
  ],
  'insights': [
    {insight_description: "Couples value exclusivity over opulence"}
  ],
  'prices': [
    {experience_type: "Yacht rental (100ft)", average_price: 65000}
  ],
  'learnings': [
    {learning: "Book Monaco marina 6+ months ahead for summer"}
  ]
}
```

---

## 🤖 **LEXA Integration** (Enhanced System Prompt)

### **Before** (Basic POI lookup):
```
User: Create romantic Monaco experience
LEXA: Here are some romantic restaurants in Monaco...
```

### **After** (Intelligence-Enhanced):
```
User: Create romantic Monaco experience
LEXA: 
  - Queries intelligence DB
  - Finds "Sunset Yacht Proposal Experience" (used 32 times)
  - Sees trend: "Privacy-First Luxury" is growing
  - Knows: UHNW couples book 12 months ahead
  - Learns: Monaco marina books fast for summer
  
Response: "I've designed a private yacht experience inspired by 
successful romantic Monaco getaways. Based on current trends, 
couples are seeking privacy over opulence. I recommend booking 
your 100ft yacht ($65K) at least 6 months ahead for peak season..."
```

---

## 📈 **Usage Tracking**

Every time LEXA uses intelligence, we track it:

```python
# Track most valuable content
await increment_usage_count('extracted_experiences', experience_id)

# Later queries prioritize high-usage items:
ORDER BY usage_count DESC  # Most proven experiences first
```

**Why?** The most-used experiences are proven winners. LEXA learns what works.

---

## 🎯 **Real-World Example**

### **Captain uploads luxury travel blog about Santorini:**

**Extracted Intelligence:**

| Type | Count | Examples |
|------|-------|----------|
| **POIs** | 12 | 5 restaurants, 3 hotels, 2 beaches, 2 activities |
| **Experiences** | 3 | "Wine tasting at sunset", "Private catamaran tour", "Cooking class with local chef" |
| **Trends** | 2 | "Wellness-focused luxury travel", "Instagram-worthy moments" |
| **Insights** | 5 | "Millennials prioritize Instagrammable locations", "Book caldera-view hotels 9 months ahead" |
| **Prices** | 4 | Hotel: $800-2000/night, Catamaran: $5000-8000/day |
| **Learnings** | 6 | "Best sunset views from Oia", "Avoid cruise ship crowds 10am-4pm" |

### **When user asks for Santorini romantic getaway:**

**LEXA's Enhanced Response Uses:**
- ✅ 12 POIs for venue recommendations
- ✅ 3 Experience ideas for inspiration
- ✅ 2 Trends to align with (wellness + Instagram)
- ✅ 5 Insights for personalization
- ✅ 4 Price points for budget
- ✅ 6 Learnings for insider tips

**Result:** Instead of generic POI list, LEXA creates a **curated narrative experience** with:
- Timing recommendations (sunset, avoid cruise crowds)
- Budget breakdown ($15K-25K for 5 days)
- Instagrammable moments (trending for target demographic)
- Insider tips (caldera view booking timeline)

---

## 💡 **Why This is Powerful**

### **Traditional Approach:**
- Upload → Extract POIs → Store → Done
- **Value:** List of places

### **LEXA Approach:**
- Upload → Extract 7 intelligence types → Store → Learn → Apply
- **Value:** Complete business intelligence system

### **Competitive Advantage:**

| Feature | Competitors | LEXA |
|---------|-------------|------|
| POI Database | ✅ | ✅ |
| Experience Ideas | ❌ | ✅ |
| Market Trends | ❌ | ✅ |
| Client Psychology | ❌ | ✅ |
| Price Intelligence | ❌ | ✅ |
| Competitor Analysis | ❌ | ✅ |
| Operational Knowledge | ❌ | ✅ |

---

## 🚀 **Next Steps**

1. **Run migration 012:** Create 6 new tables
2. **Deploy intelligence_storage.py:** Save/retrieve functions
3. **Update LEXA chat prompt:** Query intelligence on every request
4. **Track usage:** Learn which content works best
5. **Iterate:** Refine based on what users love

---

## 📊 **Sample Stats After 3 Months**

Imagine:
- **100 documents uploaded** by captains
- **2,000 POIs** extracted
- **300 experience ideas** captured
- **150 market trends** identified
- **500 client insights** discovered
- **200 price points** collected
- **400 operational learnings** documented

**Result:** LEXA becomes the most intelligent luxury travel AI in the world, powered by human-curated knowledge from experienced captains.

---

**🎉 LEXA doesn't just know places - it understands luxury travel psychology, market dynamics, and how to create unforgettable experiences!**
