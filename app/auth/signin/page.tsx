/**
 * Sign In Page
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import LuxuryBackground from '@/components/luxury-background';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get redirectTo from URL params - default to account dashboard
  const redirectTo = searchParams.get('redirectTo') || '/account';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to the original URL or default to /app
      router.push(redirectTo);
      router.refresh();
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <LuxuryBackground />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6">
            <div className="relative inline-block">
              <h1 className="text-5xl font-bold">
                <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent">
                  LEXA
                </span>
              </h1>
              {/* Beta Badge */}
              <span className="absolute top-0 -right-8 inline-block px-2 py-0.5 rounded-full bg-lexa-gold text-zinc-900 text-xs font-bold tracking-wider shadow-lg shadow-lexa-gold/50 transform rotate-12">
                BETA
              </span>
            </div>
          </Link>
          <h2 className="mb-2 text-3xl font-bold text-white">Welcome Back</h2>
          <p className="text-zinc-400">Continue your journey</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-zinc-200/50">
          <form onSubmit={handleSignIn} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-zinc-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-zinc-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-lexa-navy to-zinc-900 px-4 py-4 font-semibold text-white transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-lexa-gold to-lexa-navy opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600">
              Not registered yet?{' '}
              <Link
                href="/auth/signup"
                className="font-semibold text-lexa-navy hover:text-lexa-gold transition-colors"
              >
                Click here to sign up.
              </Link>
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-2">
            <span>←</span> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}

