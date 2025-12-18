import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

async function checkActivityRelationships() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    const session = driver.session();
    
    console.log('🔍 Activity & Emotion Relationship Analysis\n');
    console.log('=' .repeat(60) + '\n');

    // Total POIs
    const totalResult = await session.run('MATCH (p:poi) RETURN count(p) as total');
    const totalPois = totalResult.records[0].get('total').toNumber();
    console.log(`📍 Total POIs: ${totalPois.toLocaleString()}\n`);

    // POIs with SUPPORTS_ACTIVITY relationships
    const withActivityResult = await session.run(`
      MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->()
      RETURN count(DISTINCT p) as with_activity
    `);
    const withActivity = withActivityResult.records[0].get('with_activity').toNumber();
    const withActivityPct = (withActivity / totalPois * 100).toFixed(1);
    console.log(`✅ POIs with SUPPORTS_ACTIVITY: ${withActivity.toLocaleString()} (${withActivityPct}%)`);
    console.log(`❌ POIs WITHOUT SUPPORTS_ACTIVITY: ${(totalPois - withActivity).toLocaleString()} (${(100 - parseFloat(withActivityPct)).toFixed(1)}%)\n`);

    // Total activity_type nodes
    const activityTypesResult = await session.run(`
      MATCH (a:activity_type)
      RETURN count(a) as total_activities
    `);
    const totalActivities = activityTypesResult.records[0].get('total_activities').toNumber();
    console.log(`🎯 Total activity_type nodes: ${totalActivities.toLocaleString()}\n`);

    // Activities with emotional relationships
    const activitiesWithEmotionsResult = await session.run(`
      MATCH (a:activity_type)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      RETURN count(DISTINCT a) as with_emotions
    `);
    const activitiesWithEmotions = activitiesWithEmotionsResult.records[0].get('with_emotions').toNumber();
    const activityEmotionPct = totalActivities > 0 ? (activitiesWithEmotions / totalActivities * 100).toFixed(1) : '0.0';
    console.log(`🧠 Activities with emotional relationships: ${activitiesWithEmotions.toLocaleString()} (${activityEmotionPct}%)`);
    console.log(`❌ Activities WITHOUT emotions: ${(totalActivities - activitiesWithEmotions).toLocaleString()} (${(100 - parseFloat(activityEmotionPct)).toFixed(1)}%)\n`);

    // POIs with direct emotional relationships
    const poisWithEmotionsResult = await session.run(`
      MATCH (p:poi)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      RETURN count(DISTINCT p) as with_emotions
    `);
    const poisWithEmotions = poisWithEmotionsResult.records[0].get('with_emotions').toNumber();
    const poiEmotionPct = (poisWithEmotions / totalPois * 100).toFixed(1);
    console.log(`🧠 POIs with DIRECT emotional relationships: ${poisWithEmotions.toLocaleString()} (${poiEmotionPct}%)`);
    console.log(`❌ POIs WITHOUT emotions: ${(totalPois - poisWithEmotions).toLocaleString()} (${(100 - parseFloat(poiEmotionPct)).toFixed(1)}%)\n`);

    // POIs that could INHERIT emotions from activities
    const inheritableEmotionsResult = await session.run(`
      MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      WHERE NOT (p)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      RETURN count(DISTINCT p) as can_inherit
    `);
    const canInherit = inheritableEmotionsResult.records[0].get('can_inherit').toNumber();
    console.log(`💡 POIs that can INHERIT emotions from activities: ${canInherit.toLocaleString()}\n`);

    // Sample activities without emotions
    console.log('🔍 Sample activities WITHOUT emotional relationships:');
    const sampleActivitiesResult = await session.run(`
      MATCH (a:activity_type)
      WHERE NOT (a)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
      RETURN a.name as activity
      LIMIT 10
    `);
    sampleActivitiesResult.records.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.get('activity')}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 RECOMMENDATIONS:\n');
    
    if (withActivity < totalPois * 0.8) {
      console.log(`⚠️  Only ${withActivityPct}% of POIs have SUPPORTS_ACTIVITY relationships`);
      console.log(`   → Need to infer activities from POI types`);
    }
    
    if (activitiesWithEmotions < totalActivities * 0.8) {
      console.log(`⚠️  Only ${activityEmotionPct}% of activities have emotional relationships`);
      console.log(`   → Need to create emotional relationships for all activities`);
    }
    
    if (canInherit > 0) {
      console.log(`✅ ${canInherit.toLocaleString()} POIs can inherit emotions from activities`);
      console.log(`   → Run emotion inference script to propagate`);
    }

    console.log('');

    await session.close();
  } finally {
    await driver.close();
  }
}

checkActivityRelationships().catch(console.error);

