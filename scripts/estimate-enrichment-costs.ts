/**
 * Estimate Enrichment Costs by Destination
 * 
 * Analyzes POI count per destination and calculates enrichment costs
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

interface DestinationStats {
  destination: string;
  total_pois: number;
  unenriched_pois: number;
  enriched_pois: number;
  percent_enriched: number;
  estimated_cost_usd: number;
  estimated_time_minutes: number;
}

async function estimateEnrichmentCosts() {
  console.log('💰 Enrichment Cost Estimation by Destination\n');
  
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    const session = driver.session();
    
    // Get stats for all destinations
    const result = await session.run(`
      MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
      WITH d.name as destination,
           count(p) as total_pois,
           sum(CASE WHEN p.luxury_score IS NOT NULL AND p.luxury_score > 0 THEN 1 ELSE 0 END) as enriched_pois
      RETURN destination,
             total_pois,
             enriched_pois,
             total_pois - enriched_pois as unenriched_pois
      ORDER BY unenriched_pois DESC
    `);
    
    await session.close();

    const destinations: DestinationStats[] = result.records.map(r => {
      const total = r.get('total_pois').toNumber();
      const enriched = r.get('enriched_pois').toNumber();
      const unenriched = r.get('unenriched_pois').toNumber();
      
      // Cost calculation:
      // - Google Places API: $0.017 per request
      // - Website scraping (40% have websites): $0.002 per scrape
      // - Emotional inference (60% qualify): $0.01 per Claude call
      // Average: ~$0.025 per POI
      
      const avgCostPerPOI = 0.025;
      const estimatedCost = unenriched * avgCostPerPOI;
      
      // Time calculation:
      // - ~10 seconds per POI (Google + Website + Emotions + delays)
      // - Batch of 50 = ~500 seconds = ~8 minutes
      const estimatedTimeMinutes = Math.ceil((unenriched * 10) / 60);
      
      return {
        destination: r.get('destination'),
        total_pois: total,
        enriched_pois: enriched,
        unenriched_pois: unenriched,
        percent_enriched: total > 0 ? Math.round((enriched / total) * 100) : 0,
        estimated_cost_usd: Math.round(estimatedCost * 100) / 100,
        estimated_time_minutes: estimatedTimeMinutes
      };
    });

    // Display results
    console.log('📊 DESTINATION ENRICHMENT ANALYSIS\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Destination                    Total    Enriched  Remaining    %    Cost    Time');
    console.log('───────────────────────────────────────────────────────────────────────────────');

    let totalPOIs = 0;
    let totalEnriched = 0;
    let totalUnenriched = 0;
    let totalCost = 0;
    let totalTime = 0;

    for (const dest of destinations) {
      const destName = dest.destination.padEnd(30);
      const total = String(dest.total_pois).padStart(6);
      const enriched = String(dest.enriched_pois).padStart(9);
      const remaining = String(dest.unenriched_pois).padStart(10);
      const percent = String(dest.percent_enriched).padStart(4);
      const cost = `$${dest.estimated_cost_usd}`.padStart(7);
      const time = `${dest.estimated_time_minutes}m`.padStart(7);

      console.log(`${destName} ${total} ${enriched} ${remaining} ${percent}% ${cost} ${time}`);

      totalPOIs += dest.total_pois;
      totalEnriched += dest.enriched_pois;
      totalUnenriched += dest.unenriched_pois;
      totalCost += dest.estimated_cost_usd;
      totalTime += dest.estimated_time_minutes;
    }

    console.log('───────────────────────────────────────────────────────────────────────────────');
    console.log(`${'TOTAL'.padEnd(30)} ${String(totalPOIs).padStart(6)} ${String(totalEnriched).padStart(9)} ${String(totalUnenriched).padStart(10)} ${String(Math.round((totalEnriched / totalPOIs) * 100)).padStart(4)}% $${String(Math.round(totalCost * 100) / 100).padStart(6)} ${String(totalTime).padStart(6)}m`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Summary with recommendations
    console.log('💡 RECOMMENDATIONS:\n');

    // Top 5 by priority (most POIs, least enriched)
    const priority = destinations
      .filter(d => d.unenriched_pois > 100)
      .sort((a, b) => b.unenriched_pois - a.unenriched_pois)
      .slice(0, 5);

    console.log('🎯 TOP 5 PRIORITY DESTINATIONS:\n');
    for (let i = 0; i < priority.length; i++) {
      const dest = priority[i];
      console.log(`${i + 1}. ${dest.destination}`);
      console.log(`   └─ ${dest.unenriched_pois.toLocaleString()} POIs to enrich`);
      console.log(`   └─ Estimated cost: $${dest.estimated_cost_usd}`);
      console.log(`   └─ Estimated time: ${Math.ceil(dest.estimated_time_minutes / 60)} hours (${Math.ceil(dest.estimated_time_minutes / 60 / 8)} days @ 8hr/day)`);
      console.log('');
    }

    // Quick wins (small destinations, easy to complete)
    const quickWins = destinations
      .filter(d => d.unenriched_pois > 0 && d.unenriched_pois < 500)
      .sort((a, b) => a.unenriched_pois - b.unenriched_pois)
      .slice(0, 5);

    if (quickWins.length > 0) {
      console.log('⚡ QUICK WINS (Complete These First):\n');
      for (const dest of quickWins) {
        console.log(`• ${dest.destination}: ${dest.unenriched_pois} POIs ($${dest.estimated_cost_usd}, ~${dest.estimated_time_minutes}min)`);
      }
      console.log('');
    }

    // Cost scenarios
    console.log('💰 COST SCENARIOS:\n');
    console.log(`• Complete ALL destinations: $${Math.round(totalCost * 100) / 100} (${Math.ceil(totalTime / 60)} hours)`);
    console.log(`• Top 5 priority destinations: $${priority.reduce((sum, d) => sum + d.estimated_cost_usd, 0).toFixed(2)}`);
    console.log(`• Quick wins (< 500 POIs each): $${quickWins.reduce((sum, d) => sum + d.estimated_cost_usd, 0).toFixed(2)}`);
    console.log('');

    // Batch recommendations
    console.log('📦 BATCH SIZE RECOMMENDATIONS:\n');
    console.log('• Current: 50 POIs/batch (~8 minutes)');
    console.log('• Recommended: 100 POIs/batch (~16 minutes) - Better throughput');
    console.log('• Maximum: 200 POIs/batch (~33 minutes) - Approach API limits');
    console.log('• Overnight: 500 POIs/batch (~83 minutes) - For automated runs');
    console.log('');

    console.log('🤖 AUTOMATION STRATEGY:\n');
    console.log('1. Set up overnight automation for large destinations');
    console.log('2. Run 100 POI batches every 30 minutes during day');
    console.log('3. Complete quick wins first for immediate results');
    console.log('4. Focus on French Riviera first (highest value)');
    console.log('');

  } finally {
    await driver.close();
  }
}

estimateEnrichmentCosts().catch(console.error);

