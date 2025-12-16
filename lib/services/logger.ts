/**
 * Logging Service
 * Writes data quality check results to log files for audit trail
 */

import fs from 'fs/promises';
import path from 'path';
import type { QualityCheckResults } from '../neo4j/data-quality-agent';

const LOG_DIR = path.join(process.cwd(), 'logs', 'data-quality');
const MAX_LOG_AGE_DAYS = 30;

/**
 * Initialize the logging directory
 */
async function ensureLogDirectory(): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('[Logger] Failed to create log directory:', error);
  }
}

/**
 * Log a quality check result to a file
 */
export async function logQualityCheck(results: QualityCheckResults): Promise<void> {
  try {
    await ensureLogDirectory();

    const timestamp = new Date(results.startTime);
    const filename = `${timestamp.toISOString().split('T')[0]}.json`;
    const filepath = path.join(LOG_DIR, filename);

    // Read existing logs for the day
    let logs: QualityCheckResults[] = [];
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      logs = JSON.parse(content);
    } catch {
      // File doesn't exist yet, start with empty array
    }

    // Add new result
    logs.push(results);

    // Write back to file
    await fs.writeFile(filepath, JSON.stringify(logs, null, 2), 'utf-8');
    
    console.log(`[Logger] Logged quality check to ${filename}`);

    // Clean up old logs
    await cleanupOldLogs();

  } catch (error) {
    console.error('[Logger] Failed to log quality check:', error);
  }
}

/**
 * Get logs for a specific date
 */
export async function getLogsForDate(date: Date): Promise<QualityCheckResults[]> {
  try {
    const filename = `${date.toISOString().split('T')[0]}.json`;
    const filepath = path.join(LOG_DIR, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Get the last N log entries
 */
export async function getRecentLogs(count: number = 10): Promise<QualityCheckResults[]> {
  try {
    await ensureLogDirectory();

    const files = await fs.readdir(LOG_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

    const logs: QualityCheckResults[] = [];

    for (const file of jsonFiles) {
      if (logs.length >= count) break;

      const filepath = path.join(LOG_DIR, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const fileLogs: QualityCheckResults[] = JSON.parse(content);
      
      logs.push(...fileLogs.reverse());
    }

    return logs.slice(0, count);
  } catch (error) {
    console.error('[Logger] Failed to get recent logs:', error);
    return [];
  }
}

/**
 * Clean up logs older than MAX_LOG_AGE_DAYS
 */
async function cleanupOldLogs(): Promise<void> {
  try {
    const files = await fs.readdir(LOG_DIR);
    const now = Date.now();
    const maxAge = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filepath = path.join(LOG_DIR, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.unlink(filepath);
        console.log(`[Logger] Deleted old log file: ${file}`);
      }
    }
  } catch (error) {
    console.error('[Logger] Failed to cleanup old logs:', error);
  }
}

/**
 * Get log statistics
 */
export async function getLogStats(): Promise<{
  totalRuns: number;
  oldestLog: Date | null;
  newestLog: Date | null;
  totalFilesSize: number;
}> {
  try {
    await ensureLogDirectory();

    const files = await fs.readdir(LOG_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

    let totalRuns = 0;
    let totalSize = 0;

    for (const file of jsonFiles) {
      const filepath = path.join(LOG_DIR, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const logs: QualityCheckResults[] = JSON.parse(content);
      totalRuns += logs.length;

      const stats = await fs.stat(filepath);
      totalSize += stats.size;
    }

    return {
      totalRuns,
      oldestLog: jsonFiles.length > 0 ? new Date(jsonFiles[0].replace('.json', '')) : null,
      newestLog: jsonFiles.length > 0 ? new Date(jsonFiles[jsonFiles.length - 1].replace('.json', '')) : null,
      totalFilesSize: totalSize,
    };
  } catch (error) {
    console.error('[Logger] Failed to get log stats:', error);
    return {
      totalRuns: 0,
      oldestLog: null,
      newestLog: null,
      totalFilesSize: 0,
    };
  }
}

