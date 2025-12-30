/**
 * Get Captain Profile
 * Retrieves the captain profile for the current authenticated user
 */

import { createClient } from '@/lib/supabase/server';

export interface CaptainProfile {
  id: string;
  user_id: string;
  display_name: string;
  role: 'admin' | 'internal' | 'external_captain' | 'yacht_crew' | 'expert';
  commission_rate: number;
  bank_info?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Get the captain profile for the currently authenticated user
 */
export async function getCaptainProfile(): Promise<CaptainProfile | null> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('Error getting user:', userError);
    return null;
  }
  
  // Get captain profile
  const { data, error } = await supabase
    .from('captain_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error) {
    console.error('Error getting captain profile:', error);
    return null;
  }
  
  return data;
}

/**
 * Get captain profile by user ID (admin function)
 */
export async function getCaptainProfileById(userId: string): Promise<CaptainProfile | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('captain_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('Error getting captain profile:', error);
    return null;
  }
  
  return data;
}

/**
 * Update captain profile
 */
export async function updateCaptainProfile(updates: Partial<CaptainProfile>): Promise<CaptainProfile | null> {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('Error getting user:', userError);
    return null;
  }
  
  const { data, error } = await supabase
    .from('captain_profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating captain profile:', error);
    return null;
  }
  
  return data;
}

