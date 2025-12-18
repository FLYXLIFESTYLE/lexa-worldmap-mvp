/**
 * Release Notes API
 * 
 * GET /api/release-notes - Get all release notes
 * POST /api/release-notes - Create a new release note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllReleaseDays, addReleaseNote } from '@/lib/release-notes/manager';
import { SortOrder, FilterScope } from '@/lib/release-notes/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sortOrder = (searchParams.get('sort') || 'newest-first') as SortOrder;
  const filterScope = (searchParams.get('scope') || 'all') as FilterScope;
  
  try {
    const days = await getAllReleaseDays(sortOrder, filterScope);
    
    return NextResponse.json({
      success: true,
      days,
      totalDays: days.length,
      totalNotes: days.reduce((sum, day) => sum + day.totalChanges, 0)
    });
    
  } catch (error: any) {
    console.error('Failed to fetch release notes:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { date, category, title, description, details, author, isPublic, tags, relatedFiles, githubCommit } = body;
    
    // Validation
    if (!date || !category || !title || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: date, category, title, description' },
        { status: 400 }
      );
    }
    
    const note = await addReleaseNote({
      date,
      category,
      title,
      description,
      details,
      author,
      isPublic: isPublic !== undefined ? isPublic : false,
      tags,
      relatedFiles,
      githubCommit
    });
    
    return NextResponse.json({
      success: true,
      note
    });
    
  } catch (error: any) {
    console.error('Failed to create release note:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

