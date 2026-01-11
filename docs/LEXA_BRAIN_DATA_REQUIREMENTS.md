# LEXA Brain - Data Requirements (Extraction + Generation)

This document defines the **minimum data required** to keep LEXA's Brain consistent, reviewable, and investor-ready when we ingest from:

- **Generation (open sources)**: OSM / Overture / Wikidata
- **Extraction (our owned inputs)**: uploads, paste, scraping, manual entry (including yacht destinations)

Important policy decisions for MVP:
- **No Foursquare** ingestion/storage until an enterprise contract explicitly permits the use-case.
- **No paid enrichment APIs** (e.g., Google Places) for MVP. We rely on open sources + scraping + manual enrichment.
- **Avoid unnamed POIs**: do not ingest/create POIs that cannot be reviewed and approved.
- **Auto-merge** only when match confidence is high; otherwise require manual review.

See also:
- **Field allowlist + retention policy**: [`docs/LEXA_BRAIN_FIELD_ALLOWLIST_POLICY.md`](docs/LEXA_BRAIN_FIELD_ALLOWLIST_POLICY.md)
- **Canonical POI contract (Step 2)**: [`docs/LEXA_CANONICAL_POI_CONTRACT.md`](docs/LEXA_CANONICAL_POI_CONTRACT.md)

---

## 1) Core principle: a POI must be reviewable

If a record cannot be reviewed and approved by a human, it does not belong in the Brain.

### Hard rejection (do not store)
A generated/extracted POI should be **dropped** if any of the following are true:
- **Name is missing or empty**
- **Name is clearly a placeholder** (e.g., "Unnamed", "Unknown", "N/A")
- **No coordinates** (lat/lon missing) *and* no reliable destination anchoring (for MVP)
- **No type/category** that can be mapped into our POI types

Rationale: you cannot approve, score, or relate these reliably.

### Route-to-nugget (do not create a POI, but do not lose the information)
Some “POIs” coming from uploads/scrapes are actually **valuable sentence fragments** (e.g., “by the French family behind Pernod Ricard…”).

Policy:
- If `name` **looks like a sentence/paragraph fragment**, we do **NOT** store it as a POI draft.
- Instead, we store it as a **Knowledge Nugget** in `knowledge_nuggets` so it can be enriched, classified, and (optionally) converted to a real POI by a Captain.

Captain workflow:
- Review nuggets in **Captain Portal → Browse, Verify & Enhance → Nuggets tab**
- Use **⚡ Enrich** to extract structured facts + citations
- Use **✨ Convert to POI** only after confirming the real place name

---

## 2) The Minimum POI Contract (MVP investor-ready)

This is the minimum field set that every POI must satisfy to enter the workflow.

### A) Identity (must-have)
- **name**: string
- **poi_type**: string (hotel, restaurant, beach club, marina, activity, museum, etc.)
- **destination_label**: string (e.g., "Monaco", "St. Tropez", "French Riviera")
- **lat**: number
- **lon**: number

### B) Provenance / traceability (must-have)
- **source_refs**: array of objects, each containing:
  - `source_type`: `upload` | `paste` | `url_scrape` | `manual` | `osm` | `overture` | `wikidata`
  - `source_id`: ID in our DB (upload_id / scrape_id) or external ID (overture_id/wikidata_id/osm_id)
  - `source_url`: optional url
  - `captured_at`: timestamp
- **citations** (optional but recommended): pointers to where a fact came from (page section, quote, etc.)

### C) Workflow / trust (must-have)
- **confidence_score**: 0-100 (default 80 for drafts)
- **verified**: boolean
- **verified_by / verified_at**: audit trail
- **enrichment_status**: `draft` | `needs_enrichment` | `enriched` | `verified` | `promoted`
- **last_enriched_at**: timestamp (nullable)

### D) Emotional layer (minimum viable for emotional matching)
For investor readiness, this is the minimum set that enables LEXA to say "why" a POI fits a client:
- **emotional_map**: array of `{ emotion, intensity_1_10, evidence }`
  - Minimum: **3 emotions** per POI when coming from extraction/scraping/manual enrichment
  - For generated POIs (OSM/Overture/Wikidata): can start empty and be filled by later enrichment
- **sensory_triggers**: array of strings (smell/taste/sound/sight/touch cues) when available

### E) Luxury layer (MVP without paid APIs)
Without paid APIs, luxury scoring must be explainable and can be partial:
- **luxury_score**: 0-10 (nullable until enriched)
- **luxury_indicators**: array of strings ("Michelin", "private", "members-only", "yacht accessible", etc.)
- **luxury_score_confidence**: 0-100 (how confident we are in the score)

### F) Practicality (recommended)
- **address**: string (nullable)
- **booking_url / booking_info**: string (nullable)
- **best_time**: string (nullable)
- **keywords**: array of strings
- **themes**: array of theme slugs/names (14 themes)
- Yacht: `yacht_accessible`, `marina_distance` (nullable)

---

## 3) Where these fields live today in LEXA

LEXA currently has two relevant storage shapes:

### A) Captain extraction workflow (Supabase)
- Table: `captain_uploads`
- Table: `extracted_pois`

This is the "review/edit/verify/promote" workflow used by Upload/Scrape/Manual Entry.

### B) Open-source generation workflow (Supabase)
- Table: `experience_entities` + `experience_entity_sources`

This is used by scripts like Overture/Wikidata ingestion.

### Target state (recommended)
Treat open-source generated POIs as **drafts that still go through a human approval workflow**.

Two valid implementation options:
1) **Unify**: all generated POIs also land in `extracted_pois` (single workflow), or
2) **Bridge**: keep `experience_entities` as the generated base layer, but add linking so uploads/scrapes can match/merge into it.

For investor readiness, either is fine as long as:
- duplicates are controlled
- provenance is preserved
- promotion into Neo4j is deterministic

---

## 4) Matching & merge requirements (uploads/scrapes vs generated)

When we extract POIs from documents/URLs, we must match them to generated POIs when possible.

### A) Matching signals (ranked)
1) **Exact external ID match** (when available):
   - OSM: `osm_id`
   - Overture: `overture_id`
   - Wikidata: `wikidata_id`
2) **High-confidence geo+name match**
   - distance threshold (typical): 50-150m depending on type
   - strong name similarity (case-insensitive, normalized)
   - destination_label compatible
3) **Weak match** -> human review

### B) Auto-merge policy
- Auto-merge only when confidence is high.
- Otherwise, store a `possible_duplicate_of` link and require manual decision.

### C) Merge behavior (what merges)
- Keep the most trusted identity fields (name/coords/type)
- Append provenance (`source_refs`)
- Prefer verified/enriched emotional data over generated base data
- Never delete provenance

---

## 5) Practical minimums: can free sources provide enough?

Yes for **identity + geometry + category**. No for **luxury + emotional mapping**.

So our pipeline must treat open-source POIs as a **skeleton** that becomes valuable through:
- scraping official sites
- document uploads (brochures/itineraries)
- manual enrichment by captains

This is acceptable for an investor MVP because:
- the workflow is clear and scalable
- the “emotional layer” is demonstrably buildable and traceable

---

## 6) Checklist for extractor outputs (documents/URLs/manual)

For each extracted POI, the extractor should aim to output:
- Identity fields (name/type/destination/lat/lon if available)
- 3+ emotions with evidence (when source supports it)
- luxury indicators (with evidence)
- booking info / best time / tips when present
- citations or at least a short evidence string per claim

If the extractor cannot produce coordinates:
- it must still provide enough **address + destination** to enable later geocoding/manual fix.

