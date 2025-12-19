/**
 * API for managing individual upload records
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user from session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sb-access-token');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionCookie.value);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get upload record
    const { data: upload, error: fetchError } = await supabase
      .from('upload_tracking')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Check if user is captain/admin or owns this upload
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isCaptainOrAdmin = profile?.role === 'captain' || profile?.role === 'admin';
    const isOwner = upload.uploaded_by === user.id;

    if (!isCaptainOrAdmin && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete file from storage if it exists
    if (upload.file_path) {
      const { error: storageError } = await supabase.storage
        .from('knowledge-uploads')
        .remove([upload.file_path]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError);
      }
    }

    // Soft delete (set deleted_at timestamp)
    const { error: deleteError } = await supabase
      .from('upload_tracking')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete upload:', deleteError);
      return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

