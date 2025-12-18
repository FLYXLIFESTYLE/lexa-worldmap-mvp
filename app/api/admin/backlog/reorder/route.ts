/**
 * Backlog Reorder API
 * Updates order_index for drag-and-drop reordering within priority groups
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
    const { items } = body; // Array of { id, order_index }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Update order_index for each item
    const updates = items.map(async (item) => {
      return supabase
        .from('backlog_items')
        .update({ order_index: item.order_index })
        .eq('id', item.id);
    });

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      message: 'Backlog order updated'
    });

  } catch (error: any) {
    console.error('Backlog reorder error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reorder backlog items' },
      { status: 500 }
    );
  }
}

