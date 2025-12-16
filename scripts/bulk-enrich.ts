/**
 * Bulk Enrichment Script
 * Runs the quality check agent multiple times to process all unnamed POIs
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { runFullCheck } from '../lib/neo4j/data-quality-agent';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface BulkStats {
  totalRuns: number;
  totalEnriched: number;
  totalFailed: number;
  totalScored: number;
  totalDuplicatesMerged: number;
  totalRelationsCreated: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

async function runBulkEnrichment(options: {
  maxRuns: number;
  delayBetweenRuns: number; // milliseconds
  stopWhenNoProgress: boolean;
}) {
  const stats: BulkStats = {
    totalRuns: 0,
    totalEnriched: 0,
    totalFailed: 0,
    totalScored: 0,
    totalDuplicatesMerged: 0,
    totalRelationsCreated: 0,
    startTime: new Date(),
  };

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           LEXA Bulk Enrichment & Quality Check            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Configuration:`);
  console.log(`  Max runs: ${options.maxRuns}`);
  console.log(`  Delay between runs: ${options.delayBetweenRuns}ms`);
  console.log(`  Stop when no progress: ${options.stopWhenNoProgress}`);
  console.log(`  Started: ${stats.startTime.toLocaleString()}\n`);

  for (let i = 1; i <= options.maxRuns; i++) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`RUN ${i}/${options.maxRuns}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
      const result = await runFullCheck();

      // Update cumulative stats
      stats.totalRuns = i;
      stats.totalEnriched += result.unnamedPOIs?.enriched || 0;
      stats.totalFailed += result.unnamedPOIs?.failed || 0;
      stats.totalScored += result.scoring?.added || 0;
      stats.totalDuplicatesMerged += result.duplicates?.poisMerged || 0;
      stats.totalRelationsCreated += result.relations?.created || 0;

      // Print run summary
      console.log('\n📊 Run Summary:');
      console.log(`  Enriched: ${result.unnamedPOIs?.enriched || 0}`);
      console.log(`  Failed: ${result.unnamedPOIs?.failed || 0}`);
      console.log(`  Scored: ${result.scoring?.added || 0} POIs`);
      console.log(`  Duplicates merged: ${result.duplicates?.poisMerged || 0}`);
      console.log(`  Relations created: ${result.relations?.created || 0}`);

      // Check if we should stop (no progress)
      if (options.stopWhenNoProgress) {
        const hasProgress = 
          (result.unnamedPOIs?.enriched || 0) > 0 ||
          (result.scoring?.added || 0) > 0 ||
          (result.duplicates?.poisMerged || 0) > 0;

        if (!hasProgress) {
          console.log('\n✅ No more progress detected. Stopping early.');
          break;
        }
      }

      // Wait before next run (respect rate limits)
      if (i < options.maxRuns) {
        console.log(`\n⏳ Waiting ${options.delayBetweenRuns}ms before next run...`);
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenRuns));
      }

    } catch (error) {
      console.error(`\n❌ Error in run ${i}:`, error);
      console.log('Continuing to next run...\n');
      
      // Wait longer after error
      await new Promise(resolve => setTimeout(resolve, options.delayBetweenRuns * 2));
    }
  }

  stats.endTime = new Date();
  stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

  // Print final summary
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL SUMMARY                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`⏱️  Time:`);
  console.log(`  Started: ${stats.startTime.toLocaleString()}`);
  console.log(`  Ended: ${stats.endTime.toLocaleString()}`);
  console.log(`  Duration: ${Math.round(stats.duration / 1000 / 60)} minutes\n`);
  
  console.log(`🔢 Totals:`);
  console.log(`  Total runs: ${stats.totalRuns}`);
  console.log(`  POIs enriched: ${stats.totalEnriched}`);
  console.log(`  Enrichment failed: ${stats.totalFailed}`);
  console.log(`  POIs scored: ${stats.totalScored}`);
  console.log(`  Duplicates merged: ${stats.totalDuplicatesMerged}`);
  console.log(`  Relations created: ${stats.totalRelationsCreated}\n`);
  
  console.log(`📈 Success Rate:`);
  const enrichmentTotal = stats.totalEnriched + stats.totalFailed;
  if (enrichmentTotal > 0) {
    const successRate = (stats.totalEnriched / enrichmentTotal * 100).toFixed(1);
    console.log(`  Enrichment: ${successRate}% (${stats.totalEnriched}/${enrichmentTotal})\n`);
  }
  
  console.log('✅ Bulk enrichment complete!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const maxRuns = parseInt(args[0]) || 10;
const delayMs = parseInt(args[1]) || 5000; // 5 seconds default
const stopWhenDone = args[2] === 'stop-when-done';

runBulkEnrichment({
  maxRuns,
  delayBetweenRuns: delayMs,
  stopWhenNoProgress: stopWhenDone,
}).then(() => {
  console.log('Process completed. Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

