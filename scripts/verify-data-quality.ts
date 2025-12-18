import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

async function verifyDataQuality() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    const session = driver.session();
    
    console.log('📊 LEXA Data Quality Report\n');
    console.log('=' .repeat(50) + '\n');

    // Total POIs
    const totalResult = await session.run('MATCH (p:poi) RETURN count(p) as total');
    const totalPois = totalResult.records[0].get('total').toNumber();
    console.log(`Total POIs: ${totalPois.toLocaleString()}`);

    // POIs with LOCATED_IN (count unique POIs, not relationships)
    const locatedResult = await session.run(`
      MATCH (p:poi)-[:LOCATED_IN]->()
      RETURN count(DISTINCT p) as with_located_in
    `);
    const withLocated = locatedResult.records[0].get('with_located_in').toNumber();
    console.log(`POIs with LOCATED_IN: ${withLocated.toLocaleString()} (${(withLocated/totalPois*100).toFixed(1)}%)`);

    // POIs WITHOUT LOCATED_IN
    const withoutResult = await session.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:LOCATED_IN]->()
      RETURN count(p) as without_located_in
    `);
    const withoutLocated = withoutResult.records[0].get('without_located_in').toNumber();
    console.log(`POIs WITHOUT LOCATED_IN: ${withoutLocated.toLocaleString()} (${(withoutLocated/totalPois*100).toFixed(1)}%)\n`);

    // Unnamed POIs
    const unnamedResult = await session.run(`
      MATCH (p:poi)
      WHERE p.name CONTAINS 'Unnamed' OR p.name CONTAINS 'unnamed' OR p.name IS NULL OR p.name = ''
      RETURN count(p) as unnamed
    `);
    const unnamed = unnamedResult.records[0].get('unnamed').toNumber();
    console.log(`Unnamed POIs: ${unnamed.toLocaleString()} (${(unnamed/totalPois*100).toFixed(1)}%)`);

    // POIs with luxury scores
    const scoredResult = await session.run(`
      MATCH (p:poi)
      WHERE p.luxury_score IS NOT NULL AND p.luxury_score > 0
      RETURN count(p) as scored
    `);
    const scored = scoredResult.records[0].get('scored').toNumber();
    console.log(`POIs with luxury scores: ${scored.toLocaleString()} (${(scored/totalPois*100).toFixed(1)}%)`);

    // POIs with emotional relationships
    const emotionsResult = await session.run(`
      MATCH (p:poi)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      RETURN count(DISTINCT p) as with_emotions
    `);
    const withEmotions = emotionsResult.records[0].get('with_emotions').toNumber();
    console.log(`POIs with emotional relationships: ${withEmotions.toLocaleString()} (${(withEmotions/totalPois*100).toFixed(1)}%)\n`);

    // Nodes with NO relationships
    const orphanedResult = await session.run(`
      MATCH (n)
      WHERE NOT (n)--()
      RETURN count(n) as orphaned
    `);
    const orphaned = orphanedResult.records[0].get('orphaned').toNumber();
    console.log(`🚨 Orphaned nodes (no relationships): ${orphaned.toLocaleString()}\n`);

    // Top destinations by POI count
    console.log('Top 10 Destinations by POI Count:');
    const topDestsResult = await session.run(`
      MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
      RETURN d.name as destination, count(p) as poi_count
      ORDER BY poi_count DESC
      LIMIT 10
    `);
    topDestsResult.records.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.get('destination')}: ${r.get('poi_count').toNumber().toLocaleString()} POIs`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ Data Quality Check Complete!\n');

    await session.close();
  } finally {
    await driver.close();
  }
}

verifyDataQuality().catch(console.error);

