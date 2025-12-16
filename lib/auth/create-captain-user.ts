/**
 * Create Captain User
 * Admin function to create new captain users
 */

import { createClient } from '@/lib/supabase/server';

export interface CreateCaptainUserParams {
  email: string;
  displayName: string;
  role: 'internal' | 'external_captain' | 'yacht_crew' | 'expert';
  commissionRate?: number;
}

/**
 * Create a new captain user
 * This function should only be called by admins
 */
export async function createCaptainUser(params: CreateCaptainUserParams): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Create user in Supabase Auth
    // Note: This requires service role key for admin operations
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: params.displayName,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return {
        success: false,
        error: authError?.message || 'Failed to create user',
      };
    }

    // Create captain profile
    const { error: profileError } = await supabase
      .from('captain_profiles')
      .insert({
        user_id: authData.user.id,
        display_name: params.displayName,
        role: params.role,
        commission_rate: params.commissionRate || 0.00,
      });

    if (profileError) {
      console.error('Error creating captain profile:', profileError);
      // Try to delete the auth user since profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      return {
        success: false,
        error: 'Failed to create captain profile',
      };
    }

    // Send password reset email so user can set their password
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(params.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/set-password`,
    });

    if (resetError) {
      console.error('Error sending password reset email:', resetError);
      // Don't fail the operation, just log it
    }

    return {
      success: true,
      userId: authData.user.id,
    };
  } catch (error) {
    console.error('Error in createCaptainUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all captain users (admin function)
 */
export async function listCaptainUsers(): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('captain_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing captain users:', error);
    return [];
  }

  return data || [];
}

/**
 * Deactivate a captain user (admin function)
 */
export async function deactivateCaptainUser(userId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    // Delete user from auth (this will cascade to captain_profiles)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deactivating user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deactivateCaptainUser:', error);
    return false;
  }
}

