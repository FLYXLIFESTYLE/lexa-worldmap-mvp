-- 022_experience_entities_geo_indexes.sql
--
-- Purpose:
-- Speed up bbox queries like:
--   lat BETWEEN ... AND ... AND lon BETWEEN ... AND ...
--
-- Why:
-- Scripts like `npm run destinations:coverage` and `npm run destinations:sources`
-- can hit Postgres statement timeouts without geo-friendly indexes.

CREATE INDEX IF NOT EXISTS idx_experience_entities_lat ON experience_entities(lat);
CREATE INDEX IF NOT EXISTS idx_experience_entities_lon ON experience_entities(lon);
CREATE INDEX IF NOT EXISTS idx_experience_entities_lat_lon ON experience_entities(lat, lon);

