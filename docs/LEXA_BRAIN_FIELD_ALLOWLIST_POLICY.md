# LEXA Brain – Field Allowlist Policy (MVP Legal + Consistency)

This policy defines **what LEXA is allowed to store** (and what it must NOT store) for Brain v2.

It applies to **all LEXA agents** and pipelines:
- Upload/Paste/Manual entry (Captain Portal)
- URL scraping + enrichment
- Open-source generation (OSM / Overture / Wikidata)
- Market Intelligence + Company Brain
- Promotion into Neo4j + retrieval for LEXA Chat + Script Engine

---

## 1) Non‑negotiables (MVP)

### A) No Foursquare
- **Policy**: **Do not ingest or store any Foursquare data** until an enterprise contract explicitly permits the use-case.
- Allowed for MVP: **OSM + Overture + Wikidata + our own uploads/scrapes/manual curation**.

### B) Paid real‑time search IS allowed (Tavily)
- **Policy**: We WILL use **Tavily** for real-time discovery and freshness (events, opening status, recent changes, “what’s possible right now”).
- **Important**: Even with Tavily, we still follow **content minimization**:
  - We do **not** store full scraped page bodies
  - We store **facts** + **provenance** + **short evidence snippets** only
  - We cache results and re-check periodically to control cost
- This enables LEXA to:
  - re-plan based on weather/availability
  - recommend current events that match the client profile
  - keep “luxury + prestige” claims grounded with citations

### C) Paid POI databases are future (investor plan)
- **Policy**: We still do **not** ingest large paid POI databases (e.g., Google Places, Foursquare) until:
  - legal use-case is approved (contracts/terms)
  - we have a clear storage + attribution policy per provider
  - feature flags + cost controls are in place
- **Investor story**: paid POI datasets significantly improve **coverage + freshness + metadata depth**, and we will show the “before/after” lift when funding enables it.

### D) Named‑POI‑only ingestion for open sources
- **Policy**: When ingesting from OSM/Overture/Wikidata, **drop** any POI that is not reviewable.
- Hard rejection:
  - Missing/empty `name`
  - Placeholder name like `Unnamed`, `Unknown`, `N/A`
  - Missing `type/category` (cannot be mapped)
  - Missing `lat/lon` *and* no reliable destination anchor

### E) Copyright + content minimization (scraping & documents)
- **Policy**: We do **not** persist full copyrighted text from websites/articles.
- We store:
  - **Structured facts** we extracted (fields)
  - **Provenance** (URLs, timestamps, IDs)
  - **Short evidence snippets** (redacted) to explain why we believe a fact is true

---

## 2) Canonical storage model (what we aim for)

### A) The Brain stores **facts**, not raw text
Every stored fact should be a field (or a relationship) that can be:
- reviewed by a human
- traced back to a source
- promoted deterministically into Neo4j

### B) Required provenance on everything
Every POI/intelligence record must carry:
- `source_refs[]` (where it came from)
- optional `citations[]` (why we believe it; short snippets + anchors)

---

## 3) Allowed fields by **entity type**

### 3.1 POI (Point of Interest) – allowed fields

**Identity & location (allowed)**
- `poi_uid` (internal canonical ID)
- `name`
- `type/category` (mapped into LEXA categories)
- `destination_label` (MVP destination label or city label)
- `lat`, `lon`
- `address` (optional)

**Practicality (allowed)**
- `website` / `booking_url` / `booking_info` (links only)
- `phone` (optional)
- `opening_hours` (optional)
- `best_time` / `best_months` / `seasonality` (optional)
- `price_point_eur` (optional) / `price_band` (optional)

**Luxury layer (allowed)**
- `luxury_score` (0–10, nullable until enriched)
- `luxury_indicators[]` (e.g., “Michelin”, “members-only”, “private”, “yacht-accessible”)
- `luxury_score_confidence` (0–100)
- `luxury_evidence` (short text, redacted)

**Emotional layer (allowed)**
- `emotional_map[]`: `{ emotion_code_or_name, intensity_1_10, evidence }`
- `sensory_triggers[]` (strings)
- `client_archetypes[]` (objects or strings with match score + why)
- `conversation_triggers[]` (strings)
- `emotion_confidence` (0–100)

**Workflow & trust (allowed)**
- `confidence_score` (0–100)
- `verified`, `verified_by`, `verified_at`
- `enrichment_status`, `enriched_at`, `enrichment` (structured JSON)

**Provenance (required / allowed)**
- `source_refs[]` (see section 4)
- `citations[]` (see section 4)
- `created_at`, `created_by`, `updated_at`, `last_edited_by`, `last_edited_at`

**NOT allowed (POI)**
- Full scraped article/page text
- Full user-provided copyrighted documents embedded as plain text (unless stored as an uploaded file with “keep file”, see retention)
- Sensitive PII (passport numbers, credit cards, private addresses of individuals, medical info, etc.)

### 3.2 Destination – allowed fields
Destinations must be typed so cities don’t become “MVP yacht destinations”.

Allowed fields:
- `canonical_id` or `lexa_uid`
- `name`
- `kind`: `mvp_destination` | `city` | `region` | `country` | `area`
- optional geo bounds: `min_lat`, `min_lon`, `max_lat`, `max_lon`
- optional hierarchy labels: `area_name`, `region_name`, `country_name`, `continent_name`
- audit fields (`created_at`, `updated_at`, etc.)

### 3.3 Taxonomy nodes – allowed fields

**Emotion / Desire / Fear (canonical)**
- `code` (unique, stable)
- `name`
- `layer: LEXA_TAXONOMY`
- `updated_at`

**EmotionalTag (UX layer)**
- `name`
- `slug` (normalized unique key)
- `category` (Primary Emotion / Trigger / Desire / etc.)
- `intensity` (optional)

### 3.4 Theme category vs occasion type (do not merge)

**theme_category (core themes; used in chat + script engine)**
- `lexa_uid`, `name`, `description`, `short_description`, `icon`, `image_url`, `luxuryScore`, `evoked_feelings[]`

**occasion_type (facets/filters)**
- `slug`, `name`, `description`, `icon`, `color`, `display_order`, `source`, `is_active`

---

## 4) Provenance fields (required for investor-grade traceability)

### 4.1 `source_refs[]` (required)
Each entry is an object with:
- `source_type`: `upload` | `paste` | `url_scrape` | `manual` | `osm` | `overture` | `wikidata` | `market_intelligence` | `company_brain`
- `source_id`: internal ID (upload_id/scrape_id/etc.) or external ID
- `source_url`: optional (for scrape / market intel)
- `captured_at`: ISO timestamp
- `external_ids`: optional object (e.g., `{ osm_id, overture_id, wikidata_id }`)
- `license`: optional (when known for open sources)

### 4.2 `citations[]` (recommended)
Each citation is an object with:
- `source_ref_index` (index into `source_refs`)
- `anchor`: e.g. `page:3`, `section:"#about"`, `selector:"main h1"`
- `quote_snippet`: **max 300–500 chars**, **redacted**
- `hash`: optional checksum of the snippet (to detect changes)

---

## 5) How we handle text (uploads + scraping)

### Uploads (PDF/DOCX/etc.)
- If uploader chooses **Keep file**:
  - Store the original file in private storage (only uploader/admin can access).
  - Store extracted structured facts in Supabase (`extracted_pois`) with provenance.
- If uploader chooses **Dump file**:
  - Delete the file after extraction.
  - Still store extracted structured facts + provenance + short evidence snippets.

### URL scraping (restaurants, venues, articles)
- Do **not** store full HTML or full cleaned article text.
- Store only:
  - URL + timestamps (`source_refs`)
  - extracted structured facts
  - short redacted evidence snippets (`citations`)

### Market Intelligence
- Store:
  - source URL(s), captured_at
  - extracted insights + structured fields
  - citations/snippets (redacted, short)
- Do **not** store full article bodies.

### Company Brain
- Store:
  - extracted insights, learnings, script ideas (structured)
  - provenance (file IDs / upload references)
- Do **not** store the uploaded documents themselves (agent-specific override).

---

## 6) Retention rules (simple defaults)

### Always retained (indefinitely, unless manually deleted)
- Structured POI drafts (`extracted_pois`) and their provenance
- Promoted Neo4j canonical nodes/relationships + their provenance references
- Market Intelligence / Company Brain extracted insights (structured)

### Conditionally retained (user choice)
- Uploaded original files:
  - kept only when **Keep file** is selected
  - otherwise deleted immediately after extraction

### Temporary (auto-expire)
- Raw scrape payloads / intermediate cleaned text: **do not persist**
- Processing logs: keep **30 days** (or platform default)

---

## 7) Enforcement checklist (what every agent must do)

Before writing to Supabase or Neo4j, every agent must:
1. Apply **named-only ingestion gate** (drop unreviewable POIs)
2. Normalize into the canonical POI contract (fields, not blobs)
3. Attach `source_refs[]` (required) and `citations[]` (recommended)
4. Redact PII in any evidence snippet
5. Never store full scraped article bodies

