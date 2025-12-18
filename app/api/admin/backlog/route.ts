/**
 * Backlog Management API
 * CRUD operations for backlog items with drag-and-drop reordering
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated and has captain/admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'captain'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending'; // pending, in_progress, completed, cancelled, all
    const priority = searchParams.get('priority'); // critical, high, normal

    // Build query
    let query = supabase
      .from('backlog_items')
      .select('*')
      .order('priority', { ascending: false }) // critical > high > normal
      .order('order_index', { ascending: true });

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by priority
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: items, error } = await query;

    if (error) {
      throw error;
    }

    // Group by priority for frontend
    const grouped = {
      critical: items?.filter(item => item.priority === 'critical') || [],
      high: items?.filter(item => item.priority === 'high') || [],
      normal: items?.filter(item => item.priority === 'normal') || []
    };

    // Calculate stats
    const stats = {
      total: items?.length || 0,
      open: items?.filter(item => ['pending', 'in_progress'].includes(item.status)).length || 0,
      resolved: items?.filter(item => ['completed', 'cancelled'].includes(item.status)).length || 0,
      critical: items?.filter(item => item.priority === 'critical').length || 0,
      high: items?.filter(item => item.priority === 'high').length || 0
    };

    return NextResponse.json({
      success: true,
      items: items || [],
      grouped,
      stats,
      total: items?.length || 0
    });

  } catch (error: any) {
    console.error('Backlog GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch backlog items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'captain'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, priority, category, estimated_hours, tags, notes } = body;

    if (!title || !priority) {
      return NextResponse.json(
        { success: false, error: 'Title and priority are required' },
        { status: 400 }
      );
    }

    // Get highest order_index for this priority to add new item at top
    const { data: existingItems } = await supabase
      .from('backlog_items')
      .select('order_index')
      .eq('priority', priority)
      .eq('status', 'pending')
      .order('order_index', { ascending: false })
      .limit(1);

    const maxOrder = existingItems && existingItems.length > 0 
      ? existingItems[0].order_index 
      : 0;

    // Insert new item at top (order_index = maxOrder + 1)
    const { data: newItem, error } = await supabase
      .from('backlog_items')
      .insert({
        title,
        description,
        priority,
        category: category || 'other',
        estimated_hours: estimated_hours || null,
        tags: tags || [],
        notes: notes || null,
        order_index: maxOrder + 1,
        created_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      item: newItem
    });

  } catch (error: any) {
    console.error('Backlog POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create backlog item' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'captain'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // If status is being set to 'completed', add completed_at timestamp
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const { data: updatedItem, error } = await supabase
      .from('backlog_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      item: updatedItem
    });

  } catch (error: any) {
    console.error('Backlog PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update backlog item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user is admin (only admins can delete)
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete backlog items' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('backlog_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Backlog item deleted'
    });

  } catch (error: any) {
    console.error('Backlog DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete backlog item' },
      { status: 500 }
    );
  }
}

