'use client';

/**
 * Set Password Page
 * First-time password setup for new captain users
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect to knowledge portal after 2 seconds
      setTimeout(() => {
        router.push('/admin/knowledge');
      }, 2000);
    } catch (err) {
      console.error('Error setting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">
            Password Set Successfully!
          </h1>
          <p className="text-zinc-600 mb-4">
            Redirecting to the Knowledge Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-white">LEXA</span>
          </h1>
          <p className="text-zinc-400">
            Captain's Knowledge Portal
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-2">
            Set Your Password
          </h2>
          <p className="text-zinc-300 mb-6">
            Welcome! Please create a secure password for your account.
          </p>

          <form onSubmit={handleSetPassword} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white font-semibold mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-zinc-400 focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                required
                minLength={8}
              />
              <p className="text-xs text-zinc-400 mt-1">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-zinc-400 focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-lexa-navy to-lexa-gold text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting Password...' : 'Set Password & Continue'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-zinc-400 text-sm">
              After setting your password, you'll be redirected to the Knowledge Portal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

