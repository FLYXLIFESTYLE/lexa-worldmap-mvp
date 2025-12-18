/**
 * Propagate Emotional Relationships from Activities to POIs
 * 
 * For POIs that SUPPORT activities, inherit the emotional relationships
 * from those activities (EVOKES, AMPLIFIES_DESIRE, MITIGATES_FEAR)
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

const BATCH_SIZE = 1000;

async function propagateEmotionsFromActivities() {
  console.log('🧠 Propagating Emotions from Activities to POIs\n');
  
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Check current state
    const statsSession = driver.session();
    const stats = await statsSession.run(`
      MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      WHERE NOT (p)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      RETURN count(DISTINCT p) as can_inherit
    `);
    
    const canInherit = stats.records[0].get('can_inherit').toNumber();
    await statsSession.close();
    
    console.log(`📊 POIs that can inherit emotions: ${canInherit.toLocaleString()}\n`);
    
    if (canInherit === 0) {
      console.log('✅ All POIs already have emotional relationships!');
      return;
    }

    console.log('🎯 Propagating emotions in batches...\n');

    let totalProcessed = 0;
    let totalEvokes = 0;
    let totalDesires = 0;
    let totalFears = 0;

    // Propagate EVOKES relationships
    console.log('1️⃣ Propagating EVOKES relationships...');
    let batch = 1;
    while (true) {
      const session = driver.session();
      const result = await session.run(`
        // Find POIs that support activities with EVOKES relationships
        MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[r:EVOKES]->(e:Emotion)
        WHERE NOT (p)-[:EVOKES]->(e)
        
        WITH p, a, e, r LIMIT $batch_size
        
        // Create inherited EVOKES relationship
        MERGE (p)-[new_r:EVOKES]->(e)
        ON CREATE SET new_r.confidence = r.confidence * 0.8,  // Slightly lower confidence for inherited
                      new_r.reason = 'Inherited from activity: ' + a.name,
                      new_r.source = 'activity_inheritance',
                      new_r.inherited_from = a.name,
                      new_r.created_at = datetime()
        
        RETURN count(new_r) as created
      `, { batch_size: neo4j.int(BATCH_SIZE) });
      
      const created = result.records[0].get('created').toNumber();
      await session.close();
      
      if (created === 0) break;
      
      totalEvokes += created;
      if (batch % 5 === 0 || created < BATCH_SIZE) {
        console.log(`   Batch ${batch}: ${created} relationships created (${totalEvokes} total)`);
      }
      batch++;
      
      if (created < BATCH_SIZE) break;
    }
    console.log(`   ✅ Total EVOKES propagated: ${totalEvokes.toLocaleString()}\n`);

    // Propagate AMPLIFIES_DESIRE relationships
    console.log('2️⃣ Propagating AMPLIFIES_DESIRE relationships...');
    batch = 1;
    while (true) {
      const session = driver.session();
      const result = await session.run(`
        MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[r:AMPLIFIES_DESIRE]->(d:Desire)
        WHERE NOT (p)-[:AMPLIFIES_DESIRE]->(d)
        
        WITH p, a, d, r LIMIT $batch_size
        
        MERGE (p)-[new_r:AMPLIFIES_DESIRE]->(d)
        ON CREATE SET new_r.confidence = r.confidence * 0.8,
                      new_r.reason = 'Inherited from activity: ' + a.name,
                      new_r.source = 'activity_inheritance',
                      new_r.inherited_from = a.name,
                      new_r.created_at = datetime()
        
        RETURN count(new_r) as created
      `, { batch_size: neo4j.int(BATCH_SIZE) });
      
      const created = result.records[0].get('created').toNumber();
      await session.close();
      
      if (created === 0) break;
      
      totalDesires += created;
      if (batch % 5 === 0 || created < BATCH_SIZE) {
        console.log(`   Batch ${batch}: ${created} relationships created (${totalDesires} total)`);
      }
      batch++;
      
      if (created < BATCH_SIZE) break;
    }
    console.log(`   ✅ Total AMPLIFIES_DESIRE propagated: ${totalDesires.toLocaleString()}\n`);

    // Propagate MITIGATES_FEAR relationships
    console.log('3️⃣ Propagating MITIGATES_FEAR relationships...');
    batch = 1;
    while (true) {
      const session = driver.session();
      const result = await session.run(`
        MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[r:MITIGATES_FEAR]->(f:Fear)
        WHERE NOT (p)-[:MITIGATES_FEAR]->(f)
        
        WITH p, a, f, r LIMIT $batch_size
        
        MERGE (p)-[new_r:MITIGATES_FEAR]->(f)
        ON CREATE SET new_r.confidence = r.confidence * 0.8,
                      new_r.reason = 'Inherited from activity: ' + a.name,
                      new_r.source = 'activity_inheritance',
                      new_r.inherited_from = a.name,
                      new_r.created_at = datetime()
        
        RETURN count(new_r) as created
      `, { batch_size: neo4j.int(BATCH_SIZE) });
      
      const created = result.records[0].get('created').toNumber();
      await session.close();
      
      if (created === 0) break;
      
      totalFears += created;
      if (batch % 5 === 0 || created < BATCH_SIZE) {
        console.log(`   Batch ${batch}: ${created} relationships created (${totalFears} total)`);
      }
      batch++;
      
      if (created < BATCH_SIZE) break;
    }
    console.log(`   ✅ Total MITIGATES_FEAR propagated: ${totalFears.toLocaleString()}\n`);

    // Final statistics
    const finalSession = driver.session();
    const finalStats = await finalSession.run(`
      MATCH (p:poi)
      WITH count(p) as total_pois
      MATCH (p:poi)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      RETURN total_pois, count(DISTINCT p) as with_emotions,
             round(100.0 * count(DISTINCT p) / total_pois, 2) as percentage
    `);
    
    const finalRecord = finalStats.records[0];
    const totalPois = finalRecord.get('total_pois').toNumber();
    const withEmotions = finalRecord.get('with_emotions').toNumber();
    const percentage = finalRecord.get('percentage');
    
    await finalSession.close();

    console.log('========================================');
    console.log('🎉 Emotion Propagation Complete!');
    console.log('========================================\n');
    
    console.log('Results:');
    console.log(`  ✅ EVOKES relationships created: ${totalEvokes.toLocaleString()}`);
    console.log(`  ✅ AMPLIFIES_DESIRE relationships created: ${totalDesires.toLocaleString()}`);
    console.log(`  ✅ MITIGATES_FEAR relationships created: ${totalFears.toLocaleString()}`);
    console.log(`  📊 Total relationships created: ${(totalEvokes + totalDesires + totalFears).toLocaleString()}\n`);
    
    console.log('Final State:');
    console.log(`  Total POIs: ${totalPois.toLocaleString()}`);
    console.log(`  POIs with emotional relationships: ${withEmotions.toLocaleString()} (${percentage}%)\n`);
    
    console.log('✅ Emotional intelligence propagated from activities to POIs!');
    console.log('💡 Check results in ChatNeo4j: "Show me POIs that evoke joy"\n');

  } finally {
    await driver.close();
  }
}

propagateEmotionsFromActivities().catch(console.error);

