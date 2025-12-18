# 🕷️ Web Scraping Guide: Premium Luxury Sources

**Complete guide to scraping Forbes, Michelin, Condé Nast, World's 50 Best, and Relais & Châteaux**

---

## 📋 **Overview**

We're scraping **5 premium sources** to build LEXA's luxury POI database with ~12,000 verified luxury properties.

| Source | POIs | Luxury Score | Cost | Time |
|--------|------|--------------|------|------|
| **Forbes Travel Guide** | 5,000 | 8-10 | FREE | 30 min |
| **Michelin Guide** | 3,000 | 6-10 | FREE | 45 min |
| **Condé Nast Traveler** | 3,000 | 8-9 | FREE | 30 min |
| **World's 50 Best** | 500 | 10 | FREE | 15 min |
| **Relais & Châteaux** | 600 | 9 | FREE | 20 min |
| **TOTAL** | **12,000** | **6-10** | **$30** | **2-3 hours** |

**Cost:** Only Claude API calls for HTML parsing (~$30)  
**No API keys needed** (except Claude which we already have)

---

## 🚀 **Quick Start**

### **Option 1: Run All Scrapers at Once**

```bash
npx ts-node scripts/run-all-scrapers.ts
```

**This will:**
1. Scrape all 5 sources sequentially
2. Store POIs in Neo4j
3. Take 2-3 hours
4. Cost ~$30 in Claude API calls

---

### **Option 2: Run Scrapers Individually**

**Advantage:** You can test, pause, and monitor each source separately.

```bash
# 1. Forbes (30 min, ~5,000 POIs)
npx ts-node scripts/scrape-forbes.ts

# 2. Michelin (45 min, ~3,000 POIs)
npx ts-node scripts/scrape-michelin.ts

# 3. Condé Nast (30 min, ~3,000 POIs)
npx ts-node scripts/scrape-conde-nast.ts

# 4. World's 50 Best (15 min, ~500 POIs)
npx ts-node scripts/scrape-worlds-50-best.ts

# 5. Relais & Châteaux (20 min, ~600 POIs)
npx ts-node scripts/scrape-relais-chateaux.ts
```

---

## 📍 **After Scraping: Geocoding**

Most scraped POIs will have **city/country but no coordinates**. We need to add lat/lon:

```bash
# Add coordinates to all scraped POIs
npx ts-node scripts/geocode-scraped-pois.ts
```

**What it does:**
- Finds POIs without lat/lon
- Uses Google Places API to geocode addresses
- Processes in batches of 100
- Cost: ~$0.017 per POI = ~$200 for 12,000 POIs

---

## 🎯 **What Gets Scraped**

### **1. Forbes Travel Guide**

**URLs Scraped:**
- 5-star hotels
- 4-star hotels
- 5-star restaurants
- 4-star restaurants
- 5-star spas
- 4-star spas

**Data Extracted:**
- Name
- City, Country
- Forbes rating (4-star, 5-star)
- Property URL
- Description

**Luxury Scores:**
- 5-star = 10
- 4-star = 8

---

### **2. Michelin Guide**

**Regions Scraped:**
- France, Italy, Spain, Germany, UK, Switzerland, Monaco
- USA, Japan, Hong Kong, Singapore

**Data Extracted:**
- Restaurant name
- City, Country
- Michelin stars (1, 2, or 3)
- Bib Gourmand designation
- Cuisine type
- Chef name

**Luxury Scores:**
- 3 stars = 10
- 2 stars = 9
- 1 star = 8
- Bib Gourmand = 6

---

### **3. Condé Nast Traveler**

**Lists Scraped:**
- Gold List (annual)
- Hot List (new openings)
- Best Hotels in the World
- Best Restaurants in the World

**Data Extracted:**
- Property name
- City, Country
- Type (hotel, restaurant, resort, spa)
- Description
- Property URL

**Luxury Score:** 8-9

---

### **4. World's 50 Best**

**Lists Scraped:**
- World's 50 Best Restaurants
- World's 50 Best Bars
- World's 50 Best Hotels

**Data Extracted:**
- Name
- City, Country
- Ranking (1-50+)
- Chef name (for restaurants)
- Description

**Luxury Score:** 10 (all top-tier)

---

### **5. Relais & Châteaux**

**Regions Scraped:**
- Europe
- North America
- Caribbean
- Asia Pacific
- Africa & Middle East
- South America

**Data Extracted:**
- Property name
- City, Country
- Type (hotel, restaurant, resort)
- Description
- Property URL

**Luxury Score:** 9

---

## 🤖 **How It Works**

### **The Scraping Process:**

1. **Fetch HTML**
   ```typescript
   const response = await fetch(url, {
     headers: {
       'User-Agent': 'Mozilla/5.0...'
     }
   });
   const html = await response.text();
   ```

2. **Use Claude AI to Extract Data**
   ```typescript
   const extraction = await anthropic.messages.create({
     model: 'claude-sonnet-4-20250514',
     max_tokens: 4000,
     messages: [{
       role: 'user',
       content: `Extract all hotels from this HTML...`
     }]
   });
   ```

3. **Parse JSON Response**
   ```typescript
   const pois = JSON.parse(extraction.content[0].text);
   ```

4. **Store in Neo4j**
   ```typescript
   await session.run(`
     MERGE (p:poi {source: 'forbes', name: $name})
     SET p.luxury_score = $luxuryScore,
         p.city = $city,
         ...
   `);
   ```

---

## 💰 **Cost Breakdown**

### **Scraping Costs:**

| Source | Pages | Claude Calls | Cost per Call | Total |
|--------|-------|--------------|---------------|-------|
| Forbes | 6 | 6 | $0.50 | $3 |
| Michelin | 11 | 11 | $0.50 | $5.50 |
| Condé Nast | 4 | 4 | $0.50 | $2 |
| World's 50 Best | 3 | 3 | $0.50 | $1.50 |
| Relais & Châteaux | 6 | 6 | $0.50 | $3 |
| **TOTAL** | **30** | **30** | **$0.50** | **$15** |

### **Geocoding Costs:**

```
12,000 POIs × $0.017 per request = $204
```

### **Total Costs:**

```
Scraping: $15
Geocoding: $204
TOTAL: $219
```

**For 12,000 verified luxury POIs!**

---

## 📊 **Expected Results**

### **After Scraping:**

```cypher
// Check scraped POIs
MATCH (p:poi)
WHERE p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux']
RETURN p.source, count(*) as count
ORDER BY count DESC;
```

**Expected:**
```
forbes: ~5,000
michelin: ~3,000
conde_nast: ~3,000
worlds_50_best: ~500
relais_chateaux: ~600
TOTAL: ~12,000
```

### **After Geocoding:**

```cypher
// Check geocoded POIs
MATCH (p:poi)
WHERE p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux']
  AND p.lat IS NOT NULL
  AND p.lon IS NOT NULL
RETURN p.source, count(*) as count
ORDER BY count DESC;
```

**Expected:** ~11,500 (95% success rate)

---

## ⚠️ **Important Notes**

### **Rate Limiting:**

Each scraper has built-in rate limiting:
- **Between pages:** 2-3 seconds
- **Between scrapers:** 5 seconds
- **Geocoding:** 0.5 seconds per request

**Don't modify these!** They prevent IP bans.

### **Error Handling:**

All scrapers have error handling:
- Failed pages are logged but don't stop the process
- If Claude fails to parse, the scraper continues
- Failed geocoding is logged

### **Data Quality:**

**Advantages of scraped data:**
- ✅ Verified luxury (expert-curated)
- ✅ High luxury scores (8-10)
- ✅ Includes awards, ratings, descriptions
- ✅ Automatic relationship to activities

**Limitations:**
- ❌ No coordinates initially (need geocoding)
- ❌ May be incomplete addresses
- ❌ Some properties may be duplicates (need deduplication)

---

## 🔍 **Monitoring Progress**

### **Check Scraping Progress:**

```bash
# Watch terminal output for:
# - "Extracted X POIs"
# - "Stored X properties in Neo4j"
```

### **Check Neo4j Database:**

```cypher
// Total scraped POIs
MATCH (p:poi)
WHERE p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux']
RETURN count(*) as total;

// POIs by source
MATCH (p:poi)
WHERE p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux']
RETURN p.source, count(*) as count
ORDER BY count DESC;

// POIs with coordinates
MATCH (p:poi)
WHERE p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux']
  AND p.lat IS NOT NULL
RETURN count(*) as with_coordinates;
```

---

## 🐛 **Troubleshooting**

### **"Failed to fetch: 403"**

**Problem:** IP blocked by website  
**Solution:** Wait 5 minutes, then retry with longer delays

### **"Claude API error"**

**Problem:** API key invalid or rate limit  
**Solution:** Check `.env` for `ANTHROPIC_API_KEY`

### **"Empty JSON array []"**

**Problem:** Website structure changed or Claude couldn't parse  
**Solution:** Check website manually, update scraper logic

### **"Geocoding failed: 429"**

**Problem:** Google Places API rate limit  
**Solution:** Wait, or increase delay in geocoding script

---

## 🎯 **Next Steps After Scraping**

### **1. Geocode All POIs**

```bash
npx ts-node scripts/geocode-scraped-pois.ts
```

### **2. Create LOCATED_IN Relationships**

```bash
npx ts-node scripts/fix-missing-located-in.ts
```

### **3. Create Emotional Relationships**

```bash
# For luxury POIs (score 6-10)
npx ts-node scripts/create-emotional-relationships.ts
```

### **4. Verify Data Quality**

```bash
npx ts-node scripts/verify-data-quality.ts
```

---

## 📈 **Success Metrics**

**You're successful when:**

✅ 12,000 POIs scraped  
✅ 95% geocoded (11,500 with coordinates)  
✅ 100% have luxury scores 6-10  
✅ All have LOCATED_IN relationships  
✅ All have activity relationships  
✅ Emotional relationships created

**Then you have:** LEXA's premium luxury database! 🌟

---

## 💡 **Pro Tips**

1. **Run scrapers overnight** - They take 2-3 hours
2. **Start with one scraper** - Test Forbes first
3. **Monitor costs** - Check Anthropic dashboard
4. **Backup Neo4j** - Before running scrapers
5. **Check results** - After each scraper completes

---

**Ready to scrape?** 🕷️

```bash
# Option 1: All at once (recommended)
npx ts-node scripts/run-all-scrapers.ts

# Option 2: Start with Forbes
npx ts-node scripts/scrape-forbes.ts
```

---

**Last Updated:** December 18, 2025  
**Status:** Ready to run  
**Cost:** $219 total ($15 scraping + $204 geocoding)  
**Time:** 3-4 hours total

