/**
 * Run the Script Engine Neo4j Migration
 *
 * Seeds the Neo4j database with experience_arc, arc_phase,
 * guest_archetype, journey_type, and ritual_template nodes.
 *
 * Usage:
 *   npx tsx scripts/run-script-engine-migration.ts
 *
 * Requires: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
  console.error('Missing Neo4j credentials. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env');
  process.exit(1);
}

async function runMigration() {
  console.log('Connecting to Neo4j...');
  console.log(`  URI: ${NEO4J_URI}`);

  const driver = neo4j.driver(NEO4J_URI!, neo4j.auth.basic(NEO4J_USER!, NEO4J_PASSWORD!));

  try {
    await driver.verifyConnectivity();
    console.log('Connected to Neo4j\n');

    const migrationPath = path.resolve(__dirname, '../neo4j/migrations/001-script-engine-schema.cypher');
    const cypher = fs.readFileSync(migrationPath, 'utf-8');

    // Split into individual statements by semicolons followed by newlines
    const statements = cypher
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false;
        // Skip blocks that are only comments
        const nonCommentLines = s.split('\n').filter(line => !line.trim().startsWith('//') && line.trim().length > 0);
        return nonCommentLines.length > 0;
      });

    console.log(`Found ${statements.length} Cypher statements to execute\n`);

    const session = driver.session();
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Remove comment lines from the statement before running
      const cleanStmt = stmt
        .split('\n')
        .filter(line => !line.trim().startsWith('//'))
        .join('\n')
        .trim();

      if (!cleanStmt) {
        skipped++;
        continue;
      }

      try {
        await session.run(cleanStmt);
        success++;
        if (success % 10 === 0) {
          console.log(`  Progress: ${success} executed, ${i + 1}/${statements.length} processed`);
        }
      } catch (err: any) {
        const msg = err.message || '';
        // Constraints/indexes may already exist
        if (msg.includes('already exists') || msg.includes('EquivalentSchemaRuleAlreadyExists')) {
          skipped++;
        } else {
          console.error(`  FAILED statement ${i + 1}: ${msg}`);
          console.error(`  Preview: ${cleanStmt.slice(0, 120)}...`);
          failed++;
        }
      }
    }

    await session.close();

    console.log('\n--- Migration Complete ---');
    console.log(`Successful: ${success}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Failed: ${failed}`);

    // Verify (each query in its own session to avoid transaction conflicts)
    const runCount = async (query: string) => {
      const s = driver.session();
      try {
        const r = await s.run(query);
        return r;
      } finally {
        await s.close();
      }
    };

    const counts = [
      await runCount('MATCH (ea:experience_arc) RETURN count(ea) AS c'),
      await runCount('MATCH (ga:guest_archetype) RETURN count(ga) AS c'),
      await runCount('MATCH (ap:arc_phase) RETURN count(ap) AS c'),
      await runCount('MATCH (jt:journey_type) RETURN count(jt) AS c'),
      await runCount('MATCH (rt:ritual_template) RETURN count(rt) AS c'),
    ];
    const verifySession = { close: async () => {} };

    const toNum = (r: any) => {
      const val = r.records[0].get('c');
      return typeof val === 'object' && val.toNumber ? val.toNumber() : Number(val);
    };

    console.log('\n--- Verification ---');
    console.log(`Experience Arcs:    ${toNum(counts[0])} (expected 7)`);
    console.log(`Guest Archetypes:   ${toNum(counts[1])} (expected 7)`);
    console.log(`Arc Phases:         ${toNum(counts[2])} (expected 28)`);
    console.log(`Journey Types:      ${toNum(counts[3])} (expected 4)`);
    console.log(`Ritual Templates:   ${toNum(counts[4])} (expected 4)`);

    await verifySession.close();

    if (failed > 0) {
      console.log('\nSome statements failed. Check errors above.');
      process.exit(1);
    } else {
      console.log('\nMigration completed successfully!');
    }
  } finally {
    await driver.close();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
