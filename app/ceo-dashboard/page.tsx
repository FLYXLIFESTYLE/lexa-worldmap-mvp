'use client';

/**
 * CEO Dashboard - Strategic Overview for Chris, Paul, Bakary
 * High-level view of LEXA: Mission, Architecture, KPIs, and Definitions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import PortalShell from '@/components/portal/portal-shell';

export default function CEODashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Refresh KPIs (on-demand or could be cron)
  const refreshKPIs = async () => {
    setLoading(true);
    try {
      // TODO: Call API to get live KPI data
      // For now, using placeholder
      setKpiData({
        pois_total: 340000,
        pois_luxury_scored: 85000,
        chats_total: 1247,
        users_by_tier: {
          spark: 890,
          inspired: 45,
          connoisseur: 12
        },
        arr: 3564 * 45 + 11964 * 12,
        upsell_revenue: 47500
      });
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshKPIs();
  }, []);

  return (
    <PortalShell
      icon="👔"
      title="CEO Dashboard"
      subtitle="Strategic overview of LEXA - Mission, Architecture, KPIs"
      backLink={{ href: '/admin/dashboard', label: 'Back to Admin' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'PURPOSE', text: 'High-level strategic view for Chris, Paul, and Bakary.' },
        { label: 'WHAT YOU SEE', text: 'Elevator pitch, architecture, definitions, and live KPIs.' },
        { label: 'FOR INVESTORS', text: 'This page tells the LEXA story in one view.' },
      ]}
      quickTips={[
        'Use this page for investor presentations and strategic reviews.',
        'KPIs update on-demand (click Refresh) or can be automated nightly.',
        'Elevator pitch section is designed to create FOMO in investors.',
      ]}
    >
      {/* SECTION 1: ELEVATOR PITCH */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl shadow-2xl p-10 mb-8 text-white">
        <h2 className="text-4xl font-bold mb-8 text-center">🚀 The LEXA Elevator Pitch</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Mission */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-3 text-yellow-300">🎯 Mission</h3>
            <p className="text-lg leading-relaxed">
              Transform luxury travel from logistics into <span className="font-bold text-yellow-300">emotional transformation</span>. 
              We design €3k-€100k+ experiences that clients remember for life, not just Instagram.
            </p>
          </div>

          {/* Why */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-3 text-yellow-300">💡 Why LEXA Exists</h3>
            <p className="text-lg leading-relaxed">
              Humans don't remember destinations—they remember <span className="font-bold text-yellow-300">feelings</span>. 
              Every booking site shows hotels. We design moments you'll taste, smell, and feel years later.
            </p>
          </div>

          {/* What */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-3 text-yellow-300">🤖 What We Built</h3>
            <p className="text-lg leading-relaxed">
              AI that uses <span className="font-bold text-yellow-300">emotional intelligence</span> (not just keywords) to design personalized 
              experience scripts. Powered by 340k+ luxury POIs, 8 specialized AI agents, and a knowledge graph 
              competitors can't replicate.
            </p>
          </div>

          {/* How */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-3 text-yellow-300">⚙️ How It Works</h3>
            <p className="text-lg leading-relaxed">
              3-tier subscription (€0-€12k/year) + 4 upsell packages (€497-€8k/day). 
              AIlessia (conversational artist) + AIbert (analytical psychologist) design scripts. 
              Grounded in real, verified POIs—<span className="font-bold text-yellow-300">no hallucinations</span>.
            </p>
          </div>
        </div>

        {/* Differentiation */}
        <div className="bg-yellow-400/20 backdrop-blur-sm rounded-lg p-8 mb-8 border-2 border-yellow-300">
          <h3 className="text-3xl font-bold mb-6 text-center">🥊 Why We Win</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-xl mb-2 text-yellow-300">vs. Google Maps</h4>
              <p className="text-sm opacity-90">
                <span className="text-red-300">They show:</span> "4.8★ Restaurant"<br/>
                <span className="text-green-300">We show:</span> "Evokes Discovery (9/10) + Prestige (8/10), perfect for Cultural Connoisseur archetype"
              </p>
            </div>

            <div>
              <h4 className="font-bold text-xl mb-2 text-yellow-300">vs. Generic ChatGPT/Claude</h4>
              <p className="text-sm opacity-90">
                <span className="text-red-300">They:</span> Hallucinate venues, generic suggestions<br/>
                <span className="text-green-300">We:</span> Grounded in 340k verified POIs, emotional profiling, zero hallucinations
              </p>
            </div>

            <div>
              <h4 className="font-bold text-xl mb-2 text-yellow-300">vs. Travel Agents/Brokers</h4>
              <p className="text-sm opacity-90">
                <span className="text-red-300">They:</span> Can't scale, limited by personal experience<br/>
                <span className="text-green-300">We:</span> AI scales infinitely, learns from every conversation, €12k/year ARR per client
              </p>
            </div>
          </div>
        </div>

        {/* Future Potential */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 border-2 border-white/30">
          <h3 className="text-3xl font-bold mb-4 text-center">🔮 The Future (This Is Where Investors FOMO)</h3>
          <p className="text-xl leading-relaxed text-center mb-6">
            Today: 14 emotional themes. Tomorrow: <span className="font-bold text-yellow-300">Luxury assets AS themes.</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/20 rounded p-4">
              <div className="font-bold mb-2">🛥️ Asset Themes</div>
              <div className="opacity-90">"Design my experience around this specific yacht/villa/jet"</div>
            </div>
            <div className="bg-white/20 rounded p-4">
              <div className="font-bold mb-2">👤 Individual Themes</div>
              <div className="opacity-90">"Design an experience for my father's 70th birthday" (ultimate gift service)</div>
            </div>
            <div className="bg-white/20 rounded p-4">
              <div className="font-bold mb-2">💰 Market Expansion</div>
              <div className="opacity-90">Corporate retreats, wellness programs, multi-modal journeys (yacht→jet→train)</div>
            </div>
          </div>
          <p className="text-center mt-6 text-xl font-bold text-yellow-300">
            No competitor can follow us here. We're building the luxury experience OS.
          </p>
        </div>
      </div>

      {/* SECTION 2: ARCHITECTURE & DEFINITIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* LEXA Architecture */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🏗️ LEXA Architecture</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-purple-900 mb-2">🤖 8 AI Agents</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-start p-2 bg-purple-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">AIlessia</span>
                    <div className="text-gray-600 text-xs">Conversational artist, script composer</div>
                  </div>
                </div>
                <div className="flex justify-between items-start p-2 bg-blue-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">AIbert</span>
                    <div className="text-gray-600 text-xs">Analytical psychologist, desire anticipation</div>
                  </div>
                </div>
                <div className="flex justify-between items-start p-2 bg-green-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">Intelligence Extractor</span>
                    <div className="text-gray-600 text-xs">Documents → investor-quality insights</div>
                  </div>
                </div>
                <div className="flex justify-between items-start p-2 bg-yellow-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">Multipass Enrichment</span>
                    <div className="text-gray-600 text-xs">4-pass validation for complex docs</div>
                  </div>
                </div>
                <div className="flex justify-between items-start p-2 bg-indigo-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">Brain v2 Retrieval</span>
                    <div className="text-gray-600 text-xs">Grounded POI context (no hallucinations)</div>
                  </div>
                </div>
                <div className="flex justify-between items-start p-2 bg-pink-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">Scraping Agent</span>
                    <div className="text-gray-600 text-xs">URLs → clean text → extraction</div>
                  </div>
                </div>
                <div className="flex justify-between items-start p-2 bg-emerald-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">Market Intelligence</span>
                    <div className="text-gray-600 text-xs">Strategic insights, cruise recommendations</div>
                  </div>
                </div>
                <div className="flex justify-between items-start p-2 bg-purple-50 rounded">
                  <div className="flex-1">
                    <span className="font-semibold">Company Brain</span>
                    <div className="text-gray-600 text-xs">Mines 5 years of ChatGPT for company DNA</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-bold text-blue-900 mb-2">💾 Database Landscape</h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-blue-50 rounded">
                  <div className="font-semibold mb-1">PostgreSQL (Supabase)</div>
                  <div className="text-gray-600 text-xs">
                    User accounts, conversations, emotional profiles, memberships, scripts, uploads, scraped URLs, extracted POIs (drafts)
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="font-semibold mb-1">Vector Database (pgvector)</div>
                  <div className="text-gray-600 text-xs">
                    Conversation embeddings, semantic search, narrative similarity
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded">
                  <div className="font-semibold mb-1">Graph Database (Neo4j)</div>
                  <div className="text-gray-600 text-xs">
                    340k+ luxury POIs, emotional relationships, theme connections, destination hierarchies, verified knowledge (approved POIs)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Experience DNA */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🧬 DNA of an Experience</h2>
          <p className="text-gray-600 mb-6 text-sm">
            LEXA's proprietary methodology - what makes experiences unforgettable
          </p>

          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
              <h3 className="font-bold text-amber-900 mb-2">📖 1. STORY</h3>
              <p className="text-sm text-gray-700">
                Every experience needs a narrative arc: <span className="font-semibold">Beginning</span> (arrival, transition), 
                <span className="font-semibold"> Peak</span> (the "foodgasm" moment), 
                <span className="font-semibold"> Resolution</span> (transformation, not souvenir).
              </p>
              <p className="text-xs text-gray-600 mt-2 italic">
                Examples: "Reconnection after distance," "Celebrating freedom," "The adventure that changed everything"
              </p>
            </div>

            <div className="bg-rose-50 rounded-lg p-4 border-l-4 border-rose-500">
              <h3 className="font-bold text-rose-900 mb-2">❤️ 2. EMOTION</h3>
              <p className="text-sm text-gray-700">
                The <span className="font-semibold">feeling IS the destination</span>. Core emotions: Freedom, Connection, Awe, Peace, Thrill, Belonging.
                Most powerful experiences blend 2-3 emotions.
              </p>
              <p className="text-xs text-gray-600 mt-2 italic">
                Examples: "Thrilling freedom," "Peaceful awe," "Intimate adventure"
              </p>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-500">
              <h3 className="font-bold text-emerald-900 mb-2">🎯 3. TRIGGER</h3>
              <p className="text-sm text-gray-700">
                The <span className="font-semibold">sensory anchor</span> that brings it all back. 
                Five senses as memory triggers: smell (most powerful), taste, sound, sight, touch.
              </p>
              <p className="text-xs text-gray-600 mt-2 italic">
                Examples: Lavender in Provence, that truffle pasta, ocean waves, golden hour view, cool marble
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-300">
            <p className="text-sm text-purple-900 font-semibold text-center">
              💎 This is our competitive moat—no booking site or generic AI can design with this depth.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: DEFINITIONS & LISTS */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">📚 Core Definitions & Lists</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 14 Theme Categories */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">🎨 14 Theme Categories</h3>
            <div className="space-y-2 text-sm max-h-96 overflow-y-auto pr-2">
              {[
                { name: 'Romance & Intimacy', hook: 'Fall in love with each other all over again' },
                { name: 'Adventure & Exploration', hook: 'For when comfort isn\'t enough – you want a story' },
                { name: 'Wellness & Transformation', hook: 'Leave as yourself. Return as your next chapter' },
                { name: 'Culinary Excellence', hook: 'Travel through taste, one unforgettable course at a time' },
                { name: 'Cultural Immersion', hook: 'Not just another destination – a deeper connection' },
                { name: 'Pure Luxury & Indulgence', hook: 'Give yourself permission to want exactly what you want' },
                { name: 'Nature & Wildlife', hook: 'Get close to the world that usually stays out of reach' },
                { name: 'Water Sports & Marine', hook: 'Live your days at sea, not just look at the water' },
                { name: 'Art & Architecture', hook: 'Walk inside the world\'s most beautiful ideas' },
                { name: 'Family Luxury', hook: 'Time together that everyone will remember' },
                { name: 'Celebration & Milestones', hook: 'Mark the moment so it never blurs' },
                { name: 'Solitude & Reflection', hook: 'Finally, the space to hear yourself again' },
                { name: 'Nightlife & Entertainment', hook: 'When the sun sets, your evening begins' },
                { name: 'Sports & Active', hook: 'Luxury isn\'t passive – it\'s powerful' },
              ].map((theme, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded border-l-4 border-purple-500">
                  <div className="font-semibold text-gray-900">{i + 1}. {theme.name}</div>
                  <div className="text-xs text-gray-600 italic">{theme.hook}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 12 Destinations (MVP) */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">🗺️ 12 Destinations (MVP)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                'French Riviera',
                'Amalfi Coast',
                'Balearics',
                'Cyclades',
                'BVI',
                'USVI',
                'Bahamas',
                'Dutch Antilles',
                'French Antilles',
                'Arabian Gulf (UAE)',
                'Adriatic (North/Central/South)',
                'Ionian Sea',
              ].map((dest, i) => (
                <div key={i} className="p-2 bg-blue-50 rounded text-gray-900">
                  {i + 1}. {dest}
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-4">🌍 8 Languages</h3>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {[
                'English 🇬🇧',
                'French 🇫🇷',
                'Spanish 🇪🇸',
                'German 🇩🇪',
                'Italian 🇮🇹',
                'Portuguese 🇵🇹',
                'Russian 🇷🇺',
                'Arabic 🇦🇪',
              ].map((lang, i) => (
                <div key={i} className="p-2 bg-green-50 rounded text-gray-900 text-center text-xs">
                  {lang}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-300">
              <h3 className="font-bold text-yellow-900 mb-2">🎯 Scoring Systems</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold">Luxury Score (0-10):</span>
                  <div className="text-gray-700">Based on: Google rating × 2, price level ($$$$), Michelin stars, luxury keywords, review count</div>
                </div>
                <div>
                  <span className="font-semibold">Confidence Score (0-100%):</span>
                  <div className="text-gray-700">Uploads default 80%. Captain verification required for &gt;80%. Approved POIs: 95%+</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emotions & Activities */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎭 Emotions & Activities</h2>
          
          <div className="mb-6">
            <h3 className="font-bold text-rose-900 mb-3">9 Core Emotions</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                'Exclusivity',
                'Prestige',
                'Discovery',
                'Indulgence',
                'Romance',
                'Adventure',
                'Legacy',
                'Freedom',
                'Transformation',
              ].map((emotion, i) => (
                <div key={i} className="p-2 bg-rose-50 rounded text-gray-900 text-center font-medium">
                  {emotion}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2 italic">
              Each POI mapped with intensity scores (1-10) and evidence
            </p>
          </div>

          <div>
            <h3 className="font-bold text-blue-900 mb-3">Neo4j Relationship Types</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                'LOCATED_IN',
                'HAS_THEME',
                'SUPPORTS_ACTIVITY',
                'EVOKES',
                'PERFECT_FOR',
                'INCLUDES_PORT',
                'EXEMPLIFIES',
                'SOLVES',
              ].map((rel, i) => (
                <div key={i} className="p-2 bg-blue-50 rounded text-gray-900 font-mono">
                  {rel}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2 italic">
              8 unique relationship types connecting POIs, emotions, themes, destinations
            </p>
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded">
            <h3 className="font-bold text-purple-900 mb-2 text-sm">Activities in Database</h3>
            <div className="text-2xl font-bold text-purple-600">TBD</div>
            <p className="text-xs text-gray-600">Will populate from live Neo4j query</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: LIVE KPIs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">📊 Live KPIs</h2>
          <button
            onClick={refreshKPIs}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
          >
            {loading ? '⏳ Refreshing...' : '🔄 Refresh KPIs'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* POI Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="text-sm text-blue-900 font-semibold mb-1">Total POIs</div>
            <div className="text-4xl font-bold text-blue-600">
              {kpiData?.pois_total?.toLocaleString() || '—'}
            </div>
            <div className="text-xs text-gray-600 mt-1">Across all databases</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <div className="text-sm text-purple-900 font-semibold mb-1">Luxury Scored</div>
            <div className="text-4xl font-bold text-purple-600">
              {kpiData?.pois_luxury_scored?.toLocaleString() || '—'}
            </div>
            <div className="text-xs text-gray-600 mt-1">Score &gt; 6.0 in Neo4j</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="text-sm text-green-900 font-semibold mb-1">Total Chats</div>
            <div className="text-4xl font-bold text-green-600">
              {kpiData?.chats_total?.toLocaleString() || '—'}
            </div>
            <div className="text-xs text-gray-600 mt-1">With LEXA (all time)</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border border-amber-200">
            <div className="text-sm text-amber-900 font-semibold mb-1">ARR</div>
            <div className="text-4xl font-bold text-amber-600">
              €{kpiData?.arr?.toLocaleString() || '—'}
            </div>
            <div className="text-xs text-gray-600 mt-1">Annual Recurring Revenue</div>
          </div>
        </div>

        {/* Users by Tier */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">👥 Users by Tier</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
              <div className="text-sm text-gray-600">The Spark (Free)</div>
              <div className="text-3xl font-bold text-gray-900">{kpiData?.users_by_tier?.spark || '—'}</div>
              <div className="text-xs text-gray-500 mt-1">€0/year</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="text-sm text-blue-900">The Inspired</div>
              <div className="text-3xl font-bold text-blue-600">{kpiData?.users_by_tier?.inspired || '—'}</div>
              <div className="text-xs text-gray-500 mt-1">€3,564/year × {kpiData?.users_by_tier?.inspired || 0} = €{((kpiData?.users_by_tier?.inspired || 0) * 3564).toLocaleString()}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <div className="text-sm text-purple-900">The Connoisseur</div>
              <div className="text-3xl font-bold text-purple-600">{kpiData?.users_by_tier?.connoisseur || '—'}</div>
              <div className="text-xs text-gray-500 mt-1">€11,964/year × {kpiData?.users_by_tier?.connoisseur || 0} = €{((kpiData?.users_by_tier?.connoisseur || 0) * 11964).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Placeholder for additional KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-900">Upsell Revenue</div>
            <div className="text-2xl font-bold text-green-600">€{kpiData?.upsell_revenue?.toLocaleString() || '—'}</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="text-sm text-indigo-900">Yacht POIs</div>
            <div className="text-2xl font-bold text-indigo-600">TBD</div>
          </div>
          <div className="bg-pink-50 rounded-lg p-4">
            <div className="text-sm text-pink-900">Scripts Created</div>
            <div className="text-2xl font-bold text-pink-600">TBD</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-4">
            <div className="text-sm text-teal-900">Graph Edges</div>
            <div className="text-2xl font-bold text-teal-600">TBD</div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500 text-center">
          KPIs refresh on-demand (click button above) or can be automated with nightly cron job
        </div>
      </div>

      {/* Coming Soon: Live Database Connections */}
      <div className="bg-yellow-50 rounded-xl border-2 border-yellow-300 p-6 text-center">
        <p className="text-yellow-900 font-semibold">
          🚧 Live KPI connections being implemented - will query Supabase + Neo4j directly for real-time data
        </p>
      </div>
    </PortalShell>
  );
}
