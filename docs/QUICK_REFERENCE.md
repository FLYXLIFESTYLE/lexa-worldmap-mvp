# 🚀 LEXA Quick Reference Guide

**Your go-to cheat sheet for common commands, queries, and operations**

---

## 📋 Table of Contents

1. [NPX/TypeScript Commands](#npx-commands)
2. [Common Cypher Queries](#cypher-queries)
3. [PowerShell Commands](#powershell-commands)
4. [Data Quality Checks](#data-quality)
5. [Enrichment Operations](#enrichment)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 NPX Commands {#npx-commands}

### **Data Quality & Verification**

```bash
# Verify overall data quality
npx ts-node scripts/verify-data-quality.ts

# Check activity-emotion relationships
npx ts-node scripts/check-activity-relationships.ts

# Fix missing LOCATED_IN relationships
npx ts-node scripts/fix-missing-located-in.ts

# Standardize relationship names (lowercase → UPPERCASE)
npx ts-node scripts/standardize-relationship-names.ts
```

### **Enrichment Scripts**

```bash
# Super enrichment (Google + Website + Emotions) - French Riviera
npx ts-node scripts/super-enrich-french-riviera.ts

# Basic enrichment - French Riviera only
npx ts-node scripts/enrich-french-riviera.ts

# Worldwide enrichment - 100 POIs per batch
npx ts-node scripts/enrich-all-pois.ts

# Discover NEW luxury POIs from Google Places
npx ts-node scripts/discover-luxury-pois.ts

# Propagate emotions from activities to POIs
npx ts-node scripts/propagate-emotions-from-activities.ts
```

### **Manual Data Quality Check**

```bash
# Run the data quality agent manually
npx ts-node scripts/run-quality-check.ts
```

### **Test Environment**

```bash
# Test if environment variables are loaded
npx ts-node scripts/test-env.ts
```

---

## 🔍 Common Cypher Queries {#cypher-queries}

### **1. Database Statistics**

#### Total Counts

```cypher
// Count all POIs
MATCH (p:poi) 
RETURN count(p) as total_pois

// Count all destinations
MATCH (d:destination) 
RETURN count(d) as total_destinations

// Count all activities
MATCH (a:activity_type) 
RETURN count(a) as total_activities

// Count all emotions
MATCH (e:Emotion) 
RETURN count(e) as total_emotions
```

#### Relationship Counts

```cypher
// Count all relationships by type
CALL db.relationshipTypes() YIELD relationshipType
MATCH ()-[r]->()
WHERE type(r) = relationshipType
RETURN relationshipType, count(r) as count
ORDER BY count DESC

// POIs with LOCATED_IN relationships
MATCH (p:poi)-[:LOCATED_IN]->()
RETURN count(DISTINCT p) as pois_with_location

// POIs with emotional relationships
MATCH (p:poi)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
RETURN count(DISTINCT p) as pois_with_emotions
```

---

### **2. Data Quality Checks**

```cypher
// POIs WITHOUT LOCATED_IN relationship
MATCH (p:poi)
WHERE NOT (p)-[:LOCATED_IN]->()
RETURN count(p) as unconnected_pois

// Unnamed POIs
MATCH (p:poi)
WHERE p.name CONTAINS 'Unnamed' OR p.name CONTAINS 'unnamed' 
   OR p.name IS NULL OR p.name = ''
RETURN count(p) as unnamed_pois

// POIs missing luxury scores
MATCH (p:poi)
WHERE p.luxury_score IS NULL OR p.luxury_score = 0
RETURN count(p) as unscored_pois

// Orphaned nodes (no relationships)
MATCH (n)
WHERE NOT (n)--()
RETURN labels(n) as node_type, count(n) as count

// POIs with low confidence scores
MATCH (p:poi)
WHERE p.luxury_confidence < 0.5
RETURN p.name, p.luxury_score, p.luxury_confidence, p.destination_name
LIMIT 50
```

---

### **3. Enrichment Progress Tracking**

```cypher
// French Riviera enrichment progress
MATCH (p:poi)
WHERE toLower(p.destination_name) CONTAINS 'riviera' 
   OR toLower(p.destination_name) CONTAINS 'tropez'
   OR toLower(p.destination_name) CONTAINS 'monaco'
   OR toLower(p.destination_name) CONTAINS 'cannes'
   OR toLower(p.destination_name) CONTAINS 'nice'
WITH count(p) as total
MATCH (p:poi)
WHERE (toLower(p.destination_name) CONTAINS 'riviera' 
    OR toLower(p.destination_name) CONTAINS 'tropez'
    OR toLower(p.destination_name) CONTAINS 'monaco'
    OR toLower(p.destination_name) CONTAINS 'cannes'
    OR toLower(p.destination_name) CONTAINS 'nice')
  AND p.luxury_score IS NOT NULL
RETURN total, count(p) as enriched, 
       round(100.0 * count(p) / total, 2) as percent_complete

// Top 10 destinations by POI count
MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
RETURN d.name as destination, count(p) as poi_count
ORDER BY poi_count DESC
LIMIT 10

// POIs enriched today
MATCH (p:poi)
WHERE p.enriched_at >= datetime() - duration({hours: 24})
RETURN count(p) as enriched_today

// Enrichment by source
MATCH (p:poi)
WHERE p.enriched_source IS NOT NULL
RETURN p.enriched_source as source, count(p) as count
ORDER BY count DESC
```

---

### **4. POI Discovery & Search**

```cypher
// Find POIs in a specific destination
MATCH (p:poi)
WHERE toLower(p.destination_name) CONTAINS toLower('St. Tropez')
RETURN p.name, p.type, p.luxury_score, p.lat, p.lon
ORDER BY p.luxury_score DESC
LIMIT 50

// Find POIs by type
MATCH (p:poi)
WHERE toLower(p.type) CONTAINS 'beach club'
RETURN p.name, p.destination_name, p.luxury_score
ORDER BY p.luxury_score DESC
LIMIT 50

// Find luxury POIs (score > 8)
MATCH (p:poi)
WHERE p.luxury_score > 8
RETURN p.name, p.type, p.destination_name, p.luxury_score
ORDER BY p.luxury_score DESC
LIMIT 100

// Find POIs with Captain comments
MATCH (p:poi)
WHERE p.captain_comments IS NOT NULL
RETURN p.name, p.destination_name, p.captain_comments
LIMIT 50

// Search POIs by name
MATCH (p:poi)
WHERE toLower(p.name) CONTAINS toLower('Club 55')
RETURN p.name, p.destination_name, p.luxury_score, p.type
LIMIT 20
```

---

### **5. Emotional Intelligence Queries**

```cypher
// POIs that evoke a specific emotion
MATCH (p:poi)-[:EVOKES]->(e:Emotion)
WHERE toLower(e.name) CONTAINS 'joy'
RETURN p.name, p.destination_name, p.luxury_score, e.name
ORDER BY p.luxury_score DESC
LIMIT 50

// POIs that amplify a specific desire
MATCH (p:poi)-[:AMPLIFIES_DESIRE]->(d:Desire)
WHERE toLower(d.name) CONTAINS 'luxury'
RETURN p.name, p.destination_name, p.luxury_score, d.name
ORDER BY p.luxury_score DESC
LIMIT 50

// POIs that mitigate a specific fear
MATCH (p:poi)-[:MITIGATES_FEAR]->(f:Fear)
WHERE toLower(f.name) CONTAINS 'mediocrity'
RETURN p.name, p.destination_name, p.luxury_score, f.name
ORDER BY p.luxury_score DESC
LIMIT 50

// All emotions a POI evokes
MATCH (p:poi {name: 'Club 55'})-[:EVOKES]->(e:Emotion)
RETURN e.name as emotion

// Emotional profile of a destination
MATCH (p:poi)-[:LOCATED_IN]->(d:destination {name: 'St. Tropez'})
MATCH (p)-[:EVOKES]->(e:Emotion)
RETURN e.name, count(p) as poi_count
ORDER BY poi_count DESC

// Top emotions across all POIs
MATCH (p:poi)-[:EVOKES]->(e:Emotion)
RETURN e.name, count(p) as poi_count
ORDER BY poi_count DESC
LIMIT 20
```

---

### **6. Activity Queries**

```cypher
// POIs that support a specific activity
MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)
WHERE toLower(a.name) CONTAINS 'snorkel'
RETURN p.name, p.destination_name, p.luxury_score
ORDER BY p.luxury_score DESC
LIMIT 50

// Activities available in a destination
MATCH (p:poi)-[:LOCATED_IN]->(d:destination {name: 'St. Tropez'})
MATCH (p)-[:SUPPORTS_ACTIVITY]->(a:activity_type)
RETURN DISTINCT a.name, count(p) as poi_count
ORDER BY poi_count DESC

// POIs with inherited emotions from activities
MATCH (p:poi)-[r:EVOKES]->(e:Emotion)
WHERE r.source = 'activity_inheritance'
RETURN p.name, p.destination_name, e.name, r.inherited_from
LIMIT 50
```

---

### **7. Luxury Score Analysis**

```cypher
// Average luxury score by destination
MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
WHERE p.luxury_score IS NOT NULL
RETURN d.name, 
       count(p) as poi_count,
       round(avg(p.luxury_score), 2) as avg_luxury_score,
       max(p.luxury_score) as max_score
ORDER BY avg_luxury_score DESC
LIMIT 20

// Distribution of luxury scores
MATCH (p:poi)
WHERE p.luxury_score IS NOT NULL
WITH p.luxury_score as score
WITH floor(score) as score_bucket, count(*) as count
RETURN score_bucket, count
ORDER BY score_bucket

// POIs with perfect 10 score
MATCH (p:poi)
WHERE p.luxury_score = 10
RETURN p.name, p.destination_name, p.type, p.luxury_evidence
LIMIT 50
```

---

### **8. Data Cleanup & Maintenance**

```cypher
// Find duplicate POIs (same name, same destination)
MATCH (p1:poi), (p2:poi)
WHERE p1.name = p2.name 
  AND p1.destination_name = p2.destination_name
  AND id(p1) < id(p2)
RETURN p1.name, p1.destination_name, count(*) as duplicates
ORDER BY duplicates DESC
LIMIT 50

// Find POIs with missing critical properties
MATCH (p:poi)
WHERE p.name IS NULL OR p.lat IS NULL OR p.lon IS NULL
RETURN count(p) as pois_missing_critical_data

// Find relationships with missing confidence scores
MATCH ()-[r:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
WHERE r.confidence IS NULL
RETURN type(r) as relationship_type, count(r) as missing_confidence

// Check for mixed-case relationship types
CALL db.relationshipTypes() YIELD relationshipType
WHERE relationshipType <> toUpper(relationshipType)
RETURN relationshipType, 'needs standardization' as status
```

---

## 💻 PowerShell Commands {#powershell-commands}

### **Automated Enrichment**

```powershell
# Run continuous enrichment loop (120 batches)
.\scripts\auto-french-riviera-loop.ps1 -MaxBatches 120 -DelayMinutes 30

# Run 10 batches quickly
.\scripts\auto-french-riviera-loop.ps1 -MaxBatches 10 -DelayMinutes 5

# Set up overnight automation (Run as Administrator!)
.\scripts\setup-overnight-enrichment.ps1
```

### **Task Scheduler Management**

```powershell
# List all LEXA scheduled tasks
Get-ScheduledTask | Where-Object {$_.TaskName -like "LEXA_*"}

# Disable a scheduled task
Disable-ScheduledTask -TaskName "LEXA_Enrich_2300"

# Enable a scheduled task
Enable-ScheduledTask -TaskName "LEXA_Enrich_2300"

# Run a scheduled task immediately
Start-ScheduledTask -TaskName "LEXA_Enrich_2300"

# Remove all LEXA scheduled tasks
Get-ScheduledTask | Where-Object {$_.TaskName -like "LEXA_*"} | Unregister-ScheduledTask -Confirm:$false
```

### **Process Management**

```powershell
# Kill all Node processes (if port 3000 is stuck)
Get-Process node* | Stop-Process -Force

# Check what's running on port 3000
netstat -ano | findstr :3000
```

---

## 📊 Data Quality Monitoring {#data-quality}

### **Quick Health Check**

```bash
# Run comprehensive data quality report
npx ts-node scripts/verify-data-quality.ts
```

**Expected Output:**
- Total POIs: ~203,000
- POIs with LOCATED_IN: 100%
- POIs with emotions: ~90%
- Unnamed POIs: ~18%
- POIs with luxury scores: ~7%

### **Critical Thresholds**

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **LOCATED_IN coverage** | 100% | <95% | <90% |
| **Emotional coverage** | 90%+ | <80% | <70% |
| **Unnamed POIs** | <5% | >10% | >20% |
| **Luxury scores** | 80%+ | <50% | <30% |
| **Orphaned nodes** | <100 | <1000 | >5000 |

---

## 🚀 Enrichment Operations {#enrichment}

### **Daily Enrichment Routine**

```bash
# Morning: Check progress
npx ts-node scripts/verify-data-quality.ts

# Throughout the day: Run enrichment (every 30 mins)
npx ts-node scripts/super-enrich-french-riviera.ts

# Evening: Check today's progress
# Use ChatNeo4j: "Show me POIs enriched in the last 24 hours"
```

### **Weekly Enrichment Routine**

```bash
# Monday: Set up automated enrichment
.\scripts\setup-overnight-enrichment.ps1

# Wednesday: Check progress, adjust targets

# Friday: Verify emotional relationships
npx ts-node scripts/check-activity-relationships.ts

# Sunday: Run discovery for new POIs
npx ts-node scripts/discover-luxury-pois.ts
```

### **Cost Tracking**

| Operation | Cost | Frequency |
|-----------|------|-----------|
| **Super enrichment (50 POIs)** | ~$1.20 | Every 30 mins |
| **Basic enrichment (50 POIs)** | ~$0.85 | Every 30 mins |
| **Discovery (150 POIs)** | ~$6 | Weekly |
| **Emotion propagation** | $0 | Once (done!) |
| **Daily total** | ~$17-20 | 20 batches |

---

## 🔧 Troubleshooting {#troubleshooting}

### **Database Connection Issues**

```bash
# Problem: Neo4j connection failed
# Solution: Check if database is processing (wait 10-30 mins)

# Problem: Session expired
# Solution: Database is busy, retry in a few minutes

# Problem: Rate limit exceeded
# Solution: Increase delay in scripts (DELAY_MS = 500)
```

### **Enrichment Issues**

```bash
# Problem: "Missing API keys"
# Solution: Check .env file, restart npm run dev

# Problem: "POI not found in Google Places"
# Solution: Normal for unnamed POIs, script will skip

# Problem: "Emotional inference failed"
# Solution: Check ANTHROPIC_API_KEY, check API rate limits
```

### **Common Errors & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| `NULLS LAST` syntax error | ChatNeo4j using invalid Cypher | Fixed in latest version |
| `evokes` not found | Using lowercase relationships | Run `standardize-relationship-names.ts` |
| `Port 3000 in use` | Node process stuck | Kill all node processes |
| `MODULE_TYPELESS_PACKAGE_JSON` | Missing `"type": "module"` | Safe to ignore (works anyway) |

---

## 📚 Documentation Links

- **Full Architecture:** `docs/LEXA_ARCHITECTURE.md`
- **Enrichment Guide:** `docs/SUPER_ENRICHMENT_GUIDE.md`
- **Relationship Guide:** `docs/NEO4J_RELATIONSHIPS_GUIDE.md`
- **Today's Achievements:** `docs/TODAY_ACHIEVEMENTS.md`
- **Backlog:** `BACKLOG.md`

---

## 🎯 Quick Wins

### **Get Immediate Results**

```bash
# 1. Enrich 50 POIs in 5 minutes
npx ts-node scripts/super-enrich-french-riviera.ts

# 2. Check database health
npx ts-node scripts/verify-data-quality.ts

# 3. Find Club 55 data
# ChatNeo4j: "Show me Club 55 in St. Tropez"

# 4. Test emotional queries
# ChatNeo4j: "Show me POIs that evoke joy"
```

---

## 💡 Pro Tips

1. **Run enrichment during off-hours** (overnight automation)
2. **Check progress daily** in ChatNeo4j
3. **Keep laptop plugged in** for overnight tasks
4. **Monitor costs** in Google Cloud Console
5. **Backup .env file** before making changes
6. **Use ChatNeo4j** for quick data exploration
7. **Run verify-data-quality.ts** weekly

---

## 🆘 Need Help?

**For common issues:**
1. Check this document first
2. Check `docs/TROUBLESHOOTING.md` (if created)
3. Review `docs/SUPER_ENRICHMENT_GUIDE.md`

**For Neo4j queries:**
1. Check examples in this document
2. Use ChatNeo4j to generate queries
3. Check `docs/NEO4J_RELATIONSHIPS_GUIDE.md`

---

**Last Updated:** December 17, 2025  
**LEXA Version:** MVP v1.0  
**Database:** Neo4j with ~1.25M relationships

