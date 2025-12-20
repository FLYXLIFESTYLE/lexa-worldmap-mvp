# AIlessia Quick Start Guide

## What is AIlessia?

AIlessia is a **synthetic emotional intelligence** for ultra-luxury experience design. She reads emotions, anticipates desires, and composes story-driven travel experiences.

---

## Quick Setup (5 Steps)

### Step 1: Install Dependencies

```bash
cd rag_system
pip install -r requirements_ailessia.txt
```

### Step 2: Initialize Neo4j Emotional Knowledge Graph

```bash
# Connect to your Neo4j database
cypher-shell -u neo4j -p YOUR_PASSWORD

# Run the schema
:source database/schemas/emotional_knowledge_graph.cypher
```

This creates:
- Experience nodes with emotional attributes
- Destination nodes with emotional geography
- Client archetype templates
- Emotional relationships

### Step 3: Initialize Supabase Personal Script Space

```bash
# Connect to your Supabase database
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres

# Run the migration
\i supabase/migrations/003_ailessia_personal_script_space.sql
```

This creates:
- `client_accounts` - Client profiles with emotional intelligence
- `experience_scripts` - Personal Script Space
- `conversation_sessions` - Conversation tracking
- `script_upsells` - Intelligent upsell opportunities
- `client_feedback` - Learning loop

### Step 4: Update Environment Variables

Add to your `.env` file:

```bash
# Already have these (verify they're set):
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=neo4j

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key

# Optional: For enhanced narrative generation
CLAUDE_API_KEY=your_claude_api_key
```

### Step 5: Start the API

```bash
# From rag_system directory
python -m api.main
```

AIlessia routes will be available at:
- `POST /api/ailessia/account/create`
- `POST /api/ailessia/converse`
- `POST /api/ailessia/compose-script`
- `GET /api/ailessia/script-space/{account_id}`
- `POST /api/ailessia/feedback`

---

## Test AIlessia

### 1. Create an Account

```bash
curl -X POST http://localhost:8000/api/ailessia/account/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "name": "Alexandra"
  }'
```

Response:
```json
{
  "account_id": "uuid-here",
  "email": "client@example.com",
  "name": "Alexandra",
  "session_id": "session-uuid",
  "ailessia_greeting": "Welcome. I'm AIlessia, and I'm here to design something extraordinary for you."
}
```

### 2. Converse with AIlessia

```bash
curl -X POST http://localhost:8000/api/ailessia/converse \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "your-account-id",
    "session_id": "your-session-id",
    "message": "I want to celebrate my anniversary with something truly special on the French Riviera",
    "conversation_history": []
  }'
```

Response:
```json
{
  "ailessia_response": "I sense that this is about creating a once-in-a-lifetime moment that honors your relationship...",
  "tone_used": "sophisticated_friend",
  "conversation_stage": "discovery",
  "progress": 0.4,
  "emotional_reading": {
    "primary_state": "celebrating",
    "archetype": "The Romantic",
    "energy_level": 0.8,
    "hidden_desires": ["Create Instagram-worthy moment", "Prove thoughtfulness"]
  },
  "key_insight": "Validates relationship significance and creates shared memory"
}
```

### 3. Compose Experience Script

```bash
curl -X POST http://localhost:8000/api/ailessia/compose-script \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "your-account-id",
    "session_id": "your-session-id",
    "selected_choices": {
      "destination": "French Riviera",
      "theme_category": "romance",
      "duration_days": 5
    }
  }'
```

Response:
```json
{
  "script_id": "script-uuid",
  "title": "Alexandra's A French Riviera Love Story",
  "cinematic_hook": "Imagine the moment the French Riviera sun melts into gold, and you're exactly where you've always belonged—together.",
  "emotional_arc": "Meeting → Connection → Depth → Commitment",
  "preview_narrative": "...",
  "total_investment": 25000.00,
  "duration_days": 5,
  "ailessia_message": "Your Experience Script is ready, Alexandra. I've designed something truly special..."
}
```

---

## Understanding AIlessia's Intelligence

### Emotional Reading

AIlessia detects:
- **Primary emotion**: Excited, Celebrating, Seeking Escape, Contemplative, etc.
- **Energy level**: 0-1 scale
- **Vulnerability**: How open the client is being
- **Hidden desires**: What they want but haven't said
- **Personality archetype**: The Romantic, The Achiever, The Hedonist, etc.

### Desire Anticipation

AIbert (analytical engine) recognizes patterns:
- Romantic anniversary → Wants to prove thoughtfulness, create Instagram moment
- Achievement celebration → Needs recognition, permission to indulge
- Escape from pressure → Seeks sanctuary, permission to disconnect
- Identity transformation → Desires symbolic ritual, defining moment

### Adaptive Personality

AIlessia adapts her tone:
- **Therapeutic**: Warm, empathetic (high vulnerability)
- **Sophisticated Friend**: Elegant casualness (default)
- **Mystical Guide**: Intuitive, spiritual (contemplative clients)
- **Luxury Concierge**: Professional excellence (achievers)
- **Playful Confidante**: Light, fun (high energy)

### Experience Composition

AIlessia composes:
1. **Emotional Arc**: The journey of feelings (not chronological)
2. **Cinematic Hook**: Opening that captures imagination
3. **Signature Experiences**: 5-8 key moments sequenced emotionally
4. **Sensory Journey**: How each sense evolves
5. **Personalized Rituals**: Unique touches based on archetype
6. **Transformational Promise**: Who they'll become

---

## Architecture

```
Client Message
     ↓
Emotion Interpreter (reads emotional state)
     ↓
Desire Anticipator (predicts unstated needs)
     ↓
Personality Mirror (adapts tone)
     ↓
Response Generation (in adapted voice)
     ↓
Script Composer (when ready)
     ↓
PDF Generator (beautiful keepsake)
```

### Data Flow

```
Neo4j (Emotional Knowledge Graph)
  ↓
Experiences with emotional attributes
  ↓
Matched to client's archetype & desires
  ↓
Sequenced for emotional flow
  ↓
Composed into story-driven script
  ↓
Saved to Supabase (Personal Script Space)
  ↓
Generated as branded PDF
```

---

## Key Files

### Core Intelligence
- `core/ailessia/emotion_interpreter.py` - Reads emotional state
- `core/aibert/desire_anticipator.py` - Anticipates desires
- `core/ailessia/personality_mirror.py` - Adapts communication tone
- `core/ailessia/script_composer.py` - Composes experience scripts

### Data Layer
- `database/schemas/emotional_knowledge_graph.cypher` - Neo4j schema
- `supabase/migrations/003_ailessia_personal_script_space.sql` - Supabase schema
- `database/neo4j_client.py` - Neo4j queries (extended)
- `database/account_manager.py` - Supabase account management

### API
- `api/routes/ailessia.py` - AIlessia endpoints
- `core/pdf/script_pdf_generator.py` - PDF generation

---

## Customization

### Add New Experiences

Edit `database/schemas/emotional_knowledge_graph.cypher`:

```cypher
CREATE (exp:Experience {
    id: "exp_your_experience",
    name: "Your Experience Name",
    luxury_tier: "Ultra-Premium",
    exclusivity_score: 0.95,
    primary_emotions: ["Romance", "Prestige"],
    cinematic_hook: "Your cinematic opening...",
    signature_moment: "The unforgettable moment...",
    // ... more attributes
})
```

### Add New Desire Patterns

Edit `core/aibert/desire_anticipator.py`:

```python
ANTICIPATION_RULES = {
    "your_new_scenario": {
        "triggers": ["keyword1", "keyword2"],
        "anticipated_desires": ["Desire 1", "Desire 2"],
        "hidden_anxieties": ["Anxiety 1"],
        "how_to_address": "Strategy for addressing...",
        "emotional_fulfillment": "What this provides..."
    }
}
```

### Customize Tone Profiles

Edit `core/ailessia/personality_mirror.py`:

```python
TONE_PROFILES = {
    "your_custom_tone": ToneProfile(
        name="your_custom_tone",
        style="Your style description",
        language="Your language style",
        pacing="Your pacing",
        example="Example response in this tone",
        when_to_use="When to use this tone"
    )
}
```

---

## Troubleshooting

### AIlessia routes not loading

Check logs for import errors:
```bash
# Look for "AIlessia routes loaded" or import errors
tail -f logs/api.log
```

### Neo4j connection issues

Verify connection:
```python
from database.neo4j_client import neo4j_client
await neo4j_client.connect()
await neo4j_client.verify_connection()
```

### Supabase connection issues

Verify Supabase client:
```python
from supabase import create_client
client = create_client(supabase_url, supabase_key)
result = client.table("client_accounts").select("*").limit(1).execute()
```

### PDF generation not working

Install ReportLab:
```bash
pip install reportlab
```

If still issues, system will use fallback text-based PDF.

---

## Production Considerations

### Security

1. **Enable Row Level Security** in Supabase:
   ```sql
   ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
   -- Add policies for auth.uid()
   ```

2. **API Authentication**: Add authentication middleware to AIlessia routes

3. **Rate Limiting**: Add rate limiting for conversation endpoints

### Performance

1. **Neo4j Indexes**: Already created in schema, verify they exist
2. **Supabase Indexes**: Already created in migration
3. **Caching**: Cache frequently accessed experiences
4. **Connection Pooling**: Use connection pools for both databases

### Monitoring

Track these metrics:
- Emotional resonance scores (from sessions)
- Script creation → booking conversion rate
- Upsell acceptance rates
- Client feedback ratings
- Repeat engagement rates

### Scaling

1. **Neo4j**: Use Neo4j Aura for managed scaling
2. **Supabase**: Already scales automatically
3. **API**: Deploy with horizontal scaling (stateless)
4. **PDF Generation**: Consider async job queue for large volumes

---

## Next Steps

1. **Populate Experiences**: Add real luxury experiences to Neo4j
2. **Test Conversations**: Run through full conversation flows
3. **Refine Prompts**: Tune emotional detection and response generation
4. **Build Frontend**: Create elegant web interface
5. **Integrate Claude**: Connect Claude API for enhanced narratives
6. **Deploy**: Deploy to production environment

---

## Support

For detailed implementation information, see:
- `AILESSIA_IMPLEMENTATION.md` - Complete implementation documentation
- `ailessia_intelligence_system_*.plan.md` - Original detailed plan

**AIlessia is ready to transform luxury travel into deeply personal, story-driven experiences.**

