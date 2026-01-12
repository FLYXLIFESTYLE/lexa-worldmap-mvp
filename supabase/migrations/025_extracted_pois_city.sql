-- Add city field to extracted_pois
-- Migration: 025_extracted_pois_city.sql
-- Description: Adds a dedicated city column so POIs can be "French Riviera" AND "Cannes/Nice/etc."

ALTER TABLE extracted_pois
ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN extracted_pois.city IS 'City/locality for the POI (e.g., Cannes), separate from destination region (e.g., French Riviera)';

