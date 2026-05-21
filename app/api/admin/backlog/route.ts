/**
 * Backlog Management API
 * CRUD operations for backlog items with drag-and-drop reordering
 */

import { requireStaff } from '@/lib/auth/server-auth';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: auth.status }
      );
    }

    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // pending, in_progress, completed, cancelled, all (null = all)
    const priority = searchParams.get('priority'); // critical, high, normal

    // Build query
    let query = supabase
      .from('backlog_items')
      .select('*')
      .order('priority', { ascending: false }) // critical > high > normal
      .order('order_index', { ascending: true });

    // Filter by status (only if explicitly provided and not 'all')
    if (status && status !== 'all') {
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

    // Get ALL items for accurate stats (even if filtered view)
    const { data: allItems } = await supabase
      .from('backlog_items')
      .select('*');

    // Group by priority for frontend
    type BacklogItem = { priority: string; status: string };
    const typedItems = (items ?? []) as BacklogItem[];
    const typedAllItems = (allItems ?? []) as BacklogItem[];

    const grouped = {
      critical: typedItems.filter((item) => item.priority === 'critical'),
      high: typedItems.filter((item) => item.priority === 'high'),
      normal: typedItems.filter((item) => item.priority === 'normal'),
    };

    // Calculate stats from ALL items (not just filtered view)
    const stats = {
      total: typedAllItems.length,
      open: typedAllItems.filter((item) => ['pending', 'in_progress'].includes(item.status)).length,
      resolved: typedAllItems.filter((item) => ['completed', 'cancelled'].includes(item.status)).length,
      pending: typedAllItems.filter((item) => item.status === 'pending').length,
      in_progress: typedAllItems.filter((item) => item.status === 'in_progress').length,
      completed: typedAllItems.filter((item) => item.status === 'completed').length,
      cancelled: typedAllItems.filter((item) => item.status === 'cancelled').length,
      critical: typedAllItems.filter(
        (item) => item.priority === 'critical' && ['pending', 'in_progress'].includes(item.status)
      ).length,
      high: typedAllItems.filter(
        (item) => item.priority === 'high' && ['pending', 'in_progress'].includes(item.status)
      ).length,
    };

    return NextResponse.json({
      success: true,
      items: allItems || [], // Return ALL items for client-side filtering
      grouped,
      stats,
      total: allItems?.length || 0
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
    const auth = await requireStaff();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: auth.status }
      );
    }

    const supabase = await createClient();
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
        created_by: auth.userId,
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
    const auth = await requireStaff();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: auth.status }
      );
    }

    const supabase = await createClient();
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
    const auth = await requireStaff({ adminOnly: true });
    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.status === 401 ? 'Unauthorized' : 'Only admins can delete backlog items',
        },
        { status: auth.status }
      );
    }

    const supabase = await createClient();
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

