/**
 * Fix Missing LOCATED_IN Relationships
 * 
 * Creates LOCATED_IN relationships for ALL POIs that have a destination_name
 * but no LOCATED_IN relationship yet (including unnamed POIs)
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

const BATCH_SIZE = 1000; // Process 1000 POIs at a time

async function fixMissingLocatedIn() {
  console.log('🔧 Fixing Missing LOCATED_IN Relationships\n');

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Step 1: Check current state
    console.log('📊 Analyzing current state...\n');
    
    const statsSession = driver.session();
    const stats = await statsSession.run(`
      MATCH (p:poi)
      WITH count(p) as total_pois
      MATCH (p:poi)-[:LOCATED_IN]->()
      WITH total_pois, count(p) as with_located_in
      MATCH (p:poi)
      WHERE NOT (p)-[:LOCATED_IN]->()
        AND p.destination_name IS NOT NULL
        AND p.destination_name <> ''
      WITH total_pois, with_located_in, count(p) as fixable
      RETURN total_pois, with_located_in, fixable, total_pois - with_located_in as missing
    `);
    
    const statsRecord = stats.records[0];
    const totalPois = statsRecord.get('total_pois').toNumber();
    const withLocatedIn = statsRecord.get('with_located_in').toNumber();
    const fixable = statsRecord.get('fixable').toNumber();
    const missing = statsRecord.get('missing').toNumber();
    
    console.log('Current State:');
    console.log(`  Total POIs: ${totalPois.toLocaleString()}`);
    console.log(`  With LOCATED_IN: ${withLocatedIn.toLocaleString()} (${(withLocatedIn/totalPois*100).toFixed(1)}%)`);
    console.log(`  Without LOCATED_IN: ${missing.toLocaleString()} (${(missing/totalPois*100).toFixed(1)}%)`);
    console.log(`  Fixable (have destination_name): ${fixable.toLocaleString()}\n`);
    
    await statsSession.close();

    if (fixable === 0) {
      console.log('✅ All POIs already have LOCATED_IN relationships!');
      return;
    }

    console.log(`🎯 Target: Create ${fixable.toLocaleString()} LOCATED_IN relationships\n`);

    // Step 2: Get unique destination names that need fixing
    console.log('🔍 Finding destinations...\n');
    
    const destSession = driver.session();
    const destinationsResult = await destSession.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:LOCATED_IN]->()
        AND p.destination_name IS NOT NULL
        AND p.destination_name <> ''
      RETURN DISTINCT p.destination_name as dest_name
      ORDER BY dest_name
    `);
    
    const destinationNames = destinationsResult.records.map(r => r.get('dest_name'));
    await destSession.close();
    
    console.log(`Found ${destinationNames.length} unique destinations to fix\n`);

    // Step 3: Process each destination in batches until all POIs are connected
    let totalFixed = 0;
    let totalCreatedDestinations = 0;
    let destinationsWithIssues: string[] = [];

    for (let i = 0; i < destinationNames.length; i++) {
      const destName = destinationNames[i];
      console.log(`[${i + 1}/${destinationNames.length}] Processing: ${destName}`);

      let batchNum = 1;
      let batchFixed = 0;
      let destCreated = false;

      // Keep processing batches until no more POIs need fixing for this destination
      while (true) {
        const fixSession = driver.session();
        
        try {
          // Create or match destination node, then create relationships in batches
          const result = await fixSession.run(`
            // First, ensure destination exists
            MERGE (d:destination {name: $dest_name})
            ON CREATE SET d.created_at = datetime(), d.created_by = 'fix_script'
            
            // Then create relationships for all POIs pointing to this destination
            WITH d
            MATCH (p:poi {destination_name: $dest_name})
            WHERE NOT (p)-[:LOCATED_IN]->()
            
            WITH d, p LIMIT $batch_size
            MERGE (p)-[r:LOCATED_IN]->(d)
            ON CREATE SET r.created_at = datetime(), 
                          r.source = 'destination_name_property',
                          r.confidence = 0.95
            
            RETURN count(r) as relationships_created,
                   count(DISTINCT d) as destinations_created
          `, { 
            dest_name: destName,
            batch_size: neo4j.int(BATCH_SIZE)
          });

          const record = result.records[0];
          const relsCreated = record.get('relationships_created').toNumber();
          const destsCreated = record.get('destinations_created').toNumber();

          if (destsCreated > 0 && !destCreated) {
            destCreated = true;
            totalCreatedDestinations++;
          }

          if (relsCreated === 0) {
            // No more POIs to process for this destination
            break;
          }

          batchFixed += relsCreated;
          totalFixed += relsCreated;

          if (batchNum === 1 || batchFixed % 5000 === 0 || relsCreated < BATCH_SIZE) {
            console.log(`  📦 Batch ${batchNum}: Created ${relsCreated} relationships (${batchFixed} total for this destination)`);
          }

          batchNum++;

          // If we processed fewer than BATCH_SIZE, we're done with this destination
          if (relsCreated < BATCH_SIZE) {
            break;
          }

        } catch (error) {
          console.error(`  ❌ Error in batch ${batchNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          destinationsWithIssues.push(destName);
          break;
        } finally {
          await fixSession.close();
        }
      }

      if (batchFixed > 0) {
        console.log(`  ✅ ${destName}: ${batchFixed} total relationships created${destCreated ? ' (new destination)' : ''}`);
      } else {
        console.log(`  ⚠️  No relationships created`);
        destinationsWithIssues.push(destName);
      }
      console.log('');
    }

    // Step 4: Final statistics
    console.log('\n========================================');
    console.log('🎉 Fix Complete!');
    console.log('========================================\n');

    const finalStatsSession = driver.session();
    const finalStats = await finalStatsSession.run(`
      MATCH (p:poi)
      WITH count(p) as total_pois
      MATCH (p:poi)-[:LOCATED_IN]->()
      WITH total_pois, count(p) as with_located_in
      RETURN total_pois, with_located_in, 
             round(100.0 * with_located_in / total_pois, 2) as percentage
    `);
    
    const finalRecord = finalStats.records[0];
    const finalTotal = finalRecord.get('total_pois').toNumber();
    const finalWithLocatedIn = finalRecord.get('with_located_in').toNumber();
    const finalPercentage = finalRecord.get('percentage');
    
    await finalStatsSession.close();

    console.log('Results:');
    console.log(`  ✅ Relationships created: ${totalFixed.toLocaleString()}`);
    console.log(`  🏙️  New destinations created: ${totalCreatedDestinations}`);
    console.log(`  ⚠️  Destinations with issues: ${destinationsWithIssues.length}\n`);

    console.log('Final State:');
    console.log(`  Total POIs: ${finalTotal.toLocaleString()}`);
    console.log(`  With LOCATED_IN: ${finalWithLocatedIn.toLocaleString()} (${finalPercentage}%)`);
    console.log(`  Coverage improved by: ${(finalPercentage - (withLocatedIn/totalPois*100)).toFixed(1)}%\n`);

    if (destinationsWithIssues.length > 0) {
      console.log('⚠️  Destinations that need manual review:');
      destinationsWithIssues.slice(0, 10).forEach(dest => {
        console.log(`   - ${dest}`);
      });
      if (destinationsWithIssues.length > 10) {
        console.log(`   ... and ${destinationsWithIssues.length - 10} more`);
      }
      console.log('');
    }

    console.log('✅ All POIs now have LOCATED_IN relationships (where destination_name exists)!');
    console.log('💡 Check results in ChatNeo4j: "How many POIs have LOCATED_IN relationships?"\n');

  } finally {
    await driver.close();
  }
}

fixMissingLocatedIn().catch(console.error);

