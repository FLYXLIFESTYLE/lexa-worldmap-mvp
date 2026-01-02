import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: scriptId } = await params;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get script
    const { data: script, error: scriptError } = await supabase
      .from('experience_briefs')
      .select('*')
      .eq('id', scriptId)
      .single();

    if (scriptError || !script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // Check if user owns the script or if it's shared
    if (script.user_id !== user.id && script.is_private) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get library metadata if it exists
    const { data: libraryItem } = await supabase
      .from('user_script_library')
      .select('*')
      .eq('user_id', user.id)
      .eq('script_id', scriptId)
      .single();

    // Update last_accessed if owned
    if (libraryItem) {
      await supabase
        .from('user_script_library')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', libraryItem.id);
    }

    return NextResponse.json({
      script: {
        ...script,
        library_metadata: libraryItem ? {
          is_favorite: libraryItem.is_favorite,
          is_archived: libraryItem.is_archived,
          custom_notes: libraryItem.custom_notes,
          added_at: libraryItem.added_at,
          last_accessed: libraryItem.last_accessed
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching script:', error);
    return NextResponse.json(
      { error: 'Failed to fetch script' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: scriptId } = await params;
    const body = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the script
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

    // Update library metadata
    const updateData: any = {};
    if (body.is_favorite !== undefined) updateData.is_favorite = body.is_favorite;
    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;
    if (body.custom_notes !== undefined) updateData.custom_notes = body.custom_notes;

    const { data: libraryItem, error: updateError } = await supabase
      .from('user_script_library')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('script_id', scriptId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      library_metadata: libraryItem
    });

  } catch (error) {
    console.error('Error updating script:', error);
    return NextResponse.json(
      { error: 'Failed to update script' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: scriptId } = await params;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Archive instead of delete
    const { error: archiveError } = await supabase
      .from('user_script_library')
      .update({ is_archived: true })
      .eq('user_id', user.id)
      .eq('script_id', scriptId);

    if (archiveError) {
      throw archiveError;
    }

    return NextResponse.json({
      success: true,
      message: 'Script archived successfully'
    });

  } catch (error) {
    console.error('Error archiving script:', error);
    return NextResponse.json(
      { error: 'Failed to archive script' },
      { status: 500 }
    );
  }
}
