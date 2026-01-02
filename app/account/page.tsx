'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LuxuryBackground from '@/components/luxury-background';
import { MembershipBadge } from '@/components/account/MembershipBadge';
import { UsageProgressBar } from '@/components/account/UsageProgressBar';
import { ConversationPreviewCard } from '@/components/account/ConversationPreviewCard';
import { ScriptLibraryCard } from '@/components/account/ScriptLibraryCard';
import { Crown, FileText, MessageCircle, Settings, Sparkles, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

export default function AccountDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [recentScripts, setRecentScripts] = useState<any[]>([]);
  
  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    membership: true,
    stats: true,
    conversations: true,
    scripts: true
  });
  
  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LuxuryBackground />
        <div className="relative z-10 text-white">Loading your account...</div>
      </div>
    );
  }

  const tier = membership?.tier || {};

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LuxuryBackground />
      
      <div className="relative z-10 min-h-screen py-8 px-4">
        {/* Header with LEXA Logo */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Home</span>
            </Link>
            <button
              onClick={() => router.push('/account/profile')}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-lexa-gold/30 transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Edit Profile & Preferences
            </button>
          </div>
          
          {/* LEXA Branding */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <h1 className="text-6xl sm:text-7xl font-bold tracking-tighter">
                <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent animate-gradient">
                  LEXA
                </span>
              </h1>
              <span className="absolute top-0 -right-10 inline-block px-2 py-0.5 rounded-full bg-lexa-gold text-zinc-900 text-xs font-bold tracking-wider shadow-lg shadow-lexa-gold/50 transform rotate-12">
                BETA
              </span>
            </div>
            <div className="mx-auto w-24 h-1 bg-gradient-to-r from-transparent via-lexa-gold to-transparent mb-4" />
            <p className="text-sm text-lexa-gold font-semibold uppercase tracking-widest mb-2">
              Your Account Dashboard
            </p>
            <p className="text-zinc-300">Manage your luxury travel experiences</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-8">

        {/* Membership Card */}
        <div className="rounded-2xl border border-lexa-gold/30 bg-black/20 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => toggleSection('membership')}
            className="w-full px-6 py-4 border-b border-lexa-gold/20 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-lexa-gold" />
              <h3 className="text-xl font-semibold text-white">Current Membership</h3>
            </div>
            {sectionsOpen.membership ? (
              <ChevronUp className="h-5 w-5 text-lexa-gold" />
            ) : (
              <ChevronDown className="h-5 w-5 text-lexa-gold" />
            )}
          </button>
          
          {sectionsOpen.membership && (
            <>
              <div className="px-6 py-4 border-b border-lexa-gold/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-300">
                      {tier.description || 'Your membership tier and benefits'}
                    </p>
                  </div>
                  <MembershipBadge 
                    tierSlug={tier.slug || 'free'} 
                    tierName={tier.name || 'Free'} 
                    size="lg"
                  />
                </div>
              </div>
              
              <div className="p-6 space-y-4 bg-gradient-to-br from-lexa-gold/5 to-transparent">
            {usage && (
              <div className="space-y-4 p-4 rounded-xl bg-black/10 backdrop-blur-sm">
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
            <button
              onClick={() => router.push('/account/membership')}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 hover:from-yellow-400 hover:to-lexa-gold text-zinc-900 font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade Membership
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
          <button
            onClick={() => toggleSection('stats')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-lexa-gold" />
              Your Statistics
            </h3>
            {sectionsOpen.stats ? (
              <ChevronUp className="h-5 w-5 text-lexa-gold" />
            ) : (
              <ChevronDown className="h-5 w-5 text-lexa-gold" />
            )}
          </button>
          
          {sectionsOpen.stats && stats && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6 hover:border-lexa-gold/30 transition-all">
              <div className="text-center">
                <FileText className="h-8 w-8 text-lexa-gold mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats.stats?.total_scripts || 0}</p>
                <p className="text-sm text-zinc-300 mt-1">Total Scripts</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6 hover:border-blue-400/30 transition-all">
              <div className="text-center">
                <MessageCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats.stats?.total_conversations || 0}</p>
                <p className="text-sm text-zinc-300 mt-1">Conversations</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6 hover:border-purple-400/30 transition-all">
              <div className="text-center">
                <Crown className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats.stats?.favorite_scripts || 0}</p>
                <p className="text-sm text-zinc-300 mt-1">Favorites</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6 hover:border-pink-400/30 transition-all">
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-pink-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats.stats?.shared_scripts || 0}</p>
                <p className="text-sm text-zinc-300 mt-1">Shared</p>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
          <button
            onClick={() => toggleSection('conversations')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-400" />
              Recent Conversations
            </h2>
            <div className="flex items-center gap-3">
              {sectionsOpen.conversations && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/account/conversations');
                  }}
                  className="text-lexa-gold hover:text-lexa-gold/80 transition-colors text-sm font-medium"
                >
                  View All →
                </button>
              )}
              {sectionsOpen.conversations ? (
                <ChevronUp className="h-5 w-5 text-lexa-gold" />
              ) : (
                <ChevronDown className="h-5 w-5 text-lexa-gold" />
              )}
            </div>
          </button>
          
          {sectionsOpen.conversations && (
            <div className="p-6">
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
              <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl py-12 text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-zinc-400" />
                <p className="text-zinc-300 mb-4">No conversations yet. Start chatting with LEXA!</p>
                <button
                  onClick={() => router.push('/app')}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-lexa-gold to-yellow-600 hover:from-yellow-400 hover:to-lexa-gold text-zinc-900 font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50 inline-flex items-center gap-2"
                >
                  Start New Conversation with LEXA
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Scripts */}
        <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
          <button
            onClick={() => toggleSection('scripts')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-lexa-gold" />
              Experience Scripts
            </h2>
            <div className="flex items-center gap-3">
              {sectionsOpen.scripts && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/account/scripts');
                  }}
                  className="text-lexa-gold hover:text-lexa-gold/80 transition-colors text-sm font-medium"
                >
                  View All →
                </button>
              )}
              {sectionsOpen.scripts ? (
                <ChevronUp className="h-5 w-5 text-lexa-gold" />
              ) : (
                <ChevronDown className="h-5 w-5 text-lexa-gold" />
              )}
            </div>
          </button>
          
          {sectionsOpen.scripts && (
            <div className="p-6">
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
              <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl py-12 text-center md:col-span-2">
                <FileText className="h-12 w-12 mx-auto mb-3 text-zinc-400" />
                <p className="text-zinc-300 mb-4">No experience scripts yet. Create your first one with LEXA!</p>
                <button
                  onClick={() => router.push('/app')}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-lexa-gold to-yellow-600 hover:from-yellow-400 hover:to-lexa-gold text-zinc-900 font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50 inline-flex items-center gap-2"
                >
                  Start New Conversation with LEXA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
