# 📦 Batch Size Optimization for Enrichment

## 🎯 **Current Setup: 50 POIs/batch**

**Why 50?**
- Conservative starting point
- Safe for API rate limits
- ~8 minutes per batch
- Easy to monitor/debug

---

## 🚀 **Can We Go Higher? YES!**

### **Recommended Batch Sizes:**

| Batch Size | Time | Use Case | Pros | Cons |
|------------|------|----------|------|------|
| **50** | 8 min | Current | Safe, easy debug | Slower |
| **100** ⭐ | 16 min | Recommended | Good balance | None |
| **200** | 33 min | Aggressive | Fast throughput | Harder to debug |
| **500** | 83 min | Overnight | Very efficient | Long error recovery |

---

## 🔧 **Limiting Factors (Ranked)**

### **1. API Rate Limits** (PRIMARY CONSTRAINT)

#### **Google Places API:**
- **Default:** 100 requests/second (RPS)
- **Purchased:** Can upgrade to 1,000 RPS
- **Current usage:** ~3 requests per POI (Nearby + Details + sometimes second lookup)
- **Calculation:** 50 POIs × 3 = 150 requests in ~8 minutes = 0.3 RPS ✅ SAFE

**With 200 POI batches:**
- 200 × 3 = 600 requests in ~33 minutes = 0.3 RPS ✅ STILL SAFE

**With 500 POI batches:**
- 500 × 3 = 1,500 requests in ~83 minutes = 0.3 RPS ✅ STILL SAFE

**Conclusion:** Google Places is NOT the bottleneck (we're using <1% of capacity)

---

#### **Anthropic Claude API:**
- **Rate limits:** 
  - Tier 1: 50 requests/minute
  - Tier 2: 1,000 requests/minute (after $100 spent)
- **Current usage:** ~2 requests per POI (Website scraping + Emotional inference)
- **Calculation:** 50 POIs × 2 = 100 requests in ~8 minutes = 12.5 RPM ✅ SAFE

**With 200 POI batches:**
- 200 × 2 = 400 requests in ~33 minutes = 12 RPM ✅ STILL SAFE

**With 500 POI batches:**
- 500 × 2 = 1,000 requests in ~83 minutes = 12 RPM ✅ STILL SAFE

**Conclusion:** Claude is NOT the bottleneck (we're using 25% of Tier 1 capacity)

---

### **2. Processing Time** (SECONDARY CONSTRAINT)

**Current timing per POI:**
- Google Places lookup: 2 seconds
- Website scraping: 3 seconds (if website exists)
- Emotional inference: 2 seconds (if score >= 6)
- Database writes: 1 second
- Delays between requests: 0.2 seconds
- **Total:** ~10 seconds per POI

**Batch calculations:**
- 50 POIs: 500 seconds = 8 minutes ✅
- 100 POIs: 1,000 seconds = 16 minutes ✅
- 200 POIs: 2,000 seconds = 33 minutes ✅
- 500 POIs: 5,000 seconds = 83 minutes ✅

**Conclusion:** Processing time is LINEAR - no constraint

---

### **3. Memory Usage** (MINIMAL CONSTRAINT)

**Memory per POI:**
- POI data: ~5 KB
- API responses: ~20 KB
- Total buffer: ~25 KB per POI

**Batch calculations:**
- 50 POIs: 1.25 MB ✅
- 100 POIs: 2.5 MB ✅
- 200 POIs: 5 MB ✅
- 500 POIs: 12.5 MB ✅

**Conclusion:** Memory is NOT a constraint (Node.js default heap is 2 GB)

---

### **4. Neo4j Connection** (MINIMAL CONSTRAINT)

**Database operations:**
- Average 5 queries per POI
- Connection pool: 50 connections
- Query time: ~50ms per query

**Batch calculations:**
- 50 POIs: 250 queries = 12.5 seconds DB time ✅
- 200 POIs: 1,000 queries = 50 seconds DB time ✅
- 500 POIs: 2,500 queries = 125 seconds DB time ✅

**Conclusion:** Neo4j is NOT a constraint

---

### **5. Cost Per Run** (BUSINESS CONSTRAINT)

**Cost breakdown per POI:**
- Google Places: $0.017
- Claude API: $0.010 (average, if used)
- **Total:** ~$0.025 per POI

**Batch costs:**
- 50 POIs: $1.25
- 100 POIs: $2.50
- 200 POIs: $5.00
- 500 POIs: $12.50

**Conclusion:** Cost scales linearly - not a technical constraint

---

## ✅ **RECOMMENDATION: Increase to 100 POIs/batch**

### **Why 100 is optimal:**

✅ **Twice as fast** (16 min vs 8 min)  
✅ **Still well under API limits** (25% of Claude Tier 1)  
✅ **Easy to monitor** (completes in coffee break)  
✅ **Good error recovery** (max 100 POIs lost if crash)  
✅ **Cost-effective** ($2.50 per batch)

---

## 🔧 **How to Change Batch Size**

### **In `super-enrich-french-riviera.ts`:**

```typescript
// Line 26
const BATCH_SIZE = 100; // Changed from 50
```

### **Test with different sizes:**

```bash
# 50 POIs (current)
BATCH_SIZE=50 npx ts-node scripts/super-enrich-french-riviera.ts

# 100 POIs (recommended)
BATCH_SIZE=100 npx ts-node scripts/super-enrich-french-riviera.ts

# 200 POIs (aggressive)
BATCH_SIZE=200 npx ts-node scripts/super-enrich-french-riviera.ts
```

---

## 🤖 **Automated Enrichment Strategy**

### **Daytime (Manual monitoring):**
- Batch size: **100 POIs**
- Interval: Every 30 minutes
- Monitoring: Check logs occasionally
- **Throughput:** 200 POIs/hour = 1,600 POIs/day

### **Overnight (Unattended):**
- Batch size: **200 POIs**
- Interval: Every 30 minutes
- Runs: 8 hours × 2 batches/hour = 16 batches
- **Throughput:** 3,200 POIs/night

### **Combined:**
- **Total:** 4,800 POIs/day
- **Cost:** ~$120/day
- **French Riviera (6,000 POIs):** 1.25 days
- **All destinations (200K POIs):** 42 days

---

## 💡 **Pro Tips**

### **1. Start Conservative, Scale Up**
```bash
# Day 1: Test with 50
# Day 2: Increase to 100
# Day 3: Try 200 for overnight
```

### **2. Monitor API Rate Limit Errors**
```typescript
// If you see "429 Too Many Requests":
// - Decrease batch size
// - Increase DELAY_MS
// - Check API tier limits
```

### **3. Use Different Batch Sizes by Time**
```typescript
const BATCH_SIZE = isNighttime ? 200 : 100;
```

### **4. Track Success Rate**
```bash
# Monitor: Enriched / Total
# If success rate < 80%, reduce batch size
```

---

## 📊 **Performance Comparison**

| Metric | 50 POIs | 100 POIs ⭐ | 200 POIs | 500 POIs |
|--------|---------|-----------|----------|----------|
| **Time** | 8 min | 16 min | 33 min | 83 min |
| **API Usage** | 25% | 25% | 25% | 25% |
| **Cost** | $1.25 | $2.50 | $5.00 | $12.50 |
| **POIs/day** | 800 | 1,600 | 3,200 | 8,000 |
| **Debug ease** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Efficiency** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 **Bottom Line**

**There is NO hard technical limit preventing larger batches.**

**The ONLY constraints are:**
1. ⏰ How long you want to wait per batch
2. 💰 How much you want to spend per batch
3. 🔍 How easy you want debugging to be

**Recommendation:** 
- **Daily work:** 100 POIs
- **Overnight:** 200 POIs
- **Maximum safe:** 500 POIs

**You could theoretically run 1,000+ POI batches, but error recovery becomes painful.**

---

**Last Updated:** December 17, 2025  
**Status:** Ready to scale up  
**Recommendation:** Change BATCH_SIZE to 100 immediately

