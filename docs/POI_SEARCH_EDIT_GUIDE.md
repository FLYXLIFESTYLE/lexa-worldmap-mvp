# POI Search & Edit Feature Guide

## Overview

Captains can now search for existing POIs in the Neo4j database and edit their properties directly from the Knowledge Editor. This is perfect for adding insider knowledge, adjusting scores, and enhancing location data based on firsthand experience.

## Features

### 🔍 **Smart POI Search**
- **Real-time search** with autocomplete
- Search by POI name, destination, or type
- Shows luxury scores and confidence levels
- Debounced for performance (300ms delay)

### 📝 **Edit POI Properties**
- **Name** - Correct or improve POI names
- **Type** - Set or update POI type (restaurant, hotel, beach_club, etc.)
- **Luxury Score** (0-10) - Adjust based on your experience
- **Luxury Confidence** (0-1) - How confident you are in the score
- **Luxury Evidence** - Explain why this POI deserves this score
- **Captain Comments** - Add your insider knowledge, tips, best practices

### 📊 **Relationship Display**
View all connected data:
- Destinations (where it's located)
- Themes (what experiences it offers)
- Activities (what you can do there)
- Emotions (what feelings it evokes)

### 🏷️ **Attribution Tracking**
- Automatically tracks who edited the POI
- Records when the last edit was made
- Preserves data provenance

## How to Use

### Step 1: Navigate to Knowledge Editor
Go to `/admin/knowledge/editor`

### Step 2: Search for a POI
1. At the top of the page, you'll see a **golden search box** with the heading "🔍 Edit Existing POIs"
2. Start typing a POI name (e.g., "Club55", "St. Tropez", "Monaco")
3. Results appear as you type with:
   - POI name
   - Location (destination)
   - Type
   - Current luxury score
   - Confidence level

### Step 3: Select a POI
Click on any search result to open the **POI Edit Modal**

### Step 4: Review Current Data
The modal shows:
- **POI Information**: Source, coordinates, last edited by, scored date
- **Relationships**: All connected destinations, themes, activities, emotions
- **Current Values**: Name, type, luxury score, confidence, evidence, comments

### Step 5: Make Your Edits
Update any of these fields:
- **POI Name** - Fix typos or improve clarity
- **Type** - Categorize correctly (restaurant, hotel, beach_club, marina, etc.)
- **Luxury Score (0-10)** - Your expert assessment
  - 9-10: Ultra-luxury, world-class
  - 7-8: High-end luxury
  - 5-6: Premium quality
  - Below 5: Not luxury standard
- **Luxury Confidence (0-1)** - How sure are you?
  - 0.9-1.0: Firsthand experience, absolute certainty
  - 0.7-0.8: Strong secondhand info or recent visit
  - 0.5-0.6: Reliable sources but needs verification
- **Luxury Evidence** - Why this score? What makes it special?
- **Captain Comments** - Your wisdom:
  - Best time to visit
  - Insider tips
  - Things to know
  - Guest preferences
  - Service quality
  - Booking advice

### Step 6: Save Changes
Click **"Save Changes"** - Your edits are immediately saved to Neo4j with your name attached.

## Example Use Cases

### 1. Adjust Luxury Score Based on Experience
**Scenario**: You visited Club55 in St. Tropez and noticed it's not as luxurious as the score suggests.

**Actions**:
1. Search "Club55"
2. Change luxury_score from 9.5 to 8.5
3. Update luxury_evidence: "Popular beach club but can be overcrowded. Service quality varies."
4. Add captain_comments: "Book early morning slots for VIP guests. Best in June/September, avoid July/August peak season."

### 2. Add Insider Knowledge
**Scenario**: You know a hidden gem that's in the database but lacks details.

**Actions**:
1. Search for the POI
2. Add captain_comments: "This family-run restaurant is a favorite among superyacht captains. Ask for Giovanni and mention you're from a yacht - he'll arrange a private table on the terrace. Try the fresh catch of the day and the homemade limoncello."
3. Update confidence to 1.0 (you have firsthand knowledge)

### 3. Correct Wrong Information
**Scenario**: A POI is miscategorized or has the wrong name.

**Actions**:
1. Search for the incorrect POI
2. Update the name to the correct one
3. Fix the type (e.g., from "restaurant" to "beach_club")
4. Add evidence: "Corrected by Captain [Your Name] - firsthand knowledge"

## API Endpoints

### Search POIs
```
GET /api/knowledge/search-poi?q={searchTerm}&limit={number}&destination={destination}
```

**Response**:
```json
{
  "results": [
    {
      "poi_uid": "osm:osm_way_123456",
      "name": "Club55",
      "type": "beach_club",
      "destination_name": "St. Tropez",
      "lat": 43.2346,
      "lon": 6.6789,
      "luxury_score": 9.5,
      "luxury_confidence": 0.85,
      "source": "osm"
    }
  ],
  "count": 1
}
```

### Get POI Details
```
GET /api/knowledge/poi/{poi_uid}
```

### Update POI
```
PATCH /api/knowledge/poi/{poi_uid}
```

**Payload**:
```json
{
  "name": "Club 55 Beach Club",
  "type": "beach_club",
  "luxury_score": 8.5,
  "luxury_confidence": 1.0,
  "luxury_evidence": "Firsthand experience - popular but can be overcrowded",
  "captain_comments": "Best for early bookings. VIP tables available. Avoid peak July/August."
}
```

## Neo4j Properties Updated

When you edit a POI, these properties are updated:
- `name` - POI name
- `type` - POI type
- `luxury_score` - Luxury rating (0-10)
- `luxury_confidence` - Confidence level (0-1)
- `luxury_evidence` - Explanation for the score
- `captain_comments` - Your insider knowledge
- `last_edited_by` - Your name (from captain_profiles)
- `last_edited_at` - Timestamp of edit
- `updated_at` - Timestamp of update

## Tips for Captains

1. **Be Specific**: Instead of "Great restaurant", write "Exceptional fresh seafood. The owner sources directly from local fishermen. Best dishes: branzino al sale, homemade pasta."

2. **Include Practical Info**: 
   - Best times to visit
   - Booking requirements
   - Dress codes
   - Price ranges
   - Transportation tips

3. **Share VIP Insights**:
   - Special arrangements available
   - Contact names
   - Hidden menus or experiences
   - Crew discounts or yacht services

4. **Update Regularly**: If you visit a place and notice changes, update the POI!

5. **Use High Confidence**: If you have firsthand experience, set confidence to 0.9-1.0

## Future Enhancements

- [ ] Bulk edit multiple POIs
- [ ] Add photos to POIs
- [ ] Create new relationships from the edit modal
- [ ] View edit history
- [ ] Filter search by luxury score range
- [ ] Map view for POI selection
- [ ] Compare similar POIs

## Questions?

This feature helps LEXA provide better recommendations by incorporating your real-world expertise. The more detailed and accurate the POI data, the better LEXA can serve guests!

---

**Pro Tip**: Combine this with the URL scraping feature! Scrape a destination guide, then search for the mentioned POIs and enhance them with your insider knowledge.

