import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Error Logging API
 * POST: Log an error (client-side or server-side)
 * Automatically deduplicates and increments occurrence count
 */

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const body = await request.json();
    const {
      error_type,
      error_message,
      stack_trace,
      page_url,
      severity = 'medium',
      metadata = {}
    } = body;

    // Validation
    if (!error_type || !error_message) {
      return NextResponse.json(
        { error: 'error_type and error_message are required' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Use the deduplication function
    const { data, error } = await supabase.rpc('log_error_or_increment', {
      p_error_type: error_type,
      p_error_message: error_message,
      p_stack_trace: stack_trace || null,
      p_page_url: page_url || null,
      p_user_id: user?.id || null,
      p_user_agent: userAgent,
      p_severity: severity
    });

    if (error) {
      console.error('Error logging error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      error_id: data,
      message: 'Error logged successfully'
    });
  } catch (error: any) {
    console.error('Error in error logging API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

