/**
 * Route Protection Helper
 * Middleware to protect admin/captain routes
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function protectCaptainRoute(request: NextRequest) {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    // Redirect to sign-in
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  // Check if user has captain profile
  const { data: profile, error: profileError } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (profileError || !profile) {
    // User is authenticated but not a captain
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  // User is a captain, allow access
  return NextResponse.next();
}

export async function protectAdminRoute(request: NextRequest) {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  // Check if user is an admin
  const { data: profile, error: profileError } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}

