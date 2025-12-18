/**
 * Release Notes Manager
 * 
 * Manages reading and writing release notes to/from filesystem
 * Notes are stored in: docs/release-notes/YYYY-MM-DD.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ReleaseNote, ReleaseDay, SortOrder, FilterScope } from './types';

const RELEASE_NOTES_DIR = path.join(process.cwd(), 'docs', 'release-notes');

/**
 * Ensure release notes directory exists
 */
export async function ensureReleaseNotesDir(): Promise<void> {
  try {
    await fs.mkdir(RELEASE_NOTES_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

/**
 * Get file path for a specific date
 */
function getReleaseNotesPath(date: string): string {
  return path.join(RELEASE_NOTES_DIR, `${date}.json`);
}

/**
 * Add a release note
 */
export async function addReleaseNote(note: Omit<ReleaseNote, 'id' | 'timestamp'>): Promise<ReleaseNote> {
  await ensureReleaseNotesDir();
  
  const fullNote: ReleaseNote = {
    ...note,
    id: `${note.date}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  };
  
  const filePath = getReleaseNotesPath(note.date);
  
  // Read existing notes for this day
  let dayNotes: ReleaseNote[] = [];
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    dayNotes = JSON.parse(content);
  } catch (error) {
    // File doesn't exist yet
  }
  
  // Add new note
  dayNotes.push(fullNote);
  
  // Write back
  await fs.writeFile(filePath, JSON.stringify(dayNotes, null, 2));
  
  return fullNote;
}

/**
 * Get release notes for a specific date
 */
export async function getReleaseNotesForDate(date: string): Promise<ReleaseNote[]> {
  const filePath = getReleaseNotesPath(date);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
}

/**
 * Get all release days
 */
export async function getAllReleaseDays(
  sortOrder: SortOrder = 'newest-first',
  filterScope: FilterScope = 'all'
): Promise<ReleaseDay[]> {
  await ensureReleaseNotesDir();
  
  const files = await fs.readdir(RELEASE_NOTES_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  const days: ReleaseDay[] = await Promise.all(
    jsonFiles.map(async (file) => {
      const date = file.replace('.json', '');
      const notes = await getReleaseNotesForDate(date);
      
      // Filter by scope
      let filteredNotes = notes;
      if (filterScope === 'public') {
        filteredNotes = notes.filter(n => n.isPublic);
      } else if (filterScope === 'internal') {
        filteredNotes = notes.filter(n => !n.isPublic);
      }
      
      return {
        date,
        notes: filteredNotes,
        totalChanges: filteredNotes.length
      };
    })
  );
  
  // Sort days
  if (sortOrder === 'newest-first') {
    days.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortOrder === 'oldest-first') {
    days.sort((a, b) => a.date.localeCompare(b.date));
  } else if (sortOrder === 'by-feature') {
    // Group by feature category
    days.sort((a, b) => {
      const aFeatureCount = a.notes.filter(n => n.category === 'feature').length;
      const bFeatureCount = b.notes.filter(n => n.category === 'feature').length;
      return bFeatureCount - aFeatureCount || b.date.localeCompare(a.date);
    });
  }
  
  return days;
}

/**
 * Get all notes across all days (flat list)
 */
export async function getAllReleaseNotes(
  sortOrder: SortOrder = 'newest-first',
  filterScope: FilterScope = 'all'
): Promise<ReleaseNote[]> {
  const days = await getAllReleaseDays(sortOrder, filterScope);
  const allNotes = days.flatMap(day => day.notes);
  
  // Additional sorting for individual notes
  if (sortOrder === 'by-feature') {
    allNotes.sort((a, b) => {
      // Features first
      const categoryOrder = {
        'feature': 1,
        'enhancement': 2,
        'bugfix': 3,
        'performance': 4,
        'database': 5,
        'documentation': 6,
        'infrastructure': 7,
        'security': 8
      };
      
      const aOrder = categoryOrder[a.category] || 99;
      const bOrder = categoryOrder[b.category] || 99;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Within same category, newest first
      return b.timestamp.localeCompare(a.timestamp);
    });
  }
  
  return allNotes;
}

/**
 * Update a release note
 */
export async function updateReleaseNote(noteId: string, updates: Partial<ReleaseNote>): Promise<boolean> {
  const days = await getAllReleaseDays('newest-first', 'all');
  
  for (const day of days) {
    const noteIndex = day.notes.findIndex(n => n.id === noteId);
    
    if (noteIndex !== -1) {
      // Update the note
      day.notes[noteIndex] = {
        ...day.notes[noteIndex],
        ...updates,
        id: noteId // Preserve ID
      };
      
      // Write back to file
      const filePath = getReleaseNotesPath(day.date);
      await fs.writeFile(filePath, JSON.stringify(day.notes, null, 2));
      
      return true;
    }
  }
  
  return false;
}

/**
 * Delete a release note
 */
export async function deleteReleaseNote(noteId: string): Promise<boolean> {
  const days = await getAllReleaseDays('newest-first', 'all');
  
  for (const day of days) {
    const noteIndex = day.notes.findIndex(n => n.id === noteId);
    
    if (noteIndex !== -1) {
      // Remove the note
      day.notes.splice(noteIndex, 1);
      
      // Write back to file
      const filePath = getReleaseNotesPath(day.date);
      if (day.notes.length === 0) {
        // Delete file if no notes left
        await fs.unlink(filePath);
      } else {
        await fs.writeFile(filePath, JSON.stringify(day.notes, null, 2));
      }
      
      return true;
    }
  }
  
  return false;
}

