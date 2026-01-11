# Knowledge Nuggets (Unstructured Knowledge Inbox)

Knowledge Nuggets solve a specific problem: during document extraction / URL scraping we often find **valuable facts** that are **not a valid POI** yet (because there is no clear place name).

Instead of throwing these away (or polluting the POI table), we store them as Nuggets so Captains can enrich + convert them safely.

---

## 1) How Nuggets are detected

During ingestion (uploads/scrapes), if an extracted “POI” has a `name` that looks like a **sentence fragment** (too long, multiple sentences, starts with “by/and/it/this…”, etc.):

- We **do not** create an `extracted_pois` row.
- We create a `knowledge_nuggets` row instead.

This keeps the POI dataset clean while preserving the information for later use.

---

## 2) Where Nuggets are stored

Supabase table:
- `knowledge_nuggets`

Core fields:
- `nugget_type` (event / poi_fragment / brand_signal / pricing_signal / etc.)
- `destination` (optional)
- `text` (the nugget content)
- `source_refs` (provenance; required for investor-grade traceability)
- `citations` (optional but recommended)
- `enrichment` (JSONB: extracted facts, suggested POI name, etc.)

---

## 3) How Nuggets are displayed (Captain UI)

You can review Nuggets in:
- **Captain Portal → Browse, Verify & Enhance → Nuggets tab**

Actions:
- **⚡ Enrich**: uses Tavily + Claude to classify the nugget and extract structured facts + citations (without storing full scraped text).
- **✨ Convert to POI**: prompts you for the *real place name* and creates a POI draft in `extracted_pois`.
- **Delete**: removes the nugget if it is irrelevant / low-value.

---

## 4) Why this matters (Brain Hardening)

- Prevents “garbage POIs” from entering the POI workflow.
- Preserves real-time/fresh knowledge signals (events, restrictions, openings, brand signals).
- Keeps everything **grounded** with provenance and minimal stored text for legal safety.

