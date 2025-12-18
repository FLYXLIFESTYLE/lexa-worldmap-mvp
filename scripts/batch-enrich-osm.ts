/**
 * Batch OSM Enrichment Script
 * 
 * Enriches existing OSM POIs (203K) with:
 * - Google Places data (ratings, reviews, website)
 * - Website scraping (if available)
 * - Luxury scoring
 * - Emotional intelligence (activities, emotions, desires, fears)
 * - All relationships
 * 
 * This is MORE RELIABLE than scraping premium websites!
 * 
 * Run: npx ts-node scripts/batch-enrich-osm.ts
 * 
 * Progress: Process 100-1,000 POIs per run
 * Cost: ~$0.025 per POI = $2.50-$25 per run
 */

import { processPOI } from './master-data-intake-pipeline.js';
import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const BATCH_SIZE = 100; // Adjust this: 100 (conservative), 500 (moderate), 1000 (aggressive)

const driver = neo4j.driver(
  process.env.NEO4J_URI || '',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || ''
  )
);

async function getUnprocessedOSMPOIs(limit: number): Promise<any[]> {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi)
      WHERE p.source = 'osm'
        AND (p.luxury_score IS NULL OR p.luxury_score = 0)
        AND p.enrichment_status IS NULL
        AND p.lat IS NOT NULL
        AND p.lon IS NOT NULL
        AND p.name IS NOT NULL
        AND NOT p.name CONTAINS 'Unnamed'
        AND p.type IS NOT NULL
      RETURN p.poi_uid as poi_uid,
             p.name as name,
             p.type as type,
             p.lat as lat,
             p.lon as lon,
             p.city as city,
             p.destination_name as destination_name,
             p.country as country
      LIMIT $limit
    `, { limit: neo4j.int(limit) });
    
    return result.records.map(record => ({
      poi_uid: record.get('poi_uid'),
      name: record.get('name'),
      type: record.get('type'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      city: record.get('city') || record.get('destination_name'),
      country: record.get('country') || 'Unknown',
      source: 'osm'
    }));
    
  } finally {
    await session.close();
  }
}

async function markAsProcessed(poi_uid: string, success: boolean) {
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (p:poi {poi_uid: $poi_uid})
      SET p.enrichment_status = $status,
          p.enrichment_attempted_at = datetime()
    `, {
      poi_uid,
      status: success ? 'enriched' : 'failed'
    });
  } finally {
    await session.close();
  }
}

async function getEnrichmentStats() {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi {source: 'osm'})
      RETURN 
        count(*) as total,
        count(CASE WHEN p.luxury_score IS NOT NULL AND p.luxury_score > 0 THEN 1 END) as enriched,
        count(CASE WHEN p.enrichment_status = 'failed' THEN 1 END) as failed,
        count(CASE WHEN p.luxury_score IS NULL OR p.luxury_score = 0 THEN 1 END) as remaining
    `);
    
    const record = result.records[0];
    return {
      total: record.get('total').toNumber(),
      enriched: record.get('enriched').toNumber(),
      failed: record.get('failed').toNumber(),
      remaining: record.get('remaining').toNumber()
    };
  } finally {
    await session.close();
  }
}

async function main() {
  console.log('🔄 OSM Batch Enrichment');
  console.log('=======================\n');
  console.log(`Batch size: ${BATCH_SIZE} POIs\n`);
  
  try {
    // Get current stats
    console.log('📊 Current Status:\n');
    const statsBefore = await getEnrichmentStats();
    console.log(`   Total OSM POIs: ${statsBefore.total.toLocaleString()}`);
    console.log(`   Already enriched: ${statsBefore.enriched.toLocaleString()} (${Math.round(statsBefore.enriched / statsBefore.total * 100)}%)`);
    console.log(`   Failed attempts: ${statsBefore.failed.toLocaleString()}`);
    console.log(`   Remaining: ${statsBefore.remaining.toLocaleString()}\n`);
    
    // Get POIs to process
    console.log(`🔍 Fetching ${BATCH_SIZE} unprocessed POIs...\n`);
    const pois = await getUnprocessedOSMPOIs(BATCH_SIZE);
    
    if (pois.length === 0) {
      console.log('✅ No more POIs to process! All done! 🎉\n');
      return;
    }
    
    console.log(`📦 Processing ${pois.length} POIs...\n`);
    
    let successCount = 0;
    let failureCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`\n[${i + 1}/${pois.length}] Processing: ${poi.name}`);
      
      try {
        const enriched = await processPOI(poi);
        
        if (enriched) {
          await markAsProcessed(poi.poi_uid, true);
          successCount++;
        } else {
          await markAsProcessed(poi.poi_uid, false);
          failureCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ${poi.name}:`, error);
        await markAsProcessed(poi.poi_uid, false);
        failureCount++;
      }
      
      // Progress update every 10 POIs
      if ((i + 1) % 10 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        const remaining = pois.length - (i + 1);
        const avgTimePerPOI = elapsed / (i + 1);
        const estimatedRemaining = Math.round(remaining * avgTimePerPOI);
        
        console.log(`\n📊 Progress: ${i + 1}/${pois.length} (${Math.round((i + 1) / pois.length * 100)}%)`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${failureCount}`);
        console.log(`   ⏱️  Time elapsed: ${elapsed} minutes`);
        console.log(`   ⏳ Estimated remaining: ${estimatedRemaining} minutes\n`);
      }
    }
    
    // Final stats
    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000 / 60);
    
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ BATCH COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully enriched: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   ⏱️  Total time: ${totalTime} minutes`);
    console.log(`   ⚡ Average: ${(totalTime / pois.length).toFixed(2)} min/POI`);
    
    // Cost estimation
    const estimatedCost = pois.length * 0.025;
    console.log(`   💰 Estimated cost: $${estimatedCost.toFixed(2)}`);
    
    // Updated stats
    console.log(`\n📊 Updated Status:\n`);
    const statsAfter = await getEnrichmentStats();
    console.log(`   Total OSM POIs: ${statsAfter.total.toLocaleString()}`);
    console.log(`   Enriched: ${statsAfter.enriched.toLocaleString()} (${Math.round(statsAfter.enriched / statsAfter.total * 100)}%)`);
    console.log(`   Failed: ${statsAfter.failed.toLocaleString()}`);
    console.log(`   Remaining: ${statsAfter.remaining.toLocaleString()}`);
    
    // ETA to completion
    if (statsAfter.remaining > 0) {
      const batchesRemaining = Math.ceil(statsAfter.remaining / BATCH_SIZE);
      const hoursRemaining = batchesRemaining * (totalTime / 60);
      const daysRemaining = Math.ceil(hoursRemaining / 24);
      
      console.log(`\n⏳ ETA to complete all ${statsAfter.remaining.toLocaleString()} remaining:`);
      console.log(`   At current pace: ${batchesRemaining} batches × ${totalTime} min = ${Math.round(hoursRemaining)} hours (~${daysRemaining} days)`);
      console.log(`   Total cost: $${(statsAfter.remaining * 0.025).toLocaleString()}`);
    }
    
    console.log(`\n💡 Next run:`);
    console.log(`   npx ts-node scripts/batch-enrich-osm.ts`);
    console.log(`\n🚀 To speed up, increase BATCH_SIZE in the script!`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await driver.close();
  }
}

main();

