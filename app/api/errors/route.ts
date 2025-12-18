import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Error Logs API (Admin only)
 * GET: Fetch all error logs with filtering
 * PATCH: Update error log status
 */

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'new';
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin/captain
  const { data: profile } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['admin', 'captain'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Build query
  let query = supabase
    .from('error_logs')
    .select('*')
    .order('last_seen', { ascending: false });

  // Filter by status
  if (status !== 'all') {
    if (status === 'open') {
      query = query.in('status', ['new', 'reviewed']);
    } else if (status === 'resolved') {
      query = query.in('status', ['fixed', 'ignored']);
    } else {
      query = query.eq('status', status);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by status
  const grouped = {
    open: data?.filter(err => ['new', 'reviewed'].includes(err.status)) || [],
    resolved: data?.filter(err => ['fixed', 'ignored'].includes(err.status)) || []
  };

  return NextResponse.json({ 
    success: true, 
    errors: data,
    grouped,
    stats: {
      total: data?.length || 0,
      open: grouped.open.length,
      resolved: grouped.resolved.length,
      critical: data?.filter(err => err.severity === 'critical' && ['new', 'reviewed'].includes(err.status)).length || 0,
      high: data?.filter(err => err.severity === 'high' && ['new', 'reviewed'].includes(err.status)).length || 0,
      total_occurrences: data?.reduce((sum, err) => sum + (err.occurrence_count || 0), 0) || 0
    }
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin/captain
  const { data: profile } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['admin', 'captain'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, status } = await request.json();

    const updates: any = { status };
    
    if (status === 'fixed') {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user.id;
    }

    const { data, error } = await supabase
      .from('error_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating error log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, error: data });
  } catch (error: any) {
    console.error('Error updating error log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

