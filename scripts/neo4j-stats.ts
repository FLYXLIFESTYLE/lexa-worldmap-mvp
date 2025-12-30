/**
 * Quick Neo4j stats dump for "is the brain wired?" checks.
 *
 * Usage:
 *   npm exec -- tsx scripts/neo4j-stats.ts
 */

import * as neo4j from 'neo4j-driver';
import './_env';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function scalar(session: neo4j.Session, cypher: string, params: Record<string, any> = {}) {
  const res = await session.run(cypher, params);
  const first = res.records[0];
  if (!first) return 0;
  const v = first.get(0);
  // Neo4j integers
  if (v && typeof v.toNumber === 'function') return v.toNumber();
  return Number(v ?? 0);
}

async function main() {
  const driver = neo4j.driver(
    requireEnv('NEO4J_URI'),
    neo4j.auth.basic(requireEnv('NEO4J_USER'), requireEnv('NEO4J_PASSWORD'))
  );
  const session = driver.session();

  try {
    const totalPois = await scalar(session, 'MATCH (p:poi) RETURN count(p)');
    const totalDestinations = await scalar(session, 'MATCH (d:destination) RETURN count(d)');
    const totalThemes = await scalar(session, 'MATCH (t:theme_category) RETURN count(t)');

    const locatedInRels = await scalar(session, 'MATCH (:poi)-[r:LOCATED_IN]->(:destination) RETURN count(r)');
    const featuredInRels = await scalar(session, 'MATCH (:poi)-[r:FEATURED_IN]->(:theme_category) RETURN count(r)');

    const emotionRels = await scalar(
      session,
      'MATCH ()-[r:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->() RETURN count(r)'
    );
    const activityRels = await scalar(session, 'MATCH ()-[r:SUPPORTS_ACTIVITY]->() RETURN count(r)');

    const poisWithThemes = await scalar(
      session,
      'MATCH (p:poi)-[:FEATURED_IN]->(:theme_category) RETURN count(DISTINCT p)'
    );
    const poisWithEmotions = await scalar(
      session,
      'MATCH (p:poi)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->() RETURN count(DISTINCT p)'
    );
    const poisWithActivities = await scalar(session, 'MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->() RETURN count(DISTINCT p)');

    console.log('Neo4j stats:');
    console.log(`- POIs: ${totalPois}`);
    console.log(`- Destinations: ${totalDestinations}`);
    console.log(`- Themes: ${totalThemes}`);
    console.log(`- Relationships: LOCATED_IN=${locatedInRels}, FEATURED_IN=${featuredInRels}`);
    console.log(`- Relationships: emotion_edges=${emotionRels}, supports_activity=${activityRels}`);
    console.log(`- POIs linked: with_themes=${poisWithThemes}, with_emotions=${poisWithEmotions}, with_activities=${poisWithActivities}`);

    // Per-destination POI counts for the Adriatic trio (if present)
    const adriatic = ['Adriatic (North)', 'Adriatic (Central)', 'Adriatic (South)'];
    for (const name of adriatic) {
      const n = await scalar(
        session,
        `
        MATCH (d:destination {name: $name})
        OPTIONAL MATCH (p:poi)-[:LOCATED_IN]->(d)
        RETURN count(p)
        `,
        { name }
      );
      console.log(`- POIs in destination "${name}": ${n}`);

      // IMPORTANT: count only POIs that actually have those edges.
      const themed = await scalar(
        session,
        `
        MATCH (d:destination {name: $name})
        MATCH (p:poi)-[:LOCATED_IN]->(d)
        WHERE (p)-[:FEATURED_IN]->(:theme_category)
        RETURN count(DISTINCT p)
        `,
        { name }
      );
      const emoted = await scalar(
        session,
        `
        MATCH (d:destination {name: $name})
        MATCH (p:poi)-[:LOCATED_IN]->(d)
        WHERE (p)-[:EVOKES|AMPLIFIES_DESIRE|MITIGATES_FEAR]->()
        RETURN count(DISTINCT p)
        `,
        { name }
      );
      const acted = await scalar(
        session,
        `
        MATCH (d:destination {name: $name})
        MATCH (p:poi)-[:LOCATED_IN]->(d)
        WHERE (p)-[:SUPPORTS_ACTIVITY]->()
        RETURN count(DISTINCT p)
        `,
        { name }
      );
      console.log(`  - POIs in "${name}" linked: with_themes=${themed}, with_emotions=${emoted}, with_activities=${acted}`);
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


