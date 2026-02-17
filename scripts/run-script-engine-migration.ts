/**
 * Run the Script Engine Neo4j Migration
 *
 * Seeds the Neo4j database with experience_arc, arc_phase,
 * guest_archetype, journey_type, and ritual_template nodes.
 *
 * Usage:
 *   npx ts-node scripts/run-script-engine-migration.ts
 *
 * Requires: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
  console.error('Missing Neo4j credentials. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env');
  process.exit(1);
}

async function runMigration() {
  const driver = neo4j.driver(NEO4J_URI!, neo4j.auth.basic(NEO4J_USER!, NEO4J_PASSWORD!));

  try {
    await driver.verifyConnectivity();
    console.log('Connected to Neo4j');

    const migrationPath = path.resolve(__dirname, '../neo4j/migrations/001-script-engine-schema.cypher');
    const cypher = fs.readFileSync(migrationPath, 'utf-8');

    // Split into individual statements (separated by semicolons at end of line)
    // Filter out comments and empty lines
    const statements = cypher
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('//'));

    console.log(`Found ${statements.length} Cypher statements to execute`);

    const session = driver.session();
    let success = 0;
    let failed = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      // Skip pure comment blocks
      if (stmt.split('\n').every(line => line.trim().startsWith('//'))) continue;

      try {
        await session.run(stmt);
        success++;
        // Print progress every 10 statements
        if (success % 10 === 0) {
          console.log(`  Progress: ${success}/${statements.length} executed`);
        }
      } catch (err: any) {
        // Constraints/indexes may already exist — that's fine
        if (err.message?.includes('already exists') || err.message?.includes('EquivalentSchemaRuleAlreadyExists')) {
          success++;
        } else {
          console.error(`  Statement ${i + 1} FAILED:`, err.message);
          console.error(`  Statement preview: ${stmt.slice(0, 100)}...`);
          failed++;
        }
      }
    }

    await session.close();

    console.log('\n--- Migration Complete ---');
    console.log(`Successful: ${success}`);
    console.log(`Failed: ${failed}`);

    // Verify the data was created
    const verifySession = driver.session();
    const arcCount = await verifySession.run('MATCH (ea:experience_arc) RETURN count(ea) AS count');
    const archetypeCount = await verifySession.run('MATCH (ga:guest_archetype) RETURN count(ga) AS count');
    const phaseCount = await verifySession.run('MATCH (ap:arc_phase) RETURN count(ap) AS count');
    const jtCount = await verifySession.run('MATCH (jt:journey_type) RETURN count(jt) AS count');
    const ritualCount = await verifySession.run('MATCH (rt:ritual_template) RETURN count(rt) AS count');

    console.log('\n--- Verification ---');
    console.log(`Experience Arcs: ${arcCount.records[0].get('count').toNumber()}`);
    console.log(`Guest Archetypes: ${archetypeCount.records[0].get('count').toNumber()}`);
    console.log(`Arc Phases: ${phaseCount.records[0].get('count').toNumber()}`);
    console.log(`Journey Types: ${jtCount.records[0].get('count').toNumber()}`);
    console.log(`Ritual Templates: ${ritualCount.records[0].get('count').toNumber()}`);

    await verifySession.close();
  } finally {
    await driver.close();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
