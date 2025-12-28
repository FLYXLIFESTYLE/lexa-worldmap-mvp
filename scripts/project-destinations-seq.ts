/**
 * Project destinations into Neo4j sequentially from a config JSON file (bbox list).
 *
 * Usage:
 *   npm run project:seq -- "French Riviera" --config "docs/destinations_bbox_pilot14.json"
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type Cfg = { destinations: Array<{ name: string }> };

function q(s: string) {
  return `"${s.replace(/"/g, '\\"')}"`;
}

function runOrThrow(command: string) {
  const res = spawnSync(command, { stdio: 'inherit', shell: true });
  if (res.status !== 0) throw new Error(`Command failed: ${command}`);
}

function parse(argv: string[]) {
  const pilot = argv[0]?.trim();
  if (!pilot) throw new Error('Missing pilot destination. Example: npm run project:seq -- "French Riviera"');

  let config = 'docs/destinations_bbox_pilot14.json';
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--config') config = argv[++i] ?? config;
  }

  return { pilot, config };
}

async function main() {
  const { pilot, config } = parse(process.argv.slice(2));
  const cfgPath = path.isAbsolute(config) ? config : path.join(process.cwd(), config);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as Cfg;
  const names = (cfg.destinations ?? []).map((d) => d.name).filter(Boolean);
  if (names.length === 0) throw new Error(`No destinations found in config: ${cfgPath}`);

  const pilotIdx = names.findIndex((n) => n.toLowerCase() === pilot.toLowerCase());
  if (pilotIdx === -1) throw new Error(`Pilot destination not in config: "${pilot}"`);

  const ordered = [names[pilotIdx], ...names.slice(0, pilotIdx), ...names.slice(pilotIdx + 1)];
  console.log(`=== Project sequential ===`);
  console.log(`Config: ${cfgPath}`);
  console.log(`Order: ${ordered.join(' -> ')}`);

  for (const dest of ordered) {
    console.log(`\n=== Project: ${dest} ===`);
    runOrThrow(`npm run project:neo4j -- ${q(dest)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


