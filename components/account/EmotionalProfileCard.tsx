'use client';

import { Heart, Sparkles, Mountain, Waves } from 'lucide-react';

interface EmotionalProfileCardProps {
  profile: {
    core_emotions?: string[];
    secondary_emotions?: string[];
    personality_traits?: Record<string, number>;
  };
  primaryThemes?: string[];
  personalityArchetype?: string;
}

const emotionIcons: Record<string, any> = {
  freedom: Sparkles,
  connection: Heart,
  awe: Mountain,
  peace: Waves,
  thrill: Sparkles,
  belonging: Heart
};

const emotionColors: Record<string, string> = {
  freedom: 'bg-sky-100 text-sky-700 border-sky-300',
  connection: 'bg-rose-100 text-rose-700 border-rose-300',
  awe: 'bg-purple-100 text-purple-700 border-purple-300',
  peace: 'bg-teal-100 text-teal-700 border-teal-300',
  thrill: 'bg-orange-100 text-orange-700 border-orange-300',
  belonging: 'bg-pink-100 text-pink-700 border-pink-300'
};

export function EmotionalProfileCard({ 
  profile, 
  primaryThemes = [],
  personalityArchetype 
}: EmotionalProfileCardProps) {
  const coreEmotions = profile?.core_emotions || [];
  const secondaryEmotions = profile?.secondary_emotions || [];

  return (
    <div className="rounded-lg border border-lexa-navy/10 bg-white">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-lexa-gold" />
          Emotional Profile
        </h3>
      </div>
      <div className="p-6 space-y-6">
        {/* Personality Archetype */}
        {personalityArchetype && (
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Personality Type</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-lexa-gold/10 text-lexa-gold border border-lexa-gold">
              {personalityArchetype}
            </span>
          </div>
        )}

        {/* Core Emotions */}
        {coreEmotions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Core Emotions</p>
            <div className="flex flex-wrap gap-2">
              {coreEmotions.map((emotion) => {
                const Icon = emotionIcons[emotion.toLowerCase()] || Heart;
                const colorClass = emotionColors[emotion.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-300';
                return (
                  <span 
                    key={emotion} 
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}
                  >
                    <Icon className="h-3 w-3" />
                    {emotion}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Secondary Emotions */}
        {secondaryEmotions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Secondary Emotions</p>
            <div className="flex flex-wrap gap-2">
              {secondaryEmotions.map((emotion) => {
                const colorClass = emotionColors[emotion.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-300';
                return (
                  <span 
                    key={emotion} 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}
                  >
                    {emotion}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary Themes */}
        {primaryThemes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Favorite Themes</p>
            <div className="flex flex-wrap gap-2">
              {primaryThemes.map((theme) => (
                <span 
                  key={theme} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-lexa-navy/5 text-lexa-navy border border-lexa-navy/20"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {coreEmotions.length === 0 && secondaryEmotions.length === 0 && primaryThemes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Heart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Your emotional profile will be discovered through conversations with LEXA</p>
          </div>
        )}
      </div>
    </div>
  );
}
