# MVP Destination POI Ingestion Runbook (OSM + Wikidata + Overture)

This runbook explains the simplest “beginner safe” path to ingest POIs for the 12 MVP destinations.

Targets (Supabase canonical layer):
- `experience_entities`
- `experience_entity_sources`

---

## 0) One-time prerequisites

- Ensure Supabase migrations are up to date:
  - `20251227001_experience_graph_core.sql`
  - `021_knowledge_nuggets.sql`
  - `022_experience_entities_geo_indexes.sql` (recommended for bbox queries + reporting)
  - `023_experience_entity_destination_links.sql` (required for accurate per-destination ingestion overview)

---

## 1) Wikidata ingestion (open + online)

Wikidata is the easiest ingestion because it doesn’t require local data files.

Run for one destination:

```bash
npm run ingest:wikidata -- "French Riviera"
```

Run for all MVP destinations (sequence runner):

```bash
npm run ingest:seq -- "French Riviera" --config "docs/destinations_bbox_mvp12.json" --wikidata
```

Notes:
- The script is **idempotent** (safe to re-run): it skips existing `(source='wikidata', source_id)` rows.
- Current SPARQL query uses `LIMIT 500` per destination as a safe first pass.

---

## 2) OSM ingestion (from local JSONL exports)

OSM ingestion uses local `data_raw/*.jsonl` files (one destination per file).

Run for one destination:

```bash
npm run ingest:destination -- "BVI" --osm "data_raw/bvi.jsonl"
```

Run for all MVP destinations (repeat per destination):
- `French Riviera` → `data_raw/french_riviera.jsonl`
- `Amalfi Coast` → `data_raw/amalfi_coast.jsonl`
- `Balearics` → `data_raw/balearics.jsonl`
- `Cyclades` → `data_raw/cyclades.jsonl`
- `BVI` → `data_raw/bvi.jsonl`
- `USVI` → `data_raw/usvi.jsonl`
- `Bahamas` → `data_raw/bahamas.jsonl`
- `French Antilles` → `data_raw/french_antilles.jsonl`
- `Adriatic (North)` → `data_raw/adriatic_(north).jsonl`
- `Adriatic (Central)` → `data_raw/adriatic_(central).jsonl`
- `Adriatic (South)` → `data_raw/adriatic_(south).jsonl`
- `Ionian Sea` → `data_raw/ionian_sea.jsonl`

Notes:
- Named-POI-only: rows without a usable `name` are skipped.
- Idempotent by `experience_entity_sources(source='osm', source_id)`.

---

## 3) Overture ingestion (requires local GeoJSON)

Overture ingestion expects a local GeoJSON file path per destination:

```bash
npm run ingest:destination -- "French Riviera" --overture "C:\\path\\to\\overture_fr.geojson"
```

This is optional until we decide the exact download/extract workflow for Overture datasets.

