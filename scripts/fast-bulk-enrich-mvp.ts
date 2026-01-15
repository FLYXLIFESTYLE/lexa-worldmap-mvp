/**
 * FAST Bulk Enrichment for MVP Deadline (January 23rd, 2026)
 *
 * Purpose: Enrich thousands of POIs quickly for investor demo
 * 
 * Differences from bulk-enrich.ts:
 * - NO Neo4j quality checks (skip memory errors)
 * - Parallel enrichment (10 POIs at once)
 * - Auto-promote to Neo4j if score >= 70
 * - Auto-create relationships (emotions, activities, themes)
 * - Run until done (no stopping)
 *
 * Usage: npm run fast-enrich-mvp
 */

import './_env';
import { supabaseAdmin } from './_supabaseAdmin';

const BATCH_SIZE = 10; // Enrich 10 POIs in parallel
const MAX_POIS = 1000; // Stop after 1000 (run multiple times if needed)
const AUTO_PROMOTE_THRESHOLD = 70; // Auto-promote POIs with script score >= 70

async function enrichPOI(poiId: string): Promise<{ success: boolean; promoted: boolean; error?: string }> {
  try {
    // Call the enrichment API
    const enrichRes = await fetch(`http://localhost:3000/api/captain/pois/${poiId}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!enrichRes.ok) {
      const err = await enrichRes.json().catch(() => ({}));
      return { success: false, promoted: false, error: err.error || 'Enrichment failed' };
    }

    const enrichData = await enrichRes.json();

    // Check if auto-deleted (low value)
    if (enrichData.action === 'deleted') {
      return { success: true, promoted: false, error: 'Auto-deleted (low value)' };
    }

    // Auto-promote if script score >= threshold
    const scriptScore = enrichData.scores?.script_contribution || 0;
    if (scriptScore >= AUTO_PROMOTE_THRESHOLD) {
      const promoteRes = await fetch(`http://localhost:3000/api/captain/pois/${poiId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (promoteRes.ok) {
        return { success: true, promoted: true };
      }
    }

    return { success: true, promoted: false };
  } catch (error) {
    return { success: false, promoted: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function main() {
  console.log('🚀 FAST MVP Enrichment Pipeline');
  console.log('='.repeat(60));
  console.log(`Deadline: Friday January 23rd, 2026`);
  console.log(`Strategy: Enrich → Score → Auto-promote (>=70)`);
  console.log(`Batch size: ${BATCH_SIZE} parallel`);
  console.log(`Max POIs: ${MAX_POIS}`);
  console.log('='.repeat(60));
  console.log('');

  // Find unenriched POIs
  const { data: pois, error } = await supabaseAdmin
    .from('extracted_pois')
    .select('id,name,destination')
    .eq('enhanced', false)
    .limit(MAX_POIS);

  if (error) throw new Error(error.message);
  if (!pois || pois.length === 0) {
    console.log('✅ All POIs enriched!');
    return;
  }

  console.log(`Found ${pois.length} POIs to enrich\n`);

  let enriched = 0;
  let promoted = 0;
  let failed = 0;
  let deleted = 0;

  // Process in batches
  for (let i = 0; i < pois.length; i += BATCH_SIZE) {
    const batch = pois.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pois.length / BATCH_SIZE);

    console.log(`\nBatch ${batchNum}/${totalBatches} (POIs ${i + 1}-${Math.min(i + BATCH_SIZE, pois.length)})`);

    // Process batch in parallel
    const results = await Promise.allSettled(batch.map((poi) => enrichPOI(poi.id)));

    results.forEach((result, idx) => {
      const poi = batch[idx];
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          enriched++;
          if (result.value.promoted) {
            promoted++;
            console.log(`  ✅ ${poi.name} → PROMOTED to Neo4j`);
          } else if (result.value.error === 'Auto-deleted (low value)') {
            deleted++;
            console.log(`  🗑️  ${poi.name} → Deleted (low value)`);
          } else {
            console.log(`  ✓ ${poi.name} → Enriched (score < 70, not promoted)`);
          }
        } else {
          failed++;
          console.log(`  ❌ ${poi.name} → Error: ${result.value.error}`);
        }
      } else {
        failed++;
        console.log(`  ❌ ${poi.name} → Error: ${result.reason}`);
      }
    });

    // Progress
    console.log(`Progress: ${enriched} enriched, ${promoted} promoted, ${deleted} deleted, ${failed} failed`);

    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < pois.length) {
      await new Promise((r) => setTimeout(r, 2000)); // 2 second delay between batches
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ ENRICHMENT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Enriched: ${enriched}`);
  console.log(`Promoted to Neo4j: ${promoted}`);
  console.log(`Deleted (low value): ${deleted}`);
  console.log(`Failed: ${failed}`);
  console.log('');
  console.log(`Neo4j now has ${promoted} new POIs with relationships!`);
  console.log('Run again to enrich more POIs.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
