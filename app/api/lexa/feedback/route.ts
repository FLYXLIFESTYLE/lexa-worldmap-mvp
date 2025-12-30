import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, rating, comment, tags } = body ?? {};

    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    if (rating !== 1 && rating !== -1) {
      return NextResponse.json({ error: 'rating must be 1 or -1' }, { status: 400 });
    }

    // Ensure the message belongs to this user (prevents rating other users' messages)
    const { data: msg, error: msgErr } = await supabaseAdmin
      .from('lexa_messages')
      .select('id, session_id, user_id, role')
      .eq('id', messageId)
      .single();

    if (msgErr || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (msg.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only rate assistant messages (simple guard)
    if (msg.role !== 'assistant') {
      return NextResponse.json({ error: 'Only assistant messages can be rated' }, { status: 400 });
    }

    const safeTags = Array.isArray(tags) ? tags.filter((t) => typeof t === 'string').slice(0, 10) : [];
    const safeComment = typeof comment === 'string' ? comment.slice(0, 1000) : null;

    // Upsert by (user_id, message_id) would be ideal; keep it simple for MVP: insert duplicates allowed.
    const { error: insErr } = await supabaseAdmin.from('lexa_message_feedback').insert({
      user_id: user.id,
      session_id: msg.session_id,
      message_id: msg.id,
      rating,
      tags: safeTags,
      comment: safeComment,
    });

    if (insErr) {
      console.error('Feedback insert error:', insErr);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Feedback API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


