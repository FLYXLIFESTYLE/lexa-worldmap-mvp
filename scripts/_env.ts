/**
 * Script environment loader
 *
 * Why: Next.js uses `.env.local` in development, but `dotenv/config` only loads `.env`.
 * Our ingestion scripts should work for beginners without requiring extra env setup.
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

function loadIfExists(p: string) {
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  if (fs.existsSync(abs)) {
    dotenv.config({ path: abs });
  }
}

function loadIfExistsOverride(p: string) {
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  if (fs.existsSync(abs)) {
    dotenv.config({ path: abs, override: true });
  }
}

// Load in the same priority Next.js expects locally:
// `.env.local` should WIN over `.env`
loadIfExists('.env');
loadIfExistsOverride('.env.local');


