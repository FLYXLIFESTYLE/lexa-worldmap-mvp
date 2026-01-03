/**
 * API for fetching upload history
 * Uses captain_uploads table from backend
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is captain or admin
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isCaptainOrAdmin = profile?.role === 'captain' || profile?.role === 'admin';

    if (!isCaptainOrAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Fetch uploads from captain_uploads table
    let query = supabase
      .from('captain_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(100);

    // If not admin, only show own uploads
    if (profile?.role !== 'admin') {
      query = query.eq('uploaded_by', user.id);
    }

    const { data: uploads, error } = await query;

    if (error) {
      console.error('Failed to fetch uploads:', error);
      return NextResponse.json({ error: 'Failed to fetch uploads', details: error.message }, { status: 500 });
    }

    // Transform to match frontend interface
    const transformedUploads = (uploads || []).map((upload: any) => ({
      id: upload.id,
      filename: upload.filename,
      file_type: upload.file_type,
      file_size: upload.file_size,
      uploaded_at: upload.uploaded_at || upload.created_at,
      pois_extracted: upload.pois_extracted || 0,
      relationships_created: 0, // Not tracked in captain_uploads
      wisdom_created: 0, // Not tracked in captain_uploads
      processing_status: upload.processing_status || 'pending',
      error_message: upload.error_message,
      keep_file: upload.keep_file !== false,
      file_url: upload.file_url,
    }));

    return NextResponse.json({ uploads: transformedUploads });
  } catch (error: any) {
    console.error('Upload fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

