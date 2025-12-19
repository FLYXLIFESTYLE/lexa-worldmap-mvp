/**
 * API for fetching upload history
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
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

    // Check if user is captain or admin
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isCaptainOrAdmin = profile?.role === 'captain' || profile?.role === 'admin';

    // Fetch uploads
    let query = supabase
      .from('upload_tracking')
      .select('*')
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    // If not captain/admin, only show own uploads
    if (!isCaptainOrAdmin) {
      query = query.eq('uploaded_by', user.id);
    }

    const { data: uploads, error } = await query;

    if (error) {
      console.error('Failed to fetch uploads:', error);
      return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }

    return NextResponse.json({ uploads: uploads || [] });
  } catch (error) {
    console.error('Upload fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

