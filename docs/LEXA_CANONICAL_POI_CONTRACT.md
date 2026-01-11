# LEXA Canonical POI Contract (Step 2)

This document defines the **single canonical contract** every LEXA agent must produce and consume, so extraction, storage, Neo4j promotion, retrieval, and script recommendations are consistent.

Scope:
- **Supabase draft POIs**: `extracted_pois` (review/edit/verify)
- **Neo4j canonical POIs**: `:poi` + relationships (explainable retrieval)
- **Taxonomy alignment**: `Emotion` vs `EmotionalTag` vs `Desire` vs `Fear`

This contract is **compatible with**:
- `supabase/migrations/011_captain_portal_tables.sql`
- `supabase/migrations/020_extracted_pois_brain_fields.sql`
- `rag_system/app/services/intelligence_storage.py` (normalizer)

---

## 1) Two emotional systems (and why we keep both)

### A) `:Emotion` (human-universal core emotions; code-based)
Examples (from Neo4j): `AWE`, `PEACE`, `FREEDOM`, `INTIMACY`, `MEANING`, etc.

**Use when**:
- we want stable, universal emotions that generalize across cultures
- we want explainable “why this fits” based on a shared taxonomy

### B) `:EmotionalTag` (LEXA’s commercial/UX dimensions; not universal emotions)
LEXA currently uses 9 “dimensions” heavily in extraction and script logic:
- Exclusivity, Prestige, Discovery, Indulgence, Romance, Adventure, Legacy, Freedom, Transformation

These are powerful for luxury travel, but they are closer to **positioning/experience dimensions** than universal emotions.

**Use when**:
- we want consistent investor-demo language (prestige/exclusivity are sticky)
- we want flexible UX tagging, filtering, and “experience style” matching

**Decision**: We keep both. **Agents must not treat these 9 as `:Emotion` nodes.**

---

## 2) Canonical POI record (Supabase) – `extracted_pois`

### 2.1 Columns (source of truth for drafts)

**Identity**
- `id` (uuid)
- `name` (text, required)
- `destination` (text, nullable)
- `category` (text, nullable)
- `description` (text, nullable)
- `address` (text, nullable)
- `latitude` / `longitude` (decimal, nullable)

**Workflow**
- `confidence_score` (0–100)
- `verified` (bool)
- `verified_by` / `verified_at`
- `promoted_to_main` (bool)

**Classification**
- `themes` (text[])
- `keywords` (text[])
- `luxury_indicators` (text[])

**Practicality**
- `best_time` (text)
- `booking_info` (text)
- `yacht_accessible` (bool)
- `marina_distance` (text)

**Investor-grade brain fields (added in migration 020)**
- `emotional_map` (jsonb)
- `sensory_triggers` (text[])
- `client_archetypes` (jsonb)
- `conversation_triggers` (text[])
- `pricing` (jsonb)
- `source_refs` (jsonb)
- `citations` (jsonb)
- `enrichment` (jsonb)
- `emotion_confidence` (int 0–100)
- `luxury_score_confidence` (int 0–100)

**Raw debug**
- `metadata` (jsonb) — allowed for debugging snapshots; not the primary store for critical fields.

### 2.1.1 Data quality gates (to prevent “garbage POIs”)
These rules exist because your screenshot shows “POIs” that are actually *sentence fragments* (e.g. “by the French family behind Pernod Ricard…”).

**Hard reject (cannot auto-ingest):**
- `name` is missing OR looks like a paragraph/sentence (too long, contains multiple commas/sentences, starts with “by/and/it/this/they…”)
- missing `category` AND cannot be mapped into a known POI type
- missing `latitude/longitude` AND no reliable destination anchor

**Soft reject (allow draft but require Captain verification before promotion):**
- missing destination
- missing description
- missing at least one good `source_ref`

### 2.2 Required JSON shapes (must be consistent across agents)

#### `emotional_map` (required for enriched POIs; optional for open-source skeletons)
Array of “signals”. Each signal MUST include `kind`, `name`, `intensity_1_10`, `evidence`.

```json
[
  {
    "kind": "EmotionalTag",
    "name": "Prestige",
    "intensity_1_10": 10,
    "evidence": "Former royal palace; Michelin-caliber service; high-status guest history.",
    "confidence_0_1": 0.85,
    "citations": [{ "source_ref_index": 0, "anchor": "about", "quote_snippet": "..." }]
  },
  {
    "kind": "Emotion",
    "code": "AWE",
    "name": "Awe",
    "intensity_1_10": 8,
    "evidence": "Clifftop setting + sea views described as 'breathtaking'.",
    "confidence_0_1": 0.7
  }
]
```

Rules:
- `kind` is one of: `Emotion` | `EmotionalTag` | `Desire` | `Fear`
- If `kind = Emotion/Desire/Fear` and a canonical code exists, include `code`.
- Evidence must be short and redacted (no PII).

#### `client_archetypes`
Array of objects:
```json
[
  {
    "name": "The Romantic",
    "match_score_0_100": 92,
    "why": "Intimate setting; couples-only pacing; high romance cues.",
    "pain_points_solved": ["Crowds", "Generic luxury", "No intimacy"],
    "confidence_0_1": 0.8
  }
]
```

#### `pricing`
```json
{
  "amount": 8500,
  "currency": "EUR",
  "unit": "per_experience",
  "range": { "low": null, "high": null },
  "notes": "Price varies by season and vessel size."
}
```

#### `source_refs` (required)
See `docs/LEXA_BRAIN_FIELD_ALLOWLIST_POLICY.md`.

#### `citations` (recommended)
See `docs/LEXA_BRAIN_FIELD_ALLOWLIST_POLICY.md`.

#### `enrichment`
Reserved for structured enrichment payloads (scrape-derived facts, normalized attributes, etc.).
Agents should store any *extra structured facets* here when no first-class column exists yet:
```json
{
  "occasion_types": ["Photography-Worthy", "Intimate & Private"],
  "activity_types": ["Sailing", "Snorkeling"],
  "notes": "Signature moment: toast at sunset timed by captain."
}
```

---

## 3) Canonical POI in Neo4j – `:poi` + relationships

### 3.1 Node identity
Every canonical POI MUST have:
- `poi_uid` (unique)
- `name`
- `type`
- A destination link via relationships:
  - `(p:poi)-[:LOCATED_IN]->(d:destination)` (city or MVP destination)
  - optional `(d:destination)-[:IN_DESTINATION]->(mvp:destination {kind:'mvp_destination'})`

### 3.2 Relationships (explainable retrieval)
Promotion should write edges instead of storing only arrays.

Recommended:
- `(p:poi)-[:HAS_THEME {confidence,evidence,source_id,created_at}]->(t:theme_category)`
- `(p:poi)-[:FITS_OCCASION {confidence,evidence,...}]->(o:occasion_type)`
- `(p:poi)-[:SUPPORTS_ACTIVITY {confidence,evidence,...}]->(a:activity_type)`
- `(p:poi)-[:EVOKES {intensity_1_10,confidence,evidence,...}]->(tag:EmotionalTag)`
- `(p:poi)-[:EVOKES_EMOTION {intensity_1_10,confidence,evidence,...}]->(e:Emotion)`
- `(p:poi)-[:AMPLIFIES_DESIRE {confidence,evidence,...}]->(d:Desire)`
- `(p:poi)-[:MITIGATES_FEAR {confidence,evidence,...}]->(f:Fear)`

---

## 4) Mapping: Supabase → Neo4j (promotion)

| Supabase (`extracted_pois`) | Neo4j |
|---|---|
| `themes[]` | `(:poi)-[:HAS_THEME]->(:theme_category)` |
| `keywords[]` | `p.keywords` (optional property) and/or `(:poi)-[:RELATES_TO]->(:keyword)` (later) |
| `luxury_indicators[]` | `p.luxury_indicators` (property) and used in scoring |
| `emotional_map[]` | `EVOKES` to `:EmotionalTag` and `EVOKES_EMOTION` to `:Emotion` when `kind` matches |
| `client_archetypes[]` | `(:poi)-[:IDEAL_FOR_ARCHETYPE]->(:ClientArchetype)` (later) or keep on POI node as property for MVP |
| `conversation_triggers[]` | property on POI (MVP) |
| `source_refs` + `citations` | relationship properties or POI properties (traceability) |

---

## 5) Agent rules (must follow)

All agents that create/update POIs must:
1. Enforce **named-only ingestion gate** (drop unreviewable POIs)
2. Output the exact JSON shapes above (especially `emotional_map`)
3. Always attach `source_refs` (and `citations` when possible)
4. Treat LEXA’s 9 “dimensions” as **`EmotionalTag`**, not `Emotion`

---

## 6) Real-time enrichment (Tavily + Claude) — how we make incomplete POIs valuable
**Goal:** Convert a “thin” POI (name + coords) into an **investor-grade** POI with:
- accurate category + destination
- short description
- booking/website link
- luxury indicators + confidence
- emotional map + evidence
- citations/provenance for every important claim

**Process (safe + explainable):**
1. **Search with Tavily** (real-time): find the official site + 2–4 high-quality sources.
2. **Extract facts with Claude** *only from those sources*:
   - opening status/seasonality (if publicly stated)
   - price band (if available)
   - awards/accolades (Michelin, Relais & Châteaux, yacht club membership, etc.)
3. **Store only**:
   - structured fields (facts)
   - `source_refs[]` (URLs + timestamps)
   - `citations[]` (short redacted snippets, max 300–500 chars)
4. **Never store full page text**.

This unlocks “real-time” use cases:
- last-minute re-planning due to weather
- event recommendations that match client archetype/preferences
- “what’s open tonight / what’s happening this week” (with citations)

---

## 7) Investor roadmap: what paid data unlocks (and how funding increases quality)
We already avoid Foursquare until the right contract exists. For the investor plan, we can clearly show:

- **Tavily (now)**: real-time web discovery + freshness (events, changes, “what’s possible right now”)
- **Google Places / similar (later)**:
  - richer structured metadata (hours, popularity, photos, reviews)
  - better entity resolution (same place across languages)
  - faster completeness for new destinations
- **Foursquare (later, with enterprise contract)**:
  - large POI coverage + categorization
  - stable place IDs for dedupe
  - strong venue taxonomy

**How we present this to investors:**
- baseline (free/open sources) coverage + quality metrics
- “funded” upgrade path (paid services) with:
  - expected lift in coverage (% of POIs with hours/website/phone)
  - expected lift in freshness (days since last verified)
  - expected lift in conversion metrics (faster itinerary generation, fewer manual fixes)

