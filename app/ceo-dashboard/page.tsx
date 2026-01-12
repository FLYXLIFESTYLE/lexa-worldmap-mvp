'use client';

/**
 * CEO Dashboard - Investor Handout (single scroll page)
 * 8 sections styled like pitch-deck slides, stacked vertically.
 * Works standalone (no Supabase dependency for local testing).
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import PortalShell from '@/components/portal/portal-shell';

type PoiCountsRow = {
  destination_id: string;
  destination: string;
  kind: string;
  supabase_pois: number;
  extracted_pois: number;
  sources: { wikidata: number; osm: number; overture: number };
  neo4j_pois: number;
  neo4j_matched_destinations: string[];
};

type PoiCountsResponse =
  | { success: true; rows: PoiCountsRow[]; generated_at: string }
  | { success: false; error: string };

type EditableKey =
  | 'mission'
  | 'why'
  | 'what'
  | 'how'
  | 'problem'
  | 'solution'
  | 'future'
  | 'profiles'
  | 'market_opportunity'
  | 'financial_projection';

type EditableContent = Record<EditableKey, string>;

const STORAGE_KEY = 'lexa_ceo_dashboard_content_v1';

export default function CEODashboardPage() {
  const defaultContent: EditableContent = useMemo(
    () => ({
      mission: 'Transform luxury travel from logistics into emotional transformation.',
      why: "Humans don't remember destinations - they remember feelings. Booking sites list hotels; LEXA designs moments you will taste, smell, and feel years later.",
      what: 'Emotional-intelligence travel design: profiles + grounded POIs + cinematic scripts. Built on a knowledge graph and a captain-verified learning loop.',
      how: 'Upload & extraction -> captain verify -> Neo4j knowledge graph -> grounded retrieval -> script engine. Monetization: 3 membership tiers + 4 upsell packages.',
      problem:
        'Luxury Fatigue: UHNW travelers are tired of cookie-cutter experiences. Traditional agents cannot scale. Booking sites lack emotional intelligence. Generic AI hallucinates.',
      solution:
        "Experience-first, not logistics-first. We start with: “What do you want to feel?” Then we ground recommendations in verified POIs and generate a script worth paying for.",
      future:
        "Phase 1: themes. Phase 2: luxury assets as themes (your yacht / villa). Phase 3: individuals as themes (the ultimate gift - 'design an experience for my father’s 70th').",
      profiles:
        'LEXA builds an emotional profile through conversation signals (desires, boundaries, sensory triggers, relationship context). This profile powers script personalization and makes upsells feel inevitable and helpful.',
      market_opportunity:
        'Market sizing + why now + wedge. Replace this with your sourced numbers and assumptions.',
      financial_projection:
        '3-year projection + pricing model + assumptions. Replace placeholders with your sourced plan.',
    }),
    [],
  );

  const [editableContent, setEditableContent] = useState<EditableContent>(defaultContent);
  const [poiCountsLoading, setPoiCountsLoading] = useState(false);
  const [poiCountsError, setPoiCountsError] = useState<string | null>(null);
  const [poiCounts, setPoiCounts] = useState<PoiCountsRow[] | null>(null);
  const [poiCountsUpdatedAt, setPoiCountsUpdatedAt] = useState<string | null>(null);
  const [poiCountsAutoRefresh, setPoiCountsAutoRefresh] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<EditableContent>;
      setEditableContent((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore corrupted local storage
    }
  }, []);

  const refreshPoiCounts = async () => {
    setPoiCountsLoading(true);
    setPoiCountsError(null);
    try {
      const res = await fetch('/api/admin/poi-counts', { method: 'GET' });
      const json = (await res.json().catch(() => ({}))) as PoiCountsResponse;
      if (!res.ok || !json || (json as any).success === false) {
        const err = String((json as any)?.error || 'Failed to load POI counts');
        throw new Error(err);
      }
      const ok = json as Extract<PoiCountsResponse, { success: true }>;
      setPoiCounts(ok.rows);
      setPoiCountsUpdatedAt(ok.generated_at);
    } catch (e: any) {
      setPoiCountsError(e?.message || 'Failed to load POI counts');
      setPoiCounts(null);
    } finally {
      setPoiCountsLoading(false);
    }
  };

  const updateContent = (key: EditableKey, value: string) => {
    setEditableContent((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures (private mode, quota, etc.)
      }
      return next;
    });
  };

  const sections = useMemo(
    () => [
      { id: 'slide-1', n: '01', title: 'Mission - Why - What - How', icon: '🚀', accent: 'bg-blue-600' },
      { id: 'slide-2', n: '02', title: 'Problem - Why We Win - The Future', icon: '💡', accent: 'bg-emerald-600' },
      { id: 'slide-3', n: '03', title: 'DNA of an Experience - Emotional Profiles', icon: '🧬', accent: 'bg-purple-600' },
      { id: 'slide-4', n: '04', title: 'Architecture (Agents + Databases)', icon: '🏗️', accent: 'bg-slate-700' },
      { id: 'slide-5', n: '05', title: 'Coverage (Themes + Destinations)', icon: '🌍', accent: 'bg-cyan-600' },
      { id: 'slide-6', n: '06', title: 'Emotional Framework (Emotions + Activities)', icon: '❤️', accent: 'bg-rose-600' },
      { id: 'slide-7', n: '07', title: 'Live KPIs (Investor Snapshot)', icon: '📊', accent: 'bg-amber-600' },
      { id: 'slide-8', n: '08', title: 'Market - Financials - Sources', icon: '💰', accent: 'bg-indigo-600' },
    ],
    [],
  );

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetEdits = () => {
    setEditableContent(defaultContent);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Best-effort: only shows if you are logged in as admin.
    refreshPoiCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!poiCountsAutoRefresh) return;
    const t = setInterval(() => {
      refreshPoiCounts();
    }, 2 * 60 * 1000); // every 2 minutes (keeps CEO view "live" without spamming Neo4j)
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poiCountsAutoRefresh]);

  const poiKpis = useMemo(() => {
    if (!poiCounts?.length) return null;
    const mvp = poiCounts.filter((r) => r.kind === 'mvp_destination');
    const rows = mvp.length ? mvp : poiCounts;

    const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
    const totalSupabasePois = sum(rows.map((r) => r.supabase_pois));
    const totalDraftPois = sum(rows.map((r) => r.extracted_pois));
    const totalNeo4jPois = sum(rows.map((r) => r.neo4j_pois));
    const totalWikidata = sum(rows.map((r) => r.sources?.wikidata || 0));
    const totalOsm = sum(rows.map((r) => r.sources?.osm || 0));
    const totalOverture = sum(rows.map((r) => r.sources?.overture || 0));

    const coveredDestinations = rows.filter((r) => (r.supabase_pois || 0) > 0 || (r.extracted_pois || 0) > 0).length;
    const totalDestinations = rows.length;

    return {
      totalSupabasePois,
      totalDraftPois,
      totalNeo4jPois,
      totalWikidata,
      totalOsm,
      totalOverture,
      coveredDestinations,
      totalDestinations,
      scopeLabel: mvp.length ? 'MVP destinations' : 'all destinations',
    };
  }, [poiCounts]);

  return (
    <PortalShell
      icon="👔"
      title="CEO Dashboard"
      subtitle="Investor-ready handout - 8 slides in one scroll."
      topRight={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors text-sm font-semibold"
          >
            ← Admin
          </Link>
          <button
            onClick={resetEdits}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors text-sm font-semibold"
            type="button"
          >
            Reset edits
          </button>
        </div>
      }
      mission={[
        { label: 'DEMO FLOW', text: 'Show chat -> show script -> show this CEO page for proof + process.' },
        { label: 'PROMISE', text: 'Emotional intelligence + grounded, explainable recommendations (no hallucinations).' },
        { label: 'LOOP', text: 'Ingestion -> captain verification -> knowledge graph -> retrieval -> script engine.' },
      ]}
      quickTips={[
        'Click a section on the right to jump instantly.',
        'Text blocks marked editable can be refined live before an event (they auto-save in your browser).',
        'KPIs can be connected to live Supabase + Neo4j (admin-only).',
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Main: Slides */}
        <div className="space-y-8">
          {/* SLIDE 1 */}
          <section id="slide-1" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-blue-600 h-2" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-zinc-500">01 - Mission</div>
                    <h2 className="text-2xl font-bold text-lexa-navy mt-1">Mission - Why - What - How</h2>
                    <p className="text-sm text-zinc-600 mt-1">
                      The 30-second explanation you can say out loud to an investor.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(
                    [
                      { k: 'mission', label: 'MISSION', icon: '🎯', tint: 'bg-blue-50 border-blue-200 text-blue-900' },
                      { k: 'why', label: 'WHY', icon: '💡', tint: 'bg-amber-50 border-amber-200 text-amber-900' },
                      { k: 'what', label: 'WHAT', icon: '🤖', tint: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
                      { k: 'how', label: 'HOW', icon: '⚙️', tint: 'bg-purple-50 border-purple-200 text-purple-900' },
                    ] as const
                  ).map((item) => (
                    <div key={item.k} className={`rounded-xl border p-4 ${item.tint}`}>
                      <div className="text-xs font-bold tracking-wide">
                        {item.icon} {item.label}
                      </div>
                      <div
                        className="mt-2 text-sm leading-relaxed text-zinc-800 bg-white/70 rounded-lg p-3 border border-zinc-200"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateContent(item.k, e.currentTarget.textContent || '')}
                      >
                        {editableContent[item.k]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 2 */}
          <section id="slide-2" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-emerald-600 h-2" />
              <div className="p-6">
                <div className="text-xs font-semibold text-zinc-500">02 - Narrative</div>
                <h2 className="text-2xl font-bold text-lexa-navy mt-1">Problem - Why We Win - The Future</h2>
                <div className="mt-6 space-y-4">
                  {(
                    [
                      { k: 'problem', label: 'THE PROBLEM', badge: 'Problem', tone: 'bg-red-50 border-red-200' },
                      { k: 'solution', label: 'WHY WE WIN', badge: 'Solution', tone: 'bg-emerald-50 border-emerald-200' },
                      { k: 'future', label: 'THE FUTURE', badge: 'Moat', tone: 'bg-indigo-50 border-indigo-200' },
                    ] as const
                  ).map((item) => (
                    <div key={item.k} className={`rounded-xl border p-4 ${item.tone}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-lexa-navy">{item.label}</div>
                        <div className="text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-full px-2 py-1">
                          {item.badge}
                        </div>
                      </div>
                      <div
                        className="mt-2 text-sm leading-relaxed text-zinc-800 bg-white rounded-lg p-3 border border-zinc-200"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateContent(item.k, e.currentTarget.textContent || '')}
                      >
                        {editableContent[item.k]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 3 */}
          <section id="slide-3" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-purple-600 h-2" />
              <div className="p-6">
                <div className="text-xs font-semibold text-zinc-500">03 - Method</div>
                <h2 className="text-2xl font-bold text-lexa-navy mt-1">DNA of an Experience - Emotional Profiles</h2>
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                    <div className="text-sm font-bold text-lexa-navy">🧬 DNA of an Experience</div>
                    <div className="mt-3 space-y-3 text-sm text-zinc-700">
                      <div className="bg-white border border-zinc-200 rounded-lg p-3">
                        <div className="font-semibold text-zinc-900">📖 Story</div>
                        <div className="text-xs mt-1">Beginning (arrival) → Peak (“foodgasm”) → Resolution (transformation)</div>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-lg p-3">
                        <div className="font-semibold text-zinc-900">❤️ Emotion</div>
                        <div className="text-xs mt-1">The feeling is the destination. Blend 2-3 emotions with intensity (1-10).</div>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-lg p-3">
                        <div className="font-semibold text-zinc-900">🎯 Trigger</div>
                        <div className="text-xs mt-1">Sensory anchors (smell/taste/sound/sight/touch) that make it unforgettable.</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-500">
                      This is the script engine’s “format contract”.
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-blue-50 p-5">
                    <div className="text-sm font-bold text-lexa-navy">🧠 How LEXA builds emotional profiles</div>
                    <div
                      className="mt-3 text-sm leading-relaxed text-zinc-800 bg-white rounded-lg p-3 border border-zinc-200"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateContent('profiles', e.currentTarget.textContent || '')}
                    >
                      {editableContent.profiles}
                    </div>
                    <div className="mt-4 bg-white border border-zinc-200 rounded-lg p-3">
                      <div className="text-xs text-zinc-700">
                        <span className="font-semibold">Output:</span> profile → grounded retrieval → script → upsell offer that matches the client (not pushy).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 4 */}
          <section id="slide-4" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-slate-700 h-2" />
              <div className="p-6">
                <div className="text-xs font-semibold text-zinc-500">04 - Proof</div>
                <h2 className="text-2xl font-bold text-lexa-navy mt-1">Architecture (Agents + Databases)</h2>
                <p className="text-sm text-zinc-600 mt-1">Simple, non-technical explanation. Enough to build trust.</p>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-zinc-200 p-4">
                    <div className="text-sm font-bold text-lexa-navy">🌍 Languages</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-700">
                      {['EN', 'FR', 'ES', 'DE', 'IT', 'PT', 'RU', 'AR'].map((l) => (
                        <div key={l} className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-center">
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-zinc-200 p-4 lg:col-span-2">
                    <div className="text-sm font-bold text-lexa-navy">🤖 AI Agents</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        { name: 'AIlessia', role: 'Conversational Artist (scripts + tone)' },
                        { name: 'AIbert', role: 'Analytical Psychologist (desire signals)' },
                        { name: 'Intelligence Extractor', role: 'Docs -> structured knowledge' },
                        { name: 'Multipass Enrichment', role: 'Validation + dedupe' },
                        { name: 'Brain v2 Retrieval', role: 'Neo4j first + drafts fallback' },
                        { name: 'Scraping Agent', role: 'URLs -> clean text -> extraction' },
                        { name: 'Market Intelligence', role: 'Strategic Q&A (founders)' },
                        { name: 'Company Brain', role: 'ChatGPT history -> company DNA' },
                      ].map((a) => (
                        <div key={a.name} className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                          <div className="text-sm font-semibold text-zinc-900">{a.name}</div>
                          <div className="text-xs text-zinc-600 mt-0.5">{a.role}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-white rounded-xl border border-zinc-200 p-4">
                  <div className="text-sm font-bold text-lexa-navy">💾 Data layer</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="font-semibold text-blue-900">Supabase (Postgres)</div>
                      <div className="text-xs text-zinc-700 mt-1">Users, chat, scripts, uploads, audit trails.</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="font-semibold text-emerald-900">Vector (pgvector)</div>
                      <div className="text-xs text-zinc-700 mt-1">Narrative similarity + semantic search (hybrid retrieval).</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="font-semibold text-purple-900">Neo4j (Graph)</div>
                      <div className="text-xs text-zinc-700 mt-1">POIs + relationships + themes + grounded retrieval.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 5 */}
          <section id="slide-5" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-cyan-600 h-2" />
              <div className="p-6">
                <div className="text-xs font-semibold text-zinc-500">05 - Coverage</div>
                <h2 className="text-2xl font-bold text-lexa-navy mt-1">Coverage (Themes + Destinations)</h2>
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-sm font-bold text-lexa-navy">🎨 14 Theme Categories</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {[
                        'Romance & Intimacy',
                        'Adventure & Exploration',
                        'Wellness & Transformation',
                        'Culinary Excellence',
                        'Cultural Immersion',
                        'Pure Luxury & Indulgence',
                        'Nature & Wildlife',
                        'Water Sports & Marine',
                        'Art & Architecture',
                        'Family Luxury',
                        'Celebration & Milestones',
                        'Solitude & Reflection',
                        'Nightlife & Entertainment',
                        'Sports & Active',
                      ].map((t) => (
                        <div key={t} className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white border border-zinc-200 rounded-xl p-4">
                      <div className="text-sm font-bold text-lexa-navy">🗺️ MVP Destinations (demo set)</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
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
                          'Arabian Gulf',
                          'Adriatic (North)',
                          'Adriatic (Central)',
                          'Adriatic (South)',
                          'Ionian Sea',
                        ].map((d) => (
                          <div key={d} className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-cyan-900">⛵ Yacht-flagged POIs</div>
                        <div className="text-xs font-semibold bg-white border border-cyan-200 rounded-full px-2 py-1 text-cyan-900">
                          demo
                        </div>
                      </div>
                      <div className="mt-2 text-3xl font-bold text-cyan-900">350+</div>
                      <div className="text-xs text-zinc-700 mt-1">Ports & marinas with high confidence.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 6 */}
          <section id="slide-6" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-rose-600 h-2" />
              <div className="p-6">
                <div className="text-xs font-semibold text-zinc-500">06 - Framework</div>
                <h2 className="text-2xl font-bold text-lexa-navy mt-1">Emotional Framework (Emotions + Activities)</h2>
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <div className="text-sm font-bold text-rose-900">9 Core Emotions</div>
                    <div className="mt-3 space-y-2 text-sm">
                      {['Exclusivity', 'Prestige', 'Discovery', 'Indulgence', 'Romance', 'Adventure', 'Legacy', 'Freedom', 'Transformation'].map((e) => (
                        <div key={e} className="bg-white border border-rose-200 rounded-lg px-3 py-2 text-rose-900">
                          {e}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-zinc-700">Each POI can be mapped with intensity + evidence.</div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-sm font-bold text-blue-900">Activity Types</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {[
                        'Fine Dining',
                        'Spa & Wellness',
                        'Cultural Tours',
                        'Water Sports',
                        'Beach & Leisure',
                        'Nightlife',
                        'Adventure',
                        'Art & Museums',
                        'Shopping',
                        'Nature & Wildlife',
                        'Golf & Tennis',
                        'Yacht Charters',
                      ].map((a) => (
                        <div key={a} className="bg-white border border-blue-200 rounded-lg px-2 py-2 text-blue-900 text-center">
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="text-sm font-bold text-purple-900">Relationship Types (examples)</div>
                    <div className="mt-3 space-y-2 text-xs font-mono">
                      {['LOCATED_IN', 'HAS_THEME', 'SUPPORTS_ACTIVITY', 'EVOKES', 'PERFECT_FOR'].map((r) => (
                        <div key={r} className="bg-white border border-purple-200 rounded-lg px-3 py-2 text-purple-900">
                          {r}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-zinc-700">
                      These relationships make retrieval explainable (why this fits).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 7 */}
          <section id="slide-7" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-amber-600 h-2" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-zinc-500">07 - Snapshot</div>
                    <h2 className="text-2xl font-bold text-lexa-navy mt-1">Live KPIs (Investor Snapshot)</h2>
                    <p className="text-sm text-zinc-600 mt-1">
                      Live counts from Supabase + Neo4j (admin-only).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      refreshPoiCounts();
                    }}
                    className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors text-sm"
                  >
                    {poiCountsLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={poiCountsAutoRefresh}
                      onChange={(e) => setPoiCountsAutoRefresh(e.target.checked)}
                    />
                    Auto-refresh (every 2 minutes)
                  </label>
                  <div className="text-xs text-zinc-500">{poiKpis ? `Scope: ${poiKpis.scopeLabel}` : ''}</div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Supabase POIs',
                      value: poiKpis ? poiKpis.totalSupabasePois.toLocaleString() : '—',
                      note: 'Canonical entities (experience graph)',
                      tone: 'bg-blue-50 border-blue-200 text-blue-900',
                    },
                    {
                      label: 'Draft POIs',
                      value: poiKpis ? poiKpis.totalDraftPois.toLocaleString() : '—',
                      note: 'Captain review list (extracted_pois)',
                      tone: 'bg-purple-50 border-purple-200 text-purple-900',
                    },
                    {
                      label: 'Neo4j POIs',
                      value: poiKpis ? poiKpis.totalNeo4jPois.toLocaleString() : '—',
                      note: 'Graph POIs',
                      tone: 'bg-emerald-50 border-emerald-200 text-emerald-900',
                    },
                    {
                      label: 'Coverage',
                      value: poiKpis ? `${poiKpis.coveredDestinations}/${poiKpis.totalDestinations}` : '—',
                      note: 'Destinations with any POIs',
                      tone: 'bg-amber-50 border-amber-200 text-amber-900',
                    },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-xl border p-4 ${k.tone}`}>
                      <div className="text-xs font-semibold">{k.label}</div>
                      <div className="text-3xl font-bold mt-2">{k.value}</div>
                      <div className="text-xs text-zinc-700 mt-1">{k.note}</div>
                    </div>
                  ))}
                </div>

                {!!poiKpis && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Wikidata sources', v: poiKpis.totalWikidata },
                      { label: 'OSM sources', v: poiKpis.totalOsm },
                      { label: 'Overture sources', v: poiKpis.totalOverture },
                    ].map((x) => (
                      <div key={x.label} className="bg-white border border-zinc-200 rounded-xl p-3">
                        <div className="text-xs font-semibold text-zinc-600">{x.label}</div>
                        <div className="text-xl font-bold text-zinc-900 mt-1 tabular-nums">{x.v.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-lexa-navy">📍 POIs by destination (Supabase + Neo4j)</div>
                      <div className="text-xs text-zinc-600 mt-1">
                        Shows counts per destination. Supabase counts include canonical entities + draft POIs; Neo4j counts are graph POIs.
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {poiCountsUpdatedAt ? `Updated: ${new Date(poiCountsUpdatedAt).toLocaleString()}` : ''}
                    </div>
                  </div>

                  {poiCountsError && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      Live counts are admin-only. Sign in as admin to see them. ({poiCountsError})
                    </div>
                  )}

                  {!poiCountsError && !poiCounts && (
                    <div className="mt-3 text-sm text-zinc-600">Loading…</div>
                  )}

                  {!!poiCounts?.length && (
                    <div className="mt-4 overflow-auto">
                      <table className="min-w-[900px] w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-zinc-600">
                            <th className="py-2 pr-4">Destination</th>
                            <th className="py-2 pr-4">Supabase POIs</th>
                            <th className="py-2 pr-4">Draft POIs</th>
                            <th className="py-2 pr-4">Wikidata</th>
                            <th className="py-2 pr-4">OSM</th>
                            <th className="py-2 pr-4">Overture</th>
                            <th className="py-2 pr-4">Neo4j POIs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poiCounts.map((r) => (
                            <tr key={r.destination_id} className="border-t border-zinc-200">
                              <td className="py-2 pr-4">
                                <div className="font-semibold text-zinc-900">{r.destination}</div>
                                <div className="text-xs text-zinc-500">{r.kind}</div>
                                {r.neo4j_matched_destinations?.length ? (
                                  <div className="text-[11px] text-zinc-500">
                                    Neo4j matched: {r.neo4j_matched_destinations.slice(0, 2).join(', ')}
                                    {r.neo4j_matched_destinations.length > 2 ? '…' : ''}
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-2 pr-4 tabular-nums">{r.supabase_pois}</td>
                              <td className="py-2 pr-4 tabular-nums">{r.extracted_pois}</td>
                              <td className="py-2 pr-4 tabular-nums">{r.sources.wikidata}</td>
                              <td className="py-2 pr-4 tabular-nums">{r.sources.osm}</td>
                              <td className="py-2 pr-4 tabular-nums">{r.sources.overture}</td>
                              <td className="py-2 pr-4 tabular-nums">{r.neo4j_pois}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { tier: 'The Spark (Free)', users: '890', note: 'lead gen' },
                    { tier: 'Inspiration', users: '45', note: '€297/mo billed yearly' },
                    { tier: 'Prestige', users: '12', note: '€997/mo billed yearly' },
                  ].map((t) => (
                    <div key={t.tier} className="bg-white border border-zinc-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-lexa-navy">{t.tier}</div>
                      <div className="text-3xl font-bold text-zinc-900 mt-2">{t.users}</div>
                      <div className="text-xs text-zinc-600 mt-1">{t.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 8 */}
          <section id="slide-8" className="scroll-mt-28">
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
              <div className="bg-indigo-600 h-2" />
              <div className="p-6">
                <div className="text-xs font-semibold text-zinc-500">08 - Business</div>
                <h2 className="text-2xl font-bold text-lexa-navy mt-1">Market - Financials - Sources</h2>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="text-sm font-bold text-emerald-900">📈 Market opportunity</div>
                      <div
                        className="mt-2 text-sm leading-relaxed text-zinc-800 bg-white rounded-lg p-3 border border-zinc-200"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateContent('market_opportunity', e.currentTarget.textContent || '')}
                      >
                        {editableContent.market_opportunity}
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="text-sm font-bold text-amber-900">💵 Financial projection</div>
                      <div
                        className="mt-2 text-sm leading-relaxed text-zinc-800 bg-white rounded-lg p-3 border border-zinc-200"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateContent('financial_projection', e.currentTarget.textContent || '')}
                      >
                        {editableContent.financial_projection}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-sm font-bold text-lexa-navy">🔎 Sources (add your citations)</div>
                    <div className="mt-3 space-y-2 text-xs text-zinc-700">
                      {[
                        'Luxury travel market size: [source]',
                        'UHNW population: [source]',
                        'Pricing benchmarks (concierge / agencies): [source]',
                        'Competitive landscape: [source]',
                      ].map((s) => (
                        <div key={s} className="bg-zinc-50 border border-zinc-200 rounded-lg p-2">
                          {s}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                      <div className="text-xs text-indigo-900 font-semibold">One-line investor close</div>
                      <div className="text-sm text-zinc-800 mt-1">
                        We make luxury travel feel personal again - and we can prove it with grounded data.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Table of Contents */}
        <aside className="lg:sticky lg:top-24">
          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
            <div className="bg-lexa-navy h-2" />
            <div className="p-4">
              <div className="text-sm font-bold text-lexa-navy">Sections</div>
              <div className="mt-3 space-y-2">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => jumpTo(s.id)}
                    className="w-full text-left bg-zinc-50 hover:bg-lexa-cream border border-zinc-200 rounded-lg px-3 py-2 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 text-xs font-bold text-zinc-500 mt-0.5">{s.n}</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-lexa-navy">
                          {s.icon} {s.title}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 text-xs text-zinc-500">
                Tip: this page is designed for “scroll + jump” while talking.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
