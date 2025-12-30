/**
 * LEXA Landing Page
 * Luxury Hero with emotional positioning
 */

import Link from 'next/link';
import LuxuryBackground from '@/components/luxury-background';

export default function LandingPage() {
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
            {/* Beta Badge on Logo - Better positioned */}
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
            I don't just recommend destinations.
          </p>
          <p className="text-3xl md:text-4xl font-light text-white leading-relaxed max-w-3xl mx-auto">
            I anticipate and design the <span className="text-lexa-gold font-normal">feeling</span> behind your experience.
          </p>
        </div>
        
        {/* Benefits */}
        <div className="mx-auto mb-12 max-w-3xl space-y-4 px-6">
          <div className="text-zinc-300 text-base md:text-lg leading-relaxed">
            <p className="mb-4">
              Experience curated travel scripts that amplify or revive your emotions and feeling of wealth, anticipates your desires, and creates moments and memories that resonate with who you truly are or finally want to be(come).
            </p>
            <p className="text-zinc-400 text-sm md:text-base">
              No checklist like itineraries of destination and activities, no list of generic places recommendations.
            </p>
          </div>
        </div>
        
        {/* The Promise */}
        <div className="mx-auto mb-16 max-w-2xl space-y-4">
          <p className="text-xl md:text-2xl text-zinc-200 font-light">
            Give me 90 seconds and three questions.
          </p>
          <p className="text-base md:text-lg text-zinc-400 italic">
            If you don't feel understood, we stop.
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center mb-20">
          <Link
            href="/app"
            className="group relative overflow-hidden rounded-full bg-gradient-to-r from-lexa-gold to-yellow-600 px-10 py-5 text-lg font-semibold text-zinc-900 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50"
          >
            <span className="relative z-10">Enter LEXA</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-lexa-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          
          <Link
            href="/auth/signin"
            className="rounded-full border-2 border-zinc-600 px-10 py-5 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:border-lexa-gold hover:bg-white/5 hover:text-lexa-gold"
          >
            Welcome Back
          </Link>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <div className="text-center space-y-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-lexa-gold/30 transition-all">
            <div className="text-4xl mb-2">🧠</div>
            <h3 className="text-base font-bold text-lexa-gold uppercase tracking-wider">Perceptive</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">I read between the lines and understand what you truly desire</p>
          </div>
          <div className="text-center space-y-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-lexa-gold/30 transition-all">
            <div className="text-4xl mb-2">⚡</div>
            <h3 className="text-base font-bold text-lexa-gold uppercase tracking-wider">Anticipatory</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">I predict your needs before you articulate them</p>
          </div>
          <div className="text-center space-y-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-lexa-gold/30 transition-all">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="text-base font-bold text-lexa-gold uppercase tracking-wider">Precise</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">Every recommendation is intentional - never generic lists</p>
          </div>
        </div>
        
        {/* TODO: Latest Experience Scripts - Coming Soon */}
        {/* This will show 4 latest scripts with link to marketplace */}
        
        {/* TODO: Latest Blog Posts - Coming Soon */}
        {/* This will show 4 latest blog posts */}
        
        {/* TODO: Theme Categories - Coming Soon */}
        {/* This will show images and links to theme categories with descriptions */}
        
        {/* Footer Note */}
        <div className="space-y-2 mt-20">
          <p className="text-sm text-zinc-500 tracking-wide">
            Powered by Claude Sonnet 4.5 & Neo4j
          </p>
          <p className="text-xs text-zinc-600">
            Sophisticated travel experience design
          </p>
        </div>
      </main>
      
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
