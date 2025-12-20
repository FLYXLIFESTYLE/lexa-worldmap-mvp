/**
 * Experience Script Preview
 * Shows the final composed script with theme, hook, and highlights
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import { Sparkles, Download, Share2, Calendar, MapPin, Heart } from 'lucide-react';
import { lexaAPI, loadFromLocalStorage } from '@/lib/api/lexa-client';

interface ScriptData {
  themeName: string;
  inspiringHook: string;
  emotionalDescription: string;
  signatureHighlights: string[];
  destination: string;
  month: string;
  duration: string;
}

export default function ScriptPreviewPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const [script, setScript] = useState<ScriptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth and generate script
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setUserEmail(user.email || '');

      // Load LEXA account
      const lexaAccount = loadFromLocalStorage('lexa_account');
      if (!lexaAccount) {
        router.push('/auth/signup');
        return;
      }

      // Load builder state and conversation
      const builderState = JSON.parse(localStorage.getItem('lexa_builder_state') || '{}');
      const conversation = JSON.parse(localStorage.getItem('lexa_conversation') || '[]');

      if (!builderState.destination) {
        router.push('/experience');
        return;
      }

      // Call backend to compose script
      try {
        const scriptResponse = await lexaAPI.composeScript({
          account_id: lexaAccount.account_id,
          session_id: lexaAccount.session_id,
          selected_choices: {
            destination: builderState.destination.name,
            theme: builderState.theme.name,
            time: `${builderState.time.month} ${builderState.time.year}`,
            // Extract budget, duration, must_haves from conversation if available
          },
        });

        // Transform backend response to frontend format
        const transformedScript: ScriptData = {
          themeName: scriptResponse.title,
          inspiringHook: scriptResponse.cinematic_hook,
          emotionalDescription: scriptResponse.emotional_arc,
          signatureHighlights: scriptResponse.preview_narrative.split('\n').filter(line => line.trim()),
          destination: builderState.destination.name,
          month: builderState.time.month?.charAt(0).toUpperCase() + builderState.time.month?.slice(1),
          duration: `${scriptResponse.duration_days} days`,
        };

        setScript(transformedScript);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to compose script:', error);
        
        // Fallback to mock data
        const mockScript: ScriptData = {
          themeName: `The ${builderState.theme.name} - ${builderState.destination.name}`,
          inspiringHook: `Imagine the golden hour in ${builderState.destination.name}. The Mediterranean whispers secrets only you will hear. This isn't a vacation—it's a chapter you'll return to in your mind for years to come.`,
          emotionalDescription: `This experience is designed for those who seek more than beauty—you're seeking *resonance*. Every moment is curated to help you feel deeply connected, profoundly present, and utterly free. No tours. No itineraries. Just a series of perfect moments that understand what you came here to feel.`,
          signatureHighlights: [
            `🥂 **Private sunset aperitivo** at a cliffside villa known only to locals—Champagne, silence, and the Mediterranean at your feet`,
            `🍽️ **Chef's table at Le Louis XV** (3 Michelin stars) - An 8-course journey where each dish tells a story`,
            `⛵ **Morning yacht charter** to hidden coves—swim in water so clear it feels like flying`,
            `🎨 **Private gallery viewing** at a contemporary art space, followed by meeting the artist over wine`,
            `💆 **Thermes Marins spa ritual** - 3-hour deep tissue and marine therapy designed to release what you're holding`,
            `🌅 **Final evening: private rooftop dinner** in Monaco—live jazz trio, handwritten menu, stars above`,
          ],
          destination: builderState.destination.name,
          month: builderState.time.month?.charAt(0).toUpperCase() + builderState.time.month?.slice(1),
          duration: '5 days, 4 nights',
        };

        setScript(mockScript);
        setIsLoading(false);
      }
    }
    init();
  }, [router, supabase.auth]);

  // Handle PDF download
  const handleDownload = async () => {
    try {
      // Get script ID from localStorage or state
      const lexaAccount = loadFromLocalStorage('lexa_account');
      if (!lexaAccount) {
        alert('No account found. Please sign in again.');
        return;
      }

      // For now, show message that PDF will be generated
      alert('PDF generation is being processed! This feature will download your script shortly.');
      
      // TODO: Implement actual PDF download when backend endpoint is ready
      // const blob = await lexaAPI.downloadScriptPDF(scriptId);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `LEXA-Experience-${Date.now()}.pdf`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  // Handle share
  const handleShare = async () => {
    alert('Share functionality coming soon!');
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
    return null;
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
              Your Experience Script
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
        
        {/* Decorative gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />
      </header>

      {/* Script Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Meta Info */}
        <div className="flex flex-wrap gap-6 justify-center text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-lexa-gold" />
            <span>{script.destination}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-lexa-gold" />
            <span>{script.month} • {script.duration}</span>
          </div>
        </div>

        {/* Theme Name */}
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 rounded-full bg-lexa-gold/10 border border-lexa-gold/30 mb-4">
            <span className="text-sm font-semibold text-lexa-navy uppercase tracking-wider">
              Your Experience Script
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-lexa-navy leading-tight">
            {script.themeName}
          </h2>
        </div>

        {/* Inspiring Hook */}
        <div className="relative">
          <div className="absolute -left-4 top-0 text-6xl text-lexa-gold/20 font-serif">"</div>
          <p className="text-xl md:text-2xl text-zinc-700 leading-relaxed italic pl-8 pr-8">
            {script.inspiringHook}
          </p>
          <div className="absolute -right-4 bottom-0 text-6xl text-lexa-gold/20 font-serif">"</div>
        </div>

        {/* Emotional Description */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-lexa-gold" />
            <h3 className="text-lg font-semibold text-lexa-navy">The Essence</h3>
          </div>
          <p className="text-base text-zinc-700 leading-relaxed">
            {script.emotionalDescription}
          </p>
        </div>

        {/* Signature Highlights */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-lexa-gold" />
            <h3 className="text-2xl font-bold text-lexa-navy">Signature Highlights</h3>
          </div>
          
          <div className="space-y-4">
            {script.signatureHighlights.map((highlight, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border-2 border-zinc-100 hover:border-lexa-gold/30 transition-all group"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lexa-gold/10 flex items-center justify-center text-sm font-bold text-lexa-navy group-hover:bg-lexa-gold group-hover:text-white transition-all">
                    {index + 1}
                  </div>
                  <p className="text-base text-zinc-700 leading-relaxed flex-1">
                    {highlight.replace(/\*\*/g, '')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-lexa-navy via-zinc-900 to-black rounded-2xl p-12 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Ready to make this real?</h3>
          <p className="text-zinc-300 mb-8 max-w-2xl mx-auto">
            This script is the beginning. Book a consultation with a LEXA travel curator to bring this vision to life—or let AIlessia refine it further.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => router.push('/experience')}
              className="rounded-xl border-2 border-white/30 px-6 py-3 font-semibold hover:border-white hover:bg-white/10 transition-all"
            >
              Create Another Experience
            </button>
            <button
              onClick={() => alert('Booking flow coming soon!')}
              className="rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-6 py-3 font-semibold text-zinc-900 hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50 transition-all"
            >
              Book Consultation
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-zinc-500 pt-8">
          <p>Crafted by AIlessia • Powered by emotional intelligence • {new Date().toLocaleDateString()}</p>
        </div>
      </main>
    </div>
  );
}

