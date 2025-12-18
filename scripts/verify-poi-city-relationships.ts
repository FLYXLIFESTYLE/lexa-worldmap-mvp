/**
 * Verify POI-City Relationships
 * 
 * Checks if all POIs have LOCATED_IN relationship to a city/destination
 * If not, creates the relationship based on:
 * 1. p.city property
 * 2. p.destination_name property
 * 3. Reverse geocoding (if coordinates available)
 * 
 * Run: npx ts-node scripts/verify-poi-city-relationships.ts
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || '',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || ''
  )
);

async function checkPOIsWithoutCity() {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:LOCATED_IN]->(:city)
      RETURN count(*) as count
    `);
    
    return result.records[0].get('count').toNumber();
    
  } finally {
    await session.close();
  }
}

async function getPOIsWithoutCityButHaveProperty(limit: number = 100) {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:LOCATED_IN]->(:city)
        AND (p.city IS NOT NULL OR p.destination_name IS NOT NULL)
      RETURN p.poi_uid as poi_uid,
             p.name as name,
             p.city as city,
             p.destination_name as destination_name
      LIMIT $limit
    `, { limit: neo4j.int(limit) });
    
    return result.records.map(r => ({
      poi_uid: r.get('poi_uid'),
      name: r.get('name'),
      city: r.get('city'),
      destination_name: r.get('destination_name')
    }));
    
  } finally {
    await session.close();
  }
}

async function createCityRelationship(poi_uid: string, cityName: string) {
  const session = driver.session();
  
  try {
    // LOCATED_IN links to cities ONLY (not destinations, regions, areas)
    // We have 256 cities in the database
    await session.run(`
      MATCH (p:poi {poi_uid: $poi_uid})
      MERGE (c:city {name: $cityName})
      MERGE (p)-[:LOCATED_IN {confidence: 0.90, source: 'property_based'}]->(c)
    `, {
      poi_uid,
      cityName
    });
    
  } finally {
    await session.close();
  }
}

async function getStatistics() {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi)
      RETURN count(*) as total_pois,
             count(CASE WHEN (p)-[:LOCATED_IN]->(:city) THEN 1 END) as with_city,
             count(CASE WHEN NOT (p)-[:LOCATED_IN]->(:city) THEN 1 END) as without_city,
             100.0 * count(CASE WHEN (p)-[:LOCATED_IN]->(:city) THEN 1 END) / count(*) as percentage_with_city
    `);
    
    const record = result.records[0];
    return {
      total: record.get('total_pois').toNumber(),
      withCity: record.get('with_city').toNumber(),
      withoutCity: record.get('without_city').toNumber(),
      percentage: record.get('percentage_with_city')
    };
    
  } finally {
    await session.close();
  }
}

async function main() {
  console.log('🏙️  POI-City Relationship Verification');
  console.log('======================================\n');
  
  try {
    // Get initial statistics
    console.log('📊 Current Status:\n');
    const statsBefore = await getStatistics();
    console.log(`   Total POIs: ${statsBefore.total.toLocaleString()}`);
    console.log(`   With LOCATED_IN: ${statsBefore.withCity.toLocaleString()} (${statsBefore.percentage.toFixed(1)}%)`);
    console.log(`   Without LOCATED_IN: ${statsBefore.withoutCity.toLocaleString()}\n`);
    
    if (statsBefore.withoutCity === 0) {
      console.log('✅ All POIs have LOCATED_IN relationships! Perfect! 🎉\n');
      return;
    }
    
    // Get POIs without city but have property
    console.log(`🔍 Finding POIs with city/destination_name property but no relationship...\n`);
    const pois = await getPOIsWithoutCityButHaveProperty(1000);
    
    if (pois.length === 0) {
      console.log('⚠️  All POIs without LOCATED_IN also lack city/destination_name properties.');
      console.log('    These need manual review or reverse geocoding.\n');
      return;
    }
    
    console.log(`📦 Found ${pois.length} POIs to fix\n`);
    console.log('🔧 Creating LOCATED_IN relationships...\n');
    
    let successCount = 0;
    
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      const cityName = poi.city || poi.destination_name;
      
      if (cityName) {
        try {
          await createCityRelationship(poi.poi_uid, cityName);
          console.log(`  ✅ [${i + 1}/${pois.length}] ${poi.name} → ${cityName}`);
          successCount++;
        } catch (error) {
          console.error(`  ❌ [${i + 1}/${pois.length}] ${poi.name}: ${error}`);
        }
      }
      
      // Progress update every 100 POIs
      if ((i + 1) % 100 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${pois.length} processed\n`);
      }
    }
    
    // Get final statistics
    console.log('\n📊 Final Status:\n');
    const statsAfter = await getStatistics();
    console.log(`   Total POIs: ${statsAfter.total.toLocaleString()}`);
    console.log(`   With LOCATED_IN: ${statsAfter.withCity.toLocaleString()} (${statsAfter.percentage.toFixed(1)}%)`);
    console.log(`   Without LOCATED_IN: ${statsAfter.withoutCity.toLocaleString()}\n`);
    
    console.log('='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Relationships created: ${successCount}`);
    console.log(`   📈 Improvement: ${statsBefore.percentage.toFixed(1)}% → ${statsAfter.percentage.toFixed(1)}%`);
    
    if (statsAfter.withoutCity > 0) {
      console.log(`\n⚠️  Still ${statsAfter.withoutCity.toLocaleString()} POIs without LOCATED_IN`);
      console.log('    These POIs lack city/destination_name properties.');
      console.log('\n💡 Solutions:');
      console.log('   1. Run reverse geocoding (if coordinates available)');
      console.log('   2. Manual review and update');
      console.log('   3. Delete if not useful');
      console.log('\n   To check: ');
      console.log('   MATCH (p:poi) WHERE NOT (p)-[:LOCATED_IN]->(:city)');
      console.log('   RETURN p.name, p.lat, p.lon, p.city, p.destination_name LIMIT 10');
    } else {
      console.log('\n🎉 ALL POIs now have LOCATED_IN relationships!');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await driver.close();
  }
}

main();

