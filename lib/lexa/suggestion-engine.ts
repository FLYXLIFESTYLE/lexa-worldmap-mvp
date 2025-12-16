/**
 * LEXA Suggestion Engine
 * Recommends destinations/themes based on partial input
 * 
 * Currently uses hardcoded logic, structured for later Neo4j integration
 */

import { SuggestionEngineInput, SuggestionEngineOutput, WhenData } from './types';

// Available destinations from our data
const DESTINATIONS = [
  'French Riviera',
  'Amalfi Coast',
  'Balearics',
  'Cyclades',
  'BVI',
  'USVI',
  'Bahamas',
  'Dutch Antilles',
  'French Antilles',
  'Arabian Gulf (UAE)',
  'Adriatic (North)',
  'Adriatic (Central)',
  'Adriatic (South)',
  'Ionian Sea',
] as const;

// Seasonality mapping (best months for each destination)
const SEASONALITY: Record<string, string[]> = {
  'French Riviera': ['May', 'June', 'July', 'August', 'September'],
  'Amalfi Coast': ['May', 'June', 'July', 'August', 'September'],
  'Balearics': ['May', 'June', 'July', 'August', 'September', 'October'],
  'Cyclades': ['May', 'June', 'July', 'August', 'September', 'October'],
  'BVI': ['December', 'January', 'February', 'March', 'April', 'May'],
  'USVI': ['December', 'January', 'February', 'March', 'April', 'May'],
  'Bahamas': ['December', 'January', 'February', 'March', 'April', 'May'],
  'Dutch Antilles': ['December', 'January', 'February', 'March', 'April', 'May'],
  'French Antilles': ['December', 'January', 'February', 'March', 'April', 'May'],
  'Arabian Gulf (UAE)': ['November', 'December', 'January', 'February', 'March', 'April'],
  'Adriatic (North)': ['June', 'July', 'August', 'September'],
  'Adriatic (Central)': ['May', 'June', 'July', 'August', 'September'],
  'Adriatic (South)': ['May', 'June', 'July', 'August', 'September', 'October'],
  'Ionian Sea': ['May', 'June', 'July', 'August', 'September', 'October'],
};

// Theme mapping based on emotional goals
const EMOTION_TO_THEME: Record<string, string> = {
  peace: 'Mediterranean Serenity',
  calm: 'Mediterranean Serenity',
  tranquility: 'Mediterranean Serenity',
  
  aliveness: 'Adventure & Discovery',
  excitement: 'Adventure & Discovery',
  thrill: 'Adventure & Discovery',
  
  intimacy: 'Romantic Escape',
  connection: 'Romantic Escape',
  romance: 'Romantic Escape',
  
  freedom: 'Open Water Freedom',
  liberation: 'Open Water Freedom',
  
  significance: 'Legacy Experience',
  meaning: 'Legacy Experience',
  purpose: 'Legacy Experience',
  
  luxury: 'Ultra-Luxury Indulgence',
  indulgence: 'Ultra-Luxury Indulgence',
};

// Destination characteristics for emotion matching
const DESTINATION_EMOTIONS: Record<string, string[]> = {
  'Ionian Sea': ['peace', 'calm', 'intimacy', 'tranquility'],
  'French Riviera': ['luxury', 'sophistication', 'indulgence', 'aliveness'],
  'Amalfi Coast': ['romance', 'intimacy', 'beauty', 'peace'],
  'Cyclades': ['freedom', 'discovery', 'aliveness', 'peace'],
  'BVI': ['freedom', 'adventure', 'privacy', 'peace'],
  'USVI': ['accessibility', 'family', 'ease', 'comfort'],
  'Bahamas': ['luxury', 'indulgence', 'relaxation', 'privacy'],
  'Arabian Gulf (UAE)': ['ultra-luxury', 'exclusivity', 'significance', 'modernity'],
  'Balearics': ['privacy', 'luxury', 'calm', 'intimacy'],
  'Adriatic (North)': ['history', 'culture', 'sophistication', 'discovery'],
  'Adriatic (Central)': ['discovery', 'history', 'adventure', 'authenticity'],
  'Adriatic (South)': ['authenticity', 'peace', 'beauty', 'discovery'],
  'Dutch Antilles': ['diversity', 'adventure', 'authenticity', 'freedom'],
  'French Antilles': ['sophistication', 'culture', 'indulgence', 'peace'],
};

// ============================================================================
// MAIN SUGGESTION ENGINE
// ============================================================================

export function suggestDestinationAndTheme(
  input: SuggestionEngineInput
): SuggestionEngineOutput {
  const { when_at, where_at, theme, emotions } = input;
  
  // If they already have all three, no need to suggest
  if (when_at && where_at && theme) {
    return {
      destination: where_at.destination || undefined,
      theme: theme,
      reasoning: 'You already have all core elements.',
    };
  }
  
  // Case 1: They have WHEN, suggest WHERE + THEME
  if (when_at && !where_at && !theme) {
    return suggestFromTimeframe(when_at, emotions);
  }
  
  // Case 2: They have WHERE, suggest THEME
  if (where_at && !theme) {
    return suggestThemeFromDestination(where_at.destination, emotions);
  }
  
  // Case 3: They have THEME, suggest WHERE
  if (theme && !where_at) {
    return suggestDestinationFromTheme(theme, emotions, when_at);
  }
  
  // Case 4: They have nothing yet, suggest based on emotions only
  if (!when_at && !where_at && !theme) {
    return suggestFromEmotionsOnly(emotions);
  }
  
  // Default fallback
  return {
    reasoning: 'Tell me more about what you want to feel, and I can suggest something specific.',
  };
}

// ============================================================================
// SUGGESTION STRATEGIES
// ============================================================================

function suggestFromTimeframe(
  when: WhenData,
  emotions: { desired: string[]; avoid_fears: string[] }
): SuggestionEngineOutput {
  const month = extractMonth(when.timeframe);
  
  if (!month) {
    return {
      reasoning: 'Give me a specific month or timeframe and I can suggest the best destinations.',
    };
  }
  
  // Find destinations that are good for this month
  const goodDestinations = DESTINATIONS.filter(dest => 
    SEASONALITY[dest]?.includes(month)
  );
  
  // Match destinations with emotions
  const emotionKeywords = emotions.desired.map(e => e.toLowerCase());
  const bestMatch = goodDestinations.find(dest => {
    const destEmotions = DESTINATION_EMOTIONS[dest] || [];
    return destEmotions.some(de => 
      emotionKeywords.some(ek => de.includes(ek) || ek.includes(de))
    );
  });
  
  const suggestedDest = bestMatch || goodDestinations[0];
  const suggestedTheme = findThemeForEmotions(emotions.desired);
  
  return {
    destination: suggestedDest || undefined,
    theme: suggestedTheme,
    reasoning: `For ${month}, ${suggestedDest} offers ${emotions.desired.join(' and ')}. The theme "${suggestedTheme}" matches what you want to feel, while avoiding ${emotions.avoid_fears.join(' and ')}.`,
  };
}

function suggestThemeFromDestination(
  destination: string | null,
  emotions: { desired: string[]; avoid_fears: string[] }
): SuggestionEngineOutput {
  const theme = findThemeForEmotions(emotions.desired);
  
  return {
    theme,
    reasoning: `For ${destination}, I suggest the theme "${theme}" because you want to feel ${emotions.desired.join(' and ')}.`,
  };
}

function suggestDestinationFromTheme(
  theme: string,
  emotions: { desired: string[]; avoid_fears: string[] },
  when?: WhenData | null
): SuggestionEngineOutput {
  // Match theme keywords with destination emotions
  const themeLower = theme.toLowerCase();
  const emotionKeywords = emotions.desired.map(e => e.toLowerCase());
  
  let candidates = DESTINATIONS;
  
  // Filter by season if provided
  if (when) {
    const month = extractMonth(when.timeframe);
    if (month) {
      candidates = candidates.filter(dest => 
        SEASONALITY[dest]?.includes(month)
      );
    }
  }
  
  // Find best emotional match
  const bestMatch = candidates.find(dest => {
    const destEmotions = DESTINATION_EMOTIONS[dest] || [];
    return destEmotions.some(de => 
      emotionKeywords.some(ek => de.includes(ek) || ek.includes(de)) ||
      themeLower.includes(de)
    );
  });
  
  return {
    destination: bestMatch || candidates[0],
    reasoning: `For the theme "${theme}", ${bestMatch} is the best match for ${emotions.desired.join(' and ')}.`,
  };
}

function suggestFromEmotionsOnly(
  emotions: { desired: string[]; avoid_fears: string[] }
): SuggestionEngineOutput {
  const theme = findThemeForEmotions(emotions.desired);
  const emotionKeywords = emotions.desired.map(e => e.toLowerCase());
  
  // Find destination that matches emotions
  const bestDest = DESTINATIONS.find(dest => {
    const destEmotions = DESTINATION_EMOTIONS[dest] || [];
    return destEmotions.some(de => 
      emotionKeywords.some(ek => de.includes(ek) || ek.includes(de))
    );
  });
  
  return {
    destination: bestDest,
    theme,
    reasoning: `Based on your desire for ${emotions.desired.join(' and ')}, I suggest ${bestDest} with the theme "${theme}". This avoids ${emotions.avoid_fears.join(' and ')}.`,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMonth(timeframe: string | null): string | null {
  if (!timeframe) return null;
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const lowerTimeframe = timeframe.toLowerCase();
  
  for (const month of months) {
    if (lowerTimeframe.includes(month.toLowerCase())) {
      return month;
    }
  }
  
  return null;
}

function findThemeForEmotions(desiredEmotions: string[]): string {
  for (const emotion of desiredEmotions) {
    const lowerEmotion = emotion.toLowerCase();
    for (const [key, theme] of Object.entries(EMOTION_TO_THEME)) {
      if (lowerEmotion.includes(key) || key.includes(lowerEmotion)) {
        return theme;
      }
    }
  }
  
  // Default theme
  return 'Curated Luxury Experience';
}

// ============================================================================
// NEO4J INTEGRATION PLACEHOLDER
// ============================================================================

/**
 * Future: Call Neo4j to get smarter recommendations based on:
 * - POI data
 * - User preferences graph
 * - Historical experience data
 * - Seasonal patterns
 */
export async function suggestFromNeo4j(
  input: SuggestionEngineInput
): Promise<SuggestionEngineOutput> {
  // TODO: Implement Neo4j integration
  // For now, fall back to hardcoded logic
  return suggestDestinationAndTheme(input);
}

