# POI Data Requirements & Collection Strategy
## Complete Overview for Google Places/Maps Integration

---

## 🎯 **Project Goal**

**Collect FRESH luxury POI data** from Google Places/Maps (not enriching existing POIs) to build a comprehensive knowledge base for creating exceptional travel experiences.

---

## 📋 **POI Categories to INCLUDE**

### **1. Accommodation (Hotels & Resorts)**
**Google Places Types:**
- `lodging`
- `resort_hotel`
- `hotel`
- `spa`

**Quality Filters:**
- Rating: ≥ 4.0 stars
- Price Level: $$$ or $$$$
- Review count: ≥ 50

**Data Fields:**
- Name, address, coordinates
- Star rating, price level
- Amenities (pool, spa, restaurant, beach access)
- Photos (minimum 5)
- Website, phone
- Room types
- Luxury indicators (concierge, butler service, private beach)

---

### **2. Dining Experiences**

#### **Fine Dining Restaurants**
**Google Places Types:**
- `restaurant` (filtered by price level)
- `fine_dining_restaurant`

**Quality Filters:**
- Rating: ≥ 4.2 stars
- Price Level: $$$ or $$$$
- Michelin stars (when available)

#### **Beach Clubs & Bars**
**Google Places Types:**
- `beach_club`
- `bar`
- `cocktail_bar`
- `wine_bar`
- `rooftop_bar`

**Quality Filters:**
- Rating: ≥ 4.0 stars
- Price Level: $$ or higher
- Must have "luxury", "beach club", or "rooftop" indicators

---

### **3. Cultural & Heritage Sites**

**Google Places Types:**
- `art_gallery`
- `museum`
- `church`
- `cathedral`
- `castle`
- `historical_landmark`
- `tourist_attraction` (filtered)

**Quality Filters:**
- Rating: ≥ 4.0 stars
- Historic/cultural significance
- Private tour availability (bonus)

---

### **4. Viewpoints & Scenic Places**

**Google Places Types:**
- `scenic_spot`
- `viewpoint`
- `park` (filtered for luxury/scenic)
- `nature_preserve`

**Quality Filters:**
- Rating: ≥ 4.0 stars
- Photogenic/Instagram-worthy
- Accessibility for luxury travelers

---

### **5. Activities & Experience Providers**

#### **Water Activities**
**Google Places Types:**
- `marina`
- `yacht_club`
- `boat_tour_agency`
- `scuba_diving_center`
- `water_sports_center`

**Keywords to search:**
- "yacht charter"
- "private boat"
- "sailing"
- "diving"
- "snorkeling"
- "jet ski"

#### **Adventure & Wellness**
**Google Places Types:**
- `spa`
- `wellness_center`
- `golf_course` (luxury only)
- `helicopter_tour_agency`
- `hot_air_balloon_company`

**Keywords:**
- "private tour"
- "luxury spa"
- "helicopter"
- "hot air balloon"
- "wellness retreat"

#### **Cultural Experiences**
**Keywords:**
- "cooking class"
- "wine tasting"
- "art workshop"
- "private guide"
- "cultural tour"

---

### **6. Beaches**

**Google Places Types:**
- `beach`
- `beach_club`

**Quality Indicators:**
- Rating: ≥ 4.0 stars
- Beach club presence
- Water sports availability
- Luxury amenities (sunbeds, service)

**Categories:**
- Private beaches
- Beach clubs
- Public beaches (upscale only)
- Secluded coves

---

### **7. Luxury Shopping**

#### **Fashion & Accessories**
**Google Places Types:**
- `clothing_store` (luxury brands only)
- `jewelry_store`
- `watch_store`
- `boutique`

**Luxury Brand Indicators:**
- Hermès, Louis Vuitton, Gucci, Prada, Chanel
- Rolex, Patek Philippe, Audemars Piguet
- High-end local designers

#### **Automotive**
**Google Places Types:**
- `car_dealer` (luxury only)
- `car_rental` (exotic only)

**Brands:**
- Ferrari, Lamborghini, Rolls-Royce, Bentley
- McLaren, Aston Martin, Porsche

#### **Shopping Districts**
**Keywords:**
- "luxury shopping"
- "designer boutiques"
- "high-end shopping"

---

### **8. Nightlife & Entertainment**

**Google Places Types:**
- `night_club` (upscale only)
- `casino`
- `live_music_venue`
- `theater`
- `opera_house`

**Quality Filters:**
- Rating: ≥ 4.0 stars
- Dress code presence (luxury indicator)
- VIP/table service available

---

## 🚫 **POI Categories to EXCLUDE**

### **Completely Exclude:**
- `atm`, `bank`
- `gas_station`, `car_wash`, `parking`
- `pharmacy`, `drugstore`
- `convenience_store`, `supermarket`
- `hardware_store`, `home_goods_store`
- `laundromat`, `dry_cleaning`
- `post_office`
- `hospital`, `doctor`, `dentist`
- `real_estate_agency`
- `insurance_agency`
- `lawyer`, `accounting`
- `general_contractor`
- `car_repair`, `auto_parts_store`

### **Exclude Unless Luxury:**
- Regular `cafe` (keep only luxury cafés)
- Regular `bar` (keep only cocktail bars, wine bars, rooftop bars)
- `restaurant` with price level $ or $$
- `hotel` with rating < 4.0 or price level ≤ $$

---

## 📊 **Data Fields to Collect**

### **Essential Fields (ALL POIs):**
```json
{
  "source": "google_places",
  "source_id": "ChIJ...",
  "name": "POI Name",
  "type": "restaurant",
  "category": "Fine Dining",
  "coordinates": {
    "lat": 43.7384,
    "lon": 7.4246
  },
  "address": {
    "full": "1 Avenue de Monte Carlo",
    "street": "Avenue de Monte Carlo",
    "city": "Monaco",
    "region": "French Riviera",
    "country": "Monaco",
    "postal_code": "98000"
  },
  "contact": {
    "phone": "+377...",
    "website": "https://...",
    "email": "info@..."
  }
}
```

### **Quality Indicators:**
```json
{
  "rating": 4.8,
  "review_count": 1243,
  "price_level": 4,
  "luxury_score": 9.5
}
```

### **Rich Data:**
```json
{
  "description": "AI-enhanced description",
  "photos": [
    "https://maps.googleapis.com/...",
    "..."
  ],
  "opening_hours": {
    "monday": "19:00-23:00",
    "...": "..."
  },
  "amenities": [
    "dress_code",
    "valet_parking",
    "private_dining",
    "michelin_star"
  ],
  "languages": ["en", "fr", "it"],
  "accepted_payment": ["Amex", "Visa", "Cash"]
}
```

### **Experience Metadata:**
```json
{
  "best_for": ["romantic_dinner", "celebration", "business_dining"],
  "atmosphere": ["elegant", "intimate", "upscale"],
  "dress_code": "formal",
  "reservation_required": true,
  "advance_booking": "2-4 weeks recommended"
}
```

---

## 🎯 **Quality Filters & Scoring**

### **Luxury Score Calculation (0-10):**

**Base Score:**
- Google Rating × 2 (max 10)

**Modifiers:**
- Price Level $$$$: +2
- Price Level $$$: +1
- Michelin Star: +3 per star
- Review count > 500: +0.5
- Review count > 1000: +1
- Photos > 20: +0.5

**Penalties:**
- Rating < 4.0: -2
- Price Level $: -3
- Review count < 10: -1

**Luxury Keywords Bonus (+0.5 each):**
- "luxury", "exclusive", "private"
- "VIP", "concierge", "butler"
- "five-star", "signature", "curated"

**Final Score:** Clamp between 0-10

---

## 🌍 **Geographic Scope**

### **Phase 1: Yacht Destinations (Priority)**

From your screenshots, I see:

**Cities/Ports:**
- Sydney, Taormina, Tenerife, Tivat, Tongatapu Group, Tortola, V&a Waterfront, Valletta, etc.

**Countries:**
- Netherlands Antilles, New Zealand, Norway, Portugal, Saint Martin, Seychelles, Sint Maarten, South Africa, Spain, St Barthelemy, St Kitts Nevis, St Lucia, St Vincent Grenadines, Tanzania, Thailand, Tonga, Turkey, US Virgin Is, USA, United Arab Emirates, etc.

**Routes (visible in screenshot):**
- Mediterranean: Monaco, Cannes, St Tropez, Portofino, Sardinia, Corsica, Ibiza, Mallorca, Athens
- French Riviera: Monaco, Nice, Cannes, St Tropez, Antibes
- Italian Riviera: Portofino, Santa Margherita, Cinque Terre
- Caribbean: St Martin, St Barth, Anguilla, BVI, USVI
- Balearics: Ibiza, Mallorca, Menorca, Formentera

### **Phase 2: Major Luxury Destinations**
- Maldives, Dubai, Singapore, Hong Kong, Tokyo
- Amalfi Coast, Santorini, Mykonos
- Côte d'Azur expansion
- Caribbean expansion

---

## 🔄 **Collection Strategy**

### **Step 1: Destination Upload**
1. Parse yacht cities/ports from your data
2. Parse countries from your data  
3. Parse routes with cities
4. Create destination nodes in Neo4j
5. Link to regions/countries

### **Step 2: POI Discovery**
For each destination:
1. **Nearby Search** (radius: 5km for cities, 50km for regions)
   - Each included category
   - Apply quality filters
   - Deduplicate by place_id

2. **Text Search** (targeted queries)
   - "Michelin restaurant in [city]"
   - "luxury hotel in [city]"
   - "yacht charter [city]"
   - "private tour [city]"

### **Step 3: Place Details Collection**
For each POI:
1. Get full Place Details
2. Collect all photos
3. Parse reviews for insights
4. Calculate luxury score
5. Extract amenities/features

### **Step 4: Enhancement**
1. AI description generation
2. Theme category assignment
3. Relationship creation (LOCATED_IN, HAS_THEME, SUPPORTS_ACTIVITY)
4. Quality validation

---

## 💰 **Cost Estimation**

### **Google Places API Pricing:**
- **Nearby Search:** $32 per 1,000 requests
- **Text Search:** $32 per 1,000 requests  
- **Place Details:** $17 per 1,000 requests
- **Place Photos:** $7 per 1,000 requests

### **Per Destination (average city):**
- Nearby searches: 10-15 queries × $0.032 = $0.48
- Text searches: 5-10 queries × $0.032 = $0.32
- Place Details: 100-300 POIs × $0.017 = $1.70-5.10
- Photos: 5 per POI × $0.007 = $0.35-1.05

**Average per destination:** $3-7
**For 100 yacht destinations:** $300-700

### **Your Budget:**
- €242 credits + $200/month (×3) = $850+ total
- **Plenty for comprehensive collection!**

---

## 📋 **Data Validation Rules**

### **Must Have (reject if missing):**
- Name
- Coordinates (lat/lon)
- At least one category/type
- Google Place ID

### **Should Have (flag if missing):**
- Rating
- Address
- Phone or website
- At least 1 photo

### **Quality Checks:**
- Name not in [exclude keywords]
- Coordinates within destination bounds
- Rating between 1-5
- Price level 1-4
- No duplicate place_ids

---

## 🚀 **Implementation Steps**

1. **Parse & Upload Yacht Destinations** ✅ (I'll build this)
2. **Configure Google Places API** (you enable it)
3. **Build POI Collector** (I'll build this)
4. **Run Phase 1: French Riviera** (test with 10 cities)
5. **Validate Results** (manual review)
6. **Scale to All Yacht Destinations** (automated)

---

## 📝 **Output Format**

POIs will be stored in Neo4j with:

```cypher
CREATE (p:poi {
  source: 'google_places',
  source_id: 'ChIJ...',
  name: 'Le Louis XV - Alain Ducasse',
  type: 'restaurant',
  category: 'Fine Dining',
  lat: 43.7384,
  lon: 7.4246,
  rating: 4.8,
  price_level: 4,
  luxury_score: 9.5,
  michelin_stars: 3,
  ...
})

CREATE (p)-[:LOCATED_IN]->(city:destination {name: 'Monaco'})
CREATE (p)-[:HAS_THEME]->(theme:theme_category {name: 'Culinary Excellence'})
CREATE (p)-[:SUPPORTS_ACTIVITY]->(activity:activity {name: 'Fine Dining'})
```

---

## ✅ **Next Steps**

Ready to build:
1. **Yacht destination upload system** (paste your data)
2. **Google Places POI collector** (with all these requirements)
3. **Data validation pipeline**

**Shall I start building the destination upload system first?**

