'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LuxuryBackground from '@/components/luxury-background';
import { createClient } from '@/lib/supabase/client-browser';
import { getClientAuthUser, shouldBlockUnauthenticated } from '@/lib/auth/client-auth';
import { Loader2, Check } from 'lucide-react';

export default function AccountProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [originalName, setOriginalName] = useState('');

  useEffect(() => {
    async function init() {
      const user = await getClientAuthUser(supabase);
      if (shouldBlockUnauthenticated(user)) {
        router.push('/auth/signin');
        return;
      }
      setEmail(user!.email || null);

      // Load current name from profile
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const profileData = await res.json();
          const name = profileData.profile?.full_name || user!.user_metadata?.full_name || '';
          setFullName(name);
          setOriginalName(name);
        }
      } catch {
        // Fallback
      }

      setLoading(false);
    }
    init();
  }, [router, supabase.auth]);

  const handleSaveName = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    setSaved(false);

    try {
      // Update profile
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          first_name: fullName.trim().split(' ')[0],
        }),
      });

      if (res.ok) {
        // Also update Supabase auth metadata
        await supabase.auth.updateUser({
          data: { full_name: fullName.trim() },
        });
        setOriginalName(fullName.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save name:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = fullName.trim() !== originalName;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LuxuryBackground />

      <div className="relative z-10 min-h-screen py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/account"
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              &larr; Back to Account
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-6">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Profile & Preferences
            </h1>
            <p className="text-sm text-zinc-300 mb-6">
              Manage your account details. LEXA uses your name to personalise your experience.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-zinc-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Name field */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <label className="block text-xs text-zinc-400 mb-2">Full Name</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold/30"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saving || !hasChanges || !fullName.trim()}
                      className="rounded-lg bg-lexa-gold px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : saved ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                      {saved ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  {!fullName.trim() && (
                    <p className="mt-2 text-xs text-amber-400">
                      Please set your name so LEXA can address you personally.
                    </p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-zinc-400 mb-1">Email</div>
                  <div className="text-white font-medium">{email || '\u2014'}</div>
                </div>

                {/* Sign out */}
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/auth/signin');
                    router.refresh();
                  }}
                  className="w-full rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-200 py-3 font-medium transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
