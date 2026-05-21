/**
 * Backlog Reorder API
 * Updates order_index for drag-and-drop reordering within priority groups
 */

import { requireStaff } from '@/lib/auth/server-auth';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
