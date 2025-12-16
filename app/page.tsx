/**
 * LEXA Landing Page
 * Luxury Hero with emotional positioning
 */

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-lexa-navy via-zinc-900 to-black px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-lexa-gold/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-lexa-gold/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
      
      <main className="relative z-10 mx-auto max-w-5xl text-center">
        {/* Logo / Brand */}
        <div className="mb-8">
          <h1 className="mb-3 text-7xl font-bold tracking-tighter md:text-9xl">
            <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent animate-gradient">
              LEXA
            </span>
          </h1>
          <div className="mx-auto w-24 h-1 bg-gradient-to-r from-transparent via-lexa-gold to-transparent" />
        </div>
        
        {/* Positioning Statement */}
        <div className="mb-16 space-y-4">
          <p className="text-2xl font-light text-zinc-200 md:text-4xl tracking-wide">
            I don't give lists.
          </p>
          <p className="text-2xl font-light text-zinc-200 md:text-4xl tracking-wide">
            I design the <span className="text-lexa-gold font-normal">feeling</span> behind the decision.
          </p>
        </div>
        
        {/* Value Proposition */}
        <div className="mx-auto mb-16 max-w-2xl space-y-6">
          <p className="text-xl text-zinc-300 leading-relaxed">
            Give me 90 seconds and three questions.
          </p>
          <p className="text-lg text-zinc-400 italic">
            If you don't feel understood, we stop.
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center mb-20">
          <Link
            href="/auth/signup"
            className="group relative overflow-hidden rounded-full bg-gradient-to-r from-lexa-gold to-yellow-600 px-10 py-5 text-lg font-semibold text-zinc-900 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50"
          >
            <span className="relative z-10">Begin Your Journey</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16 opacity-80">
          <div className="text-center space-y-2">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="text-sm font-semibold text-lexa-gold uppercase tracking-wider">Perceptive</h3>
            <p className="text-sm text-zinc-400">I read between the lines</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="text-sm font-semibold text-lexa-gold uppercase tracking-wider">Decisive</h3>
            <p className="text-sm text-zinc-400">No spray-gun recommendations</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl mb-2">💎</div>
            <h3 className="text-sm font-semibold text-lexa-gold uppercase tracking-wider">Refined</h3>
            <p className="text-sm text-zinc-400">Luxury without clichés</p>
          </div>
        </div>
        
        {/* Footer Note */}
        <div className="space-y-2">
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
