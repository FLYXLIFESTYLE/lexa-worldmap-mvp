/**
 * End-user login/signup and optional auth bypass for private deployments.
 * Captain/admin staff login still works via /captain, /admin, or /knowledge redirects.
 */

/** Auth off by default for private/unpublished site. Set NEXT_PUBLIC_AUTH_DISABLED=false to require login. */
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED !== 'false';

/** Fallback user when auth is disabled (matches chat API dev user). */
export const BYPASS_USER_ID = '00000000-0000-0000-0000-000000000001';
export const BYPASS_USER_EMAIL = 'dev@lexa.local';
export const BYPASS_USER_NAME = 'LEXA Dev';

/** Set NEXT_PUBLIC_USER_LOGIN_ENABLED=true to re-enable public user login. */
export const USER_LOGIN_ENABLED =
  AUTH_DISABLED || process.env.NEXT_PUBLIC_USER_LOGIN_ENABLED === 'true';

const STAFF_ROUTE_PREFIXES = ['/captain', '/admin', '/knowledge'] as const;

export function isStaffRedirectPath(path: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return STAFF_ROUTE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function canShowUserLoginForm(redirectTo: string): boolean {
  if (AUTH_DISABLED) return false;
  return USER_LOGIN_ENABLED || isStaffRedirectPath(redirectTo);
}
