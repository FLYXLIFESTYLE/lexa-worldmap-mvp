'use client';

/**
 * Resend Email Verification
 * For users who signed up but didn't receive or lost their confirmation email
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import Link from 'next/link';
import LuxuryBackground from '@/components/luxury-background';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) throw resendError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
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
          <h2 className="mb-2 text-3xl font-bold text-white">Resend Verification Email</h2>
          <p className="text-zinc-400">We'll send a new confirmation link to your inbox</p>
        </div>

        {success ? (
          /* Success State */
          <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-lexa-gold/30 text-center">
            <div className="mb-4 text-5xl">✉️</div>
            <h3 className="mb-3 text-2xl font-bold text-lexa-navy">Email Sent!</h3>
            <p className="text-zinc-600 mb-6">
              We've sent a new verification link to <strong>{email}</strong>
            </p>
            <div className="space-y-3 text-sm text-zinc-500">
              <p>📬 Check your inbox (and spam folder)</p>
              <p>⏱️ The link will expire in 24 hours</p>
              <p>🔒 Click the link to verify your email</p>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-200">
              <Link
                href="/auth/signin"
                className="text-lexa-navy font-semibold hover:text-lexa-gold transition-colors"
              >
                Back to Sign In →
              </Link>
            </div>
          </div>
        ) : (
          /* Form */
          <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-zinc-200/50">
            <form onSubmit={handleResend} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <strong>💡 Didn't receive the email?</strong>
                <ul className="mt-2 ml-4 space-y-1 list-disc">
                  <li>Check your spam/junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Wait a few minutes (email may be delayed)</li>
                </ul>
              </div>

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
                <p className="mt-2 text-xs text-zinc-500">
                  Enter the email you used to sign up
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-4 py-4 font-semibold text-zinc-900 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="relative z-10">
                  {loading ? 'Sending...' : 'Resend Verification Email'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-lexa-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-zinc-600">
                Already verified?{' '}
                <Link href="/auth/signin" className="font-semibold text-lexa-navy hover:text-lexa-gold transition-colors">
                  Sign in
                </Link>
              </p>
              <p className="text-sm text-zinc-600">
                Not registered yet?{' '}
                <Link
                  href="/auth/signup"
                  className="font-semibold text-lexa-navy hover:text-lexa-gold transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        )}

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

