/**
 * Browse Knowledge API
 * Get all knowledge entries for browsing and search
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user is captain/admin
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'captain'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Captains only' },
        { status: 403 }
      );
    }

    // Query Neo4j for knowledge entries
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      const result = await session.run(
        `
        MATCH (k:knowledge)
        OPTIONAL MATCH (k)-[:CREATED_BY]->(u:user)
        RETURN k.id as id,
               k.title as title,
               k.content as content,
               k.source_type as source_type,
               k.created_at as created_at,
               k.tags as tags,
               u.name as created_by
        ORDER BY k.created_at DESC
        LIMIT 500
        `
      );

      const entries = result.records.map(record => ({
        id: record.get('id') || 'unknown',
        title: record.get('title') || 'Untitled',
        content: record.get('content') || '',
        source_type: record.get('source_type') || 'unknown',
        created_at: record.get('created_at') || new Date().toISOString(),
        tags: record.get('tags') || [],
        created_by: record.get('created_by') || 'Unknown'
      }));

      return NextResponse.json({
        success: true,
        entries,
        count: entries.length
      });

    } finally {
      await session.close();
    }

  } catch (error: any) {
    console.error('Error fetching knowledge entries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch knowledge' },
      { status: 500 }
    );
  }
}

