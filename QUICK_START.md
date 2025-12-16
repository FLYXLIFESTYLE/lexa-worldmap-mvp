# LEXA Quick Start Guide

**Last Updated:** December 16, 2024

---

## 🚀 Running LEXA Locally

```bash
# 1. Start development server
npm run dev

# 2. Open in browser
http://localhost:3000
```

---

## 🎯 Key URLs

| Feature | URL | Description |
|---------|-----|-------------|
| **Main Chat** | `/app` | LEXA conversation interface |
| **Landing Page** | `/` | Public homepage |
| **Data Quality Dashboard** | `/admin/data-quality` | Run quality checks, view scoring stats |
| **Captain's Portal** | `/admin/knowledge` | Main knowledge hub |
| **Upload Knowledge** | `/admin/knowledge/upload` | Upload files (ChatGPT, transcripts, docs) |
| **Write Knowledge** | `/admin/knowledge/editor` | Manual knowledge entry |
| **Sign In** | `/auth/signin` | Authentication |

---

## 🔧 Running Data Quality Agent

### **Manual Trigger (UI)**
1. Go to `http://localhost:3000/admin/data-quality`
2. Click "Run Quality Check"
3. Watch progress and review results

### **Manual Trigger (Script)**
```bash
npm run quality-check
```

**Note:** For large databases (>50K nodes), use the Admin UI instead as it handles timeouts better.

### **Automatic Schedule**
- Runs **every night at midnight UTC**
- Configured in `lib/services/scheduler.ts`
- Change schedule: `cron.schedule('0 0 * * *', ...)`

### **What It Does**
✅ Merges duplicate POIs  
✅ Removes unnamed POIs  
✅ Creates missing relationships (14 types)  
✅ Calculates luxury scores (up to 500/run)  
✅ Adds confidence scores  
✅ Adds seasonal availability  
✅ Queues POIs for enrichment  

---

## 📤 Uploading Knowledge

### **Via UI**
1. Go to `/admin/knowledge/upload`
2. Drag & drop files or paste URL
3. Click "Process All"
4. View extraction results

### **Supported Formats**
- ChatGPT Export (`.json`)
- Zoom Transcripts (`.vtt`, `.srt`)
- Text files (`.txt`, `.md`)
- Documents (`.pdf`, `.docx`)
- URLs (web scraping)

### **Programmatic Upload**
```typescript
import { importChatGPTConversations } from '@/lib/knowledge';

const jsonData = JSON.parse(fs.readFileSync('conversations.json', 'utf-8'));

const results = await importChatGPTConversations(jsonData, {
  onParseComplete: (count) => console.log(`Parsed ${count} conversations`),
  onProcessProgress: (done, total) => console.log(`${done}/${total}`),
});

console.log(`Created ${results.poisCreated} POIs`);
```

---

## 🎯 Getting Recommendations

### **Via API**
```typescript
// Using presets
POST /api/lexa/recommendations
{
  "preset": "ultraLuxury" // or romanticGetaway, adventureSeeker, etc.
}

// Custom filters
POST /api/lexa/recommendations
{
  "filters": {
    "minLuxuryScore": 85,
    "desiredEmotions": ["Romance", "Peace"],
    "destinations": ["French Riviera"],
    "minConfidence": 0.8
  }
}
```

### **In Code**
```typescript
import { getRecommendations, RecommendationPresets } from '@/lib/lexa/recommendation-engine';

// Using preset
const recommendations = await getRecommendations(
  RecommendationPresets.romanticGetaway()
);

// Custom filters
const recommendations = await getRecommendations({
  minLuxuryScore: 80,
  themes: ['Culinary', 'Wine & Dine'],
  activities: ['Fine Dining'],
  destinations: ['French Riviera'],
  limit: 10
});
```

---

## 📊 Viewing Scoring Stats

### **Via Admin UI**
- Navigate to `/admin/data-quality`
- Scroll to "Current Scoring Statistics"
- View:
  - Luxury score distribution
  - Confidence score distribution
  - Top 10 luxury POIs
  - Completion rates

### **Via API**
```bash
curl http://localhost:3000/api/data-quality/scoring-stats
```

Returns:
```json
{
  "luxury": {
    "distribution": {
      "ultra_luxury": 45,
      "high_luxury": 123,
      "upscale": 234,
      ...
    },
    "stats": {
      "total": 5234,
      "avg": 67.5,
      "completion": 87
    },
    "topPOIs": [...]
  },
  "confidence": {
    "distribution": {...},
    "stats": {...}
  }
}
```

---

## 🧪 Running Tests

### **Scoring Validation Tests**
```bash
npx ts-node scripts/test-scoring.ts
```

Tests 12 scenarios:
- Ultra-luxury Michelin 3-star → 95-100
- High luxury resort → 90-100
- Budget beach → 20-40
- 6 confidence score tests

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| `BACKLOG.md` | Feature ideas, tasks, improvements (85+ items) |
| `QUICK_START.md` | This file - quick commands and URLs |
| `docs/SCORING_SYSTEM.md` | **Complete scoring system** (luxury + confidence) |
| `docs/LUXURY_SCORING_GUIDE.md` | Original Python scoring (historical) |
| `docs/RELATIONSHIP_MANAGEMENT.md` | All 14 relationship types explained |
| `docs/RELATIONSHIP_QUICK_REFERENCE.md` | Quick relationship reference |
| `docs/KNOWLEDGE_INGESTION_SYSTEM.md` | ChatGPT import system (14 pages) |
| `docs/RECOMMENDATION_ENGINE_ENHANCEMENTS.md` | 15 enhancement ideas |
| `docs/DATA_QUALITY_AGENT_README.md` | Agent documentation |

---

## 🔑 Environment Variables

Required in `.env.local`:

```env
# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-...

# Neo4j Database
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxxxx

# Supabase (Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx

# Optional (for enrichment)
GOOGLE_PLACES_API_KEY=xxxxx
```

---

## 🐛 Troubleshooting

### **Port 3000 Already in Use**
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Or use different port
npm run dev -- -p 3001
```

### **Neo4j Connection Failed**
- Check `.env.local` has correct credentials
- Verify Neo4j Aura is running
- Check firewall/VPN settings

### **Claude API Error**
- Verify `ANTHROPIC_API_KEY` is set
- Check API key is valid
- Ensure model name is correct: `claude-sonnet-4-5-20250929`

### **Memory Error During Import**
- Use `smart_split_cypher.py` for large files
- Reduce chunk size to 50 rows
- Process in batches of 250 statements

---

## 🎯 Common Tasks

### **Add a New Captain**
```sql
-- In Supabase SQL Editor
UPDATE profiles 
SET role = 'captain' 
WHERE email = 'captain@example.com';
```

### **Import ChatGPT Conversations**
```bash
# Create import script
npx ts-node scripts/import-chatgpt.ts
```

### **Clear All Knowledge**
```cypher
// In Neo4j Browser
MATCH (k:Knowledge) DETACH DELETE k;
```

### **Reset Luxury Scores**
```cypher
// In Neo4j Browser
MATCH (p:poi) SET p.luxury_score = NULL;
```

### **View All Relationships**
```cypher
// In Neo4j Browser
CALL db.relationshipTypes();
```

---

## 📈 Monitoring

### **Check Scheduler Status**
- Logs appear in terminal where `npm run dev` is running
- Look for `[Scheduler]` prefix
- Midnight runs log `Starting scheduled data quality check`

### **Check Agent Logs**
- View in `logs/data-quality/` directory
- Files named by date: `quality-check-2024-12-16.log`
- Contains full run details and stats

### **Check API Health**
```bash
curl http://localhost:3000/api/health
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set all environment variables in Vercel
- [ ] Enable Neo4j IP whitelist for Vercel IPs
- [ ] Set up Supabase RLS policies
- [ ] Add Captain authentication
- [ ] Test file upload with large files
- [ ] Configure custom domain
- [ ] Set up error monitoring (Sentry)
- [ ] Enable production Claude API key
- [ ] Test data quality agent
- [ ] Set up backup strategy for Neo4j
- [ ] Configure rate limiting

---

## 💡 Quick Wins from Backlog

Before starting new features, check if these quick wins (~30min each) make sense:

1. Add "Back to Top" button on long pages
2. Add loading spinners to all async actions  
3. Add success/error toast notifications
4. Add confirmation dialogs before delete
5. Add autosave to knowledge editor
6. Add "Copy link" button to share POIs
7. Add sorting to knowledge browser
8. Add export to CSV for admin tables
9. Add health check endpoint
10. Add version number to footer

See `BACKLOG.md` for full list!

---

## 📞 Need Help?

Check these files:
- `BACKLOG.md` - Is your issue/idea already tracked?
- `docs/` folder - Comprehensive guides
- Neo4j Browser - Query the database directly
- Terminal logs - Error details


