import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const filter = searchParams.get('filter') || 'all'; // all, favorites, archived
    const theme = searchParams.get('theme');
    const offset = (page - 1) * limit;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query for user's script library
    let query = supabase
      .from('user_script_library')
      .select(`
        *,
        script:experience_briefs(*)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filter === 'favorites') {
      query = query.eq('is_favorite', true);
    } else if (filter === 'archived') {
      query = query.eq('is_archived', true);
    } else {
      query = query.eq('is_archived', false);
    }

    const { data: library, error: libraryError, count } = await query;

    if (libraryError) {
      throw libraryError;
    }

    // Filter by theme if provided
    let scripts = library?.map(item => ({
      ...item.script,
      library_metadata: {
        is_favorite: item.is_favorite,
        is_archived: item.is_archived,
        custom_notes: item.custom_notes,
        added_at: item.added_at,
        last_accessed: item.last_accessed
      }
    })) || [];

    if (theme && scripts.length > 0) {
      scripts = scripts.filter(script => script.theme === theme);
    }

    return NextResponse.json({
      scripts,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scripts' },
      { status: 500 }
    );
  }
}
