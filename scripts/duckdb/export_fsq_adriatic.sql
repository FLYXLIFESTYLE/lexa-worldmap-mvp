-- Export FSQ OS Places subsets for the 3 Adriatic destinations (North/Central/South).
--
-- Assumptions:
-- - You already ran ATTACH and can query: SELECT * FROM places.datasets.places_os LIMIT 1;
-- - The output folder exists: C:\Users\chris\data\adriatic\
--
-- Why JSON (NDJSON):
-- - Our Node ingester (`npm run ingest:fsq`) supports JSON array or NDJSON.
-- - For big destinations, NDJSON is safer (streaming) and avoids memory spikes.

-- Adriatic (North) bbox: [minLon=12.0, minLat=44.8, maxLon=15.8, maxLat=46.9]
COPY (
  SELECT
    fsq_place_id,
    name,
    bbox,
    -- FSQ schema in the Iceberg catalog exposes category arrays as:
    -- - fsq_category_labels (array of strings)
    -- - fsq_category_ids (array of strings/ints)
    -- We alias labels as `categories` to match our ingester expectations.
    fsq_category_labels AS categories,
    fsq_category_ids AS category_ids
  FROM places.datasets.places_os
  WHERE bbox.xmin <= 15.8 AND bbox.xmax >= 12.0
    AND bbox.ymin <= 46.9 AND bbox.ymax >= 44.8
) TO 'C:\Users\chris\data\adriatic\fsq_adriatic_north_places.ndjson' (FORMAT JSON, ARRAY false);

-- Adriatic (Central) bbox: [minLon=12.8, minLat=43.2, maxLon=17.8, maxLat=44.9]
COPY (
  SELECT
    fsq_place_id,
    name,
    bbox,
    fsq_category_labels AS categories,
    fsq_category_ids AS category_ids
  FROM places.datasets.places_os
  WHERE bbox.xmin <= 17.8 AND bbox.xmax >= 12.8
    AND bbox.ymin <= 44.9 AND bbox.ymax >= 43.2
) TO 'C:\Users\chris\data\adriatic\fsq_adriatic_central_places.ndjson' (FORMAT JSON, ARRAY false);

-- Adriatic (South) bbox: [minLon=13.5, minLat=40.9, maxLon=19.8, maxLat=43.3]
COPY (
  SELECT
    fsq_place_id,
    name,
    bbox,
    fsq_category_labels AS categories,
    fsq_category_ids AS category_ids
  FROM places.datasets.places_os
  WHERE bbox.xmin <= 19.8 AND bbox.xmax >= 13.5
    AND bbox.ymin <= 43.3 AND bbox.ymax >= 40.9
) TO 'C:\Users\chris\data\adriatic\fsq_adriatic_south_places.ndjson' (FORMAT JSON, ARRAY false);


