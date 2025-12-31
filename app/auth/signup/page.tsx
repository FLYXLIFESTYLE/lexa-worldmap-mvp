/**
 * Sign Up Page
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LuxuryBackground from '@/components/luxury-background';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <LuxuryBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6">
            <div className="relative inline-block">
              <h1 className="text-5xl font-bold">
                <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent">
                  LEXA
                </span>
              </h1>
              <span className="absolute top-0 -right-8 inline-block px-2 py-0.5 rounded-full bg-lexa-gold text-zinc-900 text-xs font-bold tracking-wider shadow-lg shadow-lexa-gold/50 transform rotate-12">
                BETA
              </span>
            </div>
          </Link>
          <h2 className="mb-2 text-3xl font-bold text-white">Create your account</h2>
          <p className="text-zinc-400">Start designing your next experience</p>
        </div>

        {success ? (
          <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-lexa-gold/30 text-center">
            <div className="mb-4 text-5xl">✉️</div>
            <h3 className="mb-3 text-2xl font-bold text-lexa-navy">Check your email</h3>
            <p className="text-zinc-600 mb-6">
              We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
            </p>
            <div className="space-y-2 text-sm text-zinc-500">
              <p>Check spam/junk if you don't see it.</p>
              <p>If the link expires, you can resend it.</p>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-200 space-y-3">
              <button
                type="button"
                onClick={() => router.push('/auth/signin')}
                className="w-full rounded-xl bg-lexa-navy px-4 py-3 font-semibold text-white hover:bg-zinc-900 transition-colors"
              >
                Go to Sign In
              </button>
              <Link
                href="/auth/resend-verification"
                className="block text-sm font-semibold text-lexa-navy hover:text-lexa-gold transition-colors"
              >
                Resend verification email →
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-zinc-200/50">
            <form onSubmit={handleSignUp} className="space-y-6">
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
                  placeholder="Create a secure password"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Use at least 8 characters.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-4 py-4 font-semibold text-zinc-900 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="relative z-10">{loading ? 'Creating account...' : 'Sign Up'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-lexa-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-zinc-600">
                Already registered?{' '}
                <Link
                  href="/auth/signin"
                  className="font-semibold text-lexa-navy hover:text-lexa-gold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-2"
          >
            <span>←</span> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

