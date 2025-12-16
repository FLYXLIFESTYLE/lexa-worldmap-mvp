/**
 * Preferences API Route
 * GET/PUT user preferences (voice, language)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

// GET preferences
export async function GET() {
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
    
    const { data, error } = await supabaseAdmin
      .from('lexa_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }
    
    // If no preferences found, return defaults
    if (!data) {
      return NextResponse.json({
        voice_reply_enabled: false,
        language: 'en',
      });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT preferences (update)
export async function PUT(request: NextRequest) {
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
    
    const body = await request.json();
    const { voice_reply_enabled, language } = body;
    
    // Validate input
    if (typeof voice_reply_enabled !== 'boolean' && voice_reply_enabled !== undefined) {
      return NextResponse.json(
        { error: 'voice_reply_enabled must be a boolean' },
        { status: 400 }
      );
    }
    
    if (language !== undefined && typeof language !== 'string') {
      return NextResponse.json(
        { error: 'language must be a string' },
        { status: 400 }
      );
    }
    
    // Upsert preferences
    const { data, error } = await supabaseAdmin
      .from('lexa_preferences')
      .upsert({
        user_id: userId,
        voice_reply_enabled: voice_reply_enabled ?? false,
        language: language ?? 'en',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Preferences PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

