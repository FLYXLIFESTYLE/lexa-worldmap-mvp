'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client-browser';
import LuxuryBackground from '@/components/luxury-background';
import { Sparkles, Calendar, MapPin, Heart, ArrowLeft, Anchor, User, Download } from 'lucide-react';
import type { Stage1Output } from '@/lib/script-engine/types';

export default function ScriptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const scriptId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<Stage1Output | null>(null);
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/signin'); return; }

      try {
        const res = await fetch(`/api/user/scripts/${scriptId}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Script not found' : 'Failed to load script');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setBrief(data.script || null);

        // Extract Stage 1 output from the brief
        const engineOutput = data.script?.additional_context?.script_engine_output;
        if (engineOutput) {
          setScript(engineOutput as Stage1Output);
        }
      } catch {
        setError('Failed to load script');
      }
      setLoading(false);
    }
    load();
  }, [scriptId, router, supabase.auth]);

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <LuxuryBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <Sparkles className="h-8 w-8 animate-spin text-lexa-gold" />
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <LuxuryBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-white text-lg mb-4">{error || 'Script not found'}</p>
            <Link href="/account" className="text-lexa-gold hover:underline">
              &larr; Back to Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If we have a Stage 1 output, show the full preview
  if (script) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-lexa-cream">
        {/* Header */}
        <header className="relative border-b border-zinc-200/60 bg-white/80 backdrop-blur-lg px-6 py-5 shadow-sm">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Link href="/account" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Account
            </Link>
            <button
              onClick={() => alert('PDF download coming soon!')}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-lexa-gold to-yellow-600 px-4 py-2 text-sm font-semibold text-zinc-900 hover:scale-105 transition-all"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
          {/* Title */}
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 rounded-full bg-lexa-gold/10 border border-lexa-gold/30">
              <span className="text-sm font-semibold text-lexa-navy uppercase tracking-wider">
                {script.quick_facts?.region} {script.quick_facts?.season ? `\u00B7 ${script.quick_facts.season}` : ''}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-lexa-navy leading-tight">
              {script.experience_name}&#8482;
            </h2>
            {script.tagline && (
              <p className="text-xl text-zinc-500 italic">{script.tagline}</p>
            )}
          </div>

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

          {/* Description */}
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

          {/* Highlights */}
          {script.highlights && script.highlights.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-lexa-gold" />
                <h3 className="text-2xl font-bold text-lexa-navy">A Glimpse of What Awaits</h3>
              </div>
              <div className="space-y-4">
                {script.highlights.map((highlight, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100 hover:border-lexa-gold/30 transition-all">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lexa-gold/10 flex items-center justify-center text-lexa-gold font-bold text-sm">&#9672;</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-zinc-900 mb-1">{highlight.title}</h4>
                        <p className="text-sm text-zinc-600 leading-relaxed">{highlight.description}</p>
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
                <h3 className="text-lg font-semibold text-lexa-navy">{script.target_profile.intro}</h3>
              </div>
              <div className="space-y-3">
                {script.target_profile.criteria.map((criterion, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lexa-gold mt-0.5">&#9670;</span>
                    <p className="text-sm text-zinc-700">{criterion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Facts */}
          {script.quick_facts && (
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
          )}

          {/* Footer */}
          <div className="text-center space-y-2 pt-8">
            <p className="text-xs text-zinc-400 uppercase tracking-widest">
              {script.experience_name}&#8482; &middot; {script.tagline}
            </p>
            <p className="text-xs text-zinc-400">
              A LEXA Curated Experience
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Fallback: show raw brief data if no Stage 1 output
  return (
    <div className="relative min-h-screen overflow-hidden">
      <LuxuryBackground />
      <div className="relative z-10 min-h-screen py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/account" className="text-sm text-zinc-300 hover:text-white transition-colors mb-6 inline-block">
            &larr; Back to Account
          </Link>

          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {(brief.theme_category as string) || (brief.theme as string) || 'Experience Script'}
            </h1>
            {brief.hook ? (
              <p className="text-zinc-300 italic mb-4">{String(brief.hook)}</p>
            ) : null}
            {brief.description ? (
              <p className="text-zinc-400 text-sm mb-4">{String(brief.description)}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {brief.where_at ? (
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-xs text-zinc-500">Destination</div>
                  <div className="text-white">{String((brief.where_at as Record<string, unknown>)?.destination || 'TBC')}</div>
                </div>
              ) : null}
              {brief.duration ? (
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-xs text-zinc-500">Duration</div>
                  <div className="text-white">{String((brief.duration as Record<string, unknown>)?.days || 'TBC')} days</div>
                </div>
              ) : null}
              {brief.theme ? (
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-xs text-zinc-500">Theme</div>
                  <div className="text-white">{String(brief.theme)}</div>
                </div>
              ) : null}
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-xs text-zinc-500">Status</div>
                <div className="text-white">{String(brief.status || 'complete')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
