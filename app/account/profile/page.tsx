'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LuxuryBackground from '@/components/luxury-background';
import { createClient } from '@/lib/supabase/client-browser';

export default function AccountProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setEmail(user.email || null);
      setLoading(false);
    }
    init();
  }, [router, supabase.auth]);

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
              ← Back to Account
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-6">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Profile & Preferences
            </h1>
            <p className="text-sm text-zinc-300 mb-6">
              This page is a placeholder so the app doesn’t 404. We can extend it
              with real preferences next.
            </p>

            {loading ? (
              <div className="text-zinc-300">Loading…</div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-zinc-400">Signed in as</div>
                  <div className="text-white font-medium">{email || '—'}</div>
                </div>

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

