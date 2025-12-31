import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
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

    // Build query
    let query = supabase
      .from('lexa_sessions')
      .select('*, lexa_messages(count)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (theme) {
      query = query.contains('state', { theme });
    }

    const { data: sessions, error: sessionsError, count } = await query;

    if (sessionsError) {
      throw sessionsError;
    }

    // Get summaries for each session
    const sessionIds = sessions?.map(s => s.id) || [];
    const { data: summaries } = await supabase
      .from('conversation_summaries')
      .select('*')
      .in('session_id', sessionIds);

    // Map summaries to sessions
    const sessionsWithSummaries = sessions?.map(session => {
      const sessionSummaries = summaries?.filter(s => s.session_id === session.id) || [];
      return {
        ...session,
        summaries: sessionSummaries
      };
    });

    return NextResponse.json({
      conversations: sessionsWithSummaries,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
