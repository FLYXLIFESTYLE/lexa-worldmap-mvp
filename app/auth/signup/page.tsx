/**
 * Sign Up Page
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setSuccess(true);
      
      // Auto sign in after signup
      setTimeout(() => {
        router.push('/app');
        router.refresh();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-lexa-navy via-zinc-900 to-black px-4">
        <div className="absolute inset-0">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-lexa-gold/10 rounded-full blur-3xl animate-pulse-slow" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-12 shadow-2xl border border-lexa-gold/30">
            <div className="mb-6 text-6xl">✨</div>
            <h2 className="mb-3 text-3xl font-bold bg-gradient-to-r from-lexa-navy to-lexa-gold bg-clip-text text-transparent">
              Welcome to LEXA
            </h2>
            <p className="text-zinc-600 mb-4">
              Your journey begins now
            </p>
            <div className="animate-pulse text-sm text-zinc-500">
              Redirecting to your experience...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-lexa-navy via-zinc-900 to-black px-4">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-lexa-gold/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent">
                LEXA
              </span>
            </h1>
          </Link>
          <h2 className="mb-2 text-3xl font-bold text-white">Begin Your Journey</h2>
          <p className="text-zinc-400">Create your personal experience account</p>
        </div>

        {/* Form Card */}
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
                minLength={6}
                className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 transition-all"
                placeholder="••••••••"
              />
              <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                <span className="text-lexa-gold">•</span> Minimum 6 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-4 py-4 font-semibold text-zinc-900 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="relative z-10">{loading ? 'Creating your account...' : 'Create Account'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-lexa-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-semibold text-lexa-navy hover:text-lexa-gold transition-colors">
                Sign in
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

