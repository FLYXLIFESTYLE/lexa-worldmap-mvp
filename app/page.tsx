/**
 * LEXA Landing Page
 * Luxury Hero with emotional positioning
 * "Request a Demo" for new users, "Welcome Back" for existing users
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import LuxuryBackground from '@/components/luxury-background';
import { X, Loader2, Check, Send } from 'lucide-react';

export default function LandingPage() {
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });

  const handleSubmitDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setFormState('sending');

    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormState('sent');
      } else {
        setFormState('error');
      }
    } catch {
      setFormState('error');
    }
  };

  const closeDemoForm = () => {
    setShowDemoForm(false);
    setFormState('idle');
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 md:py-16">
      <LuxuryBackground />
      
      <main className="relative z-10 mx-auto max-w-5xl text-center px-4 sm:px-6">
        {/* Logo / Brand with Beta Badge */}
        <div className="mb-8">
          <div className="relative inline-block">
            <h1 className="mb-3 text-6xl sm:text-7xl md:text-9xl font-bold tracking-tighter">
              <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent animate-gradient">
                LEXA
              </span>
            </h1>
            <span className="absolute top-0 -right-6 sm:-right-10 md:-right-16 inline-block px-2 sm:px-3 py-1 rounded-full bg-lexa-gold text-zinc-900 text-xs sm:text-sm font-bold tracking-wider shadow-lg shadow-lexa-gold/50 transform rotate-12">
              BETA
            </span>
          </div>
          <div className="mx-auto w-24 h-1 bg-gradient-to-r from-transparent via-lexa-gold to-transparent" />
        </div>
        
        {/* What is LEXA */}
        <div className="mb-10 space-y-3">
          <p className="text-sm md:text-base text-lexa-gold font-semibold uppercase tracking-widest">
            Luxury Experience Assistant
          </p>
          <p className="text-base md:text-lg text-zinc-400">
            Emotional Intelligence for Luxury Travel
          </p>
        </div>
        
        {/* Main Value Proposition */}
        <div className="mb-12 space-y-6 px-4">
          <p className="text-2xl md:text-3xl font-light text-zinc-200 leading-relaxed max-w-3xl mx-auto">
            I don&apos;t just recommend destinations.
          </p>
          <p className="text-3xl md:text-4xl font-light text-white leading-relaxed max-w-3xl mx-auto">
            I anticipate and design the <span className="text-lexa-gold font-normal">feeling</span> behind your experience.
          </p>
        </div>
        
        {/* Benefits */}
        <div className="mx-auto mb-12 max-w-3xl space-y-4 px-6">
          <div className="text-zinc-300 text-base md:text-lg leading-relaxed">
            <p className="mb-4">
              Experience curated travel scripts that amplify or revive your emotions and feelings of wealth, anticipate your (hidden) desires, and create moments and memories that resonate with who you truly are - or who you finally want to become.
            </p>
            <p className="text-zinc-400 text-sm md:text-base">
              No checklist-like itineraries of destinations and activities. No lists of generic place recommendations - instead, a clear experience script with a hook, emotional direction, and signature highlights (then we make it real with timing, places, and logistics).
            </p>
          </div>
        </div>
        
        {/* The Promise */}
        <div className="mx-auto mb-16 max-w-2xl space-y-4">
          <p className="text-xl md:text-2xl text-zinc-200 font-light">
            Give me 90 seconds and three questions.
          </p>
          <p className="text-base md:text-lg text-zinc-400 italic">
            If you don&apos;t feel understood, we stop.
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center mb-20">
          <button
            onClick={() => setShowDemoForm(true)}
            className="group relative overflow-hidden rounded-full bg-gradient-to-r from-lexa-gold to-yellow-600 px-10 py-5 text-lg font-semibold text-zinc-900 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50"
          >
            <span className="relative z-10">Request a Demo</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-lexa-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          
          <Link
            href="/app"
            className="rounded-full border-2 border-zinc-600 px-10 py-5 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:border-lexa-gold hover:bg-white/5 hover:text-lexa-gold"
          >
            Welcome Back
          </Link>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <div className="text-center space-y-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-lexa-gold/30 transition-all">
            <div className="text-4xl mb-2">&#129504;</div>
            <h3 className="text-base font-bold text-lexa-gold uppercase tracking-wider">Perceptive</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">I read between the lines and understand what you truly desire</p>
          </div>
          <div className="text-center space-y-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-lexa-gold/30 transition-all">
            <div className="text-4xl mb-2">&#9889;</div>
            <h3 className="text-base font-bold text-lexa-gold uppercase tracking-wider">Anticipatory</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">I predict your needs before you articulate them</p>
          </div>
          <div className="text-center space-y-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-lexa-gold/30 transition-all">
            <div className="text-4xl mb-2">&#127919;</div>
            <h3 className="text-base font-bold text-lexa-gold uppercase tracking-wider">Precise</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">Every recommendation is intentional - never generic lists</p>
          </div>
        </div>
        
        {/* Partner Link */}
        <div className="mt-16 mb-8">
          <a
            href="https://lexa-partner-hub.base44.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-all hover:border-lexa-gold/30 hover:text-lexa-gold hover:bg-white/10"
          >
            Partner with LEXA &rarr;
          </a>
        </div>

        {/* Footer Note */}
        <div className="space-y-2 mt-12">
          <p className="text-sm text-zinc-500 tracking-wide">
            Powered by Claude Sonnet 4.5 &amp; Neo4j
          </p>
          <p className="text-xs text-zinc-600">
            Sophisticated travel experience design
          </p>
        </div>
      </main>
      
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

      {/* Demo Request Modal */}
      {showDemoForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden">
            {/* Close button */}
            <button
              onClick={closeDemoForm}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Sent confirmation */}
            {formState === 'sent' ? (
              <div className="p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lexa-gold/20 border border-lexa-gold/30">
                  <Check className="h-8 w-8 text-lexa-gold" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Request Received</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Thank you, {formData.name.split(' ')[0]}. We will get back to you within 24 hours to schedule your personal demo.
                </p>
                <button
                  onClick={closeDemoForm}
                  className="rounded-full bg-lexa-gold px-8 py-3 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-lexa-gold/10 to-transparent border-b border-white/5 px-8 py-6">
                  <h3 className="text-xl font-bold text-white">Request a Demo</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Experience LEXA firsthand. We will set up a personal walkthrough.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitDemo} className="p-8 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company (optional)</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Your company or yacht name"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">What are you interested in? (optional)</label>
                    <textarea
                      value={formData.message}
                      onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell us about your needs..."
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold/30 resize-none"
                    />
                  </div>

                  {formState === 'error' && (
                    <p className="text-sm text-red-400">Something went wrong. Please try again or email us directly at info@superyachtcruiseclub.com</p>
                  )}

                  <button
                    type="submit"
                    disabled={formState === 'sending' || !formData.name.trim() || !formData.email.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-lexa-gold to-yellow-600 px-6 py-3.5 text-sm font-semibold text-zinc-900 hover:shadow-lg hover:shadow-lexa-gold/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formState === 'sending' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Request
                      </>
                    )}
                  </button>

                  <p className="text-xs text-zinc-500 text-center">
                    Or contact us directly at{' '}
                    <a href="mailto:info@superyachtcruiseclub.com" className="text-lexa-gold hover:underline">
                      info@superyachtcruiseclub.com
                    </a>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
