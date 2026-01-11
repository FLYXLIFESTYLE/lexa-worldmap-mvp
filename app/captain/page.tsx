'use client';

/**
 * Captain's Knowledge Portal - Main Dashboard
 * Core pages: Upload & Manual Entry, Browse & Verify, Upload History, Scraped URLs
 */

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';

interface Captain {
  name: string;
}

type FeatureCard = {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
  badge?: 'Primary' | 'New' | 'Disabled';
  disabled?: boolean;
};

export default function CaptainPortalPage() {
  const router = useRouter();
  const [captain, setCaptain] = useState<Captain | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Prefer the captain's display_name (e.g. "Christian") over email prefix (e.g. "chh")
      let displayName = '';
      try {
        const { data: profile } = await supabase
          .from('captain_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        displayName = (profile?.display_name || '').trim();
      } catch {}

      setCaptain({
        name: displayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Captain',
      });
      
      setLoading(false);
    }

    checkAuth();
  }, [router, supabase.auth]);

  const features: FeatureCard[] = [
    {
      icon: '📤',
      title: 'Upload & Manual Entry',
      description: 'Upload documents (PDF, Word, Excel, images, text) or manually enter POI data',
      href: '/captain/upload',
      color: 'from-blue-500 to-blue-600',
      badge: 'Primary',
    },
    {
      icon: '🔍',
      title: 'Browse, Verify & Enhance',
      description: 'Review POIs, verify data quality, enhance descriptions, and manage confidence scores',
      href: '/captain/browse',
      color: 'from-purple-500 to-purple-600',
      badge: 'Primary',
    },
    {
      icon: '🧠',
      title: 'Knowledge Nuggets (Inbox)',
      description: 'Unstructured snippets from uploads/URLs (events, openings, brand signals). Enrich and convert to POIs when needed.',
      href: '/captain/nuggets',
      color: 'from-fuchsia-500 to-fuchsia-600',
      badge: 'New',
    },
    {
      icon: '📈',
      title: 'Market Insights',
      description: 'Strategic intelligence: Ask questions, get cruise recommendations, analyze demand patterns',
      href: '/captain/market-insights',
      color: 'from-emerald-500 to-emerald-600',
      badge: 'New',
    },
    {
      icon: '📊',
      title: 'Upload History',
      description: 'View your upload history, track extraction stats, and manage your documents',
      href: '/captain/history',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: '🌐',
      title: 'Scraped URLs',
      description: 'View all scraped URLs from the system (visible to all captains)',
      href: '/captain/urls',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: '🔔',
      title: 'Keyword Monitor',
      description: 'Currently disabled (will return later)',
      href: '/captain/keywords',
      color: 'from-orange-500 to-orange-600',
      badge: 'Disabled',
      disabled: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lexa-gold mb-4"></div>
          <p className="text-gray-600">Loading Captain Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-lexa-cream">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-lexa-navy to-blue-900 text-white px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">⚓</span>
                <div>
                  <h1 className="text-4xl font-bold mb-1">
                    Captain's Knowledge Portal
                  </h1>
                  <p className="text-xl opacity-90">
                    Welcome, {captain?.name}!
                  </p>
                </div>
              </div>
              
              {/* Why - What - How */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-2 max-w-3xl">
                <div className="text-sm">
                  <strong className="text-lexa-gold">YOUR MISSION:</strong>{' '}
                  <span className="opacity-90">
                    Upload data, verify quality, enhance POIs, and monitor industry news
                  </span>
                </div>
                <div className="text-sm">
                  <strong className="text-lexa-gold">DATA FORMATS:</strong>{' '}
                  <span className="opacity-90">
                    PDF, Word, Excel, .txt, images (.png, .jpg, .jpeg), or paste directly
                  </span>
                </div>
                <div className="text-sm">
                  <strong className="text-lexa-gold">CONFIDENCE SCORE:</strong>{' '}
                  <span className="opacity-90">
                    New uploads default to 80% (max). Only Captain approval can increase beyond 80%
                  </span>
                </div>
              </div>
            </div>
            <AdminNav />
          </div>

        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Captain Tools</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <button
              key={feature.title}
              onClick={() => {
                if (feature.disabled) return;
                router.push(feature.href);
              }}
              className={`relative bg-white rounded-xl shadow-sm transition-all overflow-hidden text-left group ${
                feature.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'
              }`}
            >
              {/* Gradient Top Bar */}
              <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{feature.icon}</span>
                  {feature.badge && (
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      feature.badge === 'Primary' 
                        ? 'bg-blue-100 text-blue-700' 
                        : feature.badge === 'Disabled'
                        ? 'bg-zinc-200 text-zinc-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {feature.badge}
                    </span>
                  )}
                </div>
                
                <h3 className={`text-lg font-semibold text-gray-900 mb-2 transition-colors ${
                  feature.disabled ? '' : 'group-hover:text-blue-600'
                }`}>
                  {feature.title}
                </h3>
                
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {!feature.disabled && (
                  <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
                    <span>Open</span>
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Quick Tips</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Upload History</strong> shows only YOUR uploads - keep track of your contributions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Scraped URLs</strong> are visible to ALL captains - collaborative knowledge base</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Confidence Score</strong> defaults to 80% for new data. Only approved captains can increase it</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
