import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's emotional profile
    const { data: profile, error: profileError } = await supabase
      .from('lexa_user_profiles')
      .select('emotional_profile, primary_themes, personality_archetype')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({
      emotional_profile: profile.emotional_profile || {},
      primary_themes: profile.primary_themes || [],
      personality_archetype: profile.personality_archetype || null
    });

  } catch (error) {
    console.error('Error fetching emotional profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emotional profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate emotional profile structure
    const emotionalProfile = body.emotional_profile || {};
    
    // Add last_updated timestamp
    emotionalProfile.last_updated = new Date().toISOString();

    // Update emotional profile
    const { data: profile, error: updateError } = await supabase
      .from('lexa_user_profiles')
      .update({
        emotional_profile: emotionalProfile,
        primary_themes: body.primary_themes || [],
        personality_archetype: body.personality_archetype || null
      })
      .eq('user_id', user.id)
      .select('emotional_profile, primary_themes, personality_archetype')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      emotional_profile: profile.emotional_profile,
      primary_themes: profile.primary_themes,
      personality_archetype: profile.personality_archetype
    });

  } catch (error) {
    console.error('Error updating emotional profile:', error);
    return NextResponse.json(
      { error: 'Failed to update emotional profile' },
      { status: 500 }
    );
  }
}
