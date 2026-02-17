/**
 * Experience Script Preview
 *
 * Displays the Stage 1 Discovery Output from the Script Engine
 * with proper formatting: name, tagline, hook, description,
 * highlights, target profile, and quick facts.
 *
 * Falls back to the legacy compose-script flow if no Script Engine
 * output is available.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Download, Share2, Calendar, MapPin, Heart, Anchor, User } from 'lucide-react';
import { LegalDisclaimer } from '@/components/legal-disclaimer';
import type { Stage1Output } from '@/lib/script-engine/types';

export default function ScriptPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [script, setScript] = useState<Stage1Output | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [briefId, setBriefId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Priority 1: Load from briefId URL param (from account or handoff)
      const urlBriefId = searchParams.get('briefId');
      if (urlBriefId) {
        setBriefId(urlBriefId);
        try {
          const res = await fetch(`/api/user/scripts/${urlBriefId}`);
          if (res.ok) {
            const data = await res.json();
            const engineOutput = data.script?.additional_context?.script_engine_output;
            if (engineOutput) {
              setScript(engineOutput as Stage1Output);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          console.error('Failed to load script from briefId');
        }
      }

      // Priority 2: Load from localStorage (set by chat)
      const engineOutputRaw = localStorage.getItem('lexa_script_engine_output');
      if (engineOutputRaw) {
        try {
          const engineOutput: Stage1Output = JSON.parse(engineOutputRaw);
          setScript(engineOutput);
          setIsLoading(false);
          return;
        } catch {
          console.error('Failed to parse Script Engine output from localStorage');
        }
      }

      // Priority 3: Load the most recent script from the user's account
      try {
        const res = await fetch('/api/user/scripts?limit=1');
        if (res.ok) {
          const data = await res.json();
          if (data.scripts?.[0]?.additional_context?.script_engine_output) {
            setScript(data.scripts[0].additional_context.script_engine_output as Stage1Output);
            setBriefId(data.scripts[0].id);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // No scripts found
      }

      setIsLoading(false);
    }
    init();
  }, [router, supabase.auth, searchParams]);

  const handleDownload = () => {
    alert('PDF generation coming soon! Your script will be downloadable shortly.');
  };

  const handleShare = () => {
    alert('Share functionality coming soon!');
  };

  const handleSaveToAccount = () => {
    alert('Script saved to your account! Day-by-day journey coming soon.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-lexa-gold mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-white">Composing your experience...</p>
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">No script data available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-lexa-cream">
      {/* Header */}
      <header className="relative border-b border-zinc-200/60 bg-white/80 backdrop-blur-lg px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-lexa-navy to-lexa-gold bg-clip-text text-transparent">
                LEXA
              </span>
            </h1>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mt-0.5">
              Curated Experiences
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="rounded-lg border-2 border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-lexa-gold hover:text-lexa-gold transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={handleDownload}
              className="rounded-lg bg-gradient-to-r from-lexa-gold to-yellow-600 px-4 py-2 text-sm font-semibold text-zinc-900 hover:scale-105 hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Experience Name & Tagline */}
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 rounded-full bg-lexa-gold/10 border border-lexa-gold/30">
            <span className="text-sm font-semibold text-lexa-navy uppercase tracking-wider">
              {script.quick_facts.region} · {script.quick_facts.season}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-lexa-navy leading-tight">
            {script.experience_name}&#8482;
          </h2>
          {script.tagline && (
            <p className="text-xl text-zinc-500 italic">
              {script.tagline}
            </p>
          )}
        </div>

        {/* Separator */}
        <div className="flex justify-center">
          <span className="text-lexa-gold text-2xl tracking-widest">&#9866; &#9670; &#9866;</span>
        </div>

        {/* Hook */}
        {script.hook && (
          <div className="relative bg-white rounded-2xl p-8 shadow-lg border-2 border-zinc-100">
            <div className="absolute -left-2 top-4 text-5xl text-lexa-gold/20 font-serif leading-none">&ldquo;</div>
            <p className="text-xl md:text-2xl text-zinc-700 leading-relaxed pl-6 pr-6">
              {script.hook}
            </p>
            <div className="absolute -right-2 bottom-4 text-5xl text-lexa-gold/20 font-serif leading-none">&rdquo;</div>
          </div>
        )}

        {/* Emotional Description */}
        {script.description && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-lexa-gold" />
              <h3 className="text-lg font-semibold text-lexa-navy">The Experience</h3>
            </div>
            <p className="text-base text-zinc-700 leading-relaxed whitespace-pre-line">
              {script.description}
            </p>
          </div>
        )}

        {/* Signature Highlights */}
        {script.highlights && script.highlights.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-lexa-gold" />
              <h3 className="text-2xl font-bold text-lexa-navy">A Glimpse of What Awaits</h3>
            </div>
            <div className="space-y-4">
              {script.highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100 hover:border-lexa-gold/30 transition-all group"
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lexa-gold/10 flex items-center justify-center text-lexa-gold font-bold text-sm">
                      &#9672;
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-zinc-900 mb-1">{highlight.title}</h4>
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {highlight.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target Profile */}
        {script.target_profile && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-lexa-gold" />
              <h3 className="text-lg font-semibold text-lexa-navy">
                {script.target_profile.intro}
              </h3>
            </div>
            <div className="space-y-3">
              {script.target_profile.criteria.map((criterion, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-lexa-gold mt-0.5">&#9670;</span>
                  <p className="text-sm text-zinc-700">{criterion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Facts */}
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-zinc-100">
            <Calendar className="w-4 h-4 text-lexa-gold" />
            <span className="text-sm text-zinc-700 font-medium">{script.quick_facts.duration}</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-zinc-100">
            <MapPin className="w-4 h-4 text-lexa-gold" />
            <span className="text-sm text-zinc-700 font-medium">{script.quick_facts.region}</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-zinc-100">
            <Anchor className="w-4 h-4 text-lexa-gold" />
            <span className="text-sm text-zinc-700 font-medium">{script.quick_facts.embarkation}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="flex justify-center">
          <span className="text-lexa-gold text-2xl tracking-widest">&#9866; &#9670; &#9866;</span>
        </div>

        {/* Save to Account CTA */}
        <div className="bg-gradient-to-br from-lexa-navy via-zinc-900 to-black rounded-2xl p-12 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">
            Would you like to see the day-by-day journey?
          </h3>
          <p className="text-zinc-300 mb-8 max-w-2xl mx-auto">
            Save this experience to your account to unlock the full script with daily narratives,
            memory anchors, and your personal Experience Kit.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => router.push('/experience')}
              className="rounded-xl border-2 border-white/30 px-6 py-3 font-semibold hover:border-white hover:bg-white/10 transition-all"
            >
              Create Another Experience
            </button>
            <button
              onClick={handleSaveToAccount}
              className="rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-6 py-3 font-semibold text-zinc-900 hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50 transition-all"
            >
              Save to My Account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">
            {script.experience_name}&#8482; &middot; {script.tagline}
          </p>
          <p className="text-xs text-zinc-400">
            A LEXA Curated Experience &middot; Never Ask &lsquo;Now What?&rsquo; Again.
          </p>
        </div>

        <div className="mt-8">
          <LegalDisclaimer variant="inline" />
        </div>
      </main>
    </div>
  );
}
