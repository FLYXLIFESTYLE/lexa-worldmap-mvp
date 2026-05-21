import { requireStaff } from '@/lib/auth/server-auth';
import { AUTH_DISABLED, BYPASS_USER_EMAIL } from '@/lib/auth/user-access';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Admin Presence API
 * GET: Fetch list of online admins/captains
 * POST: Update current user's presence (heartbeat)
 */

// In-memory store for online users (in production, use Redis or Supabase Realtime)
const onlineUsers = new Map<string, { user_id: string; email: string; last_seen: Date }>();

// Clean up stale presences (older than 2 minutes)
function cleanupStalePresences() {
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  
  for (const [userId, presence] of onlineUsers.entries()) {
    if (presence.last_seen < twoMinutesAgo) {
      onlineUsers.delete(userId);
    }
  }
}

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  // Clean up stale presences
  cleanupStalePresences();

  // Convert Map to array
  const online_users = Array.from(onlineUsers.values()).map(user => ({
    user_id: user.user_id,
    email: user.email,
    last_seen: user.last_seen.toISOString()
  }));

  return NextResponse.json({ 
    success: true, 
    online_users,
    count: online_users.length
  });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  try {
    const { user_id, email } = await request.json();

    let userEmail = BYPASS_USER_EMAIL;
    if (!AUTH_DISABLED) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email || 'Unknown';
    }

    // Update presence
    onlineUsers.set(user_id || auth.userId, {
      user_id: user_id || auth.userId,
      email: email || userEmail,
      last_seen: new Date()
    });

    return NextResponse.json({ 
      success: true,
      message: 'Presence updated'
    });
  } catch (error: any) {
    console.error('Error updating presence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
