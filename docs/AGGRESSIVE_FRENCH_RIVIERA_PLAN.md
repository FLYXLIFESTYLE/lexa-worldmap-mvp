# 🇫🇷 Aggressive French Riviera Enrichment Plan

## 🎯 Goal: Complete French Riviera Coverage in 24-48 Hours

---

## 📊 Current Status

| Metric | Count | Status |
|--------|-------|--------|
| Total French Riviera POIs | ~6,000 | Need to verify |
| Already enriched | 163 | From today's runs |
| Still need enrichment | ~5,837 | Target |
| Estimated cost | ~$99 | $0.017 per POI |
| Estimated time | 24-48 hours | Depends on batch frequency |

---

## 🚀 Execution Strategy

### **Phase 1: Rapid Batch Processing (Today)**

Run enrichment every 30 minutes throughout the day:

```bash
# Run this command 20 times today (every 30 mins from 9 AM - 7 PM)
npx ts-node scripts/enrich-french-riviera.ts
```

**Result:**
- 20 batches × 50 POIs = 1,000 POIs
- Cost: 20 × $0.85 = $17
- Coverage: ~17% of French Riviera

### **Phase 2: Overnight Automation (Tonight)**

Set up Windows Task Scheduler to run every 2 hours overnight:

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction `
  -Execute "npx" `
  -Argument "ts-node scripts/enrich-french-riviera.ts" `
  -WorkingDirectory "C:\Users\chris\OneDrive\Cursor_LEXA_MVP\lexa-worldmap-mvp"

# Every 2 hours from 11 PM to 7 AM (4 runs)
$triggers = @(
  (New-ScheduledTaskTrigger -Daily -At 11:00PM),
  (New-ScheduledTaskTrigger -Daily -At 1:00AM),
  (New-ScheduledTaskTrigger -Daily -At 3:00AM),
  (New-ScheduledTaskTrigger -Daily -At 5:00AM)
)

Register-ScheduledTask `
  -Action $action `
  -Trigger $triggers `
  -TaskName "LEXA_FrenchRiviera_Enrichment" `
  -Description "Overnight French Riviera POI enrichment"
```

**Result:**
- 4 batches × 50 POIs = 200 POIs
- Cost: 4 × $0.85 = $3.40
- Total after Day 1: 1,200 POIs enriched

### **Phase 3: Continue Tomorrow (Day 2)**

Repeat Phase 1 + Phase 2:

**Day 2 Result:**
- Another 1,200 POIs
- Total: 2,400 POIs enriched
- Cost so far: ~$41

### **Phase 4: Weekend Blitz (If Needed)**

If not complete after 2 days, run aggressive batches:

```bash
# Saturday & Sunday: Every hour for 12 hours
# 24 batches × 50 POIs = 1,200 POIs
```

**Total Timeline:**
- Day 1-2: 2,400 POIs
- Weekend: 1,200 POIs
- Remaining: 2,237 POIs (5 more days at 450 POIs/day)

---

## 📅 Detailed Schedule

### **Today (Wednesday):**

| Time | Action | POIs | Cost | Cumulative |
|------|--------|------|------|------------|
| 9:00 AM | ✅ Run enrichment | 50 | $0.85 | 50 |
| 9:30 AM | Run enrichment | 50 | $0.85 | 100 |
| 10:00 AM | Run enrichment | 50 | $0.85 | 150 |
| 10:30 AM | Run enrichment | 50 | $0.85 | 200 |
| ... | (continue every 30 min) | | | |
| 7:00 PM | Last run of day | 50 | $0.85 | 1,000 |

**Daily Budget:** $17  
**Daily Result:** 1,000 POIs

### **Tonight (Overnight):**

| Time | Action | POIs | Cost |
|------|--------|------|------|
| 11:00 PM | Auto-run | 50 | $0.85 |
| 1:00 AM | Auto-run | 50 | $0.85 |
| 3:00 AM | Auto-run | 50 | $0.85 |
| 5:00 AM | Auto-run | 50 | $0.85 |

**Overnight Result:** 200 POIs  
**Overnight Cost:** $3.40

---

## 🎯 Alternative: Super Aggressive (Complete in 48 Hours)

### **Increase Batch Size:**

Modify `scripts/enrich-french-riviera.ts`:

```typescript
// Change from 50 to 200 POIs per batch
const BATCH_SIZE = 200;
```

**New Math:**
- 200 POIs per batch
- Cost per batch: $3.40
- Need 30 batches to complete 6,000 POIs
- Run every hour for 30 hours = **DONE in 1.5 days**

**Total Cost:** $102  
**Total Time:** 30 hours

---

## 📊 Progress Tracking

### **Check Progress in ChatNeo4j:**

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
```

### **Daily Progress Report:**

| Day | POIs Enriched | Cumulative | % Complete | Cost | Cumulative Cost |
|-----|---------------|------------|------------|------|-----------------|
| Day 0 | 163 | 163 | 2.7% | $8 | $8 |
| Day 1 | 1,200 | 1,363 | 22.7% | $20 | $28 |
| Day 2 | 1,200 | 2,563 | 42.7% | $20 | $48 |
| Day 3 | 1,200 | 3,763 | 62.7% | $20 | $68 |
| Day 4 | 1,200 | 4,963 | 82.7% | $20 | $88 |
| Day 5 | 1,037 | 6,000 | 100% | $18 | $106 |

**Target:** 100% French Riviera enriched in 5 days for $106

---

## 🎛️ Automation Options

### **Option 1: PowerShell Loop Script**

Create `scripts/auto-enrich-french-riviera.ps1`:

```powershell
# Run enrichment 30 times with 2-hour breaks
for ($i=1; $i -le 30; $i++) {
    Write-Host "===== Batch $i of 30 ====="
    npx ts-node scripts/enrich-french-riviera.ts
    
    if ($i -lt 30) {
        Write-Host "Waiting 2 hours before next batch..."
        Start-Sleep -Seconds 7200
    }
}
Write-Host "French Riviera enrichment complete!"
```

Run in background:
```powershell
Start-Job -FilePath .\scripts\auto-enrich-french-riviera.ps1
```

### **Option 2: Node.js Script**

Create `scripts/auto-enrich-loop.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runEnrichmentLoop() {
  for (let i = 1; i <= 30; i++) {
    console.log(`\n===== Batch ${i} of 30 =====`);
    
    try {
      const { stdout } = await execAsync('npx ts-node scripts/enrich-french-riviera.ts');
      console.log(stdout);
    } catch (error) {
      console.error(`Error in batch ${i}:`, error);
    }
    
    if (i < 30) {
      console.log('Waiting 2 hours...');
      await new Promise(resolve => setTimeout(resolve, 2 * 60 * 60 * 1000));
    }
  }
  
  console.log('\n🎉 French Riviera enrichment complete!');
}

runEnrichmentLoop();
```

---

## 🚨 Important Notes

### **API Rate Limits:**

- Google Places: No hard limit, but be reasonable
- Our delay: 100ms between requests (10 req/sec)
- **Safe range:** 100-500 requests per minute

### **Cost Management:**

- Monitor spending in Google Cloud Console
- Set up billing alerts at $50, $100
- Current burn rate: ~$20/day (safe)

### **Error Handling:**

- Script automatically skips POIs not found
- Logs all errors
- Can resume from where it stopped

---

## ✅ Completion Checklist

- [ ] Day 1: 1,200 POIs enriched
- [ ] Day 2: 2,400 POIs total
- [ ] Day 3: 3,600 POIs total
- [ ] Day 4: 4,800 POIs total
- [ ] Day 5: 6,000 POIs complete ✨
- [ ] Verify in ChatNeo4j: "Show me French Riviera enrichment stats"
- [ ] Celebrate: French Riviera is now world-class! 🥂

---

## 🎯 Next Region After French Riviera

Once French Riviera hits 100%, we'll move to:

**Option A: Mediterranean Luxury**
- Ibiza, Spain
- Mykonos, Greece
- Santorini, Greece
- Amalfi Coast, Italy

**Option B: Caribbean & Tropical**
- Maldives
- Dubai & Abu Dhabi
- St. Barts
- Phuket, Thailand

**Option C: Worldwide Enrichment**
- Switch to `enrich-all-pois.ts`
- Process all destinations equally

**Decision:** We'll decide together when French Riviera is done! 🚀

---

## 💡 Pro Tips

1. **Run during low-usage hours** (overnight) to minimize interruptions
2. **Check progress daily** in ChatNeo4j
3. **Keep laptop plugged in** if running overnight
4. **Monitor costs** in Google Cloud Console
5. **Celebrate milestones** (25%, 50%, 75%, 100%)

---

**Let's make French Riviera the most luxurious, data-rich destination in LEXA! 🇫🇷✨**

