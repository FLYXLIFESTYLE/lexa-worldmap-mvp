/**
 * Ingest the 10 pilot destinations sequentially (pilot first, then the other 9).
 *
 * This reads `docs/destinations_bbox_pilot10.json` for ordering.
 *
 * Usage:
 *   npm run ingest:pilot10 -- "French Riviera" --wikidata --projectNeo4j
 *
 * Notes:
 * - Overture/FSQ require local files, so this runner currently focuses on Wikidata + optional Neo4j projection.
 * - You can still run per-destination Overture/FSQ with `npm run ingest:destination -- ... --overture ... --fsq ...`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type PilotCfg = { destinations: Array<{ name: string }> };

function q(s: string) {
  return `"${s.replace(/"/g, '\\"')}"`;
}

function runOrThrow(command: string) {
  const res = spawnSync(command, { stdio: 'inherit', shell: true });
  if (res.status !== 0) throw new Error(`Command failed: ${command}`);
}

function parse(argv: string[]) {
  const pilot = argv[0]?.trim();
  if (!pilot) throw new Error('Missing pilot destination. Example: npm run ingest:pilot10 -- "French Riviera" --wikidata');

  // Pass through flags to ingest:destination
  const passthrough = argv.slice(1);
  return { pilot, passthrough };
}

async function main() {
  const { pilot, passthrough } = parse(process.argv.slice(2));

  const cfgPath = path.join(process.cwd(), 'docs', 'destinations_bbox_pilot10.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as PilotCfg;
  const names = cfg.destinations.map((d) => d.name);

  const pilotIdx = names.findIndex((n) => n.toLowerCase() === pilot.toLowerCase());
  if (pilotIdx === -1) {
    throw new Error(`Pilot destination not found in ${cfgPath}: "${pilot}". Available: ${names.join(', ')}`);
  }

  const ordered = [names[pilotIdx], ...names.slice(0, pilotIdx), ...names.slice(pilotIdx + 1)];

  console.log(`=== Ingest pilot10 sequential ===`);
  console.log(`Order: ${ordered.join(' -> ')}`);

  for (const dest of ordered) {
    console.log(`\n=== Destination: ${dest} ===`);
    const passthroughStr = passthrough.map((p) => (p.includes(' ') ? q(p) : p)).join(' ');
    runOrThrow(`npm run ingest:destination -- ${q(dest)} ${passthroughStr}`.trim());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


