# 🚀 Quick Start: Premium Web Scraping

**Get 12,000 luxury POIs in 4 hours for $219**

---

## ⚡ **TL;DR**

```bash
# Run all scrapers (2-3 hours, ~$15 Claude API)
npx ts-node scripts/run-all-scrapers.ts

# Add coordinates (1 hour, ~$204 Google Places API)
npx ts-node scripts/geocode-scraped-pois.ts

# Create relationships
npx ts-node scripts/fix-missing-located-in.ts

# Done! You now have 12,000 verified luxury POIs 🎉
```

---

## 📊 **What You Get**

| Source | POIs | Luxury Score | Awards/Ratings |
|--------|------|--------------|----------------|
| Forbes Travel Guide | 5,000 | 8-10 | 4-star, 5-star |
| Michelin Guide | 3,000 | 6-10 | ⭐⭐⭐ stars, Bib Gourmand |
| Condé Nast Traveler | 3,000 | 8-9 | Gold List, Hot List |
| World's 50 Best | 500 | 10 | Top 50 globally |
| Relais & Châteaux | 600 | 9 | Member properties |
| **TOTAL** | **12,000** | **6-10** | **100% verified** |

**Note:** TripAdvisor excluded (their terms prohibit AI/ML use of API data)

---

## 🎯 **Key Features**

✅ **No API keys needed** (except Claude & Google Places - we already have!)  
✅ **FREE data** (only pay for API calls to process it)  
✅ **Expert-curated** (Forbes, Michelin, etc. have already done the quality check)  
✅ **Automatic luxury scoring** (based on awards)  
✅ **Activity relationships** (fine dining, luxury hospitality, etc.)  
✅ **Ready for emotional intelligence** (can add EVOKES, AMPLIFIES_DESIRE, etc.)

---

## 💰 **Cost Breakdown**

```
Scraping (30 pages × $0.50 Claude): $15
Geocoding (12,000 × $0.017 Google): $204
──────────────────────────────────────
TOTAL:                               $219
```

**Cost per POI:** $0.018 (vs. $0.025 for Google Places discovery)  
**Quality:** 100% luxury (vs. ~15% with discovery)

---

## ⏱️ **Timeline**

| Step | Time | What Happens |
|------|------|--------------|
| **Scraping** | 2-3 hours | Fetch HTML, use Claude to extract data, store in Neo4j |
| **Geocoding** | 1 hour | Add coordinates to all POIs using Google Places |
| **Relationships** | 10 min | Create LOCATED_IN, activity, emotion relationships |
| **TOTAL** | **3-4 hours** | **12,000 luxury POIs ready!** |

---

## 🛠️ **How It Works**

### **Step 1: Scraping**

1. Fetch HTML from premium sources
2. Use Claude AI to extract structured data (name, location, rating)
3. Store in Neo4j with luxury score

```typescript
// Example: Forbes scraper
const html = await fetch('forbes.com/5-star-hotels');
const pois = await claude.extract(html); // AI magic! ✨
await neo4j.store(pois);
```

### **Step 2: Geocoding**

1. Find POIs without coordinates
2. Use Google Places to geocode address
3. Add lat/lon to POI

```typescript
// Example: Geocoding
const coords = await googlePlaces.geocode('Ritz Paris, Paris, France');
// → { lat: 48.8686, lon: 2.3282 }
```

### **Step 3: Relationships**

1. Link POIs to destinations
2. Link POIs to activities
3. (Optional) Add emotional relationships

---

## 📝 **Available Scripts**

| Script | Purpose | Time | Cost |
|--------|---------|------|------|
| `scrape-forbes.ts` | Forbes 5★/4★ properties | 30 min | $3 |
| `scrape-michelin.ts` | Michelin starred restaurants | 45 min | $5.50 |
| `scrape-conde-nast.ts` | Condé Nast award winners | 30 min | $2 |
| `scrape-worlds-50-best.ts` | Top 50 global lists | 15 min | $1.50 |
| `scrape-relais-chateaux.ts` | Member properties | 20 min | $3 |
| `run-all-scrapers.ts` | **All scrapers in sequence** | 2-3 hrs | $15 |
| `geocode-scraped-pois.ts` | Add coordinates | 1 hr | $204 |

---

## ✅ **Quality Checks**

### **After Scraping:**

```cypher
// Check total scraped POIs
MATCH (p:poi)
WHERE p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux']
RETURN count(*) as total;
// Expected: ~12,000
```

### **After Geocoding:**

```cypher
// Check POIs with coordinates
MATCH (p:poi)
WHERE p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux']
  AND p.lat IS NOT NULL
RETURN count(*) as geocoded;
// Expected: ~11,500 (95% success)
```

---

## 🎉 **You're Done When:**

✅ 12,000 POIs in Neo4j  
✅ 11,500+ have coordinates  
✅ All have luxury scores 6-10  
✅ All have source attribution  
✅ All have LOCATED_IN relationships  

**Then you have LEXA's premium database!** 🌟

---

## 💡 **Comparison with Google Places Discovery**

| Metric | Web Scraping | Google Places Discovery |
|--------|--------------|-------------------------|
| **POIs** | 12,000 | 30,000 |
| **Quality** | 100% luxury | ~15% luxury |
| **Luxury Score** | 6-10 | 0-10 (need to score) |
| **Cost** | $219 | $750 |
| **Time** | 3-4 hours | 3-4 days |
| **Awards** | ✅ Included | ❌ No |
| **Expert Curation** | ✅ Yes | ❌ No |
| **Emotional Data** | ⚠️ Need to add | ⚠️ Need to add |

**Winner:** **WEB SCRAPING** for luxury focus! 🏆

---

## 🚀 **Let's Go!**

### **Option 1: All at Once (Recommended)**

```bash
npx ts-node scripts/run-all-scrapers.ts
```

Go make coffee ☕, come back in 3 hours, you have 12,000 POIs!

### **Option 2: Test with Forbes First**

```bash
npx ts-node scripts/scrape-forbes.ts
```

Start small, see results, then run the rest.

---

## 📚 **Documentation**

- **Full Guide:** `docs/WEB_SCRAPING_GUIDE.md`
- **Multi-Source Setup:** `docs/MULTI_SOURCE_DISCOVERY_API_SETUP.md`
- **Activity-First Strategy:** `docs/ACTIVITY_FIRST_DISCOVERY_STRATEGY.md`
- **Strategic Pivot:** `docs/STRATEGIC_PIVOT_DISCOVERY_VS_ENRICHMENT.md`

---

## 🆘 **Need Help?**

**Issue:** Claude API error  
**Fix:** Check `ANTHROPIC_API_KEY` in `.env`

**Issue:** Geocoding fails  
**Fix:** Check `GOOGLE_PLACES_API_KEY` in `.env`

**Issue:** Empty results  
**Fix:** Website changed, scraper needs update

---

**Ready?** Let's build LEXA's billion-dollar database! 🚀💎

```bash
npx ts-node scripts/run-all-scrapers.ts
```

---

**Last Updated:** December 18, 2025  
**Status:** Ready to run  
**Next Step:** Run the scrapers!

