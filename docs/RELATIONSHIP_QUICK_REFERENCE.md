# Relationship Quick Reference Guide

## **When & Where Are Relationships Added?**

### **Answer Summary**

| **When?** | **Where?** | **Who?** | **What Relationships?** |
|-----------|------------|----------|-------------------------|
| **Data Import** | Cypher files | You (manual curation) | All geographic + basic activity/theme |
| **Every Night at Midnight** | Automatic background job | Data Quality Agent | Missing relations, seasonal, prominence |
| **During User Conversations** | Real-time as user types | LEXA AI | Psychological (emotions, desires, fears) |
| **On-Demand Enrichment** | Manual or scheduled | Enrichment Agent | Activity/theme from external APIs |
| **Unstructured Data Input** | Real-time processing | AI Relationship Inference | All types based on content |

---

## **WHO Creates WHICH Relationships?**

### 🗂️ **Geographic Hierarchy (Structural)**
**Created by:** Data Import + Data Quality Agent (fills gaps)
- `LOCATED_IN`: POI → Destination
- `IN_AREA`: Destination → Area
- `IN_REGION`: Area → Region
- `IN_CONTINENT`: Region → Continent

✅ **When importing structured data**, these are in your Cypher files  
✅ **When adding unstructured data**, the Data Quality Agent auto-creates them  

---

### 🎯 **Activity & Theme (Content)**
**Created by:** Data Import + Enrichment Agent + AI Inference
- `SUPPORTS_ACTIVITY`: POI → Activity Type
- `HAS_THEME`: POI → Theme Category
- `FEATURED_IN`: POI → Experience
- `BELONGS_TO`: POI → Experience Category

✅ **Structured import**: In Cypher files (basic mapping)  
✅ **Unstructured data**: AI infers from descriptions, user mentions  
✅ **Enrichment**: External APIs (Google Places categories, Wikipedia analysis)  

---

### 💭 **Psychological (User-Driven)**
**Created by:** AI Inference ONLY (from user conversations)
- `EVOKES`: POI → Emotion
- `AMPLIFIES_DESIRE`: POI → Desire
- `MITIGATES_FEAR`: POI → Fear
- `RELATES_TO`: POI → Need

✅ **NEVER in Cypher files** - these are learned from users  
✅ **Real-time during conversations** when users express feelings  
✅ **From unstructured reviews/feedback** processed by AI  

---

### 🕒 **Time & Context (Dynamic)**
**Created by:** Data Quality Agent + AI Inference
- `AVAILABLE_IN`: POI → Season/Month
- `PROMINENT_IN`: POI → Destination (for iconic landmarks)

✅ **Automatic inference** based on POI type (beaches → summer)  
✅ **User feedback** ("Best visited in June")  
✅ **Data Quality Agent** runs this daily at midnight  

---

### 🔗 **Cross-References (Semantic)**
**Created by:** AI Analysis (future feature)
- `RELATES_TO`: POI → POI (semantic similarity)

✅ **Batch analysis** of POI relationships  
✅ **User behavior** (users who liked X also liked Y)  

---

## **Unstructured Data Input - How Does It Work?**

### **Example Scenario: User Submits a Travel Blog Post**

```
User Input (Unstructured):
"We stayed at a charming boutique hotel in Hvar. The sunset views from the 
rooftop terrace made us feel so peaceful and romantic. It's perfect for 
couples seeking an intimate escape. Best visited in late summer (August-September)."
```

### **AI Processing Flow:**

1. **Entity Extraction**
   ```
   - POI: "boutique hotel in Hvar" 
   - Destination: "Hvar"
   - Emotions: "Peace", "Romance"
   - Desire: "Intimate Escape", "Couples Experience"
   - Time: "August", "September"
   ```

2. **Relationship Inference** (Claude AI)
   ```cypher
   // Step 1: Find or create the hotel POI
   MATCH (h:poi {name: "boutique hotel"})-[:LOCATED_IN]->(d:destination {name: "Hvar"})
   
   // Step 2: Create psychological relationships
   MERGE (h)-[:EVOKES {confidence: 0.95, evidence: 'user explicitly stated'}]->(e1:Emotion {name: 'Peace'})
   MERGE (h)-[:EVOKES {confidence: 0.95}]->(e2:Emotion {name: 'Romance'})
   
   // Step 3: Create desire relationships
   MERGE (h)-[:AMPLIFIES_DESIRE {confidence: 0.9}]->(d:Desire {name: 'Intimate Connection'})
   
   // Step 4: Create theme relationships
   MERGE (h)-[:HAS_THEME {confidence: 0.85}]->(t:theme_category {name: 'Romantic Getaway'})
   MERGE (h)-[:FEATURED_IN {confidence: 0.9}]->(ex:experience_category {name: 'Couples Retreat'})
   
   // Step 5: Create seasonal availability
   MERGE (h)-[:AVAILABLE_IN {
     months: ['August', 'September'],
     season: 'late summer',
     confidence: 0.9,
     evidence: 'user recommendation'
   }]->(:season {name: 'Summer'})
   ```

3. **Automatic Execution**
   - All relationships created in Neo4j immediately
   - Confidence scores assigned based on explicitness
   - Evidence field stores reasoning

### **Where Does This Happen?**

```typescript
// In app/api/lexa/route.ts or wherever user input is processed
import { inferAndCreateRelationships } from '@/lib/neo4j/relationship-inference';

export async function POST(req: Request) {
  const { userInput, context } = await req.json();
  
  // Process with LEXA
  const response = await generateLexaResponse(userInput);
  
  // Automatically infer and create relationships
  const result = await inferAndCreateRelationships(userInput, context);
  
  console.log(`Created ${result.created} relationships from user input`);
  
  return Response.json({ response, relationshipsCreated: result.created });
}
```

---

## **Daily Quality Check (Midnight)**

Every night at **00:00** the Data Quality Agent runs:

```
✓ 1. Find duplicates → Merge relationships
✓ 2. Remove unnamed POIs → Clean up orphan relationships
✓ 3. Check all POIs for missing relationships:
    - LOCATED_IN (based on destination_name property)
    - IN_AREA (based on area_name property)
    - IN_REGION, IN_CONTINENT (geographic hierarchy)
    - SUPPORTS_ACTIVITY (infer from POI type)
    - HAS_THEME (infer from luxury_score)
    - PROMINENT_IN (high luxury_score POIs)
    - BELONGS_TO (match POI type to experience categories)
✓ 3.5. Add seasonal availability for beach/water POIs
✓ 4. Verify scoring (luxury_score, confidence, evidence)
✓ 5. Enrich POI data from APIs
```

**You can also trigger this manually** from the admin dashboard:
`http://localhost:3000/admin/data-quality`

---

## **Real-World Examples**

### **Example 1: Importing CSV of Hotels**
```python
# Your import script converts CSV → Cypher
import pandas as pd

df = pd.read_csv('hotels.csv')

for _, row in df.iterrows():
    # Create POI node
    cypher = f"""
    CREATE (h:poi {{
      name: '{row['name']}',
      type: 'hotel',
      lat: {row['lat']},
      lon: {row['lon']}
    }})
    """
    
    # LOCATED_IN is created based on coordinates
    cypher += f"""
    WITH h
    MATCH (d:destination)
    WHERE point.distance(
      point({{latitude: h.lat, longitude: h.lon}}),
      point({{latitude: d.lat, longitude: d.lon}})
    ) < 50000
    MERGE (h)-[:LOCATED_IN]->(d)
    """
    
    # SUPPORTS_ACTIVITY inferred from type
    cypher += """
    MERGE (h)-[:SUPPORTS_ACTIVITY]->(a:activity_type {name: 'Accommodation'})
    """
```

**What you DON'T need to add:**
- ❌ `EVOKES`, `AMPLIFIES_DESIRE` (AI will learn these from users)
- ❌ `AVAILABLE_IN` (Data Quality Agent adds this)
- ❌ `PROMINENT_IN` (Calculated based on luxury_score)

---

### **Example 2: User Adds Custom POI in LEXA Chat**

```
User: "I found an amazing hidden beach near Dubrovnik called Sveti Jakov. 
It's incredibly peaceful, no crowds at all, and you can watch the sunset. 
Perfect for anyone who wants to escape the tourist traps."
```

**What LEXA AI Does Automatically:**

1. **Creates POI node** (if doesn't exist)
   ```cypher
   MERGE (b:poi {name: 'Sveti Jakov Beach'})
   ON CREATE SET
     b.type = 'beach',
     b.added_by = 'user_input',
     b.created_at = datetime()
   ```

2. **Links to destination**
   ```cypher
   MATCH (d:destination {name: 'Dubrovnik'})
   MERGE (b)-[:LOCATED_IN]->(d)
   ```

3. **Creates psychological relationships**
   ```cypher
   MERGE (b)-[:EVOKES {confidence: 0.95, evidence: 'user said peaceful'}]->(e:Emotion {name: 'Peace'})
   MERGE (b)-[:MITIGATES_FEAR {confidence: 0.9, evidence: 'no crowds'}]->(f:Fear {name: 'Crowds'})
   MERGE (b)-[:AMPLIFIES_DESIRE {confidence: 0.85}]->(d:Desire {name: 'Escape'})
   ```

4. **Creates theme relationships**
   ```cypher
   MERGE (b)-[:HAS_THEME {confidence: 0.8}]->(t:theme_category {name: 'Hidden Gems'})
   MERGE (b)-[:HAS_THEME {confidence: 0.9}]->(t2:theme_category {name: 'Sunset Views'})
   ```

5. **Next midnight, Data Quality Agent adds:**
   - `IN_AREA`, `IN_REGION` (geographic hierarchy)
   - `AVAILABLE_IN` (summer months for beach)
   - `SUPPORTS_ACTIVITY` (swimming, sunbathing)

---

## **Summary for Beginners**

### **Think of it as 4 Systems Working Together:**

1. **📋 Import System** (You)
   - Add structured data via Cypher files
   - Create basic geographic + activity relationships

2. **🤖 AI Inference System** (LEXA)
   - Listens to user conversations in real-time
   - Creates emotional and psychological relationships
   - Processes unstructured text into structured relationships

3. **🔍 Data Quality System** (Runs every night)
   - Fills in missing relationships
   - Adds seasonal/temporal relationships
   - Ensures data consistency

4. **🌐 Enrichment System** (On-demand)
   - Fetches data from Google/Wikipedia/OSM
   - Creates activity/theme relationships
   - Adds descriptions, ratings, photos

### **You Only Need to Worry About:**
✅ Import your POI data (name, coordinates, type)  
✅ The system handles ALL relationships automatically  
✅ AI learns from users over time  
✅ Quality checks run every night  

---

## **File Locations**

- **AI Inference**: `lib/neo4j/relationship-inference.ts`
- **Data Quality Agent**: `lib/neo4j/data-quality-agent.ts`
- **Scheduler**: `lib/services/scheduler.ts` (runs at midnight)
- **Admin UI**: `app/admin/data-quality/page.tsx`
- **Full Documentation**: `docs/RELATIONSHIP_MANAGEMENT.md`


