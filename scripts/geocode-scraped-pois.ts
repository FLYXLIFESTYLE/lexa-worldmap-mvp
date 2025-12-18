/**
 * Geocode Scraped POIs
 * 
 * Adds coordinates to POIs that were scraped without lat/lon
 * Uses Google Places API to geocode addresses
 * 
 * Run: npx ts-node scripts/geocode-scraped-pois.ts
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

const driver = neo4j.driver(
  process.env.NEO4J_URI || '',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || ''
  )
);

interface POIToGeocode {
  poi_uid: string;
  name: string;
  city: string;
  country: string;
  type: string;
}

async function getPOIsWithoutCoordinates(session: neo4j.Session): Promise<POIToGeocode[]> {
  const result = await session.run(`
    MATCH (p:poi)
    WHERE (p.source IN ['forbes', 'michelin', 'conde_nast', 'worlds_50_best', 'relais_chateaux'])
      AND (p.lat IS NULL OR p.lon IS NULL)
      AND p.city IS NOT NULL
    RETURN p.poi_uid as poi_uid,
           p.name as name,
           p.city as city,
           p.country as country,
           p.type as type
    LIMIT 100
  `);
  
  return result.records.map(record => ({
    poi_uid: record.get('poi_uid'),
    name: record.get('name'),
    city: record.get('city'),
    country: record.get('country'),
    type: record.get('type')
  }));
}

async function geocodePOI(poi: POIToGeocode): Promise<{ lat: number; lon: number } | null> {
  const query = `${poi.name}, ${poi.city}, ${poi.country}`;
  
  try {
    const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.location,places.displayName'
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: 0,
              longitude: 0
            },
            radius: 50000
          }
        }
      })
    });
    
    if (!response.ok) {
      console.error(`  ❌ Geocoding failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.places || data.places.length === 0) {
      console.log(`  ⚠️  No results found`);
      return null;
    }
    
    const place = data.places[0];
    const lat = place.location.latitude;
    const lon = place.location.longitude;
    
    return { lat, lon };
    
  } catch (error) {
    console.error(`  ❌ Error geocoding ${poi.name}:`, error);
    return null;
  }
}

async function updatePOICoordinates(session: neo4j.Session, poi_uid: string, lat: number, lon: number) {
  await session.run(`
    MATCH (p:poi {poi_uid: $poi_uid})
    SET p.lat = $lat,
        p.lon = $lon,
        p.geocoded_at = datetime()
  `, {
    poi_uid,
    lat: neo4j.float(lat),
    lon: neo4j.float(lon)
  });
}

async function main() {
  console.log('📍 Geocoding Scraped POIs');
  console.log('=========================\n');
  
  const session = driver.session();
  
  let totalGeocoded = 0;
  let totalFailed = 0;
  
  try {
    while (true) {
      // Get batch of POIs without coordinates
      const pois = await getPOIsWithoutCoordinates(session);
      
      if (pois.length === 0) {
        console.log('\n✅ All POIs have been geocoded!');
        break;
      }
      
      console.log(`\n📍 Geocoding batch of ${pois.length} POIs...\n`);
      
      for (const poi of pois) {
        console.log(`🔍 ${poi.name} (${poi.city}, ${poi.country})`);
        
        const coords = await geocodePOI(poi);
        
        if (coords) {
          await updatePOICoordinates(session, poi.poi_uid, coords.lat, coords.lon);
          console.log(`  ✅ Geocoded: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
          totalGeocoded++;
        } else {
          totalFailed++;
        }
        
        // Rate limiting: Wait 0.5 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`\n📊 Progress: ${totalGeocoded} geocoded, ${totalFailed} failed`);
    }
    
    console.log('\n\n' + '='.repeat(50));
    console.log('✅ GEOCODING COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📊 Results:`);
    console.log(`   - Successfully geocoded: ${totalGeocoded}`);
    console.log(`   - Failed to geocode: ${totalFailed}`);
    console.log(`   - Success rate: ${Math.round(totalGeocoded / (totalGeocoded + totalFailed) * 100)}%`);
    console.log('\n💡 Next steps:');
    console.log('   1. Create LOCATED_IN relationships');
    console.log('   2. Create emotional relationships');
    console.log('   3. Link to activities');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();

