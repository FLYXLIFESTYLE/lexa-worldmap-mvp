# URL Scraping - Data Preview & Storage

## What Gets Extracted When You Scrape a URL

When you paste a URL in the Captain's Portal, here's what happens:

### 1. **Content Extraction**
- ✅ HTML is fetched and processed
- ✅ Main text content is extracted
- ✅ Title is extracted
- ✅ Subpage links are detected (same domain only)

### 2. **AI Processing (Claude)**
The extracted text is analyzed to identify:

#### **POIs (Points of Interest)**
- **Name**: "Marina Bay Sands", "Le Bernardin", "Santorini Caldera"
- **Type**: restaurant, hotel, beach, marina, museum, etc.
- **Destination**: French Riviera, Amalfi Coast, etc.
- **Description**: Brief description
- **Luxury Indicators**: Keywords that suggest luxury (e.g., "Michelin-starred", "exclusive")
- **Confidence**: 0.0-1.0 (how confident AI is)

#### **Relationships**
- POI ← `LOCATED_IN` → Destination
- POI ← `SUPPORTS_ACTIVITY` → Activity (e.g., sailing, diving)
- POI ← `HAS_THEME` → Theme (e.g., culinary, wellness)
- POI ← `EVOKES` → Emotion (e.g., peace, excitement)
- **Each relationship has**:
  - Confidence score (0.0-1.0)
  - Evidence (why the relationship was inferred)

#### **Wisdom/Knowledge**
- **Topic**: e.g., "best_time_to_visit", "local_cuisine", "hidden_gems"
- **Content**: The actual knowledge/insight
- **Applies To**: Which destinations/POIs this applies to
- **Tags**: Keywords for search
- **Confidence**: How reliable is this information

### 3. **What Gets Saved to Neo4j**

#### **POI Nodes** (`poi`)
```cypher
CREATE (p:poi {
  poi_uid: "generated_unique_id",
  name: "Marina Bay Sands",
  type: "hotel",
  destination_name: "Singapore",
  description: "Iconic luxury hotel with infinity pool",
  luxury_score: 85,
  confidence: 0.8,
  source: "url_scrape",
  source_id: "https://example.com/singapore-guide",
  contributed_by: "user_uuid",
  contributor_name: "Captain Chris",
  created_at: datetime()
})
```

#### **Knowledge Nodes** (`Knowledge`)
```cypher
CREATE (k:Knowledge {
  knowledge_id: "uuid",
  title: "Best Time to Visit Singapore",
  content: "November to February offers the best weather...",
  topic: "best_time_to_visit",
  tags: ["weather", "planning", "Singapore"],
  confidence: 0.75,
  source: "url_scrape",
  author: "Captain Chris",
  contributed_by: "user_uuid",
  created_at: datetime(),
  verified: true
})
```

#### **Relationships**
```cypher
(poi)-[:LOCATED_IN {confidence: 0.9}]->(destination)
(poi)-[:SUPPORTS_ACTIVITY {confidence: 0.7}]->(activity)
(poi)-[:HAS_THEME {confidence: 0.8}]->(theme)
(poi)-[:EVOKES {confidence: 0.6, evidence: "rooftop pool"}]->(emotion:Emotion {name: "Awe"})
```

#### **ScrapedURL Tracking** (`ScrapedURL`)
```cypher
CREATE (u:ScrapedURL {
  url: "https://example.com/singapore-guide",
  scraped_at: datetime(),
  status: "success",
  knowledge_count: 5,
  pois_extracted: 12,
  relationships_created: 45,
  subpages_found: ["https://example.com/hotels", "..."],
  contributed_by: "user_uuid",
  contributor_name: "Captain Chris"
})
```

## Example Response (What You See)

When you scrape a URL, you'll see:

```json
{
  "success": true,
  "title": "Ultimate Singapore Travel Guide",
  "content": "Singapore is a modern city-state...",
  "tags": ["luxury", "city", "asia", "food"],
  "pois": [
    "Marina Bay Sands",
    "Gardens by the Bay",
    "Raffles Hotel",
    "Sentosa Island"
  ],
  "wisdom": [
    "Best time to visit is November-February for optimal weather",
    "MRT is the most efficient way to get around",
    "Hawker centers offer authentic local food"
  ],
  "relationships": [
    "Marina Bay Sands → Singapore",
    "Marina Bay Sands → luxury accommodation",
    "Gardens by the Bay → family activities"
  ],
  "subpagesFound": 15,
  "subpages": [
    "https://example.com/singapore/hotels",
    "https://example.com/singapore/restaurants",
    "..."
  ],
  "saved": {
    "wisdom": 5,
    "pois": 12,
    "relationships": 45
  }
}
```

## Where to View Saved Data

### 1. **Neo4j Browser**
Query to see your scraped data:
```cypher
// Find all POIs from a specific URL
MATCH (u:ScrapedURL {url: "https://example.com/guide"})
MATCH (p:poi {source_id: u.url})
RETURN p

// Find all knowledge from a URL
MATCH (k:Knowledge {source: "url_scrape"})
WHERE k.source_id CONTAINS "example.com"
RETURN k
```

### 2. **Captain's Portal - Scraped URLs Page**
URL: `https://lexa-worldmap-mvp.vercel.app/admin/knowledge/scraped-urls`

Shows:
- ✅ All scraped URLs
- ✅ Extraction statistics
- ✅ Found subpages
- ✅ Success/failure status
- ✅ Re-scrape and delete options

## Data Quality

### Confidence Scores
- **0.9-1.0**: Very high confidence (explicit mentions)
- **0.7-0.9**: High confidence (clear context)
- **0.5-0.7**: Medium confidence (inferred)
- **0.3-0.5**: Low confidence (weak signals)

### Luxury Scores (for POIs)
- **80-100**: Ultra luxury (Michelin, Forbes 5-star, exclusive)
- **60-80**: High luxury (5-star, premium)
- **40-60**: Mid-luxury (4-star, boutique)
- **20-40**: Standard (3-star)
- **0-20**: Basic

## Next Steps After Scraping

1. **Review extracted data** in the response
2. **Check Neo4j** to verify it was saved
3. **View in Scraped URLs page** for statistics
4. **Use subpages** to scrape related content
5. **Re-scrape** if needed (force=true)

## Troubleshooting

If scraping fails:
- Check the error message in the response
- View the URL in Scraped URLs page (status: "failed")
- Check server logs for detailed error
- Try re-scraping with force=true

