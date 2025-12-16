/**
 * Scheduler Service
 * Manages automated data quality checks using node-cron
 */

import cron from 'node-cron';
import { runFullCheck } from '../neo4j/data-quality-agent';

let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Initialize the scheduler
 * Schedules data quality check to run at midnight every day
 */
export function initializeScheduler(): void {
  if (scheduledTask) {
    console.log('[Scheduler] Already initialized');
    return;
  }

  // Schedule for midnight every day (0 0 * * *)
  scheduledTask = cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Starting scheduled data quality check at midnight');
    
    try {
      const results = await runFullCheck();
      console.log('[Scheduler] Data quality check completed successfully');
      console.log(`[Scheduler] Duration: ${Math.round((results.duration || 0) / 1000)}s`);
      console.log(`[Scheduler] Duplicates found: ${results.duplicates.duplicatesFound}`);
      console.log(`[Scheduler] Unnamed POIs deleted: ${results.unnamedPOIs.deleted}`);
      console.log(`[Scheduler] Relations created: ${results.relations.created}`);
    } catch (error) {
      console.error('[Scheduler] Data quality check failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Initialized - will run at midnight UTC daily');
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}

