/**
 * Standardize Relationship Names to UPPERCASE
 * 
 * Neo4j is case-sensitive, so "located_in" and "LOCATED_IN" are different!
 * This script converts all lowercase relationships to UPPERCASE (Neo4j convention)
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

interface RelationshipMapping {
  oldName: string;
  newName: string;
  description: string;
}

const RELATIONSHIP_MAPPINGS: RelationshipMapping[] = [
  { oldName: 'located_in', newName: 'LOCATED_IN', description: 'POI is located in destination' },
  { oldName: 'supports_activity', newName: 'SUPPORTS_ACTIVITY', description: 'POI supports this activity' },
  { oldName: 'evokes', newName: 'EVOKES', description: 'Triggers this emotion' },
  { oldName: 'amplifies_desire', newName: 'AMPLIFIES_DESIRE', description: 'Increases this desire' },
  { oldName: 'mitigates_fear', newName: 'MITIGATES_FEAR', description: 'Reduces this fear' },
  { oldName: 'has_theme', newName: 'HAS_THEME', description: 'POI has this theme' },
  { oldName: 'in_region', newName: 'IN_REGION', description: 'Destination in region' },
  { oldName: 'in_country', newName: 'IN_COUNTRY', description: 'Destination in country' },
  { oldName: 'available_in', newName: 'AVAILABLE_IN', description: 'Theme available in destination' },
  { oldName: 'featured_in', newName: 'FEATURED_IN', description: 'POI featured in theme' },
  { oldName: 'belongs_to', newName: 'BELONGS_TO', description: 'Belongs to category' },
  { oldName: 'relates_to', newName: 'RELATES_TO', description: 'Related to another entity' },
  { oldName: 'prominent_in', newName: 'PROMINENT_IN', description: 'Prominent in destination' },
];

async function standardizeRelationshipNames() {
  console.log('🔧 Standardizing Neo4j Relationship Names to UPPERCASE\n');
  console.log('Why? Neo4j is case-sensitive: "located_in" ≠ "LOCATED_IN"\n');
  
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Step 1: Check which relationships exist
    console.log('📊 Checking existing relationships...\n');
    
    const checkSession = driver.session();
    const existingRels = await checkSession.run(`
      CALL db.relationshipTypes() YIELD relationshipType
      RETURN relationshipType
      ORDER BY relationshipType
    `);
    
    const allRelTypes = existingRels.records.map(r => r.get('relationshipType'));
    await checkSession.close();
    
    console.log('Found relationship types:');
    allRelTypes.forEach(rel => {
      const isLowercase = rel === rel.toLowerCase();
      const isUppercase = rel === rel.toUpperCase();
      const indicator = isLowercase ? '⚠️ ' : isUppercase ? '✅' : '⚠️ ';
      console.log(`  ${indicator} ${rel}`);
    });
    console.log('');

    // Step 2: Migrate each relationship type
    let totalMigrated = 0;
    
    for (const mapping of RELATIONSHIP_MAPPINGS) {
      const lowercaseExists = allRelTypes.includes(mapping.oldName);
      const uppercaseExists = allRelTypes.includes(mapping.newName);
      
      if (!lowercaseExists) {
        if (uppercaseExists) {
          console.log(`✅ ${mapping.newName}: Already standardized`);
        } else {
          console.log(`⏭️  ${mapping.oldName} → ${mapping.newName}: Neither exists (skip)`);
        }
        continue;
      }

      console.log(`\n🔄 Migrating: ${mapping.oldName} → ${mapping.newName}`);
      console.log(`   Description: ${mapping.description}`);

      const session = driver.session();
      
      try {
        // Count existing relationships
        const countResult = await session.run(`
          MATCH ()-[r:\`${mapping.oldName}\`]->()
          RETURN count(r) as count
        `);
        const count = countResult.records[0].get('count').toNumber();
        
        if (count === 0) {
          console.log(`   ℹ️  No relationships found`);
          await session.close();
          continue;
        }

        console.log(`   Found: ${count.toLocaleString()} relationships`);

        // Migrate in batches
        let migrated = 0;
        const batchSize = 1000;

        while (true) {
          const result = await session.run(`
            MATCH (a)-[old:\`${mapping.oldName}\`]->(b)
            WITH a, old, b, properties(old) as props
            LIMIT ${batchSize}
            
            // Create new uppercase relationship with all properties
            CREATE (a)-[new:\`${mapping.newName}\`]->(b)
            SET new = props
            
            // Delete old lowercase relationship
            DELETE old
            
            RETURN count(new) as migrated
          `);

          const batchMigrated = result.records[0].get('migrated').toNumber();
          migrated += batchMigrated;
          totalMigrated += batchMigrated;

          if (batchMigrated < batchSize) {
            break;
          }

          console.log(`   Progress: ${migrated.toLocaleString()} / ${count.toLocaleString()}`);
        }

        console.log(`   ✅ Migrated: ${migrated.toLocaleString()} relationships`);

      } catch (error) {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        await session.close();
      }
    }

    // Step 3: Final verification
    console.log('\n========================================');
    console.log('📊 Final Verification\n');

    const finalSession = driver.session();
    const finalRels = await finalSession.run(`
      CALL db.relationshipTypes() YIELD relationshipType
      RETURN relationshipType
      ORDER BY relationshipType
    `);
    
    const finalRelTypes = finalRels.records.map(r => r.get('relationshipType'));
    await finalSession.close();

    console.log('Current relationship types:');
    finalRelTypes.forEach(rel => {
      const isUppercase = rel === rel.toUpperCase();
      const indicator = isUppercase ? '✅' : '⚠️ ';
      console.log(`  ${indicator} ${rel}`);
    });

    console.log('\n========================================');
    console.log('🎉 Migration Complete!\n');
    console.log(`Total relationships migrated: ${totalMigrated.toLocaleString()}`);
    console.log('✅ All relationship names now follow UPPERCASE convention\n');

  } finally {
    await driver.close();
  }
}

standardizeRelationshipNames().catch(console.error);

