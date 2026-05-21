import { AUTH_DISABLED, BYPASS_USER_EMAIL, BYPASS_USER_ID, BYPASS_USER_NAME } from './user-access';

export type ClientAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null };
};

export function getBypassUser(): ClientAuthUser {
  return {
    id: BYPASS_USER_ID,
    email: BYPASS_USER_EMAIL,
    user_metadata: { full_name: BYPASS_USER_NAME },
  };
}

export async function getClientAuthUser(supabase: {
  auth: { getUser: () => Promise<{ data: { user: ClientAuthUser | null } }> };
}): Promise<ClientAuthUser | null> {
  if (AUTH_DISABLED) return getBypassUser();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function shouldBlockUnauthenticated(user: ClientAuthUser | null): boolean {
  return !AUTH_DISABLED && !user;
}

export function getDisplayName(user: ClientAuthUser): string {
  return (
    user.user_metadata?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    BYPASS_USER_NAME
  );
}
