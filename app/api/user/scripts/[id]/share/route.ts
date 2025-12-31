import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const scriptId = params.id;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get script and verify ownership
    const { data: script, error: scriptError } = await supabase
      .from('experience_briefs')
      .select('*')
      .eq('id', scriptId)
      .eq('user_id', user.id)
      .single();

    if (scriptError || !script) {
      return NextResponse.json(
        { error: 'Script not found or access denied' },
        { status: 404 }
      );
    }

    // Check if already shared
    const { data: existingShare } = await supabase
      .from('community_scripts')
      .select('id')
      .eq('original_script_id', scriptId)
      .single();

    if (existingShare) {
      return NextResponse.json(
        { error: 'Script already shared to community' },
        { status: 400 }
      );
    }

    // Create anonymized version
    const anonymizedVersion = {
      title: script.when_at?.title || 'Experience Script',
      theme: script.theme,
      duration: script.duration,
      experience_dna: {
        story: script.emotional_goals?.story || 'A meaningful travel experience',
        emotion: script.emotional_goals?.emotion || 'Connection and discovery',
        trigger: 'Sensory moments that create lasting memories'
      },
      highlights: script.must_haves || [],
      tags: script.tags || [],
      difficulty_level: script.difficulty_level,
      budget_range: script.estimated_budget_range,
      general_location: script.where_at?.region || 'International'
    };

    // Mark script as shared and create community version
    const { error: updateError } = await supabase
      .from('experience_briefs')
      .update({
        is_private: false,
        sharing_enabled: true
      })
      .eq('id', scriptId);

    if (updateError) {
      throw updateError;
    }

    const { data: communityScript, error: shareError } = await supabase
      .from('community_scripts')
      .insert({
        original_script_id: scriptId,
        creator_id: user.id,
        anonymized_version: anonymizedVersion,
        moderation_status: 'pending'
      })
      .select()
      .single();

    if (shareError) {
      throw shareError;
    }

    return NextResponse.json({
      success: true,
      community_script: communityScript,
      message: 'Script shared to community (pending moderation)'
    });

  } catch (error) {
    console.error('Error sharing script:', error);
    return NextResponse.json(
      { error: 'Failed to share script' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const scriptId = params.id;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: script } = await supabase
      .from('experience_briefs')
      .select('user_id')
      .eq('id', scriptId)
      .single();

    if (!script || script.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Remove from community and mark private
    await supabase
      .from('community_scripts')
      .delete()
      .eq('original_script_id', scriptId);

    await supabase
      .from('experience_briefs')
      .update({
        is_private: true,
        sharing_enabled: false
      })
      .eq('id', scriptId);

    return NextResponse.json({
      success: true,
      message: 'Script removed from community'
    });

  } catch (error) {
    console.error('Error unsharing script:', error);
    return NextResponse.json(
      { error: 'Failed to unshare script' },
      { status: 500 }
    );
  }
}
