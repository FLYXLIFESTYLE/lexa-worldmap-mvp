/**
 * LEXA Experience Builder - 3-Step Initial Flow
 * Step 1: Time OR Destination OR Theme (client chooses entry point)
 * LEXA recommends the other two
 * Client must approve before proceeding to conversation
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Sparkles, ArrowRight, Check } from 'lucide-react';

type BuilderStep = 'choose_entry' | 'time' | 'destination' | 'theme' | 'review' | 'approval' | 'complete';
type Month = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';

interface BuilderState {
  entryPoint: 'time' | 'destination' | 'theme' | null;
  time: {
    month: Month | null;
    year: number;
    defined: boolean;
  };
  destination: {
    name: string | null;
    defined: boolean;
  };
  theme: {
    name: string | null;
    defined: boolean;
  };
  approved: boolean;
}

export default function ExperienceBuilderPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const [currentStep, setCurrentStep] = useState<BuilderStep>('choose_entry');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [seasonalWarning, setSeasonalWarning] = useState<string | null>(null);
  
  const [builderState, setBuilderState] = useState<BuilderState>({
    entryPoint: null,
    time: { month: null, year: 2026, defined: false },
    destination: { name: null, defined: false },
    theme: { name: null, defined: false },
    approved: false,
  });

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setUserEmail(user.email || '');
    }
    checkAuth();
  }, [router, supabase.auth]);

  // Handle entry point selection
  const handleEntryPoint = (entry: 'time' | 'destination' | 'theme') => {
    setBuilderState({ ...builderState, entryPoint: entry });
    setCurrentStep(entry);
  };

  // Handle month selection
  const handleMonthSelect = async (month: Month, year: number) => {
    // Validate date is not in the past
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    const monthIndex = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(month);
    
    if (year < currentYear || (year === currentYear && monthIndex < currentMonth)) {
      alert(`${month.charAt(0).toUpperCase() + month.slice(1)} ${year} has already passed. Please choose a future date.`);
      return;
    }
    
    setBuilderState({
      ...builderState,
      time: { month, year, defined: true },
    });
    
    // Check for seasonal warnings with destination
    if (builderState.destination.name) {
      checkSeasonalCompatibility(month, builderState.destination.name);
    }
    
    // Return to review page to see selections
    setCurrentStep('review');
  };

  // Handle destination selection
  const handleDestinationSelect = async (destination: string) => {
    setBuilderState({
      ...builderState,
      destination: { name: destination, defined: true },
    });
    
    // Check for seasonal warnings with time
    if (builderState.time.month) {
      checkSeasonalCompatibility(builderState.time.month, destination);
    }
    
    // Return to review page to see selections
    setCurrentStep('review');
  };

  // Handle theme selection
  const handleThemeSelect = async (theme: string) => {
    setBuilderState({
      ...builderState,
      theme: { name: theme, defined: true },
    });
    
    // Return to review page to see selections
    setCurrentStep('review');
  };

  // Check seasonal compatibility
  const checkSeasonalCompatibility = (month: Month, destination: string) => {
    const summerMonths = ['june', 'july', 'august'];
    const winterMonths = ['november', 'december', 'january', 'february'];
    
    let warning = null;
    
    // UAE/Arabian Gulf in summer
    if (summerMonths.includes(month) && destination.toLowerCase().includes('arab')) {
      warning = `Note: ${destination} in ${month} can be extremely hot (40°C+). Consider visiting between October-April for more comfortable weather.`;
    }
    
    // Monaco/French Riviera in winter
    if (winterMonths.includes(month) && (destination.toLowerCase().includes('monaco') || destination.toLowerCase().includes('riviera'))) {
      warning = `Note: ${destination} in ${month} is low season. Many venues close and weather is cooler. Consider May-September for the full experience.`;
    }
    
    // Croatia/Adriatic in winter
    if (winterMonths.includes(month) && destination.toLowerCase().includes('adriatic')) {
      warning = `Note: ${destination} in ${month} is off-season. Many coastal venues close. Consider May-September for ideal conditions.`;
    }
    
    setSeasonalWarning(warning);
  };

  // Handle suggestion request
  const handleRequestSuggestion = async () => {
    setIsLoading(true);
    await getRecommendations();
    setIsLoading(false);
    setCurrentStep('approval');
  };

  // Handle continue from main page
  const handleContinue = async () => {
    setIsLoading(true);
    await getRecommendations();
    setIsLoading(false);
    setCurrentStep('approval');
  };

  // Get AI recommendations based on what user selected
  const getRecommendations = async () => {
    // TODO: Call backend API to get recommendations
    // For now, use smart defaults based on what's defined
    
    if (!builderState.time.defined) {
      // Suggest best travel time based on destination or theme
      setBuilderState(prev => ({
        ...prev,
        time: { month: 'june' as Month, year: 2026, defined: false },
      }));
    }
    
    if (!builderState.destination.defined) {
      // Suggest destination based on theme and time
      setBuilderState(prev => ({
        ...prev,
        destination: { name: 'French Riviera', defined: false },
      }));
    }
    
    if (!builderState.theme.defined) {
      // Suggest theme based on destination and time
      setBuilderState(prev => ({
        ...prev,
        theme: { name: 'Romantic Escape', defined: false },
      }));
    }
  };

  // Handle approval
  const handleApprove = () => {
    setBuilderState({ ...builderState, approved: true });
    // Save to localStorage for chat page
    localStorage.setItem('lexa_builder_state', JSON.stringify(builderState));
    // Navigate to chat
    router.push('/experience/chat');
  };

  // Render entry point selection
  if (currentStep === 'choose_entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent">
                LEXA
              </span>
            </h1>
            <p className="text-2xl text-zinc-300 mb-2">Where would you like to begin?</p>
            <p className="text-zinc-400">Choose one. I'll recommend the others.</p>
          </div>

          {/* Entry Point Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Time Entry */}
            <button
              onClick={() => handleEntryPoint('time')}
              className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-lg border-2 border-white/10 p-8 transition-all hover:border-lexa-gold hover:bg-white/10 hover:scale-105"
            >
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-lexa-gold/20 p-4 group-hover:bg-lexa-gold/30 transition-all">
                  <Calendar className="w-8 h-8 text-lexa-gold" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">When</h3>
              <p className="text-sm text-zinc-400">
                I know when I want to travel
              </p>
            </button>

            {/* Destination Entry */}
            <button
              onClick={() => handleEntryPoint('destination')}
              className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-lg border-2 border-white/10 p-8 transition-all hover:border-lexa-gold hover:bg-white/10 hover:scale-105"
            >
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-lexa-gold/20 p-4 group-hover:bg-lexa-gold/30 transition-all">
                  <MapPin className="w-8 h-8 text-lexa-gold" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Where</h3>
              <p className="text-sm text-zinc-400">
                I know where I want to go
              </p>
            </button>

            {/* Theme Entry */}
            <button
              onClick={() => handleEntryPoint('theme')}
              className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-lg border-2 border-white/10 p-8 transition-all hover:border-lexa-gold hover:bg-white/10 hover:scale-105"
            >
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-lexa-gold/20 p-4 group-hover:bg-lexa-gold/30 transition-all">
                  <Sparkles className="w-8 h-8 text-lexa-gold" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">What</h3>
              <p className="text-sm text-zinc-400">
                I know the type of experience
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render month selection
  if (currentStep === 'time') {
    const months: Month[] = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          {/* Back Button */}
          <button
            onClick={() => setCurrentStep('choose_entry')}
            className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">When do you dream of traveling?</h2>
            <p className="text-zinc-400">Select a month in 2026</p>
          </div>

          {/* Suggest Button */}
          <div className="mb-8 text-center">
            <button
              onClick={() => {
                setBuilderState({
                  ...builderState,
                  time: { month: null, year: 2026, defined: false }
                });
                setCurrentStep('review');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border-2 border-lexa-gold/50 text-lexa-gold hover:bg-lexa-gold/10 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">Please suggest the best option</span>
            </button>
          </div>

          <div className="calendar-grid quick-replies-grid mb-8">
            {months.map((month) => (
              <button
                key={month}
                onClick={() => handleMonthSelect(month, selectedYear)}
                className="calendar-month-button"
              >
                <div className="calendar-month-header"></div>
                <div className="calendar-month-label">
                  {month.charAt(0).toUpperCase() + month.slice(1, 3)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render destination selection
  if (currentStep === 'destination') {
    const destinations = [
      // Mediterranean - French Riviera
      { name: 'Monaco', region: 'French Riviera', country: 'Monaco', description: 'Ultimate luxury & prestige', image: 'https://images.unsplash.com/photo-1605559911160-a3d95d213904?w=400&h=300&fit=crop' },
      { name: 'Cannes', region: 'French Riviera', country: 'France', description: 'Film festival elegance', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=400&h=300&fit=crop' },
      { name: 'Nice', region: 'French Riviera', country: 'France', description: 'Culture & Riviera charm', image: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=400&h=300&fit=crop' },
      { name: 'St. Tropez', region: 'French Riviera', country: 'France', description: 'Chic Mediterranean escape', image: 'https://images.unsplash.com/photo-1590073844006-33379778ae09?w=400&h=300&fit=crop' },
      
      // Mediterranean - Italy
      { name: 'Amalfi Coast', region: 'Southern Italy', country: 'Italy', description: 'Dramatic beauty & dolce vita', image: 'https://images.unsplash.com/photo-1534113414509-0b167ead4f7c?w=400&h=300&fit=crop' },
      { name: 'Lake Como', region: 'Northern Italy', country: 'Italy', description: 'Alpine lakes & Italian elegance', image: 'https://images.unsplash.com/photo-1520711651678-77360f8d95bb?w=400&h=300&fit=crop' },
      { name: 'Tuscany', region: 'Central Italy', country: 'Italy', description: 'Rolling hills & wine estates', image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&h=300&fit=crop' },
      
      // Mediterranean - Greece
      { name: 'Santorini', region: 'Cyclades', country: 'Greece', description: 'Iconic sunsets & white villages', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&h=300&fit=crop' },
      { name: 'Mykonos', region: 'Cyclades', country: 'Greece', description: 'Cosmopolitan island energy', image: 'https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=400&h=300&fit=crop' },
      
      // Mediterranean - Spain
      { name: 'Ibiza', region: 'Balearics', country: 'Spain', description: 'Beach clubs & Mediterranean magic', image: 'https://images.unsplash.com/photo-1562059392-096320bccc7e?w=400&h=300&fit=crop' },
      { name: 'Mallorca', region: 'Balearics', country: 'Spain', description: 'Secluded coves & mountain charm', image: 'https://images.unsplash.com/photo-1610640278600-67ec2c2c4a25?w=400&h=300&fit=crop' },
      
      // Mediterranean - Croatia
      { name: 'Dubrovnik', region: 'Adriatic Coast', country: 'Croatia', description: 'Medieval walls & azure seas', image: 'https://images.unsplash.com/photo-1555990538-c3157b799ea4?w=400&h=300&fit=crop' },
      
      // Middle East
      { name: 'Dubai', region: 'Arabian Gulf', country: 'UAE', description: 'Ultra-modern luxury', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop' },
      { name: 'Abu Dhabi', region: 'Arabian Gulf', country: 'UAE', description: 'Cultural sophistication', image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&h=300&fit=crop' },
      
      // Caribbean
      { name: 'St. Barts', region: 'Caribbean', country: 'France', description: 'French Caribbean elegance', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop' },
      
      // Indian Ocean
      { name: 'Maldives', region: 'Indian Ocean', country: 'Maldives', description: 'Overwater paradise', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=300&fit=crop' },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
        <div className="max-w-6xl w-full">
          {/* Back Button */}
          <button
            onClick={() => setCurrentStep('choose_entry')}
            className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Where does your heart call you?</h2>
            <p className="text-zinc-400">Choose your destination</p>
          </div>

          {/* Suggest Button */}
          <div className="mb-8 text-center">
            <button
              onClick={() => {
                setBuilderState({
                  ...builderState,
                  destination: { name: null, defined: false }
                });
                setCurrentStep('review');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border-2 border-lexa-gold/50 text-lexa-gold hover:bg-lexa-gold/10 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">Please suggest the best option</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {destinations.map((dest) => (
              <button
                key={dest.name}
                onClick={() => handleDestinationSelect(dest.name)}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/20"
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                  style={{backgroundImage: `url(${dest.image})`}}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-left">
                  <h3 className="text-2xl font-bold text-white mb-1">{dest.name}</h3>
                  <p className="text-sm text-lexa-gold mb-2">{dest.region} • {dest.country}</p>
                  <p className="text-sm text-zinc-300">{dest.description}</p>
                </div>
                
                {/* Hover Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-lexa-gold rounded-2xl transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render theme selection
  if (currentStep === 'theme') {
    const themes = [
      { name: 'Romantic Escape', icon: '💕', description: 'Intimate moments & connection' },
      { name: 'Culinary Journey', icon: '🍽️', description: 'Michelin stars & wine' },
      { name: 'Wellness Retreat', icon: '🧘', description: 'Rejuvenation & balance' },
      { name: 'Adventure Quest', icon: '⛰️', description: 'Thrills & exploration' },
      { name: 'Cultural Immersion', icon: '🎨', description: 'Art, history & heritage' },
      { name: 'Pure Indulgence', icon: '💎', description: 'Ultimate luxury & pampering' },
      { name: 'Yacht & Sailing', icon: '⛵', description: 'Private cruising & coastal luxury' },
      { name: 'Beach & Sun', icon: '🏖️', description: 'Pristine shores & azure waters' },
      { name: 'Alpine Retreat', icon: '🏔️', description: 'Mountain luxury & winter sports' },
      { name: 'City Sophistication', icon: '🌆', description: 'Urban elegance & nightlife' },
      { name: 'Island Paradise', icon: '🏝️', description: 'Tropical seclusion & serenity' },
      { name: 'Wine & Vineyard', icon: '🍷', description: 'Oenophile experiences & estates' },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          {/* Back Button */}
          <button
            onClick={() => setCurrentStep('choose_entry')}
            className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">What feeling are you seeking?</h2>
            <p className="text-zinc-400">Choose your theme</p>
          </div>

          {/* Suggest Button */}
          <div className="mb-8 text-center">
            <button
              onClick={() => {
                setBuilderState({
                  ...builderState,
                  theme: { name: null, defined: false }
                });
                setCurrentStep('review');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border-2 border-lexa-gold/50 text-lexa-gold hover:bg-lexa-gold/10 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">Please suggest the best option</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeSelect(theme.name)}
                className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-lg border-2 border-white/10 p-6 transition-all hover:border-lexa-gold hover:bg-white/10 hover:scale-105 text-left"
              >
                <div className="text-5xl mb-4">{theme.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{theme.name}</h3>
                <p className="text-sm text-zinc-400">{theme.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render review screen (show choice + suggest best for others)
  if (currentStep === 'review') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Here's what I see...</h2>
            <p className="text-zinc-400">You can change any of these, or let me suggest the best options</p>
          </div>

          {/* Summary Cards - User can click to change */}
          <div className="space-y-4 mb-12">
            {/* Time */}
            <button
              onClick={() => setCurrentStep('time')}
              className={`w-full text-left rounded-2xl p-6 border-2 transition-all ${
                builderState.time.defined 
                  ? 'bg-lexa-gold/10 border-lexa-gold hover:bg-lexa-gold/20' 
                  : 'bg-white/5 border-white/10 hover:border-lexa-gold/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Calendar className={`w-6 h-6 ${builderState.time.defined ? 'text-lexa-gold' : 'text-zinc-400'}`} />
                  <div>
                    <p className="text-sm text-zinc-400 uppercase tracking-wider">When</p>
                    <p className="text-xl font-bold text-white">
                      {builderState.time.month 
                        ? `${builderState.time.month.charAt(0).toUpperCase() + builderState.time.month.slice(1)} ${builderState.time.year}`
                        : 'Click to choose'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {builderState.time.defined ? (
                    <div className="flex items-center gap-2 text-lexa-gold text-sm font-medium">
                      <Check className="w-4 h-4" />
                      <span>You chose</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Suggest best option</span>
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Destination */}
            <button
              onClick={() => setCurrentStep('destination')}
              className={`w-full text-left rounded-2xl p-6 border-2 transition-all ${
                builderState.destination.defined 
                  ? 'bg-lexa-gold/10 border-lexa-gold hover:bg-lexa-gold/20' 
                  : 'bg-white/5 border-white/10 hover:border-lexa-gold/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <MapPin className={`w-6 h-6 ${builderState.destination.defined ? 'text-lexa-gold' : 'text-zinc-400'}`} />
                  <div>
                    <p className="text-sm text-zinc-400 uppercase tracking-wider">Where</p>
                    <p className="text-xl font-bold text-white">
                      {builderState.destination.name || 'Click to choose'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {builderState.destination.defined ? (
                    <div className="flex items-center gap-2 text-lexa-gold text-sm font-medium">
                      <Check className="w-4 h-4" />
                      <span>You chose</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Suggest best option</span>
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Theme */}
            <button
              onClick={() => setCurrentStep('theme')}
              className={`w-full text-left rounded-2xl p-6 border-2 transition-all ${
                builderState.theme.defined 
                  ? 'bg-lexa-gold/10 border-lexa-gold hover:bg-lexa-gold/20' 
                  : 'bg-white/5 border-white/10 hover:border-lexa-gold/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Sparkles className={`w-6 h-6 ${builderState.theme.defined ? 'text-lexa-gold' : 'text-zinc-400'}`} />
                  <div>
                    <p className="text-sm text-zinc-400 uppercase tracking-wider">What</p>
                    <p className="text-xl font-bold text-white">
                      {builderState.theme.name || 'Click to choose'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {builderState.theme.defined ? (
                    <div className="flex items-center gap-2 text-lexa-gold text-sm font-medium">
                      <Check className="w-4 h-4" />
                      <span>You chose</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Suggest best option</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setCurrentStep('choose_entry')}
              className="px-8 py-4 rounded-xl border-2 border-white/20 text-white font-semibold hover:border-white/40 hover:bg-white/5 transition-all"
            >
              Start Over
            </button>
            <button
              onClick={handleRequestSuggestion}
              disabled={isLoading}
              className="group relative overflow-hidden px-8 py-4 rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 text-zinc-900 font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50 flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Getting suggestions...' : 'Continue'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render approval screen (after getting AI suggestions)
  if (currentStep === 'approval') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black flex items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Here's what I see...</h2>
            <p className="text-zinc-400 mb-2">This is your starting point. I'll refine it through conversation.</p>
            <p className="text-sm text-zinc-500 italic">Next: 3 questions to understand what you truly desire</p>
          </div>

          {/* Summary Cards */}
          <div className="space-y-4 mb-12">
            {/* Time */}
            <div className={`rounded-2xl p-6 border-2 ${builderState.time.defined ? 'bg-lexa-gold/10 border-lexa-gold' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Calendar className={`w-6 h-6 ${builderState.time.defined ? 'text-lexa-gold' : 'text-zinc-400'}`} />
                  <div>
                    <p className="text-sm text-zinc-400 uppercase tracking-wider">When</p>
                    <p className="text-xl font-bold text-white">
                      {builderState.time.month ? builderState.time.month.charAt(0).toUpperCase() + builderState.time.month.slice(1) : 'Not selected'} {builderState.time.year}
                    </p>
                  </div>
                </div>
                {builderState.time.defined && (
                  <div className="flex items-center gap-2 text-lexa-gold text-sm font-medium">
                    <Check className="w-4 h-4" />
                    <span>You chose</span>
                  </div>
                )}
                {!builderState.time.defined && (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>My suggestion</span>
                  </div>
                )}
              </div>
            </div>

            {/* Destination */}
            <div className={`rounded-2xl p-6 border-2 ${builderState.destination.defined ? 'bg-lexa-gold/10 border-lexa-gold' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <MapPin className={`w-6 h-6 ${builderState.destination.defined ? 'text-lexa-gold' : 'text-zinc-400'}`} />
                  <div>
                    <p className="text-sm text-zinc-400 uppercase tracking-wider">Where</p>
                    <p className="text-xl font-bold text-white">
                      {builderState.destination.name || 'Not selected'}
                    </p>
                  </div>
                </div>
                {builderState.destination.defined && (
                  <div className="flex items-center gap-2 text-lexa-gold text-sm font-medium">
                    <Check className="w-4 h-4" />
                    <span>You chose</span>
                  </div>
                )}
                {!builderState.destination.defined && (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>My suggestion</span>
                  </div>
                )}
              </div>
            </div>

            {/* Theme */}
            <div className={`rounded-2xl p-6 border-2 ${builderState.theme.defined ? 'bg-lexa-gold/10 border-lexa-gold' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Sparkles className={`w-6 h-6 ${builderState.theme.defined ? 'text-lexa-gold' : 'text-zinc-400'}`} />
                  <div>
                    <p className="text-sm text-zinc-400 uppercase tracking-wider">What</p>
                    <p className="text-xl font-bold text-white">
                      {builderState.theme.name || 'Not selected'}
                    </p>
                  </div>
                </div>
                {builderState.theme.defined && (
                  <div className="flex items-center gap-2 text-lexa-gold text-sm font-medium">
                    <Check className="w-4 h-4" />
                    <span>You chose</span>
                  </div>
                )}
                {!builderState.theme.defined && (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>My suggestion</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setCurrentStep('choose_entry')}
              className="px-8 py-4 rounded-xl border-2 border-white/20 text-white font-semibold hover:border-white/40 hover:bg-white/5 transition-all"
            >
              Start Over
            </button>
            <button
              onClick={handleApprove}
              className="group relative overflow-hidden px-10 py-4 rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 text-zinc-900 font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-lexa-gold/50 flex items-center gap-2"
            >
              <span>Continue to AIlessia</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

