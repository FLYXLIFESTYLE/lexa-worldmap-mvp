# Using Supabase pgvector Instead of Qdrant

Great news! You can use your **existing Supabase** database instead of running a separate Qdrant instance. This is simpler and integrates with your current setup.

## Why Use pgvector in Supabase?

✅ **Already have Supabase** - No new service to run  
✅ **Same database** - Auth, storage, and vectors in one place  
✅ **Powerful** - pgvector is production-ready and fast  
✅ **SQL queries** - Can join vectors with other tables  
✅ **Lower cost** - One less service to pay for  

## Setup Steps

### 1. Run Supabase Migrations

Apply these migrations to enable pgvector:

```bash
# Option A: Using Supabase CLI (if you have it)
cd rag_system/supabase
supabase migration apply

# Option B: Run SQL directly in Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# Copy and paste the contents of these files:
# 1. migrations/001_enable_pgvector.sql
# 2. migrations/002_vector_search_function.sql
```

**What these migrations do:**
- Enable pgvector extension
- Create `travel_trends` table with vector column
- Create indexes for fast similarity search
- Add RPC function for semantic search
- Insert sample trend data

### 2. Update Your .env File

Your RAG system will **reuse** your existing Supabase credentials! Just add them to `rag_system/.env`:

```env
# === Reuse from your main .env ===
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_existing_password
NEO4J_DATABASE=neo4j

# Supabase (copy from your main .env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Anthropic (copy from your main .env)
ANTHROPIC_API_KEY=sk-ant-your_key_here

# === RAG-specific settings ===
SESSION_SECRET=random-secret-key-here
PRIVACY_EMAIL=privacy@example.com
SUPPORTED_REGIONS=Baden-Württemberg,Bavaria,North Rhine-Westphalia

# API Config
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# Vector Search Settings
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
VECTOR_SEARCH_TOP_K=5
VECTOR_SIMILARITY_THRESHOLD=0.7
MIN_CONFIDENCE_SCORE=0.5
CONFIDENT_THRESHOLD=0.8
MAX_VIOLATIONS_PER_SESSION=3
```

### 3. Install Dependencies

```bash
cd rag_system
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements_supabase.txt
```

### 4. Update Import in API

Change the vector client import in `api/routes/chat.py`:

**OLD:**
```python
from database.vector_db_client import vector_db_client
```

**NEW:**
```python
from database.supabase_vector_client import vector_db_client
```

### 5. Test It

```bash
# Initialize (generates embeddings for sample data)
python -c "import asyncio; from database.supabase_vector_client import vector_db_client; asyncio.run(vector_db_client.connect()); asyncio.run(vector_db_client.add_sample_data())"

# Run tests
python test_system.py

# Start server
python api/main.py
```

## How It Works

### Data Structure in Supabase

```sql
travel_trends
├── id (UUID)
├── text (TEXT) - The trend description
├── embedding (VECTOR) - 384-dimensional vector
├── date (DATE)
├── source (TEXT)
├── regions (TEXT[]) - Array of region names
├── tags (TEXT[]) - Array of tags
└── confidence (FLOAT)
```

### Semantic Search

```python
# User asks: "wine tourism trends"
query_embedding = model.encode("wine tourism trends")

# SQL with pgvector
SELECT * FROM travel_trends
ORDER BY embedding <=> query_embedding
LIMIT 5;

# Returns trends about wine tourism, sorted by similarity
```

### Vector Similarity Operators

pgvector supports three distance operators:
- `<->` L2 distance (Euclidean)
- `<#>` Inner product (dot product)
- `<=>` Cosine distance (we use this)

## Advantages Over Qdrant

| Feature | Qdrant | pgvector in Supabase |
|---------|--------|---------------------|
| **Setup** | Separate Docker container | Already have Supabase |
| **Cost** | Additional service | Included in Supabase |
| **Integration** | Separate connection | Same database |
| **Queries** | Qdrant API | SQL (can join tables) |
| **Scale** | Millions of vectors | Millions of vectors |
| **Speed** | Very fast | Very fast (with indexes) |

## Common Operations

### Add New Trend Data

```python
from database.supabase_vector_client import vector_db_client

await vector_db_client.add_trend_data(
    text="New trend about luxury travel in Bavaria",
    metadata={
        "date": "2024-12-20",
        "source": "Industry Report 2024",
        "regions": ["Bavaria", "Munich"],
        "tags": ["Luxury", "Winter"],
        "confidence": 0.9
    }
)
```

### Search for Similar Trends

```python
results = await vector_db_client.search_trends(
    query="wine tourism in Germany",
    top_k=5,
    score_threshold=0.7
)

for result in results:
    print(f"Score: {result['score']}")
    print(f"Text: {result['text']}")
    print(f"Regions: {result['metadata']['regions']}")
```

### Query with SQL

You can also use SQL directly in Supabase:

```sql
-- Find trends about specific regions
SELECT * FROM travel_trends
WHERE 'Munich' = ANY(regions)
ORDER BY date DESC;

-- Search with vector similarity
SELECT 
    text,
    regions,
    (embedding <=> '[0.1, 0.2, ...]'::vector) AS distance
FROM travel_trends
WHERE (embedding <=> '[0.1, 0.2, ...]'::vector) < 0.3
ORDER BY distance
LIMIT 5;
```

## Monitoring

View your vectors in Supabase Dashboard:
1. Go to Table Editor
2. Select `travel_trends` table
3. You'll see all trends with their metadata
4. Embeddings are stored as vectors (can't display, but they're there!)

## Migration Path

If you later want to move back to Qdrant:
1. Export data: `SELECT * FROM travel_trends`
2. Import to Qdrant using the original `vector_db_client.py`
3. Update imports in your code

But honestly, **pgvector is perfect for your use case!**

## Performance Tips

1. **Index is critical**: The `ivfflat` index speeds up similarity search
2. **Batch inserts**: Insert multiple rows at once for speed
3. **Limit results**: Use reasonable `top_k` values (5-10)
4. **Cache frequently used queries**: Consider caching common searches

## Troubleshooting

**"Extension vector does not exist"**
→ Run migration `001_enable_pgvector.sql` in Supabase SQL editor

**"Function search_travel_trends does not exist"**
→ Run migration `002_vector_search_function.sql`

**"Slow search queries"**
→ Make sure the index was created: `SELECT * FROM pg_indexes WHERE tablename = 'travel_trends'`

**"Embedding dimension mismatch"**
→ Check that your model generates 384-dim vectors (all-MiniLM-L6-v2 does)

## Next Steps

1. Run the migrations in Supabase Dashboard
2. Update your `.env` with existing credentials
3. Change import to use `supabase_vector_client`
4. Test with sample data
5. Add your own trend data!

The pgvector integration is **production-ready** and used by thousands of applications. You're in good hands! 🚀

