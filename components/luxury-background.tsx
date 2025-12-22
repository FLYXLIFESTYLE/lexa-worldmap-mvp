/**
 * Shared Luxury Background Component
 * Beautiful beach background with overlay for LEXA pages
 */

export default function LuxuryBackground() {
  return (
    <>
      {/* Background Image - Full screen, responsive */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1505881502353-a1986add3762?q=80&w=2400&auto=format&fit=crop')`,
            backgroundPosition: 'center center',
          }}
        />
        {/* Semi-transparent dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-lexa-navy/85 via-zinc-900/80 to-black/90" />
      </div>
      
      {/* Animated accent elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-lexa-gold/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-lexa-gold/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
    </>
  );
}

