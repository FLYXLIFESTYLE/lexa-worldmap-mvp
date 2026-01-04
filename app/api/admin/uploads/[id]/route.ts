/**
 * API for managing individual upload records
 */

import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Read the current user session from cookies (standard project helper).
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Role check (captain/admin only)
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = profile?.role || null;
    const isCaptainOrAdmin = role === 'captain' || role === 'admin';

    // Use service role key for deletion (bypass RLS) but only after auth check above.
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server not configured (missing SUPABASE service key)' },
        { status: 500 }
      );
    }

    const admin = createAdminClient(supabaseUrl, serviceKey);

    // Fetch record for ownership check (if not captain/admin)
    const { data: upload, error: fetchError } = await admin
      .from('captain_uploads')
      .select('id, uploaded_by, uploaded_by_email')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const isOwner =
      upload.uploaded_by === user.id ||
      (upload.uploaded_by_email || '').toLowerCase() === (user.email || '').toLowerCase();

    if (!isCaptainOrAdmin && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { error: deleteError } = await admin
      .from('captain_uploads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete upload:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete upload', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

