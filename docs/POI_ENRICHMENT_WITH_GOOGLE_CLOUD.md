# POI Enrichment with Google Cloud - Complete Guide

## 💰 Your Budget Status

### **Current Credits:**
- €242 Google Cloud credits (paid account)
- **Valid until:** February 25, 2026
- **Project:** LEXA-POI-Enrichment (ID: lexa-poi-enrichment)

### **Google Cloud Free Tier:**
**$200 FREE credits per month** for first 90 days!
- This is **$200/month**, not one-time
- Stacks with your paid credits
- After 90 days: Keep using your €242 credits

### **Total Available for POI Enrichment:**
- **Month 1-3:** €242 + $200/month = ~$460/month
- **After 90 days:** €242 remaining credits

---

## 📊 Google Places API Pricing

### **Cost per Request:**
| API Endpoint | Cost per 1,000 | Purpose |
|--------------|----------------|---------|
| **Nearby Search** | $32 | Find POIs in an area |
| **Text Search** | $32 | Search POIs by query |
| **Place Details** | $17 | Get full POI info |
| **Place Photos** | $7 | Get POI images |

### **Typical POI Enrichment Cost:**
For **each POI**, you typically need:
1. **Place Details:** $0.017 (primary data)
2. **Place Photos (optional):** $0.007 per photo

**Average cost per POI:** ~$0.02-0.03 (~€0.02)

---

## 🗺️ French Riviera POI Enrichment

### **Estimated Scope:**
- **Cities:** Monaco, Nice, Cannes, Saint-Tropez, Antibes, Èze, Villefranche-sur-Mer, Cap d'Antibes, Menton
- **POI Categories:** 
  - Luxury hotels & resorts
  - Michelin restaurants
  - Beach clubs
  - Marinas & yacht clubs
  - Cultural sites
  - Shopping districts

### **Estimated POI Count:**
- **Luxury POIs:** 500-1,000
- **General high-quality POIs:** 2,000-3,000
- **Total:** ~2,500 POIs

### **Cost Estimate:**
- **2,500 POIs × $0.025** = ~$62.50 (€58)
- **With your credits:** You have plenty! (~€242 available)

### **Time Estimate:**
- **With rate limiting:** 2-4 hours
- **API calls:** ~5,000-7,500 requests total

---

## 🚀 How to Start POI Enrichment

### **Option 1: Use Existing Data Quality Agent**

You already have a POI enrichment system! It's in your admin dashboard.

**To enrich French Riviera:**

1. **Go to:** `/admin/data-quality`
2. **Run enrichment** for existing POIs
3. **Or:** Upload new POI lists (see Option 2)

### **Option 2: Upload Screenshot Lists**

You want to upload screenshot lists of yacht destinations! Here's how:

**Step 1: Extract Cities from Screenshots**

I'll help you create an endpoint to:
1. Upload screenshots
2. Use OCR (Google Vision API) to extract text
3. Parse city names
4. Check if POIs exist in database
5. Add missing ones
6. Queue for enrichment

**Cost for OCR:**
- **Google Vision API:** $1.50 per 1,000 images
- **10 screenshots:** ~$0.02

**Step 2: Enrich New POIs**

After adding cities:
1. Run Google Places API enrichment
2. Get full POI details
3. Add luxury scores
4. Link to theme categories

---

## 📸 Screenshot Upload System

Let me create this for you! Here's what it will do:

### **Features:**
1. **Upload multiple screenshots**
2. **OCR text extraction** (Google Vision API)
3. **Parse city/destination names**
4. **Check against existing POIs**
5. **Add missing destinations**
6. **Queue for Google Places enrichment**
7. **Show results: Added vs. Already Exists**

### **Flow:**
```
Screenshots → OCR → Parse Cities → Check DB → Add New → Enrich → Done!
```

### **Cost:**
- **OCR:** $0.002 per screenshot
- **Enrichment:** $0.025 per new POI
- **Total for 50 new yacht destinations:** ~$1.50

---

## 🎯 Recommended Enrichment Plan

### **Phase 1: French Riviera (Your Priority)**
- **Target:** 2,500 luxury POIs
- **Cost:** ~€60
- **Time:** 2-4 hours
- **Cities:** Monaco, Nice, Cannes, Saint-Tropez, Antibes, etc.

### **Phase 2: Screenshot Upload (Yacht Destinations)**
- **Target:** 50-200 new yacht destinations
- **Cost:** ~€5-10
- **Time:** 30 minutes
- **Source:** Your screenshot lists

### **Phase 3: Mediterranean Expansion**
- **Target:** Italian Riviera, Amalfi Coast, Greek Islands
- **Cost:** ~€100-150
- **Time:** 4-8 hours

---

## ⚠️ NULL Theme Categories Issue

Your screenshot shows **NULL theme categories** in the database. These are invalid and need to be removed.

### **Why They Exist:**
- Old OSM import created theme categories without proper names
- Some POIs linked to these invalid categories
- They show up as "null" in your UI

### **How to Fix:**
1. **Go to:** `/admin/seed-themes`
2. **Click:** "🗑️ Remove NULL Themes" button
3. **Result:** NULL categories deleted, invalid relationships removed
4. **Next:** Re-enrich affected POIs with valid theme categories

### **After Cleanup:**
- Only **14 valid theme categories** remain
- All have proper names, icons, and images
- POIs can be re-enriched with correct themes

---

## 🛠️ Next Steps

### **1. Clean Up NULL Themes (Do This First!)**
```bash
# Go to: /admin/seed-themes
# Click: "🗑️ Remove NULL Themes"
```

### **2. Enable Google Places API**
```bash
# In Google Cloud Console:
1. Go to APIs & Services
2. Enable "Places API"
3. Enable "Places API (New)" (optional, for advanced features)
4. Create API key (restrict to Places API only)
5. Add to your .env file
```

### **3. Add API Key to Environment**
```env
# In .env.local (Next.js) or .env (Python)
GOOGLE_PLACES_API_KEY=your-api-key-here
```

### **4. Start Enrichment**
```bash
# Option A: Use existing data quality agent
# Go to: /admin/data-quality
# Click: "Run Quality Check" → enriches existing POIs

# Option B: Build screenshot upload system (I can do this!)
```

---

## 📋 TODO List

- [ ] Clean up NULL theme categories
- [ ] Enable Google Places API in Google Cloud
- [ ] Add API key to environment variables
- [ ] Build screenshot upload & OCR system
- [ ] Enrich French Riviera POIs (2,500)
- [ ] Upload yacht destination screenshots
- [ ] Enrich new yacht destinations
- [ ] Verify theme category assignments

---

## 💡 Budget Optimization Tips

### **1. Filter POIs Before Enrichment**
Only enrich POIs that meet your luxury criteria:
- Minimum rating: 4.0+
- Price level: $$$ or $$$$
- Categories: Hotels, restaurants, attractions, clubs

### **2. Batch Requests**
- Process 1,000 POIs at a time
- Monitor costs
- Pause if budget concerns arise

### **3. Cache Results**
- Store enriched data
- Don't re-enrich same POIs
- Only update if data is old (>6 months)

### **4. Priority Queue**
Enrich in order:
1. **Monaco** (highest luxury density)
2. **Saint-Tropez** (yacht hub)
3. **Cannes** (international prestige)
4. **Nice** (major city)
5. **Other French Riviera**

---

## ✅ Summary

**Your Budget:** €242 + $200/month (90 days) = **More than enough!**

**French Riviera Enrichment:**
- Cost: ~€60
- POIs: ~2,500
- Status: **Ready to start!**

**Screenshot Upload:**
- Cost: ~€5-10
- POIs: 50-200 new yacht destinations
- Status: **I can build this system for you!**

**NULL Themes:**
- Issue: Invalid theme categories in database
- Fix: Click "Remove NULL Themes" button
- Status: **Fix available, ready to clean!**

---

**Want me to build the screenshot upload & OCR system?** 🚀

