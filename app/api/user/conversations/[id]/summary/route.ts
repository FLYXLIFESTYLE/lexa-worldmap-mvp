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

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('lexa_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get summaries
    const { data: summaries, error: summariesError } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .order('generated_at', { ascending: false });

    if (summariesError) {
      throw summariesError;
    }

    return NextResponse.json({
      summaries: summaries || []
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const sessionId = params.id;
    const body = await request.json();
    const { summary_type = 'session' } = body;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('lexa_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get messages for summarization
    const { data: messages } = await supabase
      .from('lexa_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages to summarize' },
        { status: 400 }
      );
    }

    // TODO: Call Claude API to generate summary
    // For now, create a placeholder
    const summaryContent = `Summary of conversation with ${messages.length} messages. (AI generation pending)`;
    const extractedData = {};

    // Create or update summary
    const { data: summary, error: insertError } = await supabase
      .from('conversation_summaries')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        summary_type,
        content: summaryContent,
        extracted_data: extractedData,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      summary
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
