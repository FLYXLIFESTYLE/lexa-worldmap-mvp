/**
 * Next.js Middleware - Supabase Authentication
 * Refreshes auth tokens and protects routes
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for public routes
  if (!path.startsWith('/app') && !path.startsWith('/api') && !path.startsWith('/admin')) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
    // Allow request to continue but log error
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /app routes - redirect to signin if not authenticated
  if (path.startsWith('/app') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }

  // Protect /admin routes - require captain profile
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('redirectTo', path);
      return NextResponse.redirect(url);
    }

    // Check for captain profile - with fresh query to avoid cache
    const { data: profile, error: profileError } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();  // Use maybeSingle() instead of single() to avoid errors

    if (profileError) {
      console.error('Error fetching captain profile:', profileError);
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.searchParams.set('from', path);
      url.searchParams.set('error', 'profile_fetch_error');
      return NextResponse.redirect(url);
    }

    if (!profile) {
      console.log('No captain profile found for user:', user.id);
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.searchParams.set('from', path);
      url.searchParams.set('error', 'no_profile');
      return NextResponse.redirect(url);
    }

    // Admin-only routes
    if (path.startsWith('/admin/users') && profile.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.searchParams.set('from', path);
      url.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
