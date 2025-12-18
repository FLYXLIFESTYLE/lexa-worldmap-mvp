/**
 * Fix Duplicate Relationships in Neo4j
 * 
 * Problem: Multiple LOCATED_IN relationships between same POI and Destination
 * Cause: Using CREATE instead of MERGE in enrichment scripts
 * Solution: Remove duplicates and ensure MERGE is used going forward
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

async function fixDuplicateRelationships() {
  console.log('🔧 Fixing Duplicate Relationships\n');
  
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Step 1: Find duplicate relationships
    console.log('🔍 Step 1: Finding duplicates...\n');
    
    const findSession = driver.session();
    const duplicates = await findSession.run(`
      // Find POIs with multiple LOCATED_IN relationships to same destination
      MATCH (p:poi)-[r:LOCATED_IN]->(d:destination)
      WITH p, d, collect(r) as rels
      WHERE size(rels) > 1
      RETURN p.name as poi_name, 
             p.poi_uid as poi_uid,
             d.name as destination, 
             size(rels) as duplicate_count
      ORDER BY duplicate_count DESC
      LIMIT 100
    `);
    await findSession.close();

    if (duplicates.records.length === 0) {
      console.log('✅ No duplicate LOCATED_IN relationships found!\n');
    } else {
      console.log(`⚠️  Found ${duplicates.records.length} POIs with duplicate LOCATED_IN relationships:\n`);
      
      for (const record of duplicates.records.slice(0, 10)) {
        console.log(`  • ${record.get('poi_name')} → ${record.get('destination')} (${record.get('duplicate_count')} duplicates)`);
      }
      console.log('');

      // Step 2: Remove duplicates
      console.log('🧹 Step 2: Removing duplicates...\n');

      const removeSession = driver.session();
      
      // For each POI with duplicates, keep only one LOCATED_IN relationship
      const result = await removeSession.run(`
        MATCH (p:poi)-[r:LOCATED_IN]->(d:destination)
        WITH p, d, collect(r) as rels
        WHERE size(rels) > 1
        WITH p, d, rels[0] as keep, tail(rels) as to_delete
        FOREACH (r IN to_delete | DELETE r)
        RETURN count(to_delete) as total_deleted
      `);

      await removeSession.close();

      const totalDeleted = result.records[0]?.get('total_deleted')?.toNumber() || 0;
      console.log(`✅ Removed ${totalDeleted} duplicate relationships\n`);
    }

    // Step 3: Check for other relationship types with duplicates
    console.log('🔍 Step 3: Checking other relationship types...\n');

    const checkSession = driver.session();
    
    const relTypes = ['SUPPORTS_ACTIVITY', 'OFFERS_EXPERIENCE', 'EVOKES', 'AMPLIFIES_DESIRE', 'MITIGATES_FEAR'];
    
    for (const relType of relTypes) {
      const checkResult = await checkSession.run(`
        MATCH (p)-[r:${relType}]->(n)
        WITH p, n, collect(r) as rels
        WHERE size(rels) > 1
        RETURN count(*) as duplicate_count
      `);
      
      const count = checkResult.records[0]?.get('duplicate_count')?.toNumber() || 0;
      
      if (count > 0) {
        console.log(`  ⚠️  ${relType}: ${count} duplicates found`);
        
        // Remove duplicates for this relationship type
        await checkSession.run(`
          MATCH (p)-[r:${relType}]->(n)
          WITH p, n, collect(r) as rels
          WHERE size(rels) > 1
          WITH p, n, rels[0] as keep, tail(rels) as to_delete
          FOREACH (r IN to_delete | DELETE r)
        `);
        
        console.log(`     ✅ Removed ${count} duplicate ${relType} relationships`);
      } else {
        console.log(`  ✅ ${relType}: No duplicates`);
      }
    }
    
    await checkSession.close();

    // Step 4: Verify fix
    console.log('\n🔍 Step 4: Verification...\n');
    
    const verifySession = driver.session();
    const verification = await verifySession.run(`
      MATCH (p:poi)-[r:LOCATED_IN]->(d:destination)
      WITH p, d, collect(r) as rels
      WHERE size(rels) > 1
      RETURN count(*) as remaining_duplicates
    `);
    await verifySession.close();

    const remaining = verification.records[0].get('remaining_duplicates').toNumber();
    
    if (remaining === 0) {
      console.log('✅ All duplicates removed successfully!\n');
    } else {
      console.log(`⚠️  ${remaining} duplicates still remain (may need manual review)\n`);
    }

    // Step 5: Statistics
    console.log('📊 Database Statistics:\n');
    
    const statsSession = driver.session();
    
    // Total relationships by type
    const relStats = await statsSession.run(`
      CALL db.relationshipTypes() YIELD relationshipType
      MATCH ()-[r]->()
      WHERE type(r) = relationshipType
      RETURN relationshipType, count(r) as count
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('Top relationship types:');
    for (const record of relStats.records) {
      console.log(`  • ${record.get('relationshipType')}: ${record.get('count').toNumber().toLocaleString()}`);
    }
    
    await statsSession.close();

    console.log('\n🎉 Duplicate relationship cleanup complete!\n');

    // Recommendations
    console.log('💡 RECOMMENDATIONS:\n');
    console.log('1. Always use MERGE instead of CREATE for relationships');
    console.log('2. Use this pattern: MERGE (a)-[:REL_TYPE]->(b)');
    console.log('3. Run this script monthly to catch any new duplicates');
    console.log('4. Update enrichment scripts to use MERGE (check below)\n');

    console.log('🔧 SCRIPTS TO UPDATE:\n');
    console.log('✅ scripts/super-enrich-french-riviera.ts - Check line ~256 (already uses MERGE)');
    console.log('⚠️  scripts/discover-luxury-pois.ts - Line ~256 uses CREATE, should be MERGE');
    console.log('⚠️  Check any other import scripts for CREATE relationships\n');

  } finally {
    await driver.close();
  }
}

fixDuplicateRelationships().catch(console.error);

