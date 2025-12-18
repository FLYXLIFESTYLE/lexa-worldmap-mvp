# 📥 Manual POI Import Guide

**Complete guide for importing manually downloaded POI lists**

---

## 🎯 **Quick Start**

```bash
# 1. Download Forbes/Michelin/Government list (CSV or JSON)
# 2. Place in data/ folder
# 3. Run import:
npx ts-node scripts/import-manual-poi-list.ts data/your_file.csv

# Done! POIs automatically enriched with Master Pipeline
```

---

## 📊 **What We Created Today**

### **1. Manual Import Script** ✅
**File:** `scripts/import-manual-poi-list.ts`

**What it does:**
- Reads CSV or JSON files
- Validates data
- Geocodes addresses (if no coordinates)
- Runs Master Enrichment Pipeline on each POI:
  - Google Places data
  - Website scraping
  - Luxury scoring
  - Emotional intelligence
  - All relationships
- Stores in Neo4j

**Supported formats:**
- CSV (`.csv`)
- JSON (`.json`)

---

### **2. CSV Template** ✅
**File:** `data/templates/poi_import_template.csv`

**Required columns:**
- `name` (required)
- `source` (required, e.g., "forbes_2024")

**Recommended columns:**
- `type` (e.g., "hotel", "restaurant")
- `city`
- `country`
- `address`
- `website`
- `phone`
- `description`
- `award` (e.g., "5-star", "3-michelin-stars")
- `lat` (latitude)
- `lon` (longitude)

**Example:**
```csv
name,type,city,country,address,website,phone,description,award,source,lat,lon
"Ritz Paris","hotel","Paris","France","15 Place Vendôme","https://ritzparis.com","+33 1 43 16 30 30","Iconic 5-star luxury hotel","5-star","forbes_2024",48.8686,2.3282
```

---

### **3. Government Data Request Template** ✅
**File:** `docs/GOVERNMENT_DATA_REQUEST_TEMPLATE.md`

**What it includes:**
- Professional email template
- Data requirements checklist
- Value proposition talking points
- Partnership models
- Sample data formats
- Priority countries to contact
- Follow-up strategy

**Target:** 5 partnerships by Month 3

---

### **4. TripAdvisor Alternatives Analysis** ✅
**File:** `docs/TRIPADVISOR_ALTERNATIVES_ANALYSIS.md`

**Platforms analyzed:**
- ✅ **GetYourGuide** - Activities (RECOMMENDED)
- ✅ **Google Places** - All POIs (ALREADY USING)
- ⚠️ **Booking.com** - Affiliate only
- ❌ **TripAdvisor** - AI/ML prohibited
- ❌ **Airbnb** - No API
- ✅ **Komoot** - Outdoor activities (RECOMMENDED)
- ⚠️ **Viator** - Activities (alternative)

**Recommended:**
1. Google Places (keep using)
2. GetYourGuide (sign up)
3. Komoot (sign up)

---

## 🚀 **How to Use: Manual Import**

### **Scenario 1: Forbes PDF Report**

**Step 1: Convert PDF to CSV**
- Open Forbes PDF
- Copy/paste into Excel/Google Sheets
- Format as CSV with required columns
- Save as `forbes_5star_2024.csv`

**Step 2: Prepare CSV**
```csv
name,type,city,country,website,award,source
"Hôtel de Paris","hotel","Monte-Carlo","Monaco","https://hoteldeparis.com","5-star","forbes_2024"
"Le Louis XV","restaurant","Monte-Carlo","Monaco","https://alain-ducasse.com","3-michelin-stars","forbes_2024"
```

**Step 3: Import**
```bash
npx ts-node scripts/import-manual-poi-list.ts data/forbes_5star_2024.csv
```

**Result:**
- Each POI imported
- Auto-geocoded (if no coordinates)
- Enriched with Google Places
- Websites scraped
- Emotions/activities inferred
- All relationships created

---

### **Scenario 2: Government Tourism List**

**Step 1: Request Data**
- Use template from `docs/GOVERNMENT_DATA_REQUEST_TEMPLATE.md`
- Email Monaco Tourism Board
- Receive CSV export

**Step 2: Format CSV**
```csv
name,type,city,country,address,lat,lon,source
"Casino de Monte-Carlo","casino","Monte-Carlo","Monaco","Place du Casino",43.7401,7.4242,"monaco_tourism_2024"
"Opera de Monte-Carlo","theater","Monte-Carlo","Monaco","Place du Casino",43.7394,7.4253,"monaco_tourism_2024"
```

**Step 3: Import**
```bash
npx ts-node scripts/import-manual-poi-list.ts data/monaco_official.csv
```

**Result:** Government-verified POIs in database!

---

### **Scenario 3: Michelin Guide PDF**

**Step 1: Download**
- Download Michelin Guide PDF
- Extract restaurant list

**Step 2: Create CSV**
```csv
name,type,city,country,website,award,source
"Le Jules Verne","restaurant","Paris","France","https://www.restaurants-toureiffel.com","1-michelin-star","michelin_2024"
"Arpège","restaurant","Paris","France","https://www.alain-passard.com","3-michelin-stars","michelin_2024"
```

**Step 3: Import**
```bash
npx ts-node scripts/import-manual-poi-list.ts data/michelin_paris_2024.csv
```

---

## 📋 **Data Collection Workflow**

### **Week 1: Forbes Lists**
1. Download Forbes Travel Guide reports
2. Convert to CSV
3. Import 5,000 POIs
4. Cost: ~$125

### **Week 2: Government Data**
1. Email 5 tourism boards (use template)
2. Wait for responses
3. Import official data
4. Cost: FREE + enrichment

### **Week 3: Michelin Guide**
1. Download Michelin Guide PDFs
2. Extract starred restaurants
3. Import 3,000 POIs
4. Cost: ~$75

### **Week 4: Other Sources**
1. Trade associations
2. Luxury hotel groups (Leading Hotels, Virtuoso)
3. Wine regions
4. Golf courses
5. Cost: varies

---

## 💰 **Cost Estimation**

### **Per POI:**
```
Import: FREE
Geocoding: $0.017 (if no coordinates)
Enrichment: $0.025 (Google Places + Claude AI)
TOTAL: ~$0.042 per POI
```

### **Common Scenarios:**
```
Forbes 5,000 POIs: $210
Government 10,000 POIs: $420
Michelin 3,000 POIs: $126
TOTAL 18,000 POIs: $756
```

**Much cheaper than scraping failures!**

---

## ✅ **Quality Checklist**

Before importing, ensure CSV has:

- [ ] `name` column (required)
- [ ] `source` column (required)
- [ ] At least one of: `address` OR `lat/lon` OR `city+country`
- [ ] No duplicate POI names
- [ ] Consistent source naming (e.g., all "forbes_2024", not mix of "Forbes", "forbes", "Forbes 2024")
- [ ] Valid URLs (if website column)
- [ ] Valid coordinates (if lat/lon columns)

---

## 🔍 **Validation**

### **After Import:**

```cypher
// Check imported POIs
MATCH (p:poi)
WHERE p.source = 'forbes_2024'
RETURN count(*) as total,
       avg(p.luxury_score) as avg_score,
       count(CASE WHEN p.luxury_score >= 8 THEN 1 END) as luxury_count
```

### **Verify Relationships:**

```cypher
// Check relationships created
MATCH (p:poi {source: 'forbes_2024'})-[r]->(n)
RETURN type(r) as relationship_type,
       count(*) as count
ORDER BY count DESC
```

**Expected:**
- LOCATED_IN (100%)
- SUPPORTS_ACTIVITY (80%+)
- EVOKES (60%+)
- AMPLIFIES_DESIRE (50%+)
- MITIGATES_FEAR (50%+)

---

## 📊 **Success Metrics**

### **Week 1:**
- ✅ 1,000 manual POIs imported
- ✅ Enrichment pipeline proven
- ✅ Cost validated

### **Month 1:**
- ✅ 5,000 manual POIs imported
- ✅ 2 government partnerships
- ✅ Forbes + Michelin data integrated

### **Month 3:**
- ✅ 20,000 manual POIs imported
- ✅ 5 government partnerships
- ✅ Premium data coverage

---

## 🎯 **Priority Sources**

### **Tier 1: Download Today**
1. Forbes Travel Guide Star Awards
2. Michelin Guide (your region)
3. Condé Nast Gold List
4. World's 50 Best (restaurants, bars, hotels)

### **Tier 2: Request This Week**
1. Monaco Tourism Board
2. France - Côte d'Azur Tourism
3. Italy - Amalfi Coast Tourism
4. Maldives Tourism Board

### **Tier 3: Ongoing**
1. Wine regions (Bordeaux, Napa, etc.)
2. Golf associations
3. Luxury hotel groups
4. Yacht clubs

---

## 💡 **Pro Tips**

### **1. Batch Processing**
```bash
# Import multiple files
npx ts-node scripts/import-manual-poi-list.ts data/forbes.csv
npx ts-node scripts/import-manual-poi-list.ts data/michelin.csv
npx ts-node scripts/import-manual-poi-list.ts data/government.csv
```

### **2. Source Naming**
Use consistent naming:
- `forbes_2024`
- `michelin_france_2024`
- `monaco_tourism_2024`
- `manual_captain_christian_2024`

### **3. Deduplication**
Master Pipeline automatically checks for duplicates within 100m radius!

### **4. Progress Tracking**
Script shows:
- Real-time progress
- Success/failure counts
- Time estimates
- Cost estimates

---

## 🚀 **Next Steps**

### **RIGHT NOW:**

1. ✅ Try the import script:
   ```bash
   npx ts-node scripts/import-manual-poi-list.ts data/templates/poi_import_template.csv
   ```

2. ✅ Check results in Neo4j

3. ✅ Download Forbes list (or use template to start)

### **THIS WEEK:**

1. ✅ Email 3-5 government tourism boards
2. ✅ Download 1-2 premium lists
3. ✅ Import 1,000+ POIs

### **THIS MONTH:**

1. ✅ Secure 2 government partnerships
2. ✅ Import all available premium lists
3. ✅ 10,000+ manually sourced POIs

---

## 📞 **Get API Access**

### **GetYourGuide (Activities):**
1. Sign up: https://partner.getyourguide.com
2. Email: partner-support@getyourguide.com
3. Ask: "Can we use API data with AI for recommendations?"

### **Komoot (Outdoor):**
1. Sign up: https://www.komoot.com/api
2. Request API access
3. Integrate hiking/cycling routes

---

## ✅ **Summary**

**Manual import is BETTER than scraping because:**

1. ✅ **Reliable** - No 404 errors
2. ✅ **Legal** - You have the data legitimately
3. ✅ **Quality** - Premium sources (Forbes, government)
4. ✅ **Automatic** - Master Pipeline does all enrichment
5. ✅ **Fast** - Import 1,000 POIs in < 1 hour
6. ✅ **Scalable** - Government partnerships = ongoing data

**Start importing today!** 🚀

---

**Last Updated:** December 18, 2025  
**Status:** Ready to use  
**Next:** Download Forbes list and import!

