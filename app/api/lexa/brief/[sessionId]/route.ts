/**
 * Experience Brief API Route
 * GET experience brief for a session (for Operations Agent or user review)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    const params = await context.params;
    const sessionId = params.sessionId;
    
    // Fetch experience brief
    const { data, error } = await supabaseAdmin
      .from('experience_briefs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found
      console.error('Error fetching experience brief:', error);
      return NextResponse.json(
        { error: 'Failed to fetch experience brief' },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Experience brief not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Brief GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

