/**
 * Manual Backlog Sync to Website
 * Syncs BACKLOG.md content to the documentation page
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('📋 Syncing BACKLOG.md to website...\n');

// Read the backlog
const backlogPath = join(process.cwd(), 'BACKLOG.md');
const backlogContent = readFileSync(backlogPath, 'utf-8');

// Extract key statistics
const totalItemsMatch = backlogContent.match(/\*\*Total Items\*\*: (\d+)\+/);
const completedMatch = backlogContent.match(/\*\*Completed \(Dec 2025\)\*\*: (\d+)\+/);
const highPriorityMatch = backlogContent.match(/\*\*High Priority\*\*: (\d+)\+/);
const mediumPriorityMatch = backlogContent.match(/\*\*Medium Priority\*\*: (\d+)\+/);
const lowPriorityMatch = backlogContent.match(/\*\*Low Priority\*\*: (\d+)\+/);

const stats = {
  total: totalItemsMatch ? parseInt(totalItemsMatch[1]) : 130,
  completed: completedMatch ? parseInt(completedMatch[1]) : 30,
  highPriority: highPriorityMatch ? parseInt(highPriorityMatch[1]) : 25,
  mediumPriority: mediumPriorityMatch ? parseInt(mediumPriorityMatch[1]) : 41,
  lowPriority: lowPriorityMatch ? parseInt(lowPriorityMatch[1]) : 30,
  lastUpdate: new Date().toISOString()
};

// Create JSON file for the website
const backlogData = {
  lastUpdated: stats.lastUpdate,
  statistics: stats,
  content: backlogContent,
  summary: {
    recentUpdates: [
      "Name fields added to signup (Dec 21)",
      "Conversation flow complete rewrite (Dec 21)",
      "Phase 3 AIfred features added to backlog",
      "Frontend refinements documented",
      "130+ total items tracked"
    ],
    upcomingFeatures: [
      "Theme category images (3 hours)",
      "Improved duplicate email handling (1 hour)",
      "Behavioral trait detection (Phase 3, 2-3 weeks)",
      "Unstructured data ingestion (Phase 3, 3-4 weeks)",
      "Historical AI chat integration (Phase 3, 2 weeks)"
    ]
  }
};

// Write to docs folder
const outputPath = join(process.cwd(), 'docs', 'backlog-data.json');
writeFileSync(outputPath, JSON.stringify(backlogData, null, 2), 'utf-8');

console.log('✅ Backlog synced successfully!\n');
console.log('📊 Statistics:');
console.log(`  - Total Items: ${stats.total}+`);
console.log(`  - Completed (Dec 2025): ${stats.completed}+`);
console.log(`  - High Priority: ${stats.highPriority}+`);
console.log(`  - Medium Priority: ${stats.mediumPriority}+`);
console.log(`  - Low Priority: ${stats.lowPriority}+`);
console.log(`\n📄 Output file: docs/backlog-data.json`);
console.log(`🕐 Last updated: ${new Date(stats.lastUpdate).toLocaleString()}`);

