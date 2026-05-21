/**
 * End-user login/signup access control.
 * Captain/admin staff login still works via /captain, /admin, or /knowledge redirects.
 */

/** Set NEXT_PUBLIC_USER_LOGIN_ENABLED=true to re-enable public user login. */
export const USER_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_USER_LOGIN_ENABLED === 'true';

const STAFF_ROUTE_PREFIXES = ['/captain', '/admin', '/knowledge'] as const;

export function isStaffRedirectPath(path: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return STAFF_ROUTE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function canShowUserLoginForm(redirectTo: string): boolean {
  return USER_LOGIN_ENABLED || isStaffRedirectPath(redirectTo);
}
