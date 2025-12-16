/**
 * INITIAL_QUESTIONS Stage - When, Where, What Theme
 * Core questions to activate RAG system
 */

import { SessionState, StageTransitionResult, Brief } from '../types';
import { 
  getRecommendations, 
  getDestinationsByMonth, 
  searchDestinations,
  searchThemes 
} from '../../neo4j/queries';

export async function processInitialQuestionsStage(
  state: SessionState,
  userInput: string
): Promise<StageTransitionResult> {
  const lowerInput = userInput.toLowerCase();
  
  // Track what the user has answered
  const hasWhen = state.brief?.when_at?.timeframe || detectTimeframe(lowerInput);
  const hasWhere = state.brief?.where_at?.destination || detectDestination(lowerInput);
  const hasTheme = state.brief?.theme || detectTheme(lowerInput);
  
  // User must answer at least ONE question
  const answeredCount = [hasWhen, hasWhere, hasTheme].filter(Boolean).length;
  
  if (answeredCount === 0) {
    // Still waiting for an answer
    return {
      nextStage: 'INITIAL_QUESTIONS',
      updatedState: state,
      message: `I understand you're considering your options. Could you share at least one detail? When might you travel, where you're drawn to, or what kind of experience calls to you?`
    };
  }
  
  // User has given at least one answer - get recommendations
  try {
    const month = extractMonth(userInput, state);
    const destination = extractDestinationQuery(userInput, state);
    const theme = extractThemeQuery(userInput, state);
    
    const recommendations = await getRecommendations({
      month,
      destination,
      theme
    });
    
    if (recommendations.length > 0) {
      // Store recommendations in state
      const topRec = recommendations[0];
      
      const updatedBrief: Brief = {
        ...state.brief,
        when_at: hasWhen
          ? state.brief?.when_at
          : {
              timeframe: month || 'flexible',
              dates: null,
              flexibility: 'flexible_by_days' as const,
            },
        where_at: {
          destination: topRec.destination.name,
          regions: [topRec.destination.region],
          hints: topRec.destination.description || ''
        },
        theme: topRec.themes[0]?.name || theme || null
      };
      
      // Generate a luxury response
      const message = generateRecommendationMessage(recommendations, { month, destination, theme });
      
      return {
        nextStage: 'MIRROR',
        updatedState: {
          brief: updatedBrief
        },
        message
      };
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error);
  }
  
  // Fallback if Neo4j query fails
  return {
    nextStage: 'MIRROR',
    updatedState: state,
    message: `I hear you. Let me understand what you're truly seeking. Tell me more about what draws you to this experience.`
  };
}

export function getInitialQuestionsSystemPrompt(): string {
  return `You are LEXA, a luxury travel experience designer. You are sophisticated, perceptive, and elegantly direct.

Your goal in the INITIAL_QUESTIONS stage is to gather at least ONE of these three pieces of information:

1. **When** do they want to travel? (month, season, timeframe)
2. **Where** are they drawn to? (destination, region, type of place)
3. **What theme** calls to them? (adventure, culinary, wellness, romance, cultural, etc.)

**Your tone:**
- Refined and professional
- Warm but not effusive
- Confident without arrogance
- Ask one elegant question at a time
- Listen deeply between the lines

**Script:**

"Three questions to begin:

**When** might you travel? 
**Where** does your imagination wander? 
**What kind of experience** are you seeking?

Share whatever comes to mind first. One answer is enough to start."

**Important:**
- If they answer even ONE question, move forward with intelligent recommendations
- Read emotional cues: Are they decisive? Exploratory? Uncertain?
- Match their energy: If they're concise, be concise. If they elaborate, engage deeply.
- Never ask all three again if they've answered one

Keep it under 60 words unless they ask for more detail.`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectTimeframe(input: string): boolean {
  const timeIndicators = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    'summer', 'winter', 'spring', 'fall', 'autumn',
    'month', 'week', 'next', 'this', 'season'
  ];
  
  return timeIndicators.some(indicator => input.includes(indicator));
}

function detectDestination(input: string): boolean {
  const locationIndicators = [
    'france', 'italy', 'greece', 'caribbean', 'mediterranean', 'adriatic',
    'bahamas', 'amalfi', 'riviera', 'cyclades', 'dubai', 'uae',
    'island', 'coast', 'beach', 'mountains', 'city', 'countryside'
  ];
  
  return locationIndicators.some(indicator => input.includes(indicator));
}

function detectTheme(input: string): boolean {
  const themeIndicators = [
    'adventure', 'culinary', 'food', 'wellness', 'spa', 'relaxation',
    'romance', 'romantic', 'culture', 'cultural', 'art', 'history',
    'family', 'kids', 'children', 'water', 'sailing', 'diving',
    'nightlife', 'party', 'nature', 'wildlife', 'hiking'
  ];
  
  return themeIndicators.some(indicator => input.includes(indicator));
}

function extractMonth(input: string, state: SessionState): string | undefined {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const lowerInput = input.toLowerCase();
  
  for (const month of months) {
    if (lowerInput.includes(month)) {
      return month.charAt(0).toUpperCase() + month.slice(1);
    }
  }
  
  // Check brief state
  if (state.brief?.when_at?.timeframe) {
    return state.brief.when_at.timeframe;
  }
  
  return undefined;
}

function extractDestinationQuery(input: string, state: SessionState): string | undefined {
  // Look for destination keywords
  const destinations = [
    'french riviera', 'amalfi coast', 'amalfi', 'cyclades', 'adriatic',
    'ionian', 'balearics', 'bahamas', 'bvi', 'usvi', 'caribbean',
    'dubai', 'uae', 'arabian gulf', 'mediterranean'
  ];
  
  const lowerInput = input.toLowerCase();
  
  for (const dest of destinations) {
    if (lowerInput.includes(dest)) {
      return dest;
    }
  }
  
  if (state.brief?.where_at?.destination) {
    return state.brief.where_at.destination;
  }
  
  return undefined;
}

function extractThemeQuery(input: string, state: SessionState): string | undefined {
  const themes = [
    'adventure', 'culinary', 'wellness', 'romance', 'cultural',
    'family', 'water sports', 'art', 'nightlife', 'nature'
  ];
  
  const lowerInput = input.toLowerCase();
  
  for (const theme of themes) {
    if (lowerInput.includes(theme)) {
      return theme;
    }
  }
  
  if (state.brief?.theme) {
    return state.brief.theme;
  }
  
  return undefined;
}

function generateRecommendationMessage(
  recommendations: Awaited<ReturnType<typeof getRecommendations>>,
  params: { month?: string; destination?: string; theme?: string }
): string {
  const top = recommendations[0];
  
  if (!top) {
    return `I hear what you're seeking. Let me understand more deeply what calls to you.`;
  }
  
  const parts: string[] = [];
  
  // Opening
  if (params.month && params.destination) {
    parts.push(`${top.destination.name} in ${params.month}.`);
  } else if (params.month) {
    parts.push(`For ${params.month}, I see ${top.destination.name}.`);
  } else if (params.destination) {
    parts.push(`${top.destination.name}.`);
  } else {
    parts.push(`I'm drawn to ${top.destination.name} for you.`);
  }
  
  // Reasoning
  parts.push(top.reasoning);
  
  // Theme connection
  if (top.themes.length > 0 && params.theme) {
    const matchingTheme = top.themes.find(t => 
      t.name.toLowerCase().includes(params.theme!.toLowerCase())
    );
    if (matchingTheme) {
      parts.push(`Perfect for your ${matchingTheme.name.toLowerCase()} vision.`);
    }
  }
  
  // Closing
  parts.push(`Does this resonate?`);
  
  return parts.join(' ');
}

