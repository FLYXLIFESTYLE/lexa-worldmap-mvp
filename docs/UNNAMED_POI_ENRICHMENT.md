# Unnamed POI Enrichment Strategy

## **Problem**

Your database has POIs with:
- NULL names
- Empty names
- Generic names like "Unnamed POI (osm:3487623894)"

**Old approach:** Delete them (loses valuable data)  
**New approach:** Enrich them with actual names from external sources

---

## **Enrichment Pipeline**

### **Step 1: Identify Unnamed POIs**

Query finds POIs where:
```cypher
p.name IS NULL 
OR p.name = '' 
OR p.name STARTS WITH 'Unnamed POI'
AND p.lat IS NOT NULL  -- Must have coordinates
AND p.lon IS NOT NULL
```

### **Step 2: Try Multiple Sources (in order)**

#### **Source 1: OSM Overpass API** (Free, No API Key)

For POIs with `source_id` like `osm:n123456`:
- Query OSM Overpass API for full metadata
- Extract: `name`, `name:en`, `official_name`, `alt_name`

**Example:**
```
Input:  POI with source_id="osm:n3487623894"
Query:  OSM Overpass for node 3487623894
Output: "Riva Promenade" or "Hotel Adriatic"
```

#### **Source 2: Reverse Geocoding** (Free, Nominatim)

For POIs with coordinates but no OSM ID:
- Reverse geocode to get address
- Generate descriptive name: `"{type} in {location}"`

**Example:**
```
Input:  restaurant at lat=43.5081, lon=16.4402
Query:  Nominatim reverse geocode
Output: "Restaurant in Split Old Town"
```

#### **Source 3: Google Places API** (Paid, Best Quality)

*Commented out to avoid costs during development*

For high-priority POIs (luxury_score > 70):
- Use Google Places Nearby Search
- Get: name, rating, photo, types

**Cost:** $17 per 1,000 requests

---

## **What Gets Deleted?**

**Only POIs that are truly useless:**
- No name AND
- No coordinates AND
- No type

These POIs have zero value and cannot be enriched.

---

## **How It Works**

### **In Data Quality Agent:**

```
Step 1: Find duplicates → Merge
Step 2: Enrich unnamed POIs → Find names or delete if unusable
Step 3: Create relationships → Link to destinations
Step 4: Add luxury scores → Calculate quality
Step 5: Enrich high-priority POIs → External APIs
```

### **Per Run:**
- Processes **100 unnamed POIs**
- Tries to find names for each
- Updates POI with found name
- Marks `enriched_at` timestamp
- Stores `enrichment_source`

---

## **Example Results**

### **Before:**
```
POI #12345
  name: "Unnamed POI (osm:n3487623894)"
  type: "restaurant"
  lat: 43.5081
  lon: 16.4402
```

### **After Enrichment:**
```
POI #12345
  name: "Konoba Matejuska"
  type: "restaurant"
  lat: 43.5081
  lon: 16.4402
  enriched_at: 2025-12-16T16:30:00Z
  enrichment_source: "osm_overpass"
```

---

## **Statistics Tracking**

The enrichment module returns:

```typescript
{
  found: 100,      // Unnamed POIs found with coordinates
  enriched: 78,    // Successfully found names
  failed: 22,      // Could not find names (kept as-is)
  deleted: 5       // Deleted (no coords, no type)
}
```

---

## **API Rate Limits**

### **OSM Overpass API**
- **Limit:** 2 requests per second
- **Cost:** Free
- **Quality:** Good for POIs imported from OSM

### **Nominatim**
- **Limit:** 1 request per second
- **Cost:** Free
- **Quality:** Basic (address-based names)

### **Google Places**
- **Limit:** Unlimited (with API key)
- **Cost:** $17 per 1,000 requests
- **Quality:** Excellent (official names, ratings, photos)

---

## **Running Enrichment**

### **Automatic (Daily)**
Enrichment runs as part of the daily quality check:
```
Every night at midnight UTC
Processes 100 unnamed POIs per night
With 1,000 unnamed POIs = 10 days to complete
```

### **Manual (On Demand)**
```
http://localhost:3000/admin/data-quality
Click "Run Quality Check"
```

### **Bulk Processing**
```bash
# Enrich all unnamed POIs (run agent multiple times)
npm run quality-check-bulk 50
```

---

## **Cost Estimate**

### **Current Strategy (Free)**
- OSM Overpass: Free
- Nominatim: Free
- **Total: $0**

Success rate: ~60-80% (depends on OSM data quality)

### **With Google Places (Paid)**
- 10,000 unnamed POIs × $0.017 = **$170**
- Success rate: ~90-95%

**Recommendation:** Start with free sources, use Google for high-priority POIs only.

---

## **Next Steps**

1. **Run Quality Check** to see how many can be enriched
2. **Review results** - check enrichment success rate
3. **Decide on Google API** - if free sources aren't enough
4. **Run multiple times** - process all unnamed POIs gradually

---

## **Benefits**

✅ **Preserves data** - no loss of valuable POIs  
✅ **Improves quality** - replaces generic names with real ones  
✅ **Free** - uses open APIs (OSM, Nominatim)  
✅ **Incremental** - processes 100 per run (no timeouts)  
✅ **Transparent** - tracks enrichment source and timestamp

---

## **Testing**

### **Check unnamed POIs:**
```cypher
MATCH (p:poi)
WHERE p.name STARTS WITH 'Unnamed POI'
RETURN count(*) as unnamed_count;
```

### **Check enrichment status:**
```cypher
MATCH (p:poi)
WHERE p.enriched_at IS NOT NULL
RETURN 
  p.enrichment_source,
  count(*) as count
ORDER BY count DESC;
```

### **See enrichment examples:**
```cypher
MATCH (p:poi)
WHERE p.enriched_at IS NOT NULL
RETURN 
  p.name,
  p.type,
  p.enrichment_source,
  p.enriched_at
LIMIT 10;
```

