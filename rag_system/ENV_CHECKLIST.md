# Environment Variables Checklist

## ✅ What You Already Have

Based on your existing setup, you should **already have** these in your main `.env`:

### Required APIs (Already Have)
- ✅ `NEO4J_URI` - From your existing Neo4j Aura database
- ✅ `NEO4J_USER` - Usually "neo4j"
- ✅ `NEO4J_PASSWORD` - Your Neo4j password
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - For backend operations
- ✅ `ANTHROPIC_API_KEY` - Claude API key (you mentioned you have this)

### Optional APIs (Nice to Have)
- ⚠️ `OPENAI_API_KEY` - Only if you want to use GPT-4 instead of Claude

---

## 📋 Copy These to `rag_system/.env`

Create `rag_system/.env` and copy these values from your main `.env`:

```env
# === COPY FROM YOUR MAIN .ENV ===

# Neo4j (exact same credentials)
NEO4J_URI=bolt://your-neo4j-url.databases.neo4j.io:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j

# Supabase (exact same credentials)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Anthropic (exact same API key)
ANTHROPIC_API_KEY=sk-ant-your_key_here
DEFAULT_LLM=anthropic
MODEL_NAME=claude-3-sonnet-20240229

# === NEW VALUES (RAG-specific) ===

# Random secret for session encryption (generate a random string)
SESSION_SECRET=generate-a-random-string-abc123xyz

# Your contact emails
PRIVACY_EMAIL=privacy@yourcompany.com
PRIVACY_CONTACT=privacy@yourcompany.com

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# Embedding Model (for vector search)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# RAG Settings (can keep defaults)
VECTOR_SEARCH_TOP_K=5
VECTOR_SIMILARITY_THRESHOLD=0.7
MIN_CONFIDENCE_SCORE=0.5
CONFIDENT_THRESHOLD=0.8
MAX_VIOLATIONS_PER_SESSION=3

# Regions you support
SUPPORTED_REGIONS=Baden-Württemberg,Bavaria,North Rhine-Westphalia
```

---

## ✅ You DON'T Need New Platform APIs!

**Good news**: Your existing APIs are **sufficient** for the RAG system!

| API | Status | Usage |
|-----|--------|-------|
| **Neo4j** | ✅ Already have | Reuse your existing database |
| **Supabase** | ✅ Already have | Use pgvector for embeddings |
| **Claude (Anthropic)** | ✅ Already have | For LLM generation |
| **Qdrant** | ❌ NOT needed | Using Supabase instead |
| **OpenAI** | ⚠️ Optional | Only if you want GPT-4 |

---

## 🎯 Quick Setup Summary

### Step 1: Check Your Main `.env`
Look for these variables (you should already have them):
- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

### Step 2: Create `rag_system/.env`
1. Navigate to `rag_system/` folder
2. Create new file called `.env`
3. Copy the values from your main `.env`
4. Add the RAG-specific values (SESSION_SECRET, etc.)

### Step 3: Rename Settings File
Since you're using Supabase instead of Qdrant:

```bash
cd rag_system/config
# Rename the Supabase version to be the main one
mv settings_supabase.py settings.py
```

Or manually update `settings.py` to use Supabase variables.

### Step 4: Use Supabase Requirements
```bash
cd rag_system
pip install -r requirements_supabase.txt
```

---

## 🔍 How to Find Your Existing Values

### Neo4j
1. Open Neo4j Aura dashboard
2. Click on your database
3. Copy the connection URI and credentials

### Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - Project URL (`SUPABASE_URL`)
   - `anon` key (`SUPABASE_ANON_KEY`)
   - `service_role` key (`SUPABASE_SERVICE_KEY`) ⚠️ Keep secret!

### Anthropic (Claude)
1. Go to https://console.anthropic.com/
2. Click **API Keys**
3. Copy your key (starts with `sk-ant-`)

---

## ⚠️ Important Notes

### Same Neo4j, Different Use
- ✅ **You can use the same Neo4j database**
- The RAG nodes (Region, Activity, Tag) will coexist with your POI nodes
- They won't conflict - they're different node types!
- You can even create relationships between them!

### Supabase Service Key
- ⚠️ **Keep `SUPABASE_SERVICE_KEY` secret**
- Never commit to git
- Only use in backend (never in frontend)
- Has admin privileges

### Session Secret
- Generate a random string (like a password)
- Used for encrypting session data
- Example: `my-super-secret-key-abc123xyz-change-this`

---

## 📝 Example `.env` Template

Copy this and fill in your actual values:

```env
# Neo4j (from your main .env)
NEO4J_URI=bolt://xxxxx.databases.neo4j.io:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_actual_password
NEO4J_DATABASE=neo4j

# Supabase (from your main .env)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic (from your main .env)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
DEFAULT_LLM=anthropic
MODEL_NAME=claude-3-sonnet-20240229

# RAG-specific (NEW - generate these)
SESSION_SECRET=change-this-to-a-random-string-abc123xyz
PRIVACY_EMAIL=privacy@example.com
PRIVACY_CONTACT=privacy@example.com

# API Config (defaults are fine)
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# Vector/Embedding Settings (defaults are fine)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
VECTOR_SEARCH_TOP_K=5
VECTOR_SIMILARITY_THRESHOLD=0.7
MIN_CONFIDENCE_SCORE=0.5
CONFIDENT_THRESHOLD=0.8
MAX_VIOLATIONS_PER_SESSION=3

# Supported Regions (customize as needed)
SUPPORTED_REGIONS=Baden-Württemberg,Bavaria,North Rhine-Westphalia
```

---

## ✅ Verification

After creating `.env`, verify you have everything:

```bash
cd rag_system
python -c "from config.settings_supabase import settings; print('✅ Neo4j:', settings.neo4j_uri); print('✅ Supabase:', settings.supabase_url); print('✅ Claude:', 'Yes' if settings.anthropic_api_key else 'No')"
```

Should output:
```
✅ Neo4j: bolt://xxxxx.databases.neo4j.io:7687
✅ Supabase: https://xxxxx.supabase.co
✅ Claude: Yes
```

---

## 🚀 Ready to Go!

Once your `.env` is set up:

1. **Run Supabase migrations** (see `SUPABASE_SETUP.md`)
2. **Install dependencies**: `pip install -r requirements_supabase.txt`
3. **Test**: `python test_system.py`
4. **Start server**: `python api/main.py`

No new platform APIs needed - you're all set! 🎉

