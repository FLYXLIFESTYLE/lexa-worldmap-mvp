# Captain Browse Guide (POI Review List)

Path: `/captain/browse`

## What you see
- **Destination** = the region/theme bucket (e.g., `French Riviera`)
- **City** = the specific place inside the destination (e.g., `Cannes`)
- **Confidence %** = your quality/accuracy confidence for this POI (0–100)
- **Quality badge** is derived from confidence:
  - **Excellent**: ≥ 90
  - **Good**: ≥ 80
  - **Fair**: 60–79
  - **Poor**: < 60

## Import Generated POIs (OSM/Wikidata/Overture)
The import is **idempotent** (re-running updates existing rows instead of duplicating).

To import in batches:
- Batch 1: `skip=0`, `limit=500`
- Batch 2: `skip=500`, `limit=500`
- Batch 3: `skip=1000`, ...

## Edit a POI
Click **Edit & Enhance** to edit:
- Name, Category, Destination, **City**
- Description
- Tags (keywords)
- Confidence (0–100)
- Luxury score (0–10)

## Enrich (Tavily + Claude)
Click **Enrich** to fill missing fields and add citations.

Confidence policy:
- Enrichment sets confidence to **at least 70%** (never reduces higher values like 80% from uploads).

## Bulk actions (select multiple POIs)
Use the checkbox next to each POI (and **Select all visible**) to run bulk actions:
- **Verify selected** (marks approved)
- **Mark enhanced** (without running enrichment)
- **Set confidence** (sets the same confidence for selected rows)
- **Delete** (removes drafts from the review list)

