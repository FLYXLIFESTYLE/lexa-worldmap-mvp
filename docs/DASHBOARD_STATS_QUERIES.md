# 📊 Dashboard Statistics - Cypher Queries

**Purpose:** Real-time KPIs displayed on the Admin Dashboard

---

## 🎯 Current KPIs (4 Metrics)

### **1. Total POIs**
Count all Points of Interest in the database.

```cypher
MATCH (p:poi)
RETURN count(p) as totalPOIs
```

**What it shows:** Total number of locations, hotels, restaurants, attractions, etc. in the system.

---

### **2. Luxury POIs**
Count POIs with a luxury score of 6 or higher (on a 0-10 scale).

```cypher
MATCH (p:poi)
WHERE p.luxury_score >= 6
RETURN count(p) as luxuryPOIs
```

**What it shows:** Number of high-end, luxury venues that meet LEXA's quality standards.

**Additional calculation:**
```cypher
// Get luxury percentage
MATCH (p:poi)
WITH count(p) as total
MATCH (lux:poi)
WHERE lux.luxury_score >= 6
WITH total, count(lux) as luxury
RETURN luxury, total, round(luxury * 100.0 / total) as percentage
```

---

### **3. Total Relations**
Count all relationships in the graph database.

```cypher
MATCH ()-[r]->()
RETURN count(r) as totalRelations
```

**What it shows:** Total number of connections between entities (POI→Activity, POI→Emotion, POI→Location, etc.)

**Breakdown by type:**
```cypher
MATCH ()-[r]->()
RETURN type(r) as relationshipType, count(r) as count
ORDER BY count DESC
```

Common relationship types:
- `SUPPORTS_ACTIVITY` - POI supports an activity
- `EVOKES` - POI evokes an emotion
- `LOCATED_IN` - POI is in a city/region
- `HAS_THEME` - POI has a theme
- `IN_COUNTRY` / `IN_REGION` / `IN_CONTINENT` - Geographic hierarchy

---

### **4. Total Clients**
Count all client/user nodes in the database.

```cypher
MATCH (c:client)
RETURN count(c) as totalClients
```

**What it shows:** Number of users/clients tracked in the system.

**Note:** This may return 0 if clients are only in Supabase and not synced to Neo4j yet.

**Alternative (from Supabase via API):**
```sql
SELECT COUNT(*) FROM captain_profiles WHERE role = 'user';
```

---

## 📈 Future Enhancement: Day-Over-Day Comparison

### **Concept:**
Store daily snapshots to compare today's stats with yesterday's.

### **Implementation Options:**

#### **Option A: Stats History Table (Supabase)**

Create a daily snapshot table:

```sql
CREATE TABLE stats_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_pois INTEGER,
  luxury_pois INTEGER,
  total_relations INTEGER,
  total_clients INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Query for comparison:
```sql
WITH today AS (
  SELECT * FROM stats_history WHERE date = CURRENT_DATE
),
yesterday AS (
  SELECT * FROM stats_history WHERE date = CURRENT_DATE - INTERVAL '1 day'
)
SELECT 
  today.total_pois,
  today.total_pois - yesterday.total_pois as pois_change,
  ROUND((today.total_pois - yesterday.total_pois) * 100.0 / yesterday.total_pois, 1) as pois_change_pct
FROM today, yesterday;
```

#### **Option B: Neo4j Temporal Properties**

Add timestamps to nodes:
```cypher
// Track when POIs were created
MATCH (p:poi)
WHERE NOT EXISTS(p.created_at)
SET p.created_at = datetime()
```

Query for today's additions:
```cypher
MATCH (p:poi)
WHERE p.created_at >= datetime() - duration('P1D')
RETURN count(p) as newPOIsToday
```

---

## 🔄 Scheduled Stats Collection

### **Daily Snapshot Script**

Run this daily at midnight to store historical stats:

```typescript
// scripts/collect-daily-stats.ts
async function collectDailyStats() {
  // 1. Query Neo4j for current counts
  const stats = await fetch('/api/admin/stats').then(r => r.json());
  
  // 2. Store in Supabase
  await supabase.from('stats_history').insert({
    date: new Date().toISOString().split('T')[0],
    total_pois: stats.totalPOIs.value,
    luxury_pois: stats.luxuryPOIs.value,
    total_relations: stats.totalRelations.value,
    total_clients: stats.totalClients.value
  });
}
```

**Schedule with Windows Task Scheduler:**
```powershell
# Run daily at midnight
npx ts-node scripts/collect-daily-stats.ts
```

---

## 📊 Additional Useful Queries

### **POI Distribution by Destination**
```cypher
MATCH (p:poi)-[:LOCATED_IN]->(c:city)
RETURN c.name as city, count(p) as poi_count
ORDER BY poi_count DESC
LIMIT 10
```

### **Luxury Score Distribution**
```cypher
MATCH (p:poi)
WHERE p.luxury_score IS NOT NULL
WITH p.luxury_score as score, count(*) as count
ORDER BY score
RETURN score, count
```

### **Most Connected POIs**
```cypher
MATCH (p:poi)-[r]->()
WITH p, count(r) as connections
ORDER BY connections DESC
LIMIT 10
RETURN p.name, p.destination_name, connections
```

### **Relationship Growth**
```cypher
MATCH ()-[r]->()
WHERE r.created_at IS NOT NULL
AND r.created_at >= datetime() - duration('P7D')
RETURN date(r.created_at) as day, count(r) as new_relationships
ORDER BY day
```

---

## 🎨 Display Format

### **Number Formatting:**
- **< 1,000:** Show exact number (e.g., "256")
- **1,000 - 999,999:** Show in thousands (e.g., "50K")
- **1,000,000+:** Show in millions (e.g., "1.2M")

### **Percentage Display:**
```typescript
const luxuryPercentage = (luxuryPOIs / totalPOIs) * 100;
// Display: "24.6% of total"
```

### **Day-Over-Day Change:**
```typescript
const change = todayValue - yesterdayValue;
const changePercent = (change / yesterdayValue) * 100;

// Display examples:
// ↑ +5.2% from yesterday (green)
// ↓ -1.3% from yesterday (red)
// → 0.0% from yesterday (gray)
```

---

## 🔧 API Endpoint

**GET `/api/admin/stats`**

Returns:
```json
{
  "success": true,
  "stats": {
    "totalPOIs": {
      "value": 203000,
      "formatted": "203K",
      "label": "Total POIs"
    },
    "luxuryPOIs": {
      "value": 50000,
      "formatted": "50K",
      "label": "Luxury POIs",
      "percentage": 25
    },
    "totalRelations": {
      "value": 1200000,
      "formatted": "1.2M",
      "label": "Total Relations"
    },
    "totalClients": {
      "value": 0,
      "formatted": "0",
      "label": "Total Clients"
    }
  },
  "timestamp": "2025-12-20T10:30:00.000Z"
}
```

---

## 📝 Notes

1. **Performance:** All queries run in parallel for faster response times
2. **Caching:** Consider caching results for 5-10 minutes to reduce database load
3. **Error Handling:** API gracefully handles database connection failures
4. **Real-time Updates:** Dashboard can be refreshed manually or auto-refresh every 60 seconds

---

**Last Updated:** December 20, 2025  
**Location:** `/app/api/admin/stats/route.ts`

