'use client';

/**
 * Unauthorized Access Page
 * Shown when user tries to access restricted areas
 */

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Lock Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full mb-4">
            <svg
              className="w-10 h-10 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Access Restricted
          </h1>
          
          <p className="text-zinc-400 mb-6">
            You don&apos;t have permission to access this area.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-3">
            This area is for internal team members only
          </h2>
          
          <p className="text-zinc-400 text-sm mb-4">
            The Captain&apos;s Knowledge Portal and admin features are restricted to
            LEXA team members and verified travel experts.
          </p>
          
          <div className="bg-lexa-gold/10 border border-lexa-gold/30 rounded-lg p-4">
            <p className="text-lexa-gold text-sm">
              <strong>Want to become a Captain?</strong><br />
              Contact us to learn about joining our team of luxury travel experts.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/app"
            className="block w-full px-6 py-3 bg-gradient-to-r from-lexa-navy to-lexa-gold text-white rounded-xl font-semibold text-center hover:shadow-lg transition-all"
          >
            Go to LEXA Chat
          </Link>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-semibold text-center hover:bg-white/10 transition-all"
          >
            Return to Home
          </Link>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Need help?{' '}
            <a href="mailto:support@lexa.com" className="text-lexa-gold hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

