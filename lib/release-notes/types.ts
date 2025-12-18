/**
 * Release Notes Types
 * 
 * Daily release notes captured at midnight
 */

export type ReleaseNoteCategory = 
  | 'feature'
  | 'enhancement'
  | 'bugfix'
  | 'performance'
  | 'documentation'
  | 'infrastructure'
  | 'security'
  | 'database';

export interface ReleaseNote {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  category: ReleaseNoteCategory;
  title: string;
  description: string;
  details?: string; // Markdown
  author?: string;
  isPublic: boolean; // true = published, false = internal only
  tags?: string[];
  relatedFiles?: string[];
  githubCommit?: string;
}

export interface ReleaseDay {
  date: string; // YYYY-MM-DD
  notes: ReleaseNote[];
  totalChanges: number;
}

export type SortOrder = 'newest-first' | 'oldest-first' | 'by-feature';
export type FilterScope = 'all' | 'public' | 'internal';

