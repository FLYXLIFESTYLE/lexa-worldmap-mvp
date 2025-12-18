/**
 * Comprehensive POI Relationship Verification
 * 
 * Checks that ALL POIs have minimum required relationships:
 * 1. At least ONE activity (SUPPORTS_ACTIVITY)
 * 2. At least ONE emotion (EVOKES, AMPLIFIES_DESIRE, or MITIGATES_FEAR)
 * 3. LOCATED_IN → city
 * 4. IN_COUNTRY → country
 * 5. IN_REGION → region
 * 6. IN_AREA → area
 * 7. IN_CONTINENT → continent
 * 
 * Run: npx ts-node scripts/verify-all-poi-relationships.ts
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

interface RelationshipStats {
  total: number;
  withRelationship: number;
  withoutRelationship: number;
  percentage: number;
}

async function checkRelationship(relationshipType: string, targetLabel: string): Promise<RelationshipStats> {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi)
      RETURN count(*) as total,
             count(CASE WHEN (p)-[:${relationshipType}]->(:${targetLabel}) THEN 1 END) as with_rel,
             count(CASE WHEN NOT (p)-[:${relationshipType}]->(:${targetLabel}) THEN 1 END) as without_rel,
             100.0 * count(CASE WHEN (p)-[:${relationshipType}]->(:${targetLabel}) THEN 1 END) / count(*) as percentage
    `);
    
    const record = result.records[0];
    return {
      total: record.get('total').toNumber(),
      withRelationship: record.get('with_rel').toNumber(),
      withoutRelationship: record.get('without_rel').toNumber(),
      percentage: record.get('percentage')
    };
    
  } finally {
    await session.close();
  }
}

async function checkActivityRelationship(): Promise<RelationshipStats> {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (p:poi)
      RETURN count(*) as total,
             count(CASE WHEN (p)-[:SUPPORTS_ACTIVITY]->(:activity_type) THEN 1 END) as with_rel,
             count(CASE WHEN NOT (p)-[:SUPPORTS_ACTIVITY]->(:activity_type) THEN 1 END) as without_rel,
             100.0 * count(CASE WHEN (p)-[:SUPPORTS_ACTIVITY]->(:activity_type) THEN 1 END) / count(*) as percentage
    `);
    
    const record = result.records[0];
    return {
      total: record.get('total').toNumber(),
      withRelationship: record.get('with_rel').toNumber(),
      withoutRelationship: record.get('without_rel').toNumber(),
      percentage: record.get('percentage')
    };
    
  } finally {
    await session.close();
  }
}

async function checkEmotionRelationship(): Promise<RelationshipStats> {
  const session = driver.session();
  
  try {
    // Check if POI has ANY emotional relationship (EVOKES, AMPLIFIES_DESIRE, or MITIGATES_FEAR)
    const result = await session.run(`
      MATCH (p:poi)
      RETURN count(*) as total,
             count(CASE WHEN (p)-[:EVOKES]->(:Emotion) OR 
                                (p)-[:AMPLIFIES_DESIRE]->(:Desire) OR 
                                (p)-[:MITIGATES_FEAR]->(:Fear) THEN 1 END) as with_rel,
             count(CASE WHEN NOT ((p)-[:EVOKES]->(:Emotion) OR 
                                  (p)-[:AMPLIFIES_DESIRE]->(:Desire) OR 
                                  (p)-[:MITIGATES_FEAR]->(:Fear)) THEN 1 END) as without_rel,
             100.0 * count(CASE WHEN (p)-[:EVOKES]->(:Emotion) OR 
                                      (p)-[:AMPLIFIES_DESIRE]->(:Desire) OR 
                                      (p)-[:MITIGATES_FEAR]->(:Fear) THEN 1 END) / count(*) as percentage
    `);
    
    const record = result.records[0];
    return {
      total: record.get('total').toNumber(),
      withRelationship: record.get('with_rel').toNumber(),
      withoutRelationship: record.get('without_rel').toNumber(),
      percentage: record.get('percentage')
    };
    
  } finally {
    await session.close();
  }
}

async function getSamplePOIsMissingRelationships(relationshipType: string, limit: number = 10): Promise<any[]> {
  const session = driver.session();
  
  try {
    let query = '';
    
    if (relationshipType === 'EMOTION') {
      query = `
        MATCH (p:poi)
        WHERE NOT ((p)-[:EVOKES]->(:Emotion) OR 
                   (p)-[:AMPLIFIES_DESIRE]->(:Desire) OR 
                   (p)-[:MITIGATES_FEAR]->(:Fear))
        RETURN p.poi_uid as poi_uid, p.name as name, p.type as type, p.city as city
        LIMIT $limit
      `;
    } else if (relationshipType === 'SUPPORTS_ACTIVITY') {
      query = `
        MATCH (p:poi)
        WHERE NOT (p)-[:SUPPORTS_ACTIVITY]->(:activity_type)
        RETURN p.poi_uid as poi_uid, p.name as name, p.type as type, p.city as city
        LIMIT $limit
      `;
    } else {
      query = `
        MATCH (p:poi)
        WHERE NOT (p)-[:${relationshipType}]->()
        RETURN p.poi_uid as poi_uid, p.name as name, p.type as type, p.city as city
        LIMIT $limit
      `;
    }
    
    const result = await session.run(query, { limit: neo4j.int(limit) });
    
    return result.records.map(r => ({
      poi_uid: r.get('poi_uid'),
      name: r.get('name'),
      type: r.get('type'),
      city: r.get('city')
    }));
    
  } finally {
    await session.close();
  }
}

async function main() {
  console.log('🔍 Comprehensive POI Relationship Verification');
  console.log('===============================================\n');
  console.log('Checking that ALL POIs have minimum required relationships:\n');
  
  try {
    const checks = [
      { name: 'Activity', type: 'SUPPORTS_ACTIVITY', target: 'activity_type', required: true },
      { name: 'Emotion', type: 'EMOTION', target: '', required: true },
      { name: 'City', type: 'LOCATED_IN', target: 'city', required: true },
      { name: 'Country', type: 'IN_COUNTRY', target: 'country', required: false },
      { name: 'Region', type: 'IN_REGION', target: 'region', required: false },
      { name: 'Area', type: 'IN_AREA', target: 'area', required: false },
      { name: 'Continent', type: 'IN_CONTINENT', target: 'continent', required: false }
    ];
    
    const results: Array<{name: string; stats: RelationshipStats; required: boolean}> = [];
    
    for (const check of checks) {
      console.log(`📊 Checking ${check.name} relationships...`);
      
      let stats: RelationshipStats;
      
      if (check.type === 'EMOTION') {
        stats = await checkEmotionRelationship();
      } else if (check.type === 'SUPPORTS_ACTIVITY') {
        stats = await checkActivityRelationship();
      } else {
        stats = await checkRelationship(check.type, check.target);
      }
      
      results.push({ name: check.name, stats, required: check.required });
      
      const icon = stats.percentage >= 95 ? '✅' : stats.percentage >= 50 ? '⚠️' : '❌';
      console.log(`   ${icon} ${stats.withRelationship.toLocaleString()} / ${stats.total.toLocaleString()} (${stats.percentage.toFixed(1)}%)`);
      
      if (stats.withoutRelationship > 0 && check.required) {
        console.log(`   ⚠️  ${stats.withoutRelationship.toLocaleString()} POIs missing ${check.name}\n`);
      } else {
        console.log('');
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60) + '\n');
    
    const requiredResults = results.filter(r => r.required);
    const allRequiredMet = requiredResults.every(r => r.stats.percentage >= 95);
    
    if (allRequiredMet) {
      console.log('✅ ALL REQUIRED RELATIONSHIPS: EXCELLENT (95%+)\n');
    } else {
      console.log('⚠️  SOME REQUIRED RELATIONSHIPS MISSING:\n');
      
      for (const result of requiredResults) {
        if (result.stats.percentage < 95) {
          console.log(`   ❌ ${result.name}: ${result.stats.percentage.toFixed(1)}% coverage`);
          console.log(`      Missing: ${result.stats.withoutRelationship.toLocaleString()} POIs\n`);
          
          // Show sample POIs
          console.log(`   📋 Sample POIs missing ${result.name}:`);
          const relationshipType = result.name === 'Activity' ? 'SUPPORTS_ACTIVITY' : 
                                   result.name === 'Emotion' ? 'EMOTION' : 
                                   result.name === 'City' ? 'LOCATED_IN' : 
                                   `IN_${result.name.toUpperCase()}`;
          const samples = await getSamplePOIsMissingRelationships(relationshipType, 5);
          
          for (const sample of samples) {
            console.log(`      • ${sample.name} (${sample.city || 'Unknown city'}) - ${sample.type || 'Unknown type'}`);
          }
          console.log('');
        }
      }
    }
    
    // Detailed breakdown
    console.log('📊 Detailed Breakdown:\n');
    
    const table = results.map(r => ({
      Relationship: r.name,
      Required: r.required ? 'YES' : 'No',
      Coverage: `${r.stats.percentage.toFixed(1)}%`,
      With: r.stats.withRelationship.toLocaleString(),
      Without: r.stats.withoutRelationship.toLocaleString(),
      Status: r.stats.percentage >= 95 ? '✅ Good' : 
              r.stats.percentage >= 50 ? '⚠️ Fair' : 
              '❌ Poor'
    }));
    
    console.table(table);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:\n');
    
    const activityResult = results.find(r => r.name === 'Activity');
    if (activityResult && activityResult.stats.percentage < 95) {
      console.log('1. RUN: npx ts-node scripts/propagate-emotions-from-activities.ts');
      console.log('   This will infer activities from POI types\n');
    }
    
    const emotionResult = results.find(r => r.name === 'Emotion');
    if (emotionResult && emotionResult.stats.percentage < 95) {
      console.log('2. RUN: npx ts-node scripts/propagate-emotions-from-activities.ts');
      console.log('   This will create emotional relationships\n');
    }
    
    const cityResult = results.find(r => r.name === 'City');
    if (cityResult && cityResult.stats.percentage < 95) {
      console.log('3. RUN: npx ts-node scripts/verify-poi-city-relationships.ts');
      console.log('   This will create LOCATED_IN → city relationships\n');
    }
    
    const geoResults = results.filter(r => ['Country', 'Region', 'Area', 'Continent'].includes(r.name));
    const needsGeo = geoResults.some(r => r.stats.percentage < 50);
    if (needsGeo) {
      console.log('4. GEOGRAPHIC RELATIONSHIPS: Need to create script for country/region/area/continent');
      console.log('   These are optional but improve filtering\n');
    }
    
    console.log('💡 TIP: Run scripts in order listed above for best results!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await driver.close();
  }
}

main();

