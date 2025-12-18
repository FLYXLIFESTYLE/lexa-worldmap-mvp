/**
 * Daily Documentation Update Script
 * 
 * Runs daily at midnight to:
 * 1. Copy internal documentation to published versions
 * 2. Generate release notes from git commits
 * 3. Update architecture documentation timestamps
 * 
 * Schedule with cron or Windows Task Scheduler
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

interface DocUpdate {
  source: string;
  destination: string;
  description: string;
}

// Documents to update daily
const DOCS_TO_UPDATE: DocUpdate[] = [
  {
    source: 'docs/LEXA_ARCHITECTURE.md',
    destination: 'public/docs/LEXA_ARCHITECTURE.md',
    description: 'Platform Architecture'
  },
  {
    source: 'docs/QUICK_REFERENCE.md',
    destination: 'public/docs/QUICK_REFERENCE.md',
    description: 'Quick Reference Guide'
  },
  {
    source: 'docs/POI_SEARCH_EDIT_GUIDE.md',
    destination: 'public/docs/POI_SEARCH_EDIT_GUIDE.md',
    description: 'POI Search & Edit Guide'
  }
];

async function updateDocumentation() {
  console.log('🔄 Starting daily documentation update...');
  console.log(`📅 ${new Date().toISOString()}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const doc of DOCS_TO_UPDATE) {
    try {
      const sourcePath = path.join(rootDir, doc.source);
      const destPath = path.join(rootDir, doc.destination);

      // Check if source exists
      if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️  Source not found: ${doc.source}`);
        errorCount++;
        continue;
      }

      // Read source
      let content = fs.readFileSync(sourcePath, 'utf-8');

      // Add "Last Updated" timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const updateNote = `\n\n---\n**Last Updated:** ${timestamp}\n**Status:** Published\n`;
      content += updateNote;

      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Write to destination
      fs.writeFileSync(destPath, content, 'utf-8');

      console.log(`✅ Updated: ${doc.description}`);
      console.log(`   Source: ${doc.source}`);
      console.log(`   Dest:   ${doc.destination}\n`);
      successCount++;

    } catch (error) {
      console.error(`❌ Error updating ${doc.description}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Update Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors:  ${errorCount}`);
  console.log(`   📝 Total:   ${DOCS_TO_UPDATE.length}\n`);

  if (successCount > 0) {
    console.log('✨ Documentation update complete!');
  } else {
    console.error('⚠️  No documents were updated successfully.');
    process.exit(1);
  }
}

// Run the update
updateDocumentation().catch(error => {
  console.error('💥 Fatal error during documentation update:', error);
  process.exit(1);
});

