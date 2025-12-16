# Emotional & Psychological Relationships Guide

## **Overview**

This guide explains how to create LEXA's emotional and psychological relationships that power the psychology-based recommendation engine.

---

## **🎭 The Three Relationship Types**

### **1. EVOKES (POI/Theme → Emotion)**
Describes what **emotions** a POI or theme triggers in guests.

**Example:**
```
(Beach) -[EVOKES]-> (Joy)
(Mountain Peak) -[EVOKES]-> (Awe)
(Spa) -[EVOKES]-> (Peace)
```

### **2. AMPLIFIES_DESIRE (POI → Desire)**
Describes what **desires** a POI fulfills or amplifies.

**Example:**
```
(Diving Experience) -[AMPLIFIES_DESIRE]-> (Adventure)
(Michelin Restaurant) -[AMPLIFIES_DESIRE]-> (Luxury)
(Local Market) -[AMPLIFIES_DESIRE]-> (Authenticity)
```

### **3. MITIGATES_FEAR (POI → Fear)**
Describes what **fears** a POI helps overcome.

**Example:**
```
(5-Star Hotel) -[MITIGATES_FEAR]-> (Discomfort)
(UNESCO Site) -[MITIGATES_FEAR]-> (Disappointment)
(Exclusive Club) -[MITIGATES_FEAR]-> (Missing Out)
```

---

## **📊 Created Nodes**

### **Emotions (8 total):**
- Joy, Excitement, Peace, Awe, Romance, Curiosity, Gratitude, Inspiration

### **Desires (8 total):**
- Adventure, Luxury, Authenticity, Connection, Knowledge, Transformation, Status, Escape

### **Fears (6 total):**
- Missing Out, Disappointment, Discomfort, Regret, Inadequacy, Judgment

---

## **🚀 How to Create Relationships**

### **Step 1: Create Emotion/Desire/Fear Nodes**

**In Neo4j Browser**, run:

```cypher
// Copy and paste from scripts/create-emotion-nodes.cypher
```

**Expected Result:**
```
node_type  | count
-----------|------
Desire     | 8
Emotion    | 8
Fear       | 6
```

### **Step 2: Create Relationships**

**In Neo4j Browser**, run:

```cypher
// Copy and paste from scripts/create-emotional-relationships.cypher
```

**Expected Result:**
```
rel_type           | count
-------------------|-------
EVOKES             | ~5,000+
AMPLIFIES_DESIRE   | ~3,000+
MITIGATES_FEAR     | ~2,000+
```

**Processing Time:** 2-5 minutes depending on database size.

---

## **🧠 How Inference Works**

The script uses **pattern matching** on POI names to infer relationships:

### **Example 1: Beach POI**
```
POI Name: "Spiaggia Tropea"
↓
Pattern Match: "spiaggia" (Italian for beach)
↓
Created Relationships:
- (POI) -[EVOKES]-> (Joy)
- (POI) -[AMPLIFIES_DESIRE]-> (Escape)
```

### **Example 2: Luxury Hotel**
```
POI Name: "Grand Hotel Villa Serbelloni"
Luxury Score: 95
↓
Pattern Match: "Grand Hotel" + high luxury_score
↓
Created Relationships:
- (POI) -[EVOKES]-> (Romance)
- (POI) -[AMPLIFIES_DESIRE]-> (Luxury)
- (POI) -[MITIGATES_FEAR]-> (Discomfort)
```

### **Example 3: Mountain Peak**
```
POI Name: "Monte Bianco"
↓
Pattern Match: "Monte" (Italian for mountain)
↓
Created Relationships:
- (POI) -[EVOKES]-> (Awe)
- (POI) -[AMPLIFIES_DESIRE]-> (Adventure)
```

---

## **📈 Impact on LEXA**

### **Before Emotional Relationships:**
```
User: "I want to feel at peace"
LEXA: *searches by theme keywords*
Result: Generic spa recommendations
```

### **After Emotional Relationships:**
```
User: "I want to feel at peace"
LEXA: *queries EVOKES relationships*
Result: Personalized recommendations:
- Quiet monastery gardens
- Wellness retreats
- Secluded beaches
- Mountain viewpoints
All connected via (POI)-[EVOKES]->(Peace)
```

---

## **🔧 Confidence Scores**

Each relationship has a confidence score (0.0 - 1.0):

| Confidence | Meaning | Example |
|------------|---------|---------|
| 0.95 | Very certain | Romantic theme → Romance emotion |
| 0.85 | High confidence | Museum → Curiosity |
| 0.75 | Good inference | Local market → Authenticity |
| 0.70 | Moderate | Exclusive venue → Missing Out fear |

**LEXA uses confidence to:**
- Weight recommendations
- Filter low-confidence matches
- Learn from user feedback

---

## **🎯 Next Steps After Creation**

1. **Verify Creation:**
   ```cypher
   // Check total relationships
   MATCH ()-[r:EVOKES]->()
   RETURN count(r);
   
   MATCH ()-[r:AMPLIFIES_DESIRE]->()
   RETURN count(r);
   
   MATCH ()-[r:MITIGATES_FEAR]->()
   RETURN count(r);
   ```

2. **Test Queries:**
   ```cypher
   // Find POIs that evoke peace
   MATCH (p:poi)-[r:EVOKES]->(e:Emotion {name: 'peace'})
   RETURN p.name, r.confidence
   ORDER BY r.confidence DESC
   LIMIT 10;
   ```

3. **Integrate with LEXA:**
   - Emotional recommendations already work via `recommendation-engine.ts`
   - Test in LEXA chat: "Show me experiences that evoke awe"

---

## **📊 Expected Results**

After running both scripts, you should have:

| Metric | Expected Value |
|--------|---------------|
| Emotion nodes | 8 |
| Desire nodes | 8 |
| Fear nodes | 6 |
| EVOKES relationships | 5,000 - 15,000 |
| AMPLIFIES_DESIRE rels | 3,000 - 10,000 |
| MITIGATES_FEAR rels | 2,000 - 8,000 |
| **Total new relationships** | **10,000 - 33,000** |

**This will boost your total relationships from 1.6M to ~1.65M!** 🚀

---

## **🔄 Re-running the Scripts**

The scripts use `MERGE` so they're **safe to re-run**:
- Won't create duplicates
- Will only add missing relationships
- Can be run after new POIs are imported

---

## **🎨 Customization**

### **Add New Emotions:**

```cypher
MERGE (e:Emotion {name: 'nostalgia'})
ON CREATE SET e.description = 'Longing for the past';

MATCH (p:poi)
WHERE p.name =~ '(?i).*(historic|vintage|classic|old town).*'
MATCH (e:Emotion {name: 'nostalgia'})
MERGE (p)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.8;
```

### **Adjust Confidence Scores:**

```cypher
// Increase confidence for luxury hotels
MATCH (p:poi)-[r:AMPLIFIES_DESIRE]->(d:Desire {name: 'luxury'})
WHERE p.luxury_score > 90
SET r.confidence = 0.95;
```

---

## **❓ FAQ**

**Q: Can I delete and recreate relationships?**
```cypher
// Delete all emotional relationships
MATCH ()-[r:EVOKES]->() DELETE r;
MATCH ()-[r:AMPLIFIES_DESIRE]->() DELETE r;
MATCH ()-[r:MITIGATES_FEAR]->() DELETE r;

// Then re-run creation scripts
```

**Q: How do I check a specific POI's emotional profile?**
```cypher
MATCH (p:poi {name: "Grand Hotel Villa Serbelloni"})
OPTIONAL MATCH (p)-[evokes:EVOKES]->(emotion)
OPTIONAL MATCH (p)-[amplifies:AMPLIFIES_DESIRE]->(desire)
OPTIONAL MATCH (p)-[mitigates:MITIGATES_FEAR]->(fear)
RETURN 
  p.name,
  collect(DISTINCT emotion.name) as emotions,
  collect(DISTINCT desire.name) as desires,
  collect(DISTINCT fear.name) as fears;
```

**Q: Can the AI infer better relationships?**
Yes! See `lib/neo4j/relationship-inference.ts` for AI-powered inference from unstructured text.

---

**Ready to create emotional intelligence for LEXA? Run the scripts now!** 🎭

