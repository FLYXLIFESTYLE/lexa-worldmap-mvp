import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Bug Reports API
 * GET: Fetch all bug reports (admins) or user's own reports
 * POST: Submit a new bug report (all users)
 * PATCH: Update bug report status (admins only)
 */

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'open';
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is admin/captain
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    isAdmin = profile?.role && ['admin', 'captain'].includes(profile.role);
  }

  // Build query
  let query = supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by status
  if (status !== 'all') {
    if (status === 'open') {
      query = query.in('status', ['open']);
    } else if (status === 'resolved') {
      query = query.in('status', ['resolved', 'duplicate', 'wont_fix']);
    } else {
      query = query.eq('status', status);
    }
  }

  // If not admin, only show user's own reports
  if (!isAdmin && user) {
    query = query.eq('reported_by', user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by status
  const grouped = {
    open: data?.filter(bug => bug.status === 'open') || [],
    resolved: data?.filter(bug => ['resolved', 'duplicate', 'wont_fix'].includes(bug.status)) || []
  };

  return NextResponse.json({ 
    success: true, 
    bugs: data,
    grouped,
    stats: {
      total: data?.length || 0,
      open: grouped.open.length,
      resolved: grouped.resolved.length,
      critical: data?.filter(bug => bug.severity === 'critical' && bug.status === 'open').length || 0,
      high: data?.filter(bug => bug.severity === 'high' && bug.status === 'open').length || 0
    }
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const body = await request.json();
    const {
      title,
      description,
      page_url,
      severity = 'medium',
      category = 'other',
      browser_info,
      steps_to_reproduce,
      expected_behavior,
      actual_behavior,
      reporter_email,
      reporter_name
    } = body;

    // Validation
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Get browser info from headers if not provided
    const userAgent = browser_info || request.headers.get('user-agent') || 'Unknown';

    // Create bug report
    const { data, error } = await supabase
      .from('bug_reports')
      .insert({
        title,
        description,
        page_url,
        severity,
        category,
        browser_info: userAgent,
        steps_to_reproduce,
        expected_behavior,
        actual_behavior,
        reported_by: user?.id || null,
        reporter_email: reporter_email || user?.email || null,
        reporter_name: reporter_name || null,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bug report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      bug: data,
      message: 'Bug report submitted successfully. Thank you for helping us improve LEXA!'
    });
  } catch (error: any) {
    console.error('Error submitting bug report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
    const { id, status, resolution_notes, assigned_to } = await request.json();

    const updates: any = { status };
    
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user.id;
    }
    
    if (resolution_notes) {
      updates.resolution_notes = resolution_notes;
    }
    
    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to;
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating bug report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bug: data });
  } catch (error: any) {
    console.error('Error updating bug report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    const { error } = await supabase
      .from('bug_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bug report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Bug report deleted' });
  } catch (error: any) {
    console.error('Error deleting bug report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

