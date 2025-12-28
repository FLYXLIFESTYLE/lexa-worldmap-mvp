/**
 * Pilot-friendly ingestion runner for one destination.
 *
 * It orchestrates existing ingestion scripts so you can run:
 * - Wikidata (online, uses destination bbox from Supabase)
 * - Overture (requires a local GeoJSON file path)
 * - Foursquare OS (requires a local NDJSON file path)
 * - Optional projection to Neo4j
 *
 * Usage examples:
 *   npm run ingest:destination -- "French Riviera" --wikidata
 *   npm run ingest:destination -- "French Riviera" --wikidata --projectNeo4j
 *   npm run ingest:destination -- "French Riviera" --overture "C:\\data\\overture_fr.geojson"
 *   npm run ingest:destination -- "French Riviera" --fsq "C:\\data\\fsq_fr.ndjson"
 *   npm run ingest:destination -- "French Riviera" --wikidata --overture "..." --fsq "..." --projectNeo4j
 */

import { spawnSync } from 'node:child_process';

type Args = {
  destination: string;
  wikidata: boolean;
  overturePath: string | null;
  fsqPath: string | null;
  projectNeo4j: boolean;
};

function parseArgs(argv: string[]): Args {
  const destination = argv[0]?.trim();
  if (!destination) throw new Error('Missing destination name. Example: npm run ingest:destination -- "French Riviera" --wikidata');

  let wikidata = false;
  let overturePath: string | null = null;
  let fsqPath: string | null = null;
  let projectNeo4j = false;

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--wikidata') wikidata = true;
    else if (a === '--projectNeo4j') projectNeo4j = true;
    else if (a === '--overture') overturePath = argv[++i] ?? null;
    else if (a === '--fsq') fsqPath = argv[++i] ?? null;
  }

  return { destination, wikidata, overturePath, fsqPath, projectNeo4j };
}

function q(s: string) {
  // Basic shell quoting for Windows/PowerShell/cmd.exe via spawnSync({shell:true}).
  // Wrap in double quotes and escape any embedded quotes.
  return `"${s.replace(/"/g, '\\"')}"`;
}

function runOrThrow(command: string) {
  const res = spawnSync(command, { stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`=== LEXA ingestion runner: ${args.destination} ===`);

  if (args.wikidata) {
    console.log('--- Step: Wikidata ---');
    runOrThrow(`npm run ingest:wikidata -- ${q(args.destination)}`);
  }

  if (args.overturePath) {
    console.log('--- Step: Overture (GeoJSON file) ---');
    runOrThrow(`npm run ingest:overture -- ${q(args.destination)} ${q(args.overturePath)}`);
  }

  if (args.fsqPath) {
    console.log('--- Step: Foursquare OS Places (NDJSON file) ---');
    runOrThrow(`npm run ingest:fsq -- ${q(args.destination)} ${q(args.fsqPath)}`);
  }

  if (args.projectNeo4j) {
    console.log('--- Step: Project to Neo4j ---');
    runOrThrow(`npm run project:neo4j -- ${q(args.destination)}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


