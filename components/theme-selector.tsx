/**
 * Theme Selection Component
 * Visual card-based selection for LEXA conversation opener
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ThemeCategory {
  name: string;
  icon: string;
  description: string;
  short_description: string;
  luxuryScore: number;
  personality_types: string[];
  evoked_feelings: string[];
  image_url: string;
}

interface ThemeSelectorProps {
  onSelect: (themeName: string) => void;
  selectedTheme?: string | null;
}

export default function ThemeSelector({ onSelect, selectedTheme }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<ThemeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);

  useEffect(() => {
    fetchThemes();
  }, []);

  async function fetchThemes() {
    try {
      const response = await fetch('/api/admin/seed-themes');
      const data = await response.json();
      
      if (data.success) {
        setThemes(data.themes);
      } else {
        setError('Failed to load themes');
      }
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError('Could not connect to database');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full py-12">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-lexa-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-400">Loading experiences...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-12">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-500 font-semibold mb-2">Unable to Load Themes</p>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <button
            onClick={fetchThemes}
            className="px-6 py-3 bg-lexa-gold text-zinc-900 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="w-full py-12">
        <div className="text-center">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-zinc-400 mb-4">No themes available yet</p>
          <p className="text-sm text-zinc-500">Please seed the database first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-light text-white mb-3">
          What kind of experience calls to you?
        </h2>
        <p className="text-zinc-400 text-lg">
          Choose the theme that resonates with your soul
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.name;
          const isHovered = hoveredTheme === theme.name;

          return (
            <button
              key={theme.name}
              onClick={() => onSelect(theme.name)}
              onMouseEnter={() => setHoveredTheme(theme.name)}
              onMouseLeave={() => setHoveredTheme(null)}
              className={`
                relative group overflow-hidden rounded-xl
                transition-all duration-300 ease-out
                ${isSelected 
                  ? 'ring-4 ring-lexa-gold scale-105 shadow-2xl shadow-lexa-gold/30' 
                  : 'ring-1 ring-zinc-700/50 hover:ring-2 hover:ring-lexa-gold/50 hover:scale-102'
                }
              `}
              style={{ height: '320px' }}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={theme.image_url}
                  alt={theme.name}
                  fill
                  className={`
                    object-cover transition-transform duration-700
                    ${isHovered || isSelected ? 'scale-110' : 'scale-100'}
                  `}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
                {/* Gradient Overlay */}
                <div className={`
                  absolute inset-0 bg-gradient-to-t transition-opacity duration-300
                  ${isHovered || isSelected
                    ? 'from-black via-black/70 to-transparent opacity-90'
                    : 'from-black/90 via-black/60 to-transparent opacity-80'
                  }
                `} />
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-end p-6">
                {/* Icon */}
                <div className={`
                  text-5xl mb-3 transition-transform duration-300
                  ${isHovered || isSelected ? 'scale-110' : 'scale-100'}
                `}>
                  {theme.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-2 text-left">
                  {theme.name}
                </h3>

                {/* Description */}
                <p className={`
                  text-sm text-zinc-300 mb-3 text-left transition-all duration-300
                  ${isHovered || isSelected ? 'opacity-100' : 'opacity-80'}
                `}>
                  {theme.description}
                </p>

                {/* Luxury Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${
                          i < Math.floor(theme.luxuryScore / 2)
                            ? 'text-lexa-gold'
                            : 'text-zinc-600'
                        }`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  
                  {isSelected && (
                    <div className="flex items-center gap-1 bg-lexa-gold px-2 py-1 rounded-full">
                      <span className="text-xs font-semibold text-zinc-900">Selected</span>
                      <span className="text-sm">✓</span>
                    </div>
                  )}
                </div>

                {/* Hover Details */}
                {isHovered && !isSelected && (
                  <div className="absolute inset-x-0 bottom-0 p-6 pt-12 bg-gradient-to-t from-black via-black/95 to-transparent">
                    <p className="text-xs text-zinc-400 mb-2">
                      {theme.short_description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {theme.evoked_feelings.slice(0, 3).map((feeling, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-lexa-gold/20 text-lexa-gold rounded-full"
                        >
                          {feeling}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center">
        <p className="text-xs text-zinc-500">
          Not sure yet? You can always refine this later in our conversation.
        </p>
      </div>
    </div>
  );
}

