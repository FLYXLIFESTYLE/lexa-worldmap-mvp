/**
 * Role-Based Access Control (RBAC)
 * Manage user roles and permissions
 */

export type UserRole = 'user' | 'captain' | 'admin';

export interface RolePermissions {
  canAccessChat: boolean;
  canAccessKnowledgePortal: boolean;
  canCreateUsers: boolean;
  canManageDataQuality: boolean;
  canViewAnalytics: boolean;
  canManageSystem: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  // Public users - Can only use LEXA chat
  user: {
    canAccessChat: true,
    canAccessKnowledgePortal: false,
    canCreateUsers: false,
    canManageDataQuality: false,
    canViewAnalytics: false,
    canManageSystem: false,
  },
  
  // Captains - Internal team, knowledge contributors
  captain: {
    canAccessChat: true,
    canAccessKnowledgePortal: true,
    canCreateUsers: false,
    canManageDataQuality: true,
    canViewAnalytics: true,
    canManageSystem: false,
  },
  
  // Admins - Full system access
  admin: {
    canAccessChat: true,
    canAccessKnowledgePortal: true,
    canCreateUsers: true,
    canManageDataQuality: true,
    canViewAnalytics: true,
    canManageSystem: true,
  },
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole | null | undefined,
  permission: keyof RolePermissions
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Get user role from captain profile
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  // This will be implemented with Supabase query
  // For now, return 'user' as default
  // TODO: Query captain_profiles table for role
  return 'user';
}

/**
 * Check if user is a captain (internal team member)
 */
export function isCaptain(role: UserRole | null | undefined): boolean {
  return role === 'captain' || role === 'admin';
}

/**
 * Check if user is an admin
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

