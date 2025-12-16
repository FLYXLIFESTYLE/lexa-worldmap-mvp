/**
 * Enrichment Module for Unnamed POIs
 * Instead of deleting unnamed POIs, try to find their names from external sources
 */

import { getNeo4jDriver } from './client';
import type { Session } from 'neo4j-driver';

interface UnnamedPOI {
  id: string;
  name: string;
  type?: string;
  lat?: number;
  lon?: number;
  poi_uid?: string;
  source_id?: string;
}

interface EnrichmentResult {
  found: number;
  enriched: number;
  failed: number;
  deleted: number;
}

/**
 * Enrich unnamed POIs by fetching their actual names from external sources
 */
export async function enrichUnnamedPOIs(): Promise<EnrichmentResult> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  const stats: EnrichmentResult = {
    found: 0,
    enriched: 0,
    failed: 0,
    deleted: 0,
  };

  try {
    // Find unnamed POIs with coordinates (can be enriched)
    const result = await session.run(`
      MATCH (p:poi)
      WHERE p.name =~ 'Unnamed POI \\(osm:.*\\)'
        AND p.lat IS NOT NULL
        AND p.lon IS NOT NULL
      RETURN 
        id(p) as id,
        p.name as name,
        p.type as type,
        p.lat as lat,
        p.lon as lon,
        p.poi_uid as poi_uid,
        p.source_id as source_id
      LIMIT 100
    `);

    stats.found = result.records.length;
    console.log(`[Enrichment] Found ${stats.found} unnamed POIs with coordinates`);

    for (const record of result.records) {
      const poi: UnnamedPOI = {
        id: record.get('id').toString(),
        name: record.get('name'),
        type: record.get('type'),
        lat: record.get('lat'),
        lon: record.get('lon'),
        poi_uid: record.get('poi_uid'),
        source_id: record.get('source_id'),
      };

      try {
        console.log(`\n[Enrichment] Processing: ${poi.name}`);
        
        // Try to enrich from external sources
        const enrichedName = await findPOIName(poi);

        if (enrichedName) {
          // Update POI with found name
          await session.run(`
            MATCH (p:poi)
            WHERE id(p) = $id
            SET 
              p.name = $name,
              p.enriched_at = datetime(),
              p.enrichment_source = $source
          `, {
            id: parseInt(poi.id),
            name: enrichedName.name,
            source: enrichedName.source,
          });

          stats.enriched++;
          console.log(`  ✓ Enriched POI ${poi.id}: "${enrichedName.name}"`);
        } else {
          stats.failed++;
          console.log(`  ✗ Could not find name for POI ${poi.id}`);
        }
        
        // Respect OSM rate limit: 2 requests per second
        await new Promise(resolve => setTimeout(resolve, 600));
        
      } catch (error) {
        stats.failed++;
        console.error(`  Error enriching POI ${poi.id}:`, error);
      }
    }

    // Delete POIs that have no coordinates AND no type (truly useless)
    const deleteResult = await session.run(`
      MATCH (p:poi)
      WHERE (p.name IS NULL OR p.name = '' OR trim(p.name) = '')
        AND (p.lat IS NULL OR p.lon IS NULL)
        AND (p.type IS NULL OR p.type = '')
      WITH p LIMIT 100
      DETACH DELETE p
      RETURN count(p) as deleted
    `);

    stats.deleted = deleteResult.records[0]?.get('deleted')?.toNumber() || 0;
    if (stats.deleted > 0) {
      console.log(`  Deleted ${stats.deleted} unusable POIs (no name, no coords, no type)`);
    }

    return stats;
  } finally {
    await session.close();
  }
}

/**
 * Find POI name from external sources
 */
async function findPOIName(poi: UnnamedPOI): Promise<{ name: string; source: string } | null> {
  // 1. Try OSM Overpass API (free, no API key needed)
  // Extract OSM ID from name like "Unnamed POI (osm:osm_node_534226067)"
  const osmIdMatch = poi.name.match(/osm:(osm_[a-z]+_\d+)/);
  if (osmIdMatch) {
    const osmId = osmIdMatch[1]; // e.g., "osm_node_534226067"
    const osmName = await fetchFromOSM(osmId, poi.type);
    if (osmName) {
      return { name: osmName, source: 'osm_overpass' };
    }
  }
  
  // Also check source_id property (backup method)
  if (poi.source_id?.startsWith('osm:')) {
    const osmId = poi.source_id.replace('osm:', '');
    const osmName = await fetchFromOSM(osmId, poi.type);
    if (osmName) {
      return { name: osmName, source: 'osm_overpass' };
    }
  }

  // 2. Try reverse geocoding (get address-based name)
  const addressName = await reverseGeocode(poi.lat!, poi.lon!, poi.type);
  if (addressName) {
    return { name: addressName, source: 'reverse_geocode' };
  }

  // 3. Try Google Places API (requires API key, costs money)
  // Commented out to avoid costs during development
  /*
  if (process.env.GOOGLE_PLACES_API_KEY) {
    const googleName = await fetchFromGooglePlaces(poi.lat!, poi.lon!, poi.type);
    if (googleName) {
      return { name: googleName, source: 'google_places' };
    }
  }
  */

  return null;
}

/**
 * Fetch POI name from OSM Overpass API
 */
async function fetchFromOSM(osmId: string, type?: string): Promise<string | null> {
  try {
    // Parse OSM ID format: "osm_node_534226067" -> type: node, id: 534226067
    let osmType = 'node';
    let numericId = osmId;
    
    if (osmId.includes('_')) {
      const parts = osmId.split('_');
      if (parts.length >= 3) {
        // Format: osm_node_534226067
        osmType = parts[1]; // "node", "way", or "relation"
        numericId = parts[2]; // "534226067"
      }
    } else if (osmId.startsWith('n') || osmId.startsWith('w') || osmId.startsWith('r')) {
      // Format: n534226067, w123456, r789012
      osmType = osmId.startsWith('n') ? 'node' : osmId.startsWith('w') ? 'way' : 'relation';
      numericId = osmId.substring(1);
    }
    
    const query = `
      [out:json][timeout:10];
      ${osmType}(${numericId});
      out tags;
    `;

    console.log(`  [OSM] Querying ${osmType} ${numericId}...`);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'User-Agent': 'LEXA-Travel-App/1.0',
      },
    });

    if (!response.ok) {
      console.error(`  [OSM] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.elements && data.elements.length > 0) {
      const element = data.elements[0];
      const tags = element.tags || {};
      
      // Try various name fields in OSM
      const name = tags.name 
        || tags['name:en'] 
        || tags.official_name 
        || tags.alt_name
        || tags.loc_name
        || null;
        
      if (name) {
        console.log(`  [OSM] ✓ Found: "${name}"`);
      } else {
        console.log(`  [OSM] ✗ No name found in tags`);
      }
      
      return name;
    }

    console.log(`  [OSM] ✗ Element not found`);
    return null;
  } catch (error) {
    console.error('  [OSM] Error:', error);
    return null;
  }
}

/**
 * Generate a name based on reverse geocoding + type
 */
async function reverseGeocode(lat: number, lon: number, type?: string): Promise<string | null> {
  try {
    // Use free Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          'User-Agent': 'LEXA-Travel-App/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const address = data.address || {};

    // Generate a descriptive name based on type + location
    if (type && address.city) {
      const typeNames: Record<string, string> = {
        'restaurant': 'Restaurant',
        'cafe': 'Café',
        'hotel': 'Hotel',
        'beach': 'Beach',
        'park': 'Park',
        'museum': 'Museum',
        'viewpoint': 'Viewpoint',
        'attraction': 'Attraction',
      };

      const typeName = typeNames[type.toLowerCase()] || type;
      const location = address.suburb || address.neighbourhood || address.city;
      
      return `${typeName} in ${location}`;
    }

    // Fallback: use road name or city name
    if (address.road) {
      return address.road;
    } else if (address.city) {
      return `Location in ${address.city}`;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Fetch POI name from Google Places API
 * Note: Requires API key and costs money ($17 per 1000 requests)
 */
async function fetchFromGooglePlaces(lat: number, lon: number, type?: string): Promise<string | null> {
  // TODO: Implement when API key is available
  return null;
}

