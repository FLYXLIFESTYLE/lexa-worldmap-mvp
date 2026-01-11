-- 023_experience_entity_destination_links.sql
--
-- Purpose:
-- Our canonical entities and sources are globally deduped (e.g. Wikidata QIDs),
-- but a single entity can belong to multiple destination bboxes.
--
-- This migration adds:
-- 1) experience_entity_destinations: entity ↔ destination membership
-- 2) experience_entity_destination_sources: destination-specific source pointers
--    (so "ingestion overview" can show Wikidata/OSM/Overture counts per destination)
--
-- It also backfills both tables from existing data where experience_entities.destination_id is set.

-- -----------------------------------------------------------------------------
-- 1) Entity ↔ Destination membership
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_entity_destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES experience_entities(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES destinations_geo(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_experience_entity_destinations_destination ON experience_entity_destinations(destination_id);
CREATE INDEX IF NOT EXISTS idx_experience_entity_destinations_entity ON experience_entity_destinations(entity_id);

-- -----------------------------------------------------------------------------
-- 2) Destination-specific sources (pointers, not full raw payload)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_entity_destination_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id UUID NOT NULL REFERENCES destinations_geo(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES experience_entities(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN (
    'foursquare_os',
    'overture',
    'osm',
    'wikidata',
    'wikipedia',
    'manual',
    'other'
  )),
  source_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (destination_id, source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_experience_entity_destination_sources_destination ON experience_entity_destination_sources(destination_id);
CREATE INDEX IF NOT EXISTS idx_experience_entity_destination_sources_entity ON experience_entity_destination_sources(entity_id);
CREATE INDEX IF NOT EXISTS idx_experience_entity_destination_sources_source ON experience_entity_destination_sources(source);

-- -----------------------------------------------------------------------------
-- 3) Backfill from existing destination_id fields (best-effort)
-- -----------------------------------------------------------------------------
INSERT INTO experience_entity_destinations (entity_id, destination_id)
SELECT e.id, e.destination_id
FROM experience_entities e
WHERE e.destination_id IS NOT NULL
ON CONFLICT (entity_id, destination_id) DO NOTHING;

INSERT INTO experience_entity_destination_sources (destination_id, entity_id, source, source_id)
SELECT e.destination_id, s.entity_id, s.source, s.source_id
FROM experience_entity_sources s
JOIN experience_entities e ON e.id = s.entity_id
WHERE e.destination_id IS NOT NULL
ON CONFLICT (destination_id, source, source_id) DO NOTHING;

