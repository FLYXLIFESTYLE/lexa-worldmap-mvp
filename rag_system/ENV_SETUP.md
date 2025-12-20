# Environment Variables Reference

This document explains all environment variables used in the RAG system.

## Required Variables

These MUST be set for the system to work:

### Database Configuration

```env
NEO4J_URI=bolt://localhost:7687
```
**What:** The connection address for your Neo4j database  
**Where to get it:** Neo4j Desktop shows this when database is running  
**Example:** `bolt://localhost:7687` (default local)

```env
NEO4J_USER=neo4j
```
**What:** Username for Neo4j database  
**Default:** `neo4j` (don't change unless you created a different user)

```env
NEO4J_PASSWORD=your_password_here
```
**What:** Password you set when creating the Neo4j database  
**Where to get it:** You chose this in Neo4j Desktop  
**Security:** Never commit this to git! Keep it in .env only

```env
NEO4J_DATABASE=neo4j
```
**What:** Which database to use in Neo4j  
**Default:** `neo4j` (the default database name)

```env
QDRANT_HOST=localhost
```
**What:** Where Qdrant is running  
**Default:** `localhost` (if running locally)  
**Cloud:** Use your Qdrant Cloud URL if using hosted version

```env
QDRANT_PORT=6333
```
**What:** Port Qdrant is listening on  
**Default:** `6333` (Qdrant's default port)

### Security

```env
SESSION_SECRET=your_random_secret_key_here
```
**What:** Secret key for encrypting session data  
**How to generate:** Use a random string, like a password  
**Example:** `my-super-secret-key-12345-change-this`  
**Security:** Must be random and kept secret!

```env
PRIVACY_EMAIL=privacy@example.com
PRIVACY_CONTACT=privacy@example.com
```
**What:** Contact email for data protection questions  
**Usage:** Shown to users who ask about data/privacy  
**Example:** `privacy@yourcompany.com`

### Regions

```env
SUPPORTED_REGIONS=Baden-Württemberg,Bavaria,North Rhine-Westphalia
```
**What:** Comma-separated list of regions your chatbot covers  
**Usage:** Used in system prompts and validation  
**Format:** No spaces after commas

## Optional Variables

These have sensible defaults but can be customized:

### API Configuration

```env
API_HOST=0.0.0.0
```
**What:** Which network interface to bind to  
**Default:** `0.0.0.0` (all interfaces - allows external access)  
**Alternative:** `127.0.0.1` (localhost only - more secure for development)

```env
API_PORT=8000
```
**What:** Port the API runs on  
**Default:** `8000`  
**Change if:** Port 8000 is already in use on your system

```env
ENVIRONMENT=development
```
**What:** Running environment  
**Options:** `development`, `production`, `testing`  
**Effects:** 
- `development`: Auto-reload enabled, more logging
- `production`: Optimized, less logging

### LLM Configuration (Phase 2+)

```env
ANTHROPIC_API_KEY=sk-ant-xxx
```
**What:** API key for Claude (Anthropic's AI)  
**Where to get:** https://console.anthropic.com/  
**Optional:** Not needed for Phase 1, required for Phase 3

```env
OPENAI_API_KEY=sk-xxx
```
**What:** API key for GPT-4 (OpenAI's AI)  
**Where to get:** https://platform.openai.com/api-keys  
**Optional:** Alternative to Anthropic key

```env
DEFAULT_LLM=anthropic
```
**What:** Which LLM to use  
**Options:** `anthropic` or `openai`  
**Default:** `anthropic`

```env
MODEL_NAME=claude-3-sonnet-20240229
```
**What:** Specific model version  
**For Anthropic:** `claude-3-sonnet-20240229`, `claude-3-opus-20240229`  
**For OpenAI:** `gpt-4-turbo-preview`, `gpt-4`

### Qdrant Configuration

```env
QDRANT_API_KEY=
```
**What:** API key for Qdrant Cloud (if using hosted version)  
**Optional:** Leave empty if running Qdrant locally with Docker  
**Where to get:** Qdrant Cloud dashboard

```env
QDRANT_COLLECTION_NAME=travel_trends
```
**What:** Name of the collection in Qdrant  
**Default:** `travel_trends`  
**Change if:** You want to use a different collection name

```env
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```
**What:** Which model to use for generating embeddings  
**Default:** `sentence-transformers/all-MiniLM-L6-v2` (fast, good quality)  
**Alternatives:**
- `sentence-transformers/all-mpnet-base-v2` (better quality, slower)
- `sentence-transformers/multi-qa-MiniLM-L6-cos-v1` (optimized for Q&A)

### RAG Configuration

```env
VECTOR_SEARCH_TOP_K=5
```
**What:** How many vector search results to retrieve  
**Default:** `5`  
**Range:** 1-20 (higher = more context but slower)

```env
VECTOR_SIMILARITY_THRESHOLD=0.7
```
**What:** Minimum similarity score to include a result  
**Default:** `0.7` (0-1 scale)  
**Higher:** More strict, fewer but more relevant results  
**Lower:** More lenient, more results but less relevant

```env
MIN_CONFIDENCE_SCORE=0.5
```
**What:** Minimum confidence to give an answer  
**Default:** `0.5`  
**Below this:** System will ask for clarification

```env
CONFIDENT_THRESHOLD=0.8
```
**What:** Score needed to be "confident"  
**Default:** `0.8`  
**Above this:** System will give a direct answer without hedging

### Security Thresholds

```env
MAX_VIOLATIONS_PER_SESSION=3
```
**What:** How many violations before terminating session  
**Default:** `3`  
**Escalation:** 1st = redirect, 2nd = decline, 3rd = terminate

## Example .env File

Here's a complete example with explanations:

```env
# === REQUIRED - Must Change ===
NEO4J_PASSWORD=YourActualPasswordHere123!
SESSION_SECRET=generate-a-random-string-here-abc123xyz
PRIVACY_EMAIL=privacy@yourcompany.com
PRIVACY_CONTACT=privacy@yourcompany.com

# === REQUIRED - Usually Keep Default ===
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_DATABASE=neo4j
QDRANT_HOST=localhost
QDRANT_PORT=6333
SUPPORTED_REGIONS=Baden-Württemberg,Bavaria,North Rhine-Westphalia

# === OPTIONAL - Has Defaults ===
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
QDRANT_COLLECTION_NAME=travel_trends
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
VECTOR_SEARCH_TOP_K=5
VECTOR_SIMILARITY_THRESHOLD=0.7
MIN_CONFIDENCE_SCORE=0.5
CONFIDENT_THRESHOLD=0.8
MAX_VIOLATIONS_PER_SESSION=3

# === OPTIONAL - For Phase 2+ ===
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEFAULT_LLM=anthropic
MODEL_NAME=claude-3-sonnet-20240229
QDRANT_API_KEY=
```

## Security Best Practices

1. **Never commit .env to git**
   - It's in .gitignore by default
   - Always use .env.example for documentation

2. **Use strong secrets**
   - SESSION_SECRET should be long and random
   - Never use simple values like "secret" or "password"

3. **API Keys**
   - Keep them private
   - Rotate them if compromised
   - Use different keys for dev/prod

4. **Production vs Development**
   - Use different passwords in production
   - Set ENVIRONMENT=production in production
   - Consider using secret management tools (AWS Secrets Manager, etc.)

## Troubleshooting

### "Connection refused" errors

Check these variables:
- `NEO4J_URI` - Is Neo4j running on this address?
- `QDRANT_HOST` and `QDRANT_PORT` - Is Qdrant running?

### "Authentication failed"

Check these variables:
- `NEO4J_USER` - Usually `neo4j`
- `NEO4J_PASSWORD` - Must match Neo4j database password

### API not accessible from other machines

Change:
- `API_HOST=0.0.0.0` (allows external access)
- Not `127.0.0.1` (localhost only)

### Import errors

Check:
- `EMBEDDING_MODEL` - Must be a valid model name
- Internet connection (downloads model on first use)

## Where to Get Help

- **Neo4j:** https://neo4j.com/docs/
- **Qdrant:** https://qdrant.tech/documentation/
- **Sentence Transformers:** https://www.sbert.net/
- **FastAPI:** https://fastapi.tiangolo.com/

