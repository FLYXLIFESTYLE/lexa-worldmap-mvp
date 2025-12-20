/**
 * Automatic Release Notes Generator
 * 
 * Runs daily to:
 * 1. Analyze git commits since last release
 * 2. Use Claude AI to generate release notes
 * 3. Create JSON file in correct format
 * 4. Commit and push to trigger deployment
 * 
 * Schedule with Windows Task Scheduler or cron
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ReleaseNote {
  id: string;
  date: string;
  timestamp: string;
  category: 'feature' | 'enhancement' | 'bugfix' | 'performance' | 'documentation' | 'infrastructure' | 'security' | 'database';
  title: string;
  description: string;
  details: string;
  author: string;
  isPublic: boolean;
  tags: string[];
  relatedFiles: string[];
  githubCommit: string;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get git commits since last release date
 */
function getRecentCommits(sinceDate: string): string {
  try {
    const gitLog = execSync(
      `git log --since="${sinceDate} 00:00:00" --pretty=format:"%h|%an|%aI|%s|%b" --name-status`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return gitLog;
  } catch (error) {
    console.error('Error getting git commits:', error);
    return '';
  }
}

/**
 * Get list of changed files
 */
function getChangedFiles(sinceDate: string): string[] {
  try {
    const files = execSync(
      `git diff --name-only --since="${sinceDate} 00:00:00" HEAD`,
      { encoding: 'utf-8' }
    );
    return files.split('\n').filter(f => f.trim().length > 0);
  } catch (error) {
    console.error('Error getting changed files:', error);
    return [];
  }
}

/**
 * Use Claude to generate release notes from commits
 */
async function generateReleaseNotesWithAI(commits: string, changedFiles: string[]): Promise<ReleaseNote[]> {
  const prompt = `You are a technical documentation expert. Analyze these git commits and generate comprehensive release notes.

**Git Commits:**
${commits}

**Changed Files:**
${changedFiles.slice(0, 50).join('\n')}

**Task:**
Generate release notes in JSON format as an array of objects. Each note should have:

{
  "id": "2025-12-XX-timestamp-slug",
  "date": "2025-12-XX",
  "timestamp": "2025-12-XXT10:00:00.000Z",
  "category": "feature|enhancement|bugfix|performance|documentation|infrastructure|security|database",
  "title": "Short descriptive title",
  "description": "One sentence summary (max 150 chars)",
  "details": "Detailed explanation with technical context",
  "author": "System",
  "isPublic": true (for user-facing) or false (for internal),
  "tags": ["relevant", "tags"],
  "relatedFiles": ["path/to/file.ts"],
  "githubCommit": "commit-hash"
}

**Guidelines:**
1. Group related commits into single notes
2. Use clear, non-technical language for descriptions
3. Mark internal/backend changes as isPublic: false
4. Mark user-facing features as isPublic: true
5. Choose appropriate categories
6. Extract relevant file paths
7. Create meaningful tags

Return ONLY valid JSON array, no markdown, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    const notes = JSON.parse(jsonText);
    
    // Validate and fix structure
    return notes.map((note: any, index: number) => ({
      id: note.id || `${getTodayDate()}-${Date.now()}-${index}`,
      date: note.date || getTodayDate(),
      timestamp: note.timestamp || new Date().toISOString(),
      category: note.category || 'enhancement',
      title: note.title || 'Untitled Change',
      description: note.description || '',
      details: note.details || '',
      author: note.author || 'System',
      isPublic: note.isPublic !== undefined ? note.isPublic : true,
      tags: Array.isArray(note.tags) ? note.tags : [],
      relatedFiles: Array.isArray(note.relatedFiles) ? note.relatedFiles : [],
      githubCommit: note.githubCommit || ''
    }));

  } catch (error) {
    console.error('Error generating release notes with AI:', error);
    throw error;
  }
}

/**
 * Save release notes to file
 */
async function saveReleaseNotes(date: string, notes: ReleaseNote[]): Promise<string> {
  const notesDir = path.join(process.cwd(), 'docs', 'release-notes');
  
  // Ensure directory exists
  await fs.mkdir(notesDir, { recursive: true });
  
  const filePath = path.join(notesDir, `${date}.json`);
  
  // Check if file already exists
  try {
    await fs.access(filePath);
    console.log(`⚠️  File ${date}.json already exists. Merging notes...`);
    
    // Read existing notes
    const existingContent = await fs.readFile(filePath, 'utf-8');
    const existingNotes = JSON.parse(existingContent);
    
    // Merge (avoid duplicates by checking IDs)
    const existingIds = new Set(existingNotes.map((n: ReleaseNote) => n.id));
    const newNotes = notes.filter(n => !existingIds.has(n.id));
    
    const mergedNotes = [...existingNotes, ...newNotes];
    await fs.writeFile(filePath, JSON.stringify(mergedNotes, null, 2));
    
    console.log(`✅ Merged ${newNotes.length} new notes with ${existingNotes.length} existing notes`);
    return filePath;
  } catch (error) {
    // File doesn't exist, create new
    await fs.writeFile(filePath, JSON.stringify(notes, null, 2));
    console.log(`✅ Created new release notes file: ${date}.json with ${notes.length} notes`);
    return filePath;
  }
}

/**
 * Commit and push to GitHub
 */
function commitAndPush(date: string): void {
  try {
    console.log('\n📤 Committing and pushing to GitHub...');
    
    execSync('git add docs/release-notes/', { encoding: 'utf-8' });
    execSync(`git commit -m "docs: auto-generate release notes for ${date}"`, { encoding: 'utf-8' });
    execSync('git push origin main', { encoding: 'utf-8' });
    
    console.log('✅ Successfully pushed to GitHub');
    console.log('⏳ Vercel deployment will start automatically');
  } catch (error: any) {
    if (error.message.includes('nothing to commit')) {
      console.log('ℹ️  No changes to commit (release notes already up to date)');
    } else {
      console.error('❌ Error committing/pushing:', error.message);
      throw error;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     AUTOMATIC RELEASE NOTES GENERATOR                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  
  console.log(`📅 Generating release notes for: ${today}`);
  console.log(`📊 Analyzing commits since: ${yesterday}\n`);

  // Check if ANTHROPIC_API_KEY is set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in environment variables');
    console.log('   Please set it in .env.local or .env file');
    process.exit(1);
  }

  try {
    // Get recent commits
    console.log('🔍 Fetching recent git commits...');
    const commits = getRecentCommits(yesterday);
    
    if (!commits || commits.trim().length === 0) {
      console.log('ℹ️  No commits found since yesterday. Nothing to do.');
      console.log('   This is normal if no development work was done today.\n');
      process.exit(0);
    }

    const commitLines = commits.split('\n').filter(l => l.includes('|')).length;
    console.log(`✅ Found ${commitLines} commits\n`);

    // Get changed files
    console.log('📁 Analyzing changed files...');
    const changedFiles = getChangedFiles(yesterday);
    console.log(`✅ Found ${changedFiles.length} changed files\n`);

    // Generate release notes with AI
    console.log('🤖 Generating release notes with Claude AI...');
    const notes = await generateReleaseNotesWithAI(commits, changedFiles);
    console.log(`✅ Generated ${notes.length} release notes\n`);

    if (notes.length === 0) {
      console.log('ℹ️  No meaningful changes to document. Skipping release notes creation.\n');
      process.exit(0);
    }

    // Preview notes
    console.log('📋 Preview of generated notes:');
    notes.forEach((note, i) => {
      console.log(`   ${i + 1}. [${note.category}] ${note.title}`);
      console.log(`      ${note.description}`);
      console.log(`      Public: ${note.isPublic ? 'Yes' : 'No (Internal)'}\n`);
    });

    // Save to file
    console.log('💾 Saving release notes...');
    const filePath = await saveReleaseNotes(today, notes);
    console.log(`✅ Saved to: ${filePath}\n`);

    // Commit and push
    commitAndPush(today);

    console.log('\n✅ Release notes generation complete!');
    console.log('🚀 Vercel will deploy the changes automatically');
    console.log(`📝 View at: https://lexa-worldmap-mvp.vercel.app/admin/release-notes\n`);

  } catch (error) {
    console.error('\n❌ Error generating release notes:', error);
    process.exit(1);
  }
}

// Run if called directly
const isCalledDirectly = (() => {
  try {
    if (!process.argv[1]) return false;
    const invokedPath = path.resolve(process.argv[1]);
    const thisFilePath = path.resolve(fileURLToPath(import.meta.url));
    return invokedPath === thisFilePath;
  } catch {
    // If we can't reliably detect, default to running (safe for scheduled usage)
    return true;
  }
})();

if (isCalledDirectly) {
  main();
}

export { main as generateReleaseNotes };

