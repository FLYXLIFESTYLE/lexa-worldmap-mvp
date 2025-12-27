/**
 * Check Enrichment History
 * Investigate when and how POIs were enriched
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

async function checkEnrichmentHistory() {
  console.log('🔍 Checking Enrichment History\n');
  
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    const session = driver.session();
    
    // Check Arabian Gulf enrichment
    console.log('📍 ARABIAN GULF (UAE) - 10,474 enriched:');
    const arabianGulf = await session.run(`
      MATCH (p:poi)-[:LOCATED_IN]->(d:destination {name: 'Arabian Gulf (UAE)'})
      WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NOT NULL
        AND coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) > 0
      RETURN 
        p.enriched_source as source,
        count(*) as count,
        min(p.enriched_at) as first_enriched,
        max(p.enriched_at) as last_enriched
      ORDER BY count DESC
    `);
    
    for (const record of arabianGulf.records) {
      const source = record.get('source') || 'unknown';
      const count = record.get('count').toNumber();
      const first = record.get('first_enriched');
      const last = record.get('last_enriched');
      console.log(`  • Source: ${source}`);
      console.log(`    └─ Count: ${count.toLocaleString()}`);
      console.log(`    └─ First: ${first || 'N/A'}`);
      console.log(`    └─ Last: ${last || 'N/A'}`);
    }
    
    // Check Amalfi Coast enrichment
    console.log('\n📍 AMALFI COAST - 5,086 enriched (100%!):');
    const amalfiCoast = await session.run(`
      MATCH (p:poi)-[:LOCATED_IN]->(d:destination {name: 'Amalfi Coast'})
      WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NOT NULL
        AND coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) > 0
      RETURN 
        p.enriched_source as source,
        count(*) as count,
        min(p.enriched_at) as first_enriched,
        max(p.enriched_at) as last_enriched,
        avg(coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore)) as avg_score
      ORDER BY count DESC
    `);
    
    for (const record of amalfiCoast.records) {
      const source = record.get('source') || 'unknown';
      const count = record.get('count').toNumber();
      const first = record.get('first_enriched');
      const last = record.get('last_enriched');
      const avgScore = record.get('avg_score');
      console.log(`  • Source: ${source}`);
      console.log(`    └─ Count: ${count.toLocaleString()}`);
      console.log(`    └─ Avg Score: ${avgScore ? Math.round(avgScore * 10) / 10 : 'N/A'}`);
      console.log(`    └─ First: ${first || 'N/A'}`);
      console.log(`    └─ Last: ${last || 'N/A'}`);
    }
    
    // Check ALL enrichment sources
    console.log('\n📊 ALL ENRICHMENT SOURCES:');
    const allSources = await session.run(`
      MATCH (p:poi)
      WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NOT NULL
        AND coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) > 0
      RETURN 
        p.enriched_source as source,
        count(*) as count,
        min(p.enriched_at) as first_enriched,
        max(p.enriched_at) as last_enriched,
        avg(coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore)) as avg_score
      ORDER BY count DESC
    `);
    
    for (const record of allSources.records) {
      const source = record.get('source') || 'unknown';
      const count = record.get('count').toNumber();
      const first = record.get('first_enriched');
      const last = record.get('last_enriched');
      const avgScore = record.get('avg_score');
      console.log(`  • ${source}: ${count.toLocaleString()} POIs (avg score: ${avgScore ? Math.round(avgScore * 10) / 10 : 'N/A'})`);
      if (first) {
        console.log(`    └─ Period: ${first.toString().substring(0, 10)} to ${last ? last.toString().substring(0, 10) : 'N/A'}`);
      }
    }
    
    // Check quality of enriched POIs
    console.log('\n📈 QUALITY ANALYSIS:');
    const qualityAnalysis = await session.run(`
      MATCH (p:poi)
      WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NOT NULL
      WITH coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) as score
      RETURN 
        CASE 
          WHEN score >= 8 THEN 'High Luxury (8-10)'
          WHEN score >= 6 THEN 'Upscale (6-7)'
          WHEN score >= 4 THEN 'Standard (4-5)'
          ELSE 'Basic (0-3)'
        END as tier,
        count(*) as count
      ORDER BY tier
    `);
    
    for (const record of qualityAnalysis.records) {
      const tier = record.get('tier');
      const count = record.get('count').toNumber();
      const percent = (count / 16377 * 100).toFixed(1);
      console.log(`  • ${tier}: ${count.toLocaleString()} (${percent}%)`);
    }
    
    await session.close();

    console.log('\n💡 INSIGHTS:\n');
    console.log('Based on the data above:');
    console.log('1. Check "enriched_source" to see where data came from');
    console.log('2. Check dates to see when enrichment happened');
    console.log('3. Note if scores are mostly low (< 6) or high (>= 6)');
    console.log('');

  } finally {
    await driver.close();
  }
}

checkEnrichmentHistory().catch(console.error);

