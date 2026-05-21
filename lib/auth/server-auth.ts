import { createClient } from '@/lib/supabase/server';
import { AUTH_DISABLED, BYPASS_USER_ID } from './user-access';

type AuthFailure = { ok: false; status: 401 | 403 };
type CaptainAuthSuccess = {
  ok: true;
  status: 200;
  user: { id: string } | null;
  userId: string;
  isAdmin: boolean;
};
type AdminAuthSuccess = { ok: true; userId: string };

export async function getAuthenticatedUserId(): Promise<string | null> {
  if (AUTH_DISABLED) return BYPASS_USER_ID;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function requireCaptainOrAdmin(): Promise<CaptainAuthSuccess | AuthFailure> {
  if (AUTH_DISABLED) {
    return {
      ok: true,
      status: 200,
      user: { id: BYPASS_USER_ID },
      userId: BYPASS_USER_ID,
      isAdmin: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const { data: profile } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = String(profile?.role || '').toLowerCase();
  if (!role) return { ok: false, status: 403 };

  return {
    ok: true,
    status: 200,
    user,
    userId: user.id,
    isAdmin: role === 'admin',
  };
}

export async function requireAdmin(): Promise<AdminAuthSuccess | AuthFailure> {
  if (AUTH_DISABLED) {
    return { ok: true, userId: BYPASS_USER_ID };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { ok: false, status: 401 };

  const { data: profile, error: profileError } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    return { ok: false, status: 403 };
  }

  return { ok: true, userId: user.id };
}

export async function requireStaff(options?: {
  adminOnly?: boolean;
}): Promise<
  | { ok: true; userId: string; isAdmin: boolean }
  | { ok: false; status: 401 | 403 }
> {
  const auth = await requireCaptainOrAdmin();
  if (!auth.ok) return { ok: false, status: auth.status };
  if (options?.adminOnly && !auth.isAdmin) return { ok: false, status: 403 };
  return { ok: true, userId: auth.userId, isAdmin: auth.isAdmin };
}
