import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const sessionId = params.id;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('lexa_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError) {
      throw sessionError;
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('lexa_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Get summaries
    const { data: summaries } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('session_id', sessionId);

    return NextResponse.json({
      session,
      messages,
      summaries: summaries || []
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
