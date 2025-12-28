/**
 * Ingest destinations sequentially from a config JSON file.
 *
 * Usage:
 *   npm run ingest:seq -- "French Riviera" --config "docs/destinations_bbox_pilot14.json" --wikidata
 *
 * Notes:
 * - `--config` is optional. Default: docs/destinations_bbox_pilot10.json
 * - Any other flags are passed through to `npm run ingest:destination -- ...`
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
  if (!pilot) {
    throw new Error('Missing pilot destination. Example: npm run ingest:seq -- "French Riviera" --wikidata');
  }

  let config = 'docs/destinations_bbox_pilot10.json';
  const passthrough: string[] = [];

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') {
      config = argv[++i] ?? config;
    } else {
      passthrough.push(a);
    }
  }

  return { pilot, config, passthrough };
}

async function main() {
  const { pilot, config, passthrough } = parse(process.argv.slice(2));

  const cfgPath = path.isAbsolute(config) ? config : path.join(process.cwd(), config);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as Cfg;
  const names = (cfg.destinations ?? []).map((d) => d.name).filter(Boolean);
  if (names.length === 0) throw new Error(`No destinations found in config: ${cfgPath}`);

  const pilotIdx = names.findIndex((n) => n.toLowerCase() === pilot.toLowerCase());
  if (pilotIdx === -1) {
    throw new Error(`Pilot destination not found in ${cfgPath}: "${pilot}". Available: ${names.join(', ')}`);
  }

  const ordered = [names[pilotIdx], ...names.slice(0, pilotIdx), ...names.slice(pilotIdx + 1)];

  console.log(`=== Ingest sequential ===`);
  console.log(`Config: ${cfgPath}`);
  console.log(`Order: ${ordered.join(' -> ')}`);

  const passthroughStr = passthrough.map((p) => (p.includes(' ') ? q(p) : p)).join(' ');

  for (const dest of ordered) {
    console.log(`\n=== Destination: ${dest} ===`);
    runOrThrow(`npm run ingest:destination -- ${q(dest)} ${passthroughStr}`.trim());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


