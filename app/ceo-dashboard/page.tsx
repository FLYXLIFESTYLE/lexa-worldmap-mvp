'use client';

/**
 * CEO Dashboard - Pitch Deck Style
 * 8 slides: Mission, Problem/Solution, DNA, Agents, Coverage, Emotions, KPIs, Financials
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';

export default function CEODashboardPage() {
  const supabase = createClient();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [kpiData, setKpiData] = useState<any>(null);

  // Editable content state
  const [editableContent, setEditableContent] = useState({
    mission: "Transform luxury travel from logistics into emotional transformation",
    why: "Humans don't remember destinations—they remember feelings. Every booking site shows hotels. We design moments you'll taste, smell, and feel years later.",
    what: "AI that uses emotional intelligence (not just keywords) to design personalized €3k-€100k+ experiences. Powered by 340k+ luxury POIs, 8 specialized AI agents, and a knowledge graph competitors can't replicate.",
    how: "3-tier subscription (€0-€12k/year) + 4 upsell packages (€497-€8k/day). AIlessia + AIbert design scripts. Grounded in real, verified POIs—no hallucinations.",
    problem: "Luxury Fatigue: UHNW travelers are tired of cookie-cutter experiences. Traditional travel agents can't scale. Booking sites lack emotional intelligence. Generic AI hallucinates.",
    solution: "Experience-First, Not Logistics: We start with 'What do you want to feel?' not 'Where do you want to go?' Emotional profiling → Grounded POIs → Cinematic scripts worth €3k-€100k+.",
    future: "Phase 1: 14 emotional themes. Phase 2: Luxury assets AS themes (your yacht, your villa). Phase 3: Individuals AS themes (ultimate gift: 'Design an experience for my father's 70th'). No competitor can follow us here.",
    dna_story: "Every experience needs a narrative arc: Beginning (arrival, transition), Peak (the 'foodgasm' moment), Resolution (transformation, not souvenir).",
    dna_emotion: "The feeling IS the destination. 9 core emotions with intensity scoring (1-10). Most powerful experiences blend 2-3 emotions.",
    dna_trigger: "Sensory anchors create lasting memories. 5 senses: Smell (most powerful), taste, sound, sight, touch. Like a meal you can taste years later.",
    profiles: "AIlessia listens to every conversation, extracting emotional keywords, detecting preferences, mapping to 9 emotions with intensities. By message 10, we know their archetype with 85%+ confidence. This profile feeds script design, making upsells inevitable.",
    market_opportunity: "€47B luxury travel market. 12M UHNW individuals globally. Current penetration: <0.01%. Target: 10,000 clients by Year 3 = €50M ARR.",
    financial_projection: "Year 1: €500k ARR (140 Inspired + 40 Connoisseur). Year 2: €5M ARR (1,000 Inspired + 200 Connoisseur + upsells). Year 3: €50M ARR (scale + SYCC cruises + White Glove). Gross margin: 47%. Break-even: Month 18."
  });

  const updateContent = (key: string, value: string) => {
    setEditableContent(prev => ({ ...prev, [key]: value }));
    // TODO: Auto-save to localStorage or database
  };

  const slides = [
    { title: "Mission & Vision", icon: "🚀" },
    { title: "Problem & Solution", icon: "💡" },
    { title: "Experience DNA", icon: "🧬" },
    { title: "LEXA Architecture", icon: "🏗️" },
    { title: "Coverage & Scale", icon: "🌍" },
    { title: "Emotional Intelligence", icon: "❤️" },
    { title: "Live KPIs", icon: "📊" },
    { title: "Market & Financials", icon: "💰" }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Top Nav */}
      <div className="fixed top-6 right-6 z-50">
        <AdminNav />
      </div>

      {/* Slide Counter */}
      <div className="fixed top-6 left-6 z-50 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
        <div className="text-sm font-medium">
          Slide {currentSlide + 1} of {slides.length}
        </div>
      </div>

      {/* Slide Navigation Dots */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex gap-2">
        {slides.map((slide, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === currentSlide ? 'bg-yellow-400 w-8' : 'bg-white/30 hover:bg-white/50'
            }`}
            title={slide.title}
          />
        ))}
      </div>

      {/* Arrow Navigation */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className="fixed left-6 top-1/2 transform -translate-y-1/2 z-50 bg-white/10 backdrop-blur-md rounded-full p-4 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ←
      </button>
      <button
        onClick={nextSlide}
        disabled={currentSlide === slides.length - 1}
        className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 bg-white/10 backdrop-blur-md rounded-full p-4 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        →
      </button>

      {/* Slides Container */}
      <div className="w-full h-screen overflow-hidden">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {/* SLIDE 1: MISSION & VISION */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full">
              <h1 className="text-6xl font-bold mb-4 text-center bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                LEXA
              </h1>
              <p className="text-2xl text-center mb-16 text-gray-300">
                Emotional Intelligence for Luxury Travel
              </p>

              <div className="grid grid-cols-2 gap-6">
                {/* Mission */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-300/50 transition-all">
                  <div className="text-yellow-300 text-sm font-bold mb-3">🎯 MISSION</div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateContent('mission', e.currentTarget.textContent || '')}
                    className="text-lg leading-relaxed outline-none focus:ring-2 focus:ring-yellow-300 rounded p-2"
                  >
                    {editableContent.mission}
                  </div>
                </div>

                {/* Why */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-300/50 transition-all">
                  <div className="text-yellow-300 text-sm font-bold mb-3">💡 WHY</div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateContent('why', e.currentTarget.textContent || '')}
                    className="text-lg leading-relaxed outline-none focus:ring-2 focus:ring-yellow-300 rounded p-2"
                  >
                    {editableContent.why}
                  </div>
                </div>

                {/* What */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-300/50 transition-all">
                  <div className="text-yellow-300 text-sm font-bold mb-3">🤖 WHAT</div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateContent('what', e.currentTarget.textContent || '')}
                    className="text-lg leading-relaxed outline-none focus:ring-2 focus:ring-yellow-300 rounded p-2"
                  >
                    {editableContent.what}
                  </div>
                </div>

                {/* How */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-300/50 transition-all">
                  <div className="text-yellow-300 text-sm font-bold mb-3">⚙️ HOW</div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateContent('how', e.currentTarget.textContent || '')}
                    className="text-lg leading-relaxed outline-none focus:ring-2 focus:ring-yellow-300 rounded p-2"
                  >
                    {editableContent.how}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 2: PROBLEM & SOLUTION */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full space-y-8">
              <h2 className="text-5xl font-bold text-center mb-12 text-yellow-300">
                Why Now? Why Us?
              </h2>

              {/* The Problem */}
              <div className="bg-red-900/30 backdrop-blur-lg rounded-2xl p-10 border-2 border-red-500/50">
                <div className="text-red-300 text-xl font-bold mb-4">😩 THE PROBLEM: Luxury Fatigue</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateContent('problem', e.currentTarget.textContent || '')}
                  className="text-2xl leading-relaxed outline-none focus:ring-2 focus:ring-red-300 rounded p-3"
                >
                  {editableContent.problem}
                </div>
              </div>

              {/* Why We Win */}
              <div className="bg-green-900/30 backdrop-blur-lg rounded-2xl p-10 border-2 border-green-500/50">
                <div className="text-green-300 text-xl font-bold mb-4">🏆 WHY WE WIN: Experience-First</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateContent('solution', e.currentTarget.textContent || '')}
                  className="text-2xl leading-relaxed outline-none focus:ring-2 focus:ring-green-300 rounded p-3"
                >
                  {editableContent.solution}
                </div>
              </div>

              {/* The Future */}
              <div className="bg-purple-900/30 backdrop-blur-lg rounded-2xl p-10 border-2 border-purple-500/50">
                <div className="text-purple-300 text-xl font-bold mb-4">🔮 THE FUTURE: Impossible to Replicate</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateContent('future', e.currentTarget.textContent || '')}
                  className="text-2xl leading-relaxed outline-none focus:ring-2 focus:ring-purple-300 rounded p-3"
                >
                  {editableContent.future}
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 3: EXPERIENCE DNA */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full">
              <h2 className="text-5xl font-bold text-center mb-12 text-yellow-300">
                🧬 The LEXA Secret Sauce
              </h2>

              <div className="grid grid-cols-2 gap-8">
                {/* DNA of Experience */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-10 border border-white/20">
                  <div className="text-yellow-300 text-2xl font-bold mb-6">DNA of an Experience</div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateContent('dna_combined', e.currentTarget.innerHTML || '')}
                    className="space-y-4 outline-none focus:ring-2 focus:ring-yellow-300 rounded p-3"
                  >
                    <div>
                      <div className="font-bold text-amber-300 mb-2">📖 STORY</div>
                      <div className="text-sm text-gray-300">Beginning (arrival) → Peak (foodgasm moment) → Resolution (transformation)</div>
                    </div>
                    <div>
                      <div className="font-bold text-rose-300 mb-2">❤️ EMOTION</div>
                      <div className="text-sm text-gray-300">The feeling IS the destination. 9 emotions with intensities. Blend 2-3 for power.</div>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-300 mb-2">🎯 TRIGGER</div>
                      <div className="text-sm text-gray-300">Sensory anchor: smell (lavender), taste (truffle pasta), sound (waves), sight (sunset), touch (marble)</div>
                    </div>
                  </div>
                </div>

                {/* How LEXA Builds Profiles */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-10 border border-white/20">
                  <div className="text-yellow-300 text-2xl font-bold mb-6">How LEXA Builds Emotional Profiles</div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateContent('profiles', e.currentTarget.textContent || '')}
                    className="text-base leading-relaxed outline-none focus:ring-2 focus:ring-yellow-300 rounded p-3"
                  >
                    {editableContent.profiles}
                  </div>
                  <div className="mt-6 p-4 bg-purple-500/20 rounded-lg border border-purple-400">
                    <div className="text-sm text-purple-200">
                      <span className="font-bold">Result:</span> Personalized scripts that feel "made for me" → 90% script acceptance rate → Inevitable upsells
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 4: ARCHITECTURE */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full">
              <h2 className="text-5xl font-bold text-center mb-12 text-yellow-300">
                🏗️ LEXA Architecture
              </h2>

              <div className="grid grid-cols-3 gap-6">
                {/* 8 Languages */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="text-yellow-300 font-bold text-lg mb-4">🌍 8 Languages</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {['English 🇬🇧', 'French 🇫🇷', 'Spanish 🇪🇸', 'German 🇩🇪', 'Italian 🇮🇹', 'Portuguese 🇵🇹', 'Russian 🇷🇺', 'Arabic 🇦🇪'].map((lang, i) => (
                      <div key={i} className="bg-white/5 rounded px-2 py-1 text-center text-xs">
                        {lang}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 8 AI Agents */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 col-span-2">
                  <div className="text-yellow-300 font-bold text-lg mb-4">🤖 8 AI Agents</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { name: 'AIlessia', role: 'Conversational Artist' },
                      { name: 'AIbert', role: 'Analytical Psychologist' },
                      { name: 'Intelligence Extractor', role: 'Data Archaeologist' },
                      { name: 'Multipass Enrichment', role: 'Validator' },
                      { name: 'Brain v2 Retrieval', role: 'Librarian (No Hallucinations)' },
                      { name: 'Scraping Agent', role: 'Web Crawler' },
                      { name: 'Market Intelligence', role: 'Strategic Advisor' },
                      { name: 'Company Brain', role: 'Knowledge Archaeologist' },
                    ].map((agent, i) => (
                      <div key={i} className="bg-white/5 rounded p-2">
                        <div className="font-semibold text-white">{agent.name}</div>
                        <div className="text-gray-400">{agent.role}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Database Landscape */}
                <div className="col-span-3 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="text-yellow-300 font-bold text-lg mb-4">💾 3-Layer Database</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400">
                      <div className="font-bold mb-2">PostgreSQL (Supabase)</div>
                      <div className="text-xs text-gray-300">Users, conversations, profiles, memberships, scripts, uploads, extracted POIs</div>
                    </div>
                    <div className="bg-green-500/20 rounded-lg p-4 border border-green-400">
                      <div className="font-bold mb-2">Vector (pgvector)</div>
                      <div className="text-xs text-gray-300">Conversation embeddings, semantic search, narrative similarity</div>
                    </div>
                    <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-400">
                      <div className="font-bold mb-2">Graph (Neo4j)</div>
                      <div className="text-xs text-gray-300">340k+ luxury POIs, emotional relationships, theme connections, verified knowledge</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 5: COVERAGE & SCALE */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full">
              <h2 className="text-5xl font-bold text-center mb-12 text-yellow-300">
                🌍 Coverage & Scale
              </h2>

              <div className="grid grid-cols-2 gap-8">
                {/* 14 Themes */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="text-yellow-300 font-bold text-xl mb-4">🎨 14 Theme Categories</div>
                  <div className="space-y-1 text-sm max-h-96 overflow-y-auto pr-2">
                    {[
                      { name: 'Romance & Intimacy', hook: 'Fall in love all over again' },
                      { name: 'Adventure & Exploration', hook: 'You want a story' },
                      { name: 'Wellness & Transformation', hook: 'Return as your next chapter' },
                      { name: 'Culinary Excellence', hook: 'Travel through taste' },
                      { name: 'Cultural Immersion', hook: 'Deeper connection' },
                      { name: 'Pure Luxury & Indulgence', hook: 'Permission to want' },
                      { name: 'Nature & Wildlife', hook: 'Close to the unreachable' },
                      { name: 'Water Sports & Marine', hook: 'Live at sea' },
                      { name: 'Art & Architecture', hook: 'Beautiful ideas' },
                      { name: 'Family Luxury', hook: 'Everyone remembers' },
                      { name: 'Celebration & Milestones', hook: 'Mark the moment' },
                      { name: 'Solitude & Reflection', hook: 'Hear yourself' },
                      { name: 'Nightlife & Entertainment', hook: 'Evening begins' },
                      { name: 'Sports & Active', hook: 'Luxury is powerful' },
                    ].map((theme, i) => (
                      <div key={i} className="bg-white/5 rounded p-2 hover:bg-white/10 transition-colors">
                        <div className="font-semibold">{i + 1}. {theme.name}</div>
                        <div className="text-xs text-gray-400 italic">{theme.hook}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 14 Destinations + Yacht POIs */}
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <div className="text-yellow-300 font-bold text-xl mb-4">🗺️ 14 Destinations (MVP)</div>
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
                        'Arabian Gulf',
                        'Adriatic (North)',
                        'Adriatic (Central)',
                        'Adriatic (South)',
                        'Ionian Sea',
                      ].map((dest, i) => (
                        <div key={i} className="bg-white/5 rounded px-3 py-2">
                          {i + 1}. {dest}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-6 border border-cyan-400">
                    <div className="text-cyan-300 font-bold text-xl mb-2">⛵ Yacht-Flagged POIs</div>
                    <div className="text-4xl font-bold text-cyan-200 mb-2">350+</div>
                    <div className="text-sm text-gray-300">
                      Luxury yacht ports and marinas with high confidence scores
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 6: EMOTIONAL INTELLIGENCE */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full">
              <h2 className="text-5xl font-bold text-center mb-12 text-yellow-300">
                ❤️ Emotional Intelligence
              </h2>

              <div className="grid grid-cols-3 gap-6">
                {/* 9 Core Emotions */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="text-rose-300 font-bold text-xl mb-4">9 Core Emotions</div>
                  <div className="space-y-2 text-sm">
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
                      <div key={i} className="bg-rose-500/20 rounded px-3 py-2 border border-rose-400/30">
                        {emotion}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-gray-400">
                    Each POI scored 1-10 with evidence
                  </div>
                </div>

                {/* Activity Types */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="text-blue-300 font-bold text-xl mb-4">Activity Types</div>
                  <div className="space-y-2 text-sm">
                    {[
                      'Fine Dining',
                      'Spa & Wellness',
                      'Cultural Tours',
                      'Water Sports',
                      'Beach & Leisure',
                      'Nightlife',
                      'Adventure Activities',
                      'Art & Museums',
                      'Shopping',
                      'Nature & Wildlife',
                      'Golf & Tennis',
                      'Yacht Charters',
                    ].map((activity, i) => (
                      <div key={i} className="bg-blue-500/20 rounded px-3 py-2 border border-blue-400/30 text-xs">
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relationship Types */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="text-purple-300 font-bold text-xl mb-4">8 Relationship Types</div>
                  <div className="space-y-2 text-sm font-mono">
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
                      <div key={i} className="bg-purple-500/20 rounded px-3 py-2 border border-purple-400/30 text-xs">
                        {rel}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-gray-400">
                    Connects POIs, emotions, themes, destinations
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 7: LIVE KPIs */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full">
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-5xl font-bold text-yellow-300">
                  📊 Live KPIs
                </h2>
                <button
                  onClick={() => {/* TODO: Refresh KPIs */}}
                  className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-bold hover:bg-yellow-300"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500/30 to-blue-600/30 backdrop-blur-lg rounded-xl p-6 border border-blue-400">
                  <div className="text-blue-200 text-sm mb-1">Total POIs</div>
                  <div className="text-5xl font-bold text-white">340k+</div>
                  <div className="text-xs text-gray-300 mt-1">All databases</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/30 to-purple-600/30 backdrop-blur-lg rounded-xl p-6 border border-purple-400">
                  <div className="text-purple-200 text-sm mb-1">Luxury Scored</div>
                  <div className="text-5xl font-bold text-white">85k+</div>
                  <div className="text-xs text-gray-300 mt-1">Score &gt; 6.0</div>
                </div>

                <div className="bg-gradient-to-br from-green-500/30 to-green-600/30 backdrop-blur-lg rounded-xl p-6 border border-green-400">
                  <div className="text-green-200 text-sm mb-1">Total Chats</div>
                  <div className="text-5xl font-bold text-white">1.2k+</div>
                  <div className="text-xs text-gray-300 mt-1">All time</div>
                </div>

                <div className="bg-gradient-to-br from-amber-500/30 to-amber-600/30 backdrop-blur-lg rounded-xl p-6 border border-amber-400">
                  <div className="text-amber-200 text-sm mb-1">ARR</div>
                  <div className="text-5xl font-bold text-white">€{((45 * 3564) + (12 * 11964)).toLocaleString()}</div>
                  <div className="text-xs text-gray-300 mt-1">Annual Recurring</div>
                </div>
              </div>

              {/* Users by Tier */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="text-gray-300 text-sm mb-2">The Spark (Free)</div>
                  <div className="text-4xl font-bold text-white mb-1">890</div>
                  <div className="text-xs text-gray-400">€0/year</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/30 to-blue-600/30 backdrop-blur-lg rounded-xl p-6 border border-blue-400">
                  <div className="text-blue-200 text-sm mb-2">The Inspired</div>
                  <div className="text-4xl font-bold text-white mb-1">45</div>
                  <div className="text-xs text-blue-200">€3,564/year × 45 = <span className="font-bold">€160k ARR</span></div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/30 to-purple-600/30 backdrop-blur-lg rounded-xl p-6 border border-purple-400">
                  <div className="text-purple-200 text-sm mb-2">The Connoisseur</div>
                  <div className="text-4xl font-bold text-white mb-1">12</div>
                  <div className="text-xs text-purple-200">€11,964/year × 12 = <span className="font-bold">€144k ARR</span></div>
                </div>
              </div>

              <div className="mt-6 text-xs text-center text-gray-400">
                KPIs refresh on-demand or via nightly cron job
              </div>
            </div>
          </div>

          {/* SLIDE 8: MARKET & FINANCIALS */}
          <div className="min-w-full h-full flex flex-col items-center justify-center p-16">
            <div className="max-w-6xl w-full space-y-8">
              <h2 className="text-5xl font-bold text-center mb-12 text-yellow-300">
                💰 Market & Financials
              </h2>

              {/* Market Opportunity */}
              <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 backdrop-blur-lg rounded-2xl p-10 border-2 border-green-500/50">
                <div className="text-green-300 text-2xl font-bold mb-4">📈 Market Opportunity</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateContent('market_opportunity', e.currentTarget.textContent || '')}
                  className="text-xl leading-relaxed outline-none focus:ring-2 focus:ring-green-300 rounded p-3"
                >
                  {editableContent.market_opportunity}
                </div>
              </div>

              {/* Financial Projections */}
              <div className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 backdrop-blur-lg rounded-2xl p-10 border-2 border-amber-500/50">
                <div className="text-amber-300 text-2xl font-bold mb-4">💵 Financial Projections</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateContent('financial_projection', e.currentTarget.textContent || '')}
                  className="text-xl leading-relaxed outline-none focus:ring-2 focus:ring-amber-300 rounded p-3"
                >
                  {editableContent.financial_projection}
                </div>
              </div>

              {/* The Ask */}
              <div className="bg-gradient-to-r from-pink-900/40 to-purple-900/40 backdrop-blur-lg rounded-2xl p-10 border-2 border-pink-500/50 text-center">
                <div className="text-4xl font-bold mb-4">
                  The luxury travel market is €47B. We're taking 0.1% in Year 3.
                </div>
                <div className="text-3xl font-bold text-yellow-300">
                  Fund us before someone else does.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Navigation Hint */}
      <div className="fixed bottom-20 right-6 text-sm text-white/50">
        Use ← → arrows or click dots
      </div>
    </PortalShell>
  );
}
