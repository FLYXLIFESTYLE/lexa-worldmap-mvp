/**
 * Debug Page - Check Captain Profile Status
 * Admin tool to verify captain_profiles entry
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import LuxuryBackground from '@/components/luxury-background';
import Link from 'next/link';

export default function DebugProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkProfile() {
      const supabase = createClient();

      try {
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!currentUser) {
          setError('Not signed in');
          setLoading(false);
          return;
        }

        setUser(currentUser);

        // Get captain profile
        const { data: profileData, error: profileError } = await supabase
          .from('captain_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          setError('Error fetching profile: ' + profileError.message);
        } else {
          setProfile(profileData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/signin?redirectTo=/admin/dashboard';
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative">
      <LuxuryBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-lexa-gold mb-2">
            🔍 Captain Profile Debug
          </h1>
          <p className="text-zinc-400">
            Check your authentication and captain profile status
          </p>
        </div>

        {loading ? (
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lexa-gold mb-4"></div>
            <p className="text-zinc-400">Checking profile...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-lexa-gold mb-4">
                {user ? '✅ User Authentication' : '❌ Not Signed In'}
              </h2>
              
              {user ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-zinc-400">User ID:</div>
                    <div className="text-white break-all">{user.id}</div>
                    
                    <div className="text-zinc-400">Email:</div>
                    <div className="text-white">{user.email}</div>
                    
                    <div className="text-zinc-400">Email Confirmed:</div>
                    <div className={user.email_confirmed_at ? 'text-green-400' : 'text-red-400'}>
                      {user.email_confirmed_at ? 'Yes' : 'No'}
                    </div>
                    
                    <div className="text-zinc-400">Created:</div>
                    <div className="text-white">{new Date(user.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-zinc-400 mb-4">You are not signed in</p>
                  <Link
                    href="/auth/signin?redirectTo=/admin/debug-profile"
                    className="inline-block px-6 py-3 bg-lexa-gold text-zinc-900 rounded-xl font-semibold hover:bg-yellow-600 transition-all"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>

            {/* Captain Profile */}
            {user && (
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-lexa-gold mb-4">
                  {profile ? '✅ Captain Profile Found' : '❌ No Captain Profile'}
                </h2>
                
                {profile ? (
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm font-mono">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-zinc-400">Display Name:</div>
                        <div className="text-white">{profile.display_name}</div>
                        
                        <div className="text-zinc-400">Role:</div>
                        <div className={`font-bold ${profile.role === 'admin' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {profile.role}
                        </div>
                        
                        <div className="text-zinc-400">Commission Rate:</div>
                        <div className="text-white">{profile.commission_rate}%</div>
                        
                        <div className="text-zinc-400">Created:</div>
                        <div className="text-white">{new Date(profile.created_at).toLocaleString()}</div>
                      </div>
                    </div>

                    {profile.role === 'admin' ? (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
                        <p className="text-green-400 font-semibold">
                          ✅ You have admin access! You should be able to access all admin pages.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
                        <p className="text-yellow-400 font-semibold">
                          ⚠️ Your role is "{profile.role}" - you need "admin" role for full access.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400 font-semibold mb-2">
                        ❌ No captain_profiles entry found
                      </p>
                      <p className="text-sm text-zinc-400">
                        Run this SQL in Supabase to create your admin profile:
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                      <pre className="text-green-400">{`INSERT INTO captain_profiles (
  user_id,
  display_name,
  role,
  commission_rate
)
VALUES (
  '${user.id}'::uuid,
  'Admin',
  'admin',
  0.00
)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';`}</pre>
                    </div>

                    <p className="text-sm text-zinc-400">
                      After running this SQL, click "Sign Out & Refresh" below.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-red-400 mb-2">
                  ⚠️ Error
                </h2>
                <p className="text-sm text-zinc-300 font-mono">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              {user && (
                <button
                  onClick={handleSignOut}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
                >
                  Sign Out & Refresh
                </button>
              )}

              {profile && profile.role === 'admin' && (
                <Link
                  href="/admin/dashboard"
                  className="px-6 py-3 bg-lexa-gold text-zinc-900 rounded-xl font-semibold hover:bg-yellow-600 transition-all"
                >
                  Go to Admin Dashboard
                </Link>
              )}

              <Link
                href="/"
                className="px-6 py-3 bg-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-600 transition-all"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

