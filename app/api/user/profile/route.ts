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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('lexa_user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      // If no profile exists, create one
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('lexa_user_profiles')
          .insert({
            user_id: user.id,
            emotional_profile: {},
            preferences: {}
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return NextResponse.json({
          profile: newProfile,
          user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          }
        });
      }
      throw profileError;
    }

    return NextResponse.json({
      profile,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
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

    // Validate and prepare update data
    const updateData: any = {};
    
    if (body.primary_themes !== undefined) updateData.primary_themes = body.primary_themes;
    if (body.personality_archetype !== undefined) updateData.personality_archetype = body.personality_archetype;
    if (body.budget_preferences !== undefined) updateData.budget_preferences = body.budget_preferences;
    if (body.travel_frequency !== undefined) updateData.travel_frequency = body.travel_frequency;
    if (body.sensory_preferences !== undefined) updateData.sensory_preferences = body.sensory_preferences;
    if (body.past_destinations !== undefined) updateData.past_destinations = body.past_destinations;
    if (body.bucket_list !== undefined) updateData.bucket_list = body.bucket_list;
    if (body.dislikes !== undefined) updateData.dislikes = body.dislikes;
    if (body.preferred_travel_style !== undefined) updateData.preferred_travel_style = body.preferred_travel_style;
    if (body.companion_types !== undefined) updateData.companion_types = body.companion_types;
    if (body.seasonal_preferences !== undefined) updateData.seasonal_preferences = body.seasonal_preferences;
    if (body.preferences !== undefined) updateData.preferences = body.preferences;

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('lexa_user_profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      profile
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
