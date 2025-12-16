# Bulk Enrichment & Automation Guide

## **Overview**

Automate the data quality and enrichment process to handle large datasets without manual intervention.

---

## **🚀 Quick Start**

### **Small Test (10 runs)**
```bash
npm run bulk-enrich-10
```
- Processes: ~1,000 POIs
- Duration: ~5 minutes
- Good for: Testing

### **Medium Batch (50 runs)**
```bash
npm run bulk-enrich-50
```
- Processes: ~5,000 POIs
- Duration: ~25 minutes
- Good for: Daily maintenance

### **Large Batch (100 runs)**
```bash
npm run bulk-enrich-100
```
- Processes: ~10,000 POIs
- Duration: ~50 minutes
- Good for: Initial cleanup

### **Auto Mode (until done)**
```bash
npm run bulk-enrich-auto
```
- Runs up to 1000 times
- Stops when no more progress
- Duration: Until complete
- Good for: Complete processing

---

## **📊 What It Does Per Run**

Each run processes:
- **100 unnamed POIs** → Try to enrich with real names
- **1000 POIs** → Add luxury scores
- **1000 relationships** → Add confidence scores
- **50 duplicates** → Merge
- **All POIs** → Create missing LOCATED_IN relationships

**Total time per run:** ~3-5 minutes

---

## **🎯 Your Situation**

### **Current State:**
- **Nodes:** 203,000 POIs
- **Unnamed POIs:** ~several thousand (TBD - run test query)
- **Unscored POIs:** 201,461
- **Relationships:** 1.6M (low density)

### **Estimated Processing Time:**

**For Unnamed POIs (if 10,000 exist):**
- 10,000 ÷ 100 per run = 100 runs
- 100 runs × 4 minutes = ~7 hours

**For Luxury Scoring:**
- 201,461 ÷ 1000 per run = 202 runs
- 202 runs × 3 minutes = ~10 hours

**Total:** ~17 hours to process everything

---

## **💡 Recommended Strategy**

### **Day 1: Test & Setup**
```bash
# 1. Count unnamed POIs
# Run in Neo4j Browser:
MATCH (p:poi)
WHERE p.name =~ 'Unnamed POI \\(osm:.*\\)'
RETURN count(*) as unnamed_count;

# 2. Test enrichment (10 runs)
npm run bulk-enrich-10

# 3. Check results
# Run in Neo4j Browser:
MATCH (p:poi)
WHERE p.enriched_at IS NOT NULL
RETURN count(*) as enriched_so_far;
```

### **Day 1-2: Bulk Processing**
```bash
# Option A: Run in batches (recommended)
npm run bulk-enrich-50
# Wait for completion, then run again
npm run bulk-enrich-50
# Repeat 4-5 times

# Option B: Auto mode (overnight)
npm run bulk-enrich-auto
```

### **Day 3+: Maintenance**
- Daily automated job at midnight handles new data
- Manual runs only when importing new datasets

---

## **📈 Progress Tracking**

### **Check Status in Neo4j:**

```cypher
// Overall Progress
MATCH (p:poi)
WITH count(p) as total
MATCH (p:poi) WHERE p.luxury_score IS NOT NULL
WITH total, count(p) as scored
MATCH (p:poi) WHERE p.enriched_at IS NOT NULL
WITH total, scored, count(p) as enriched
MATCH (p:poi) WHERE p.name =~ 'Unnamed POI \\(osm:.*\\)'
WITH total, scored, enriched, count(p) as still_unnamed
RETURN 
  total as total_pois,
  scored as pois_scored,
  round(100.0 * scored / total, 1) as percent_scored,
  enriched as pois_enriched,
  still_unnamed as still_unnamed;
```

### **Live Progress (During Run):**

Watch the terminal output:
```
═══════════════════════════════════════════════
RUN 1/50
═══════════════════════════════════════════════

[Enrichment] Found 100 unnamed POIs with coordinates
[Enrichment] Processing: Unnamed POI (osm:osm_node_2465442159)
  [OSM] Querying node 2465442159...
  [OSM] ✓ Found: "Marina Split"
  ✓ Enriched POI 12345: "Marina Split"

📊 Run Summary:
  Enriched: 78
  Failed: 22
  Scored: 1000 POIs
  Duplicates merged: 1
  Relations created: 234

⏳ Waiting 5000ms before next run...
```

---

## **🔧 Custom Parameters**

### **Manual Control:**
```bash
# Format: npm run bulk-enrich <runs> <delay_ms>
npm run bulk-enrich 25 3000  # 25 runs, 3 second delay
```

### **Parameters:**
- **runs:** Number of quality checks to run (1-1000)
- **delay_ms:** Milliseconds between runs (1000-60000)
  - Minimum: 1000ms (respect API rate limits)
  - Recommended: 5000ms (5 seconds)
- **stop-when-done:** Optional flag to stop when no progress

---

## **🐛 Troubleshooting**

### **Error: OSM API Rate Limit**
```
Error: 429 Too Many Requests
```
**Solution:** Increase delay between runs
```bash
npm run bulk-enrich 50 10000  # 10 second delay
```

### **Error: Neo4j Memory**
```
Neo.TransientError.General.MemoryPoolOutOfMemoryError
```
**Solution:** Agent already has limits, but you can:
1. Reduce batch sizes in `scoring-engine.ts` (1000 → 500)
2. Run fewer concurrent processes

### **Progress Seems Stuck**
```cypher
// Check if there's actually data to process
MATCH (p:poi)
WHERE p.luxury_score IS NULL
RETURN count(p) as remaining;
```

---

## **🎓 Understanding the Output**

### **Per-Run Stats:**
```
Enriched: 78        ← POIs that got real names from OSM
Failed: 22          ← POIs where OSM had no name
Scored: 1000        ← POIs that got luxury scores
Duplicates: 1       ← POIs merged
Relations: 234      ← LOCATED_IN relationships created
```

### **Final Summary:**
```
⏱️  Time:
  Duration: 45 minutes

🔢 Totals:
  Total runs: 50
  POIs enriched: 3,890
  POIs scored: 50,000
  Relations created: 11,700

📈 Success Rate:
  Enrichment: 78.0% (3,890/5,000)
```

---

## **❓ FAQ**

### **Q: Can I stop and resume?**
**A:** Yes! The agent tracks progress in Neo4j. Just run again and it will continue where it left off.

### **Q: Can I run multiple instances?**
**A:** No - the agent uses a lock to prevent concurrent runs. You'll see:
```
Error: Data quality check is already running
```

### **Q: What if my computer sleeps?**
**A:** The script will stop. Just run it again when you're back.

### **Q: How much does this cost?**
**A:** $0 - we use free APIs (OSM Overpass, Nominatim). Google Places is disabled.

### **Q: What about the daily scheduled job?**
**A:** It runs at midnight UTC, processing 100 POIs per night. Use bulk scripts for faster processing.

---

## **📊 Expected Results**

### **After 10 Runs:**
- Enriched: ~800 POIs
- Scored: ~10,000 POIs
- Progress: ~5%

### **After 50 Runs:**
- Enriched: ~4,000 POIs
- Scored: ~50,000 POIs
- Progress: ~25%

### **After 200 Runs:**
- Enriched: All unnamed POIs (if <20K)
- Scored: All POIs
- Progress: 100%

---

## **🎯 Success Metrics**

### **Good:**
- Enrichment success rate: >70%
- Scoring completion: >95%
- Relations created: >100 per run

### **Needs Investigation:**
- Enrichment success rate: <50%
- Many "Failed" enrichments
- No relations being created

---

## **Next Steps**

1. **Run test query** to count unnamed POIs
2. **Run bulk-enrich-10** as a test
3. **Check results** after 10 runs
4. **Run bulk-enrich-auto** overnight
5. **Monitor progress** next day

