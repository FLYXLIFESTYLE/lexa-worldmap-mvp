/**
 * Reverse Geocoding for POIs
 * 
 * Uses Google Geocoding API to find city names from coordinates
 * Cost: $5 per 1,000 requests (first 40K/month free)
 * 
 * Note: Nominatim cannot be used - their policy forbids bulk geocoding
 * Source: https://operations.osmfoundation.org/policies/nominatim/
 * 
 * Processes POIs without city relationships and adds city property + LOCATED_IN relationship
 * 
 * Setup:
 * 1. Get API key: https://console.cloud.google.com/apis/credentials
 * 2. Enable Geocoding API
 * 3. Add to .env: GOOGLE_GEOCODING_API_KEY=your_key_here
 * 
 * Run: npx ts-node scripts/reverse-geocode-pois.ts
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';
import axios from 'axios';

dotenv.config({ path: '.env.local' });
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || '',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || ''
  )
);

const GOOGLE_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_GEOCODING_API_KEY or GOOGLE_PLACES_API_KEY not found in .env');
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          latlng: `${lat},${lon}`,
          key: GOOGLE_API_KEY,
          result_type: 'locality|administrative_area_level_3'
        },
        timeout: 10000
      }
    );
    
    if (response.data.status !== 'OK') {
      console.error(`  ⚠️  Geocoding failed: ${response.data.status}`);
      return null;
    }
    
    // Extract city name from address components
    const result = response.data.results[0];
    if (!result) return null;
    
    const cityComponent = result.address_components.find((comp: any) => 
      comp.types.includes('locality') || 
      comp.types.includes('administrative_area_level_3') ||
      comp.types.includes('postal_town')
    );
    
    return cityComponent?.long_name || null;
    
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('  ⚠️  Rate limit exceeded, waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      return reverseGeocode(lat, lon); // Retry
    }
    console.error(`  ❌ Failed to geocode: ${error.message}`);
    return null;
  }
}

async function processBatch(batchSize: number = 1000) {
  const session = driver.session();
  
  try {
    // Get POIs without city but with coordinates
    const result = await session.run(`
      MATCH (p:poi)
      WHERE p.city IS NULL 
        AND p.lat IS NOT NULL 
        AND p.lon IS NOT NULL
        AND NOT (p)-[:LOCATED_IN]->(:city)
      RETURN p.poi_uid as poi_uid, 
             p.name as name, 
             p.lat as lat, 
             p.lon as lon
      LIMIT $batchSize
    `, { batchSize: neo4j.int(batchSize) });
    
    const pois = result.records.map(r => ({
      poi_uid: r.get('poi_uid'),
      name: r.get('name'),
      lat: r.get('lat'),
      lon: r.get('lon')
    }));
    
    if (pois.length === 0) {
      return { total: 0, success: 0, failed: 0 };
    }
    
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`[${i + 1}/${pois.length}] ${poi.name || 'Unnamed'}`);
      
      const cityName = await reverseGeocode(poi.lat, poi.lon);
      
      if (cityName) {
        // Update POI with city name and create relationship
        await session.run(`
          MATCH (p:poi {poi_uid: $poi_uid})
          SET p.city = $cityName
          MERGE (c:city {name: $cityName})
          MERGE (p)-[:LOCATED_IN {
            confidence: 0.85, 
            source: 'reverse_geocoding',
            created_at: datetime()
          }]->(c)
        `, {
          poi_uid: poi.poi_uid,
          cityName
        });
        
        console.log(`  ✅ ${cityName}`);
        successCount++;
      } else {
        console.log(`  ❌ No city found`);
        failedCount++;
      }
      
      // Rate limit: Google allows ~50 requests/second, but we'll be conservative
      if (i < pois.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 20 req/sec
      }
    }
    
    return { total: pois.length, success: successCount, failed: failedCount };
    
  } finally {
    await session.close();
  }
}

async function getStatistics() {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi)
      RETURN count(*) as total,
             count(CASE WHEN p.lat IS NOT NULL AND p.lon IS NOT NULL THEN 1 END) as with_coords,
             count(CASE WHEN (p)-[:LOCATED_IN]->(:city) THEN 1 END) as with_city,
             count(CASE WHEN p.lat IS NOT NULL AND p.lon IS NOT NULL AND NOT (p)-[:LOCATED_IN]->(:city) THEN 1 END) as need_geocoding
    `);
    
    const record = result.records[0];
    return {
      total: record.get('total').toNumber(),
      withCoords: record.get('with_coords').toNumber(),
      withCity: record.get('with_city').toNumber(),
      needGeocoding: record.get('need_geocoding').toNumber()
    };
    
  } finally {
    await session.close();
  }
}

async function main() {
  console.log('🌍 Reverse Geocoding POIs');
  console.log('========================\n');
  console.log('Using Google Geocoding API');
  console.log('Cost: $5 per 1,000 requests (first 40K/month free)');
  console.log('Rate: ~20 requests/second (conservative)');
  console.log('Processing: 1,000 POIs per batch\n');
  
  try {
    // Get initial statistics
    console.log('📊 Initial Status:\n');
    const statsBefore = await getStatistics();
    console.log(`   Total POIs: ${statsBefore.total.toLocaleString()}`);
    console.log(`   With coordinates: ${statsBefore.withCoords.toLocaleString()}`);
    console.log(`   With LOCATED_IN → city: ${statsBefore.withCity.toLocaleString()}`);
    console.log(`   Need geocoding: ${statsBefore.needGeocoding.toLocaleString()}\n`);
    
    if (statsBefore.needGeocoding === 0) {
      console.log('✅ All POIs with coordinates already have city relationships!');
      console.log('\n💡 POIs without coordinates cannot be geocoded.');
      console.log('   Consider manual review or data enrichment.\n');
      return;
    }
    
    const estimatedTime = Math.ceil((statsBefore.needGeocoding * 0.05) / 60); // ~20 req/sec
    const estimatedCost = Math.max(0, ((statsBefore.needGeocoding - 40000) / 1000) * 5);
    console.log(`⏱️  Estimated time for all POIs: ~${estimatedTime} minutes`);
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(2)} (first 40K free)\n`);
    console.log('🔄 Processing batch of 1,000 POIs...\n');
    
    const result = await processBatch(1000);
    
    // Get final statistics
    console.log('\n📊 Final Status:\n');
    const statsAfter = await getStatistics();
    console.log(`   With LOCATED_IN → city: ${statsAfter.withCity.toLocaleString()}`);
    console.log(`   Need geocoding: ${statsAfter.needGeocoding.toLocaleString()}\n`);
    
    console.log('='.repeat(60));
    console.log('✅ BATCH COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\n📊 This Batch Results:`);
    console.log(`   Processed: ${result.total}`);
    console.log(`   Successful: ${result.success}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`\n📈 Overall Progress:`);
    console.log(`   Before: ${statsBefore.withCity.toLocaleString()} POIs with city`);
    console.log(`   After: ${statsAfter.withCity.toLocaleString()} POIs with city`);
    console.log(`   Improvement: +${(statsAfter.withCity - statsBefore.withCity).toLocaleString()}`);
    
    if (statsAfter.needGeocoding > 0) {
      const remainingTime = Math.ceil((statsAfter.needGeocoding * 0.05) / 60);
      const remainingCost = Math.max(0, ((statsAfter.needGeocoding - 40000) / 1000) * 5);
      
      console.log(`\n💡 To process more POIs:`);
      console.log(`   Run: npx ts-node scripts/reverse-geocode-pois.ts`);
      console.log(`   Remaining: ${statsAfter.needGeocoding.toLocaleString()} POIs`);
      console.log(`   Time: ~${remainingTime} minutes`);
      console.log(`   Cost: ~$${remainingCost.toFixed(2)}\n`);
      console.log('💡 TIP: You can run this script multiple times.');
      console.log('   It automatically skips POIs that already have cities.');
    } else {
      console.log('\n🎉 ALL POIs WITH COORDINATES NOW HAVE CITY RELATIONSHIPS!');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await driver.close();
  }
}

main();

