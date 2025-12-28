# Pilot10 POI Ingestion (Supabase canonical tables)

## Goal
Seed the **10 pilot destinations** into `destinations_geo`, then ingest POIs **destination-by-destination** (pilot first, then the other 9).

## 1) Seed destinations into Supabase
This populates `destinations_geo` from `docs/destinations_bbox_pilot10.json`.

```bash
npm run destinations:seed
npm run destinations:list
```

## 2) Pilot ingestion (recommended)
Start with **French Riviera**:

```bash
npm run ingest:destination -- "French Riviera" --wikidata --projectNeo4j
```

## 3) Continue the other 9 one-by-one
This runs the same steps sequentially for the pilot10 list (starting with your pilot):

```bash
npm run ingest:pilot10 -- "French Riviera" --wikidata --projectNeo4j
```

## 4) Adding Overture + Foursquare OS (file-based)
Overture and FSQ ingestion scripts expect **local files** (GeoJSON / NDJSON). Once you have the files:

```bash
npm run ingest:destination -- "French Riviera" --overture "C:\\path\\overture_fr.geojson"
npm run ingest:destination -- "French Riviera" --fsq "C:\\path\\fsq_fr.ndjson"
```

Or combine:

```bash
npm run ingest:destination -- "French Riviera" --wikidata --overture "C:\\path\\overture_fr.geojson" --fsq "C:\\path\\fsq_fr.ndjson" --projectNeo4j
```



