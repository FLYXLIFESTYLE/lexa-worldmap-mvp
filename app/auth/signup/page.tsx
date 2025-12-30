/**
 * Sign Up Page (Invite-only)
 * Public sign-ups are disabled. Only admins can create captain/admin accounts.
 */

'use client';

import Link from 'next/link';
import LuxuryBackground from '@/components/luxury-background';

export default function SignUpPage() {
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
          <h2 className="mb-2 text-3xl font-bold text-white">Invite-only access</h2>
          <p className="text-zinc-400">
            Registration is disabled. An admin must create your account.
          </p>
        </div>

        <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-zinc-200/50 text-center">
          <p className="text-zinc-700">
            If you should have access, please contact your admin.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/signin"
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-4 py-4 font-semibold text-zinc-900 transition-all hover:shadow-xl hover:scale-105 inline-flex items-center justify-center"
            >
              Sign in
            </Link>
          </div>
        </div>

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

