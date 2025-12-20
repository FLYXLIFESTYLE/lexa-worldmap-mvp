# Quick Start: Test Phase 2 Backend

## 🚀 Start the API

```bash
cd rag_system
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

API should be running at: `http://localhost:8000`

---

## ✅ Option 1: Run Automated Tests

```bash
cd rag_system
python tests/test_phase2_integration.py
```

**This will:**
1. Create account for "Victoria"
2. Have 3 romantic conversation turns
3. Get personalized POI recommendations
4. Test activity filtering
5. Show complete flow working

**Expected output:** All tests pass ✅

---

## ✅ Option 2: Manual API Testing

### **Step 1: Create Account**

```bash
curl -X POST http://localhost:8000/api/ailessia/account/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "victoria@test.com",
    "name": "Victoria"
  }'
```

**Save the `account_id` and `session_id` from response!**

---

### **Step 2: Have a Romantic Conversation**

Replace `YOUR_ACCOUNT_ID` and `YOUR_SESSION_ID`:

```bash
curl -X POST http://localhost:8000/api/ailessia/converse \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "session_id": "YOUR_SESSION_ID",
    "message": "I want to plan a romantic getaway for my anniversary. Somewhere on the French Riviera with intimate dining and beautiful sunsets.",
    "conversation_history": []
  }'
```

**Watch for:**
- `emotional_reading.archetype` → "The Romantic"
- `emotional_reading.primary_state` → emotions detected
- AIlessia's personalized response

---

### **Step 3: Get Personalized POI Recommendations**

```bash
curl -X POST http://localhost:8000/api/ailessia/recommendations/pois \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "destination": "French Riviera",
    "min_luxury_score": 0.7,
    "min_fit_score": 0.75,
    "limit": 10
  }'
```

**You'll get:**
- `client_archetype_weights` → Victoria's 6D personality profile
- `pois` → Personalized recommendations with fit scores
- Each POI shows:
  - `personality_fit` (e.g., 0.92 = perfect match!)
  - `emotions_evoked` (Romance, Sophistication, etc.)
  - `personality_breakdown` (romantic: 0.95, etc.)
  - Google ratings, reviews, website

---

### **Step 4: Test Activity Filtering**

Get only romantic dining experiences:

```bash
curl -X POST http://localhost:8000/api/ailessia/recommendations/pois \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "destination": "French Riviera",
    "activity_types": ["Fine dining", "Beach time"],
    "min_luxury_score": 0.8,
    "min_fit_score": 0.80,
    "limit": 5
  }'
```

---

## ✅ Option 3: Use API Docs (Interactive)

Open your browser:
```
http://localhost:8000/docs
```

**Interactive Swagger UI** - test all endpoints visually!

---

## 📊 Verify in Neo4j

After running tests, check Neo4j:

```cypher
// Find Victoria's profile
MATCH (cp:ClientProfile {email: 'victoria@test.com'})
RETURN cp

// See her emotional resonances
MATCH (cp:ClientProfile {email: 'victoria@test.com'})-[r:RESONATES_WITH]->(e:EmotionalTag)
RETURN cp.name, e.name, r.strength

// See recommended POIs for romantics in French Riviera
MATCH (poi:poi)-[:OFFERS]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag {name: 'Romance'})
WHERE poi.destination_name = 'French Riviera'
  AND poi.luxury_score > 0.7
  AND poi.personality_romantic > 0.85
RETURN poi.name, poi.google_rating, a.name
LIMIT 10
```

---

## 🎯 Expected Results

### **Victoria's Archetype Weights:**
```json
{
  "romantic": 0.90-0.95,     // ✅ Should be HIGH
  "connoisseur": 0.70-0.80,  // ✅ Medium-high
  "hedonist": 0.75-0.85,     // ✅ Medium-high
  "contemplative": 0.60-0.70,
  "achiever": 0.50-0.60,
  "adventurer": 0.30-0.40    // ✅ Should be LOW
}
```

### **Top POI Recommendations:**
- Fine dining restaurants (4.8-5.0★)
- Romantic hotels and villas
- Beach clubs with sunset views
- Intimate wine tasting experiences
- Scenic viewpoints
- **All with fit_score >= 0.75**

---

## 🎉 Success Indicators

You'll know it's working when:
1. ✅ Account created with greeting from AIlessia
2. ✅ Conversation detects "The Romantic" archetype
3. ✅ Archetype weights calculated automatically
4. ✅ POI recommendations show high fit_score (0.80+)
5. ✅ Top POIs are romantic (dining, beaches, hotels)
6. ✅ Neo4j shows ClientProfile with emotional connections

---

## 🆘 Troubleshooting

**API not starting?**
```bash
# Check if already running
lsof -i :8000

# Restart
cd rag_system
python -m uvicorn api.main:app --reload
```

**Tests fail?**
- Make sure API is running at localhost:8000
- Check Neo4j connection (should be running)
- Check Supabase connection (keys in .env)

**No POIs returned?**
- Run `normalize_poi_scores.cypher` in Neo4j
- Run `connect_to_existing_activities.cypher` in Neo4j
- Verify French Riviera POIs exist: `MATCH (p:poi {destination_name: 'French Riviera'}) RETURN count(p)`

---

## 🎯 Quick Test Commands (Copy-Paste)

```bash
# 1. Create account
curl -X POST http://localhost:8000/api/ailessia/account/create \
  -H "Content-Type: application/json" \
  -d '{"email":"test@lexa.com","name":"Victoria"}'

# Save account_id and session_id, then:

# 2. Get recommendations (replace YOUR_ACCOUNT_ID)
curl -X POST http://localhost:8000/api/ailessia/recommendations/pois \
  -H "Content-Type: application/json" \
  -d '{"account_id":"YOUR_ACCOUNT_ID","destination":"French Riviera","limit":5}'
```

---

**Ready to test? Run the automated tests or use the API directly!** 🚀


