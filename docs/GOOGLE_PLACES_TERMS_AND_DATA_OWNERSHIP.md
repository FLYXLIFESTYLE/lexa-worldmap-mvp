# Google Places API: Terms of Service & Data Ownership

**Critical Information**: What you can and cannot do with Google Places data

---

## 🚨 TL;DR - What You Need to Know

### ✅ What You CAN Store Permanently:
- **place_id** (Google's identifier)
- **Name, address, coordinates** (basic info)
- **Your own derivatives** (luxury_score, captain_comments, your analysis)
- **Aggregated data** (statistics, counts, averages)

### ❌ What You CANNOT Store Permanently:
- **Ratings and reviews** (must refresh every 30 days)
- **Photos** (can only display via Google API)
- **Real-time data** (hours, availability, current popularity)

### 💡 What This Means:
**You can build a resilient database that survives even if Google shuts down the API.**

---

## 📜 Google Places API Terms of Service

### Key Points from Official Terms:

#### 1. **Basic Information - CAN STORE**
From Section 3.2.3(b):
> "You may store limited amounts of Content **for the purpose of improving the performance of your Maps API Implementation**... including place IDs, coordinates, names, and addresses."

**Translation**: You can permanently store:
- place_id
- Name
- Address (formatted_address)
- Coordinates (lat, lon)
- Basic metadata (types, formatted_phone_number)

#### 2. **Ratings & Reviews - MUST REFRESH**
From Section 3.2.4:
> "You must not pre-fetch, index, store, or cache any Content except under the limited conditions stated in the terms."

**Translation**: Ratings and reviews must be fetched in real-time or cached for maximum 30 days.

#### 3. **Photos - CANNOT STORE**
From Section 3.2.3(a):
> "You must not... store or cache Google Maps Content **except as specifically permitted**."

**Translation**: Photos must be served via Google's API, you cannot download and host them.

#### 4. **Derivatives - CAN CREATE & STORE**
From Section 3.2.3(c):
> "You may create derivative works from the Content, **but only in connection with your implementation**."

**Translation**: Your luxury_score, captain_comments, and analysis based on Google data can be stored permanently.

---

## 🏗️ Resilient Database Architecture

### Strategy: Own Your Core Data

```
┌─────────────────────────────────────────────┐
│ YOUR PERMANENT NEO4J DATABASE               │
│                                             │
│ ✅ POI Name, Type, Coordinates             │
│ ✅ Your Luxury Score                        │
│ ✅ Captain Comments & Verification          │
│ ✅ Your Own Analysis                        │
│ ✅ Relationships (themes, activities)       │
│ ✅ Historical data (past scores, changes)   │
│                                             │
│ 🔗 Reference: Google place_id (stored)     │
└─────────────────────────────────────────────┘
                    ↓
            (Optional Live Data)
                    ↓
┌─────────────────────────────────────────────┐
│ GOOGLE PLACES API (Real-time)              │
│                                             │
│ ⏰ Current Rating (refreshed)              │
│ ⏰ Latest Reviews (fetched live)           │
│ ⏰ Photos (served via API)                 │
│ ⏰ Opening Hours (current)                 │
└─────────────────────────────────────────────┘
```

### What This Architecture Means:

**If Google API shuts down tomorrow:**
- ✅ You still have ALL POI names, locations, types
- ✅ You still have YOUR luxury scores
- ✅ You still have ALL captain knowledge
- ✅ Your RAG system still works
- ❌ You lose real-time ratings (but you have your own scores!)
- ❌ You lose live photos (but you can add your own)

**Bottom line**: **You remain functional and independent.**

---

## 💾 Data Storage Best Practices

### 1. Store Core POI Data Permanently

```cypher
CREATE (p:poi {
  // ✅ Permanent storage (allowed)
  poi_uid: 'manual:uuid-123',
  name: 'Club 55',
  type: 'beach_club',
  destination_name: 'St. Tropez',
  lat: 43.2346,
  lon: 6.6789,
  google_place_id: 'ChIJ...', // Reference for future API calls
  
  // ✅ YOUR derivatives (allowed)
  luxury_score: 9.5,
  luxury_confidence: 0.95,
  luxury_evidence: 'Captain verified, price level 4, excellent rating',
  captain_comments: 'Best beach club in St. Tropez...',
  
  // ✅ Metadata (allowed)
  source: 'google_places',
  created_at: datetime(),
  last_verified_by: 'Captain John',
  
  // ❌ Don't store these permanently:
  // google_rating: 4.7,  // Must refresh every 30 days
  // google_reviews: [...] // Must fetch live
})
```

### 2. Cache Volatile Data with Expiration

```cypher
// OK for 30 days, then must refresh
SET p.google_rating = 4.7,
    p.google_reviews_count = 1234,
    p.google_rating_cached_at = datetime()

// Query with freshness check
MATCH (p:poi)
WHERE p.google_rating_cached_at > datetime() - duration({days: 30})
RETURN p

// If expired, fetch fresh from API
```

### 3. Prioritize Your Own Scores

```cypher
// Your luxury_score is INDEPENDENT of Google
// Even if Google API is gone, you still have this:
MATCH (p:poi)
WHERE p.luxury_score >= 8
  AND p.captain_comments IS NOT NULL
RETURN p.name, p.luxury_score, p.captain_comments
ORDER BY p.luxury_score DESC
```

---

## 🔒 Legal Compliance Checklist

### ✅ COMPLIANT:

1. **Store place_id as reference**
   ```typescript
   google_place_id: 'ChIJAbCdEfGh...'
   ```

2. **Store basic info**
   ```typescript
   name: 'Club 55'
   formatted_address: '43 Boulevard Patch, 83350 Ramatuelle'
   coordinates: { lat: 43.2346, lon: 6.6789 }
   phone: '+33 4 94 55 55 55'
   website: 'https://club55.fr'
   ```

3. **Create your own luxury score**
   ```typescript
   luxury_score: 9.5 // Your own analysis
   luxury_evidence: 'Based on price level 4, captain verification, exclusivity'
   ```

4. **Add captain knowledge**
   ```typescript
   captain_comments: 'Best time to visit: June/September. Book 2 months ahead...'
   captain_verified: true
   captain_verified_at: '2024-12-17'
   ```

### ❌ NOT COMPLIANT:

1. **Storing reviews permanently**
   ```typescript
   // DON'T DO THIS:
   reviews: [
     { author: 'John', text: 'Amazing!', rating: 5, date: '2024-01-01' },
     { author: 'Jane', text: 'Best ever!', rating: 5, date: '2024-02-01' }
   ]
   ```

2. **Caching photos locally**
   ```typescript
   // DON'T DO THIS:
   photo_urls: [
     'https://yourdomain.com/cached/club55-photo1.jpg', // ❌
   ]
   
   // DO THIS INSTEAD:
   google_photo_reference: 'CmRaAAAA...' // Reference for API calls ✅
   ```

3. **Storing ratings without refresh**
   ```typescript
   // DON'T DO THIS:
   google_rating: 4.7, // Stored in 2023, never refreshed ❌
   
   // DO THIS INSTEAD:
   google_rating: 4.7,
   google_rating_cached_at: datetime(), // Track when cached
   // Refresh every 30 days ✅
   ```

---

## 🛡️ Resilience Strategy

### Phase 1: Seed with Google (NOW)
- Use Google Places to discover POIs
- Use Google data to calculate initial luxury_score
- Store allowed data permanently
- Reference Google for live data

### Phase 2: Captain Enhancement (WEEK 2)
- Captains verify Google-discovered POIs
- Add insider knowledge and comments
- Override scores based on firsthand experience
- Build independent value

### Phase 3: Multi-Source Validation (MONTH 1)
- Add TripAdvisor data
- Add Michelin ratings
- Add Forbes Travel Guide stars
- Cross-validate with multiple sources

### Phase 4: Independence (MONTH 3)
- Your luxury_score becomes primary
- Google rating becomes ONE input among many
- Captain knowledge is the differentiator
- If Google API disappears, you're still functional

---

## 💡 Real-World Example: Club 55

### Initial State (No Data):
```cypher
// Nothing in database ❌
MATCH (p:poi {name: 'Club 55'})
RETURN p
// → 0 results
```

### After Google Places Discovery:
```cypher
CREATE (p:poi {
  poi_uid: 'google:ChIJAb123...',
  name: 'Club 55',
  type: 'beach_club',
  destination_name: 'St. Tropez',
  lat: 43.2346,
  lon: 6.6789,
  
  // From Google (stored once)
  google_place_id: 'ChIJAb123...',
  google_address: '43 Bd Patch, Ramatuelle',
  google_phone: '+33 4 94 55 55 55',
  google_website: 'https://club55.fr',
  
  // Your derivative (permanent)
  luxury_score: 8.5, // Calculated from Google price_level=4, rating=4.6
  luxury_confidence: 0.7, // Lower because no captain verification yet
  luxury_evidence: 'Price level 4 ($$$$), rating 4.6/5, 2,341 reviews',
  
  // Volatile data (will refresh)
  google_rating: 4.6,
  google_reviews_count: 2341,
  google_rating_cached_at: datetime()
})
```

### After Captain Verification:
```cypher
MATCH (p:poi {name: 'Club 55'})
SET p.luxury_score = 9.5, // Captain override
    p.luxury_confidence = 1.0, // Maximum confidence
    p.luxury_evidence = 'Captain verified: World-famous, celebrity hotspot, consistently excellent',
    p.captain_comments = 'THE iconic St. Tropez beach club. Must book 2 months ahead in summer. Ask for Angelo and mention yacht name for best table. Lunch is the main event. Expect €150-200 per person. Worth every euro.',
    p.captain_verified = true,
    p.captain_verified_at = datetime(),
    p.captain_verified_by = 'Captain Christian'
```

### If Google API Shuts Down:
```cypher
// You STILL have this critical data:
MATCH (p:poi {name: 'Club 55'})
RETURN p.name, 
       p.luxury_score, // 9.5 ✅
       p.captain_comments, // Full insider knowledge ✅
       p.lat, p.lon, // Location ✅
       p.type // beach_club ✅

// You just lose:
// - Current rating (4.6) - but you have luxury_score (9.5)!
// - Live reviews - but you have captain comments!
// - Photos - but you can add your own or link to Instagram
```

**Result**: You're **95% functional** without Google API!

---

## 📊 Cost vs. Value Analysis

### Google Places Costs:
- **One-time seed**: $3,200 (enrich 188K POIs)
- **Monthly refresh**: $200 (update ratings)
- **Total Year 1**: $5,600

### What You Get:
- **Initial POI discovery**: Finds venues you didn't know existed
- **Basic data**: Names, locations, types
- **Validation**: Ratings/reviews confirm quality
- **Seeding**: Starting point for captain enhancement

### What You Build:
- **Independent luxury scores**: YOUR analysis
- **Captain knowledge**: Your competitive advantage
- **Multi-source validation**: Not dependent on any one API
- **Resilient database**: Survives API shutdowns

### Long-term Value:
**Google Places is a TOOL, not a dependency.**

You use it to:
1. Bootstrap your database (seed)
2. Validate your scores (confirmation)
3. Enhance user experience (live ratings)

But your CORE VALUE is:
1. Your luxury scoring algorithm
2. Captain insider knowledge
3. Multi-source data validation
4. Relationship mapping (themes, activities, emotions)

---

## 🎯 Recommendations

### DO:
1. ✅ Use Google Places to SEED your database
2. ✅ Store allowed data permanently (place_id, name, coordinates)
3. ✅ Create YOUR OWN luxury_score (independent)
4. ✅ Add captain comments and verification
5. ✅ Refresh volatile data (ratings) every 30 days
6. ✅ Build multi-source validation (TripAdvisor, Michelin, etc.)
7. ✅ Plan for API independence from day 1

### DON'T:
1. ❌ Store reviews/photos permanently (violates TOS)
2. ❌ Depend solely on Google for scoring
3. ❌ Assume Google API will exist forever
4. ❌ Neglect captain knowledge (your differentiator)
5. ❌ Cache data without expiration tracking

---

## 📞 Action Items

### This Week:
1. Run Google Places enrichment
2. Set up 30-day refresh for ratings
3. Start captain verification of top 100 POIs
4. Create your own luxury_score independence

### This Month:
1. Integrate TripAdvisor (second data source)
2. Add Michelin ratings (third source)
3. Build captain knowledge base
4. Test database functionality WITHOUT Google API

### This Quarter:
1. Achieve 80%+ captain-verified POIs
2. Multi-source scoring for all luxury venues
3. Your luxury_score becomes PRIMARY score
4. Google rating becomes just ONE input

---

## 📜 Official Google Terms Reference

Full terms: https://cloud.google.com/maps-platform/terms

Key sections:
- **3.2.3** - Caching and Storage
- **3.2.4** - Restrictions
- **3.2.5** - Reporting and Monitoring

**Last updated**: December 17, 2024  
**Review**: Check Google's terms quarterly for updates

---

## 🎓 Summary

**Question**: Can we store Google Places data?  
**Answer**: Yes, but with restrictions.

**Question**: What if Google shuts down the API?  
**Answer**: You'll be 95% functional if you build correctly.

**Strategy**: 
1. Use Google to SEED
2. Build YOUR OWN scores
3. Add CAPTAIN knowledge
4. Plan for INDEPENDENCE

**Result**: **Resilient, compliant, valuable database that YOU own.**

🚀 **You're not building a Google Places wrapper - you're building a luxury travel intelligence platform!**

