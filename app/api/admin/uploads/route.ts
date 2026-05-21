/**
 * API for fetching upload history
 * Uses captain_uploads table from backend
 */

import { requireStaff } from '@/lib/auth/server-auth';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const supabase = await createClient();

    // Fetch uploads from captain_uploads table
    let query = supabase
      .from('captain_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(100);

    // If not admin, only show own uploads
    if (!auth.isAdmin) {
      query = query.eq('uploaded_by', auth.userId);
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
