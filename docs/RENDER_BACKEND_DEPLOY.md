## Render Backend Deploy (FastAPI) — LEXA

You should deploy **only the backend** to Render. Keep the frontend on Vercel.

### Why your Render deploy failed
If Render runs `npm install; npm run build`, you deployed the **Next.js frontend** to Render.
That will fail unless you set *all* frontend env vars (Supabase, etc.) and it's not what we want here.

### Correct Render service (backend)

Create a new Render **Web Service** (Python) for the backend:

- **Runtime**: Python
- **Root Directory**: `rag_system`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**:
  - `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- **Plan/Instance**: Hobby + Starter is enough for testing

### Required Render environment variables (backend)

```env
ENVIRONMENT=production
LOG_LEVEL=INFO

SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<your-anon-key-or-service-key>
SUPABASE_SERVICE_KEY=<your-service-role-key>

NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<your-password>
NEO4J_DATABASE=neo4j

ANTHROPIC_API_KEY=sk-ant-...

# Recommended (match your Vercel domain)
CORS_ALLOW_ORIGINS=https://lexa-worldmap-mvp.vercel.app
```

### After backend deploy
Copy your Render backend URL and set this in Vercel:

```env
NEXT_PUBLIC_API_URL=https://<your-render-backend>.onrender.com
```

### Quick health checks

- `GET /api/health`
- `POST /api/lexa/account/create`


