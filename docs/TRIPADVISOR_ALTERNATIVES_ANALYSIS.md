# 🔍 TripAdvisor Alternatives: API Analysis

**Comprehensive analysis of alternative platforms for POI data**

**Date:** December 18, 2025  
**Status:** TripAdvisor EXCLUDED (prohibits AI/ML use)

---

## 📊 **Platform Comparison**

| Platform | API Available | AI/ML Allowed | Cost | Quality | Best For |
|----------|---------------|---------------|------|---------|----------|
| **TripAdvisor** | ✅ Yes | ❌ **NO** | Paid | High | ❌ EXCLUDED |
| **GetYourGuide** | ✅ Yes | ⚠️ Unknown | Paid | High | Activities |
| **Google Travel** | ❌ No standalone API | ✅ Yes | Paid | Highest | All POIs |
| **Booking.com** | ✅ Yes (Affiliate) | ⚠️ Affiliate only | Commission | High | Accommodations |
| **Airbnb** | ❌ No public API | ❌ No | N/A | Medium | Stays |
| **Komoot** | ✅ Yes | ✅ Likely yes | FREE | Medium | Outdoor activities |
| **Viator** | ✅ Yes | ⚠️ Unknown | Paid | High | Activities |

---

## 1️⃣ **GetYourGuide** ⭐ RECOMMENDED

### **Overview:**
- World's largest activities marketplace
- 30,000+ destinations
- 50,000+ activities, tours, experiences
- Focus: Things to do, experiences

### **API Access:**
- **Availability:** ✅ Yes - Partner API
- **Signup:** https://partner.getyourguide.com
- **Documentation:** https://api-docs.getyourguide.com

### **Data Available:**
- ✅ Activity listings
- ✅ Descriptions, photos
- ✅ Ratings & reviews
- ✅ Pricing
- ✅ Availability
- ✅ Categories (tours, activities, attractions)
- ✅ Location data

### **Terms of Service - AI/ML:**
```
⚠️ NEED TO VERIFY
- Review their API Terms
- Contact: partner-support@getyourguide.com
- Ask explicitly: "Can we use API data with AI for recommendations?"
```

### **Pricing:**
- Partnership model
- Commission-based (typically 20-30%)
- FREE API access for partners
- Revenue share on bookings

### **Use Case for LEXA:**
```
✅ PERFECT for activity recommendations
- "User wants snorkeling in Maldives"
- GetYourGuide API → Find snorkeling tours
- LEXA adds emotional intelligence
- User books → Commission revenue
```

### **Action:**
1. ✅ Sign up as partner: https://partner.getyourguide.com
2. ✅ Review API Terms (check AI/ML clause)
3. ✅ Request API credentials
4. ✅ Integrate if allowed

**Priority:** HIGH ⭐

---

## 2️⃣ **Google Travel** ✅ ALREADY USING

### **Overview:**
- Part of Google Maps/Places
- Comprehensive POI data
- 200M+ POIs worldwide

### **API Access:**
- **Availability:** ✅ Yes - Google Places API
- **We already have:** ✅ API key configured
- **Documentation:** https://developers.google.com/maps/documentation/places

### **Data Available:**
- ✅ ALL POIs (hotels, restaurants, attractions, etc.)
- ✅ Ratings, reviews, photos
- ✅ Opening hours, contact info
- ✅ Price levels
- ✅ Categories, attributes

### **Terms of Service - AI/ML:**
```
✅ ALLOWED
- Google explicitly allows AI/ML use
- Can use for recommendations
- Must comply with display requirements
- Must show "Powered by Google" attribution
```

### **Pricing:**
- **Text Search:** $0.032 per request
- **Place Details:** $0.017 per request
- **We're already using this!**

### **Use Case for LEXA:**
```
✅ ALREADY IMPLEMENTED
- scripts/discover-luxury-pois.ts
- scripts/enrich-french-riviera.ts
- Master Pipeline
```

**Status:** ✅ ACTIVE, keep using

---

## 3️⃣ **Booking.com** ⚠️ LIMITED USE

### **Overview:**
- World's largest accommodation platform
- 28M+ listings
- Focus: Hotels, apartments, vacation rentals

### **API Access:**
- **Availability:** ✅ Yes - Affiliate Partner Network
- **Signup:** https://www.booking.com/affiliate
- **Type:** Affiliate API (commission-based)

### **Data Available:**
- ✅ Accommodation listings
- ✅ Descriptions, photos
- ✅ Ratings, reviews
- ✅ Pricing, availability
- ✅ Location data
- ❌ Limited to bookable properties

### **Terms of Service - AI/ML:**
```
⚠️ AFFILIATE MODEL ONLY
- Data usage restricted to affiliate links
- Can display + earn commission
- AI use unclear - likely restricted
- Focus: Drive bookings to Booking.com
```

### **Pricing:**
- FREE API access
- Commission: 25-40% on bookings
- No booking = no cost

### **Use Case for LEXA:**
```
⚠️ LIMITED - Affiliate only
- Display accommodation options
- Earn commission on bookings
- BUT: Can't use data for training/analysis
- Alternative: Use for booking links only
```

### **Action:**
1. ⚠️ Sign up as affiliate (optional)
2. ⚠️ Use for booking links, not data source
3. ✅ Use Google Places for accommodation data instead

**Priority:** LOW (affiliate use only)

---

## 4️⃣ **Airbnb** ❌ NO PUBLIC API

### **Overview:**
- Vacation rental marketplace
- 7M+ listings
- Focus: Unique stays, experiences

### **API Access:**
- **Availability:** ❌ NO - Closed 2018
- **Alternative:** Web scraping (NOT RECOMMENDED)
- **Reason:** Prevent competitor data harvesting

### **Data Available:**
- ❌ No official API
- ❌ Scraping violates ToS
- ❌ Would need manual data collection

### **Use Case for LEXA:**
```
❌ NOT AVAILABLE
- No API access
- Scraping = ToS violation
- Skip entirely
```

**Status:** ❌ SKIP

---

## 5️⃣ **Komoot** ✅ GREAT FOR OUTDOOR

### **Overview:**
- Outdoor activity planning platform
- Focus: Hiking, cycling, running routes
- 30M+ users
- Strong in Europe

### **API Access:**
- **Availability:** ✅ Yes - Partner API
- **Signup:** https://www.komoot.com/api
- **Documentation:** Limited public docs

### **Data Available:**
- ✅ Hiking trails
- ✅ Cycling routes
- ✅ Running paths
- ✅ POIs along routes
- ✅ Difficulty ratings
- ✅ Elevation profiles
- ✅ User reviews

### **Terms of Service - AI/ML:**
```
✅ LIKELY ALLOWED
- Open API for partners
- Focus: Promote outdoor activities
- Smaller platform = more flexible
- Contact: api@komoot.com
```

### **Pricing:**
- FREE for non-commercial
- Commercial: Contact for pricing
- Likely: Revenue share or flat fee

### **Use Case for LEXA:**
```
✅ PERFECT for outdoor experiences
- "User wants scenic hike in Alps"
- Komoot API → Find beautiful trails
- LEXA adds: "Evokes: Freedom, Adventure, Wonder"
- Unique differentiator vs competitors
```

### **Action:**
1. ✅ Sign up: https://www.komoot.com/api
2. ✅ Request API access
3. ✅ Test with outdoor destinations
4. ✅ Integrate for hiking/cycling POIs

**Priority:** MEDIUM (unique niche) ⭐

---

## 6️⃣ **Viator** (TripAdvisor Company) ⚠️

### **Overview:**
- Activities and tours marketplace
- Part of TripAdvisor (Tripadvisor Experiences)
- 300,000+ travel experiences

### **API Access:**
- **Availability:** ✅ Yes - Affiliate API
- **Signup:** https://www.viator.com/affiliates
- **Note:** Owned by TripAdvisor

### **Terms of Service - AI/ML:**
```
⚠️ LIKELY RESTRICTED (TripAdvisor parent)
- Same parent company as TripAdvisor
- Likely similar AI/ML restrictions
- Affiliate model only
```

### **Use Case for LEXA:**
```
⚠️ SIMILAR to GetYourGuide
- Affiliate partnership possible
- Data usage restricted
- GetYourGuide is better alternative
```

**Priority:** LOW (GetYourGuide is better)

---

## 📊 **RECOMMENDED STRATEGY**

### **Tier 1: Implement Now** ⭐

1. **Google Places API** ✅
   - Already using
   - Reliable, comprehensive
   - AI/ML allowed
   - Keep as primary source

2. **GetYourGuide API** ⭐
   - Sign up as partner
   - Verify AI/ML allowed
   - Integrate for activities
   - Revenue potential

3. **Komoot API** ⭐
   - Sign up for outdoor POIs
   - Unique differentiator
   - Strong European coverage

### **Tier 2: Consider for Affiliate** ⚠️

4. **Booking.com Affiliate**
   - Use for booking links only
   - Earn commission
   - Don't use data for AI training

5. **Viator Affiliate**
   - Backup to GetYourGuide
   - Commission-based

### **Tier 3: Skip** ❌

6. **TripAdvisor** - Prohibited
7. **Airbnb** - No API

---

## 🎯 **Implementation Plan**

### **Week 1: GetYourGuide**

```bash
1. Sign up: https://partner.getyourguide.com
2. Email: partner-support@getyourguide.com
   Subject: "AI/ML Use Clarification for Luxury Travel Platform"
   Body: "We're building LEXA, an AI-powered luxury travel platform.
          We want to integrate GetYourGuide activities into our
          AI recommendation engine. Are there any restrictions on
          using API data with AI/ML for personalized recommendations?"
3. Wait for confirmation
4. If approved: Request API credentials
5. Create integration: scripts/integrate-getyourguide.ts
```

### **Week 2: Komoot**

```bash
1. Sign up: https://www.komoot.com/api
2. Request API access
3. Test with Alpine destinations
4. Create integration: scripts/integrate-komoot.ts
```

### **Week 3: Booking.com (Optional)**

```bash
1. Sign up as affiliate
2. Get affiliate links
3. Add booking widgets to LEXA
4. Earn commission (don't use data for AI)
```

---

## 💰 **Revenue Potential**

| Platform | Model | Revenue | Effort |
|----------|-------|---------|--------|
| **GetYourGuide** | Commission | 20-30% per booking | Medium |
| **Booking.com** | Affiliate | 25-40% per booking | Low |
| **Viator** | Affiliate | 8-12% per booking | Low |
| **Komoot** | Subscription | Premium upsell | Medium |

**Estimated Monthly (1,000 users):**
```
GetYourGuide: 100 bookings × $150 avg × 25% = $3,750/month
Booking.com: 50 bookings × $300 avg × 30% = $4,500/month
Viator: 30 bookings × $100 avg × 10% = $300/month
TOTAL: $8,550/month revenue potential
```

---

## ✅ **Next Actions**

### **TODAY:**
1. ✅ Sign up for GetYourGuide Partner Program
2. ✅ Email to clarify AI/ML terms
3. ✅ Sign up for Komoot API

### **THIS WEEK:**
1. ✅ Get API credentials (if approved)
2. ✅ Create integration scripts
3. ✅ Test with sample data

### **THIS MONTH:**
1. ✅ Full GetYourGuide integration
2. ✅ Komoot integration for outdoor activities
3. ✅ (Optional) Booking.com affiliate setup

---

## 📝 **Summary**

| Platform | Status | Action |
|----------|--------|--------|
| ✅ **Google Places** | ACTIVE | Keep using |
| ⭐ **GetYourGuide** | RECOMMENDED | Sign up & verify |
| ⭐ **Komoot** | RECOMMENDED | Sign up |
| ⚠️ **Booking.com** | OPTIONAL | Affiliate only |
| ❌ **TripAdvisor** | EXCLUDED | AI/ML prohibited |
| ❌ **Airbnb** | SKIP | No API |
| ⚠️ **Viator** | SKIP | Use GetYourGuide instead |

---

**Best Strategy:** Google Places (POIs) + GetYourGuide (Activities) + Komoot (Outdoor)

---

**Last Updated:** December 18, 2025  
**Next Review:** After GetYourGuide/Komoot API approval

