/**
 * Sign Up Page
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { lexaAPI, saveToLocalStorage } from '@/lib/api/lexa-client';
import LuxuryBackground from '@/components/luxury-background';

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      // Validate name fields
      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your first and last name');
        setLoading(false);
        return;
      }

      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      // 2. Create LEXA account in backend with full name
      const lexaAccount = await lexaAPI.createAccount({
        email,
        name: `${firstName.trim()} ${lastName.trim()}`,
      });

      console.log('✅ LEXA account created:', {
        account_id: lexaAccount.account_id,
        session_id: lexaAccount.session_id,
        offline: (lexaAccount as any).offline || false
      });

      setSuccess(true);
      
      // Auto sign in and redirect to experience builder
      setTimeout(() => {
        router.push('/experience');
        router.refresh();
      }, 1500);
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (error.message?.includes('invalid email')) {
        setError('Please enter a valid email address.');
      } else if (error.message?.includes('password')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(error.message || 'An error occurred during sign up');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <LuxuryBackground />
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
          <h2 className="mb-2 text-3xl font-bold text-white">Begin Your Journey</h2>
          <p className="text-zinc-400">Create your personal experience account</p>
        </div>

        {/* Why Account Explanation */}
        <div className="mb-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lexa-gold" />
            Why do I need an account?
          </h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-lexa-gold mt-0.5">•</span>
              <span><strong>Highly individualized conversations:</strong> LEXA learns your unique emotional profile to design experiences that truly resonate with you.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lexa-gold mt-0.5">•</span>
              <span><strong>No mixed archetypes:</strong> For brokers and agents, keeping client profiles separate ensures each person gets recommendations tailored to *their* desires—not someone else's.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lexa-gold mt-0.5">•</span>
              <span><strong>Work with your clients:</strong> Brokers, travel advisors, and luxury agents can <Link href="/affiliate-signup" className="text-lexa-gold underline hover:text-yellow-400 transition-colors">sign up as affiliates</Link> to collaborate with clients in their accounts for a consistent emotional profile and preferences.</span>
            </li>
          </ul>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-zinc-200/50">
          <form onSubmit={handleSignUp} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-zinc-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 transition-all"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-zinc-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 transition-all"
                  placeholder="Doe"
                />
              </div>
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

