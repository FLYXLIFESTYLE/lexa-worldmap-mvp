'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MembershipBadge } from '@/components/account/MembershipBadge';
import { UsageProgressBar } from '@/components/account/UsageProgressBar';
import { ConversationPreviewCard } from '@/components/account/ConversationPreviewCard';
import { ScriptLibraryCard } from '@/components/account/ScriptLibraryCard';
import { Crown, FileText, MessageCircle, Settings, Sparkles } from 'lucide-react';

export default function AccountDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [recentScripts, setRecentScripts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [membershipRes, usageRes, statsRes, conversationsRes, scriptsRes] = await Promise.all([
        fetch('/api/user/membership'),
        fetch('/api/user/membership/usage'),
        fetch('/api/user/stats'),
        fetch('/api/user/conversations?limit=3'),
        fetch('/api/user/scripts?limit=4')
      ]);

      if (membershipRes.ok) {
        const data = await membershipRes.json();
        setMembership(data);
      }

      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (conversationsRes.ok) {
        const data = await conversationsRes.json();
        setRecentConversations(data.conversations || []);
      }

      if (scriptsRes.ok) {
        const data = await scriptsRes.json();
        setRecentScripts(data.scripts || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading your account...</div>
      </div>
    );
  }

  const tier = membership?.tier || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-navy to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Account</h1>
            <p className="text-gray-300">Manage your LEXA experience and preferences</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/account/profile')}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Membership Card */}
        <Card className="border-lexa-gold/30 bg-gradient-to-br from-lexa-gold/10 to-lexa-gold/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-lexa-gold" />
                  Current Membership
                </CardTitle>
                <CardDescription className="mt-2">
                  {tier.description || 'Your membership tier and benefits'}
                </CardDescription>
              </div>
              <MembershipBadge 
                tierSlug={tier.slug || 'free'} 
                tierName={tier.name || 'Free'} 
                size="lg"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {usage && (
              <div className="space-y-4">
                <UsageProgressBar
                  label="Experience Scripts"
                  current={usage.usage?.scripts_created || 0}
                  limit={usage.usage?.scripts_limit || 3}
                  description="Scripts created this month"
                  onUpgrade={() => router.push('/account/membership')}
                />
                <UsageProgressBar
                  label="Conversations with LEXA"
                  current={usage.usage?.conversations_count || 0}
                  limit={usage.usage?.conversations_limit || 10}
                  description="Conversations this month"
                  onUpgrade={() => router.push('/account/membership')}
                />
              </div>
            )}
            <Button
              onClick={() => router.push('/account/membership')}
              className="w-full bg-lexa-gold hover:bg-lexa-gold/90 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade Membership
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="h-8 w-8 text-lexa-gold mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white">{stats.stats?.total_scripts || 0}</p>
                  <p className="text-sm text-gray-300 mt-1">Total Scripts</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <MessageCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white">{stats.stats?.total_conversations || 0}</p>
                  <p className="text-sm text-gray-300 mt-1">Conversations</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Crown className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white">{stats.stats?.favorite_scripts || 0}</p>
                  <p className="text-sm text-gray-300 mt-1">Favorites</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Sparkles className="h-8 w-8 text-pink-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white">{stats.stats?.shared_scripts || 0}</p>
                  <p className="text-sm text-gray-300 mt-1">Shared</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Conversations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Recent Conversations</h2>
            <Button
              variant="ghost"
              onClick={() => router.push('/account/conversations')}
              className="text-lexa-gold hover:text-lexa-gold/80"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recentConversations.length > 0 ? (
              recentConversations.map((conversation) => (
                <ConversationPreviewCard
                  key={conversation.id}
                  conversation={conversation}
                  onContinue={(id) => router.push(`/experience?session=${id}`)}
                  onView={(id) => router.push(`/account/conversations/${id}`)}
                />
              ))
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center text-gray-300">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No conversations yet. Start chatting with LEXA!</p>
                  <Button
                    onClick={() => router.push('/experience')}
                    className="mt-4 bg-lexa-gold hover:bg-lexa-gold/90"
                  >
                    Start Conversation
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Scripts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Experience Scripts</h2>
            <Button
              variant="ghost"
              onClick={() => router.push('/account/scripts')}
              className="text-lexa-gold hover:text-lexa-gold/80"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentScripts.length > 0 ? (
              recentScripts.map((script) => (
                <ScriptLibraryCard
                  key={script.id}
                  script={script}
                  onView={(id) => router.push(`/account/scripts/${id}`)}
                  onToggleFavorite={async (id, isFavorite) => {
                    await fetch(`/api/user/scripts/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_favorite: isFavorite })
                    });
                    fetchDashboardData();
                  }}
                />
              ))
            ) : (
              <Card className="bg-white/5 border-white/10 md:col-span-2">
                <CardContent className="py-12 text-center text-gray-300">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No experience scripts yet. Create your first one with LEXA!</p>
                  <Button
                    onClick={() => router.push('/experience')}
                    className="mt-4 bg-lexa-gold hover:bg-lexa-gold/90"
                  >
                    Create Script
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
