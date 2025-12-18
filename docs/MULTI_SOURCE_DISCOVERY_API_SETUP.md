# 🚀 Multi-Source Discovery: API Setup & Implementation Guide

**Complete guide for setting up premium discovery sources**

---

## 📋 **Quick Overview**

| Source | POIs | Cost | API Required | Setup Time |
|--------|------|------|--------------|------------|
| **Google Places** ✅ | 30,000 | $750 | YES - Have it! | Done! |
| **TripAdvisor** | 25,000 | FREE | YES | 10 min |
| **Forbes** | 5,000 | FREE | NO (scraping) | 30 min |
| **Michelin** | 3,000 | FREE | NO (scraping) | 20 min |
| **Condé Nast** | 3,000 | FREE | NO (scraping) | 20 min |
| **World's 50 Best** | 500 | FREE | NO (scraping) | 15 min |
| **Relais & Châteaux** | 600 | FREE | NO (scraping) | 15 min |

**Total Setup Time:** ~2 hours  
**Total Cost:** $750 (Google Places only)

---

## 1️⃣ **Google Places API** ✅ ALREADY HAVE

### **Status:** ✅ Already configured in `.env`

```bash
GOOGLE_PLACES_API_KEY=your_key_here
```

### **Nothing to do!** You're already using this.

**Daily limits:**
- Free tier: 0 requests
- Pay-as-you-go: Unlimited
- Cost: $0.017 per request

**What we'll use it for:**
- Search for experience-enabling POIs (beaches, viewpoints, etc.)
- Enrich with ratings, reviews, photos
- Get opening hours, websites, contact info

---

## 2️⃣ **TripAdvisor API** 🆓 FREE

### **Signup Steps:**

1. **Go to:** https://www.tripadvisor.com/developers
2. **Click:** "Get API Key"
3. **Register:** Create a TripAdvisor account (free)
4. **Create App:**
   - App Name: "LEXA Travel Intelligence"
   - Description: "Luxury travel recommendation engine"
   - Website: Your domain or "https://lexa.travel" (placeholder)
5. **Get API Key:** Copy your API key

### **Add to `.env`:**

```bash
TRIPADVISOR_API_KEY=your_key_here
```

### **Rate Limits:**
- **Free Tier:** 500 requests/day
- **Paid Tier:** Custom (contact sales)
- For our needs: Free tier is enough initially

### **What we'll get:**
- Travelers' Choice Award winners (top 1% globally)
- User ratings & reviews
- Photo galleries
- ~25,000 luxury POIs

### **API Documentation:**
https://tripadvisor-content-api.readme.io/reference/overview

---

## 3️⃣ **Forbes Travel Guide** 🌟 FREE (Web Scraping)

### **No API Key Needed!**

We'll scrape their award lists directly from their website.

### **Target URLs:**

```typescript
const FORBES_URLS = [
  'https://www.forbestravelguide.com/awards/5-star-hotels',
  'https://www.forbestravelguide.com/awards/4-star-hotels',
  'https://www.forbestravelguide.com/awards/5-star-restaurants',
  'https://www.forbestravelguide.com/awards/5-star-spas'
];
```

### **What we'll get:**
- ~5,000 ultra-luxury properties
- Forbes Star Ratings (4-star, 5-star)
- Expert-verified luxury venues
- Automatic luxury score: 9-10

### **Setup:**
- None! Just use scraping script

---

## 4️⃣ **Michelin Guide** 🍴 FREE (Web Scraping)

### **No API Key Needed!**

We'll scrape Michelin-starred restaurants from their guide.

### **Target URL:**

```
https://guide.michelin.com/
```

### **What we'll get:**
- ~3,000 Michelin-starred restaurants
- 1-star, 2-star, 3-star ratings
- Bib Gourmand (value picks)
- Automatic luxury score:
  - 1 star = 7
  - 2 stars = 8
  - 3 stars = 10

### **Setup:**
- None! Just use scraping script

---

## 5️⃣ **Condé Nast Traveler** ✈️ FREE (Web Scraping)

### **No API Key Needed!**

We'll scrape their annual awards lists.

### **Target URLs:**

```typescript
const CONDE_NAST_URLS = [
  'https://www.cntraveler.com/gold-list',
  'https://www.cntraveler.com/hot-list',
  'https://www.cntraveler.com/readers-choice-awards'
];
```

### **What we'll get:**
- ~3,000 curated luxury venues
- Gold List, Hot List, Readers' Choice winners
- Expert-curated selection
- Automatic luxury score: 8-10

### **Setup:**
- None! Just use scraping script

---

## 6️⃣ **World's 50 Best** 🏆 FREE (Web Scraping)

### **No API Key Needed!**

We'll scrape their top 50 lists.

### **Target URLs:**

```typescript
const WORLDS_50_BEST_URLS = [
  'https://www.theworlds50best.com/list/1-50',
  'https://www.theworlds50best.com/bars/list/1-50',
  'https://www.theworlds50best.com/hotels/list/1-50'
];
```

### **What we'll get:**
- ~500 elite venues
- Top restaurants, bars, hotels globally
- Automatic luxury score: 10

### **Setup:**
- None! Just use scraping script

---

## 7️⃣ **Relais & Châteaux** 🏰 FREE (Web Scraping)

### **No API Key Needed!**

We'll scrape their membership directory.

### **Target URL:**

```
https://www.relaischateaux.com/
```

### **What we'll get:**
- ~600 luxury properties
- Historic hotels & restaurants
- Verified luxury membership
- Automatic luxury score: 9-10

### **Setup:**
- None! Just use scraping script

---

## 🛠️ **Implementation Scripts**

### **Script 1: Google Places Discovery** (Already Exists!)

```bash
# Already have this!
npx ts-node scripts/discover-luxury-pois.ts
```

### **Script 2: TripAdvisor Discovery** (New)

```typescript
// scripts/discover-tripadvisor.ts

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const TRIPADVISOR_API_KEY = process.env.TRIPADVISOR_API_KEY || '';

async function searchTripAdvisor(destination: string) {
  const response = await fetch(
    `https://api.tripadvisor.com/api/partner/2.0/search?key=${TRIPADVISOR_API_KEY}&q=${destination}&category=hotels&rating=4.5`,
    {
      headers: {
        'Accept': 'application/json'
      }
    }
  );
  
  return await response.json();
}

// Store in Neo4j...
```

### **Script 3: Forbes/Michelin/Condé Nast Scraper** (New)

```typescript
// scripts/scrape-premium-sources.ts

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function scrapeForbes() {
  const url = 'https://www.forbestravelguide.com/awards/5-star-hotels';
  
  const response = await fetch(url);
  const html = await response.text();
  
  // Use Claude to extract structured data
  const extraction = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Extract all hotels from this Forbes Travel Guide HTML.
      
      Return ONLY a JSON array:
      [{
        "name": "Hotel name",
        "location": "City, Country",
        "rating": "5-star" | "4-star",
        "url": "https://..."
      }]
      
      HTML:
      ${html.substring(0, 10000)}`
    }]
  });
  
  // Parse and store in Neo4j...
}

// Similar for Michelin, Condé Nast, etc.
```

---

## 📊 **Complete Implementation Timeline**

### **Week 1: Setup & TripAdvisor**

**Day 1-2:**
- ✅ Sign up for TripAdvisor API
- ✅ Add to `.env`
- ✅ Create `scripts/discover-tripadvisor.ts`
- ✅ Test with one destination
- ✅ Run for all destinations

**Expected:** 25,000 POIs from TripAdvisor

---

### **Week 2: Premium Scrapers**

**Day 3-4:**
- ✅ Create `scripts/scrape-premium-sources.ts`
- ✅ Implement Forbes scraper
- ✅ Implement Michelin scraper
- ✅ Test scrapers

**Day 5-7:**
- ✅ Add Condé Nast scraper
- ✅ Add World's 50 Best scraper
- ✅ Add Relais & Châteaux scraper
- ✅ Run all scrapers
- ✅ Store in Neo4j

**Expected:** 12,000 POIs from premium sources

---

### **Week 3: Google Places Bulk Discovery**

**Day 8-14:**
- ✅ Update `discover-luxury-pois.ts` with activity types
- ✅ Run for all experience-enabling POI types
- ✅ Target 30,000 POIs

---

### **Week 4: Deduplication & Enrichment**

**Day 15-21:**
- ✅ Deduplicate by location (within 100m radius)
- ✅ Merge data from multiple sources
- ✅ Enrich with emotional intelligence
- ✅ Create all relationships

**Expected:** 44,000 unique luxury POIs after deduplication

---

## 💰 **Cost Breakdown**

| Week | Activity | Cost |
|------|----------|------|
| Week 1 | TripAdvisor | $0 (free tier) |
| Week 2 | Premium scrapers | $20 (Claude AI) |
| Week 3 | Google Places | $750 |
| Week 4 | Enrichment | $300 |
| **TOTAL** | | **$1,070** |

---

## 🔑 **Environment Variables Checklist**

Add these to your `.env` file:

```bash
# Already Have ✅
GOOGLE_PLACES_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
NEO4J_URI=your_uri_here
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here

# Need to Add 🆕
TRIPADVISOR_API_KEY=your_key_here  # ← GET THIS

# Optional (for future)
SHERPA_API_KEY=your_key_here  # For visa requirements (later)
```

---

## ✅ **Action Items for You**

### **Today (10 minutes):**

1. **Sign up for TripAdvisor API:**
   - Go to: https://www.tripadvisor.com/developers
   - Register account
   - Create app
   - Copy API key
   - Add to `.env`

2. **Test TripAdvisor API:**
   ```bash
   curl "https://api.tripadvisor.com/api/partner/2.0/search?key=YOUR_KEY&q=Monaco"
   ```

### **This Week:**

1. ✅ TripAdvisor setup (today)
2. ✅ Create TripAdvisor discovery script (Day 2)
3. ✅ Create premium scrapers (Day 3-4)
4. ✅ Test all sources (Day 5)

### **Next 4 Weeks:**

1. ✅ Run multi-source discovery
2. ✅ Collect 44,000 luxury POIs
3. ✅ Enrich with emotional intelligence
4. ✅ Build LEXA's billion-dollar database

---

## 🎯 **Expected Results**

### **After 4 Weeks:**

```
📊 LEXA Database:
- Total POIs: 44,000 unique luxury venues
- Sources: 7 premium sources
- Quality: 100% luxury (score 6-10)
- Emotional intelligence: Complete
- Cost: $1,070
- Ready for: Beta launch! 🚀
```

**vs.**

```
❌ Old Approach (Mass Enrichment):
- Total POIs: 28,000 (from 186K processed)
- Sources: 1 (Google Places only)
- Quality: Mixed (many low-quality)
- Cost: $4,670
- Time: 65 days
```

**Savings: $3,600 | Time Saved: 30 days | Quality: 10× better**

---

## 💡 **Pro Tips**

1. **Start with TripAdvisor** - Free tier, high quality, easy API
2. **Test scrapers on 1 URL first** - Make sure they work
3. **Use Claude for HTML parsing** - More reliable than regex
4. **Deduplicate by location** - Within 100m radius = same POI
5. **Merge multiple sources** - Same POI from Forbes + Google = higher confidence

---

## 📚 **Related Documentation**

- **Strategy:** `docs/STRATEGIC_PIVOT_DISCOVERY_VS_ENRICHMENT.md`
- **Activity-First:** `docs/ACTIVITY_FIRST_DISCOVERY_STRATEGY.md`
- **Cost Analysis:** `docs/ENRICHMENT_OPTIMIZATION_SUMMARY.md`

---

**Ready to build LEXA's billion-dollar database?** 🚀💎

**Next Step:** Sign up for TripAdvisor API (10 minutes)

---

**Last Updated:** December 18, 2025  
**Status:** Ready to implement  
**Timeline:** 4 weeks to 44K luxury POIs

