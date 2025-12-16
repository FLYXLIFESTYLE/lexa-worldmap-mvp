/**
 * BRIEFING_COLLECT Stage - Flexible Data Collection
 * Collects all 10 required fields for Operations Agent handoff
 */

import { SessionState, StageTransitionResult } from '../types';

// ============================================================================
// REQUIRED FIELDS CHECKLIST
// ============================================================================

const REQUIRED_FIELDS = [
  'when',
  'where',
  'theme',
  'budget',
  'duration',
  'emotional_goals',
  'must_haves',
  'best_experiences',
  'worst_experiences',
  'bucket_list',
] as const;

type RequiredField = typeof REQUIRED_FIELDS[number];

// ============================================================================
// FIELD VALIDATION
// ============================================================================

export function getNextMissingField(state: SessionState): RequiredField | null {
  const { brief, emotions } = state;
  
  if (!brief.when_at) return 'when';
  if (!brief.where_at) return 'where';
  if (!brief.theme) return 'theme';
  if (!brief.budget) return 'budget';
  if (!brief.duration) return 'duration';
  if (!emotions.success_definition) return 'emotional_goals';
  if (brief.must_haves.length === 0) return 'must_haves';
  if (brief.best_experiences.length === 0) return 'best_experiences';
  if (brief.worst_experiences.length === 0) return 'worst_experiences';
  if (brief.bucket_list.length === 0) return 'bucket_list';
  
  return null; // All fields collected!
}

export function hasAtLeastOneCoreField(state: SessionState): boolean {
  const { when_at, where_at, theme } = state.brief;
  return !!(when_at || where_at || theme);
}

export function areAllFieldsCollected(state: SessionState): boolean {
  return getNextMissingField(state) === null;
}

// ============================================================================
// FIELD-SPECIFIC PROMPTS
// ============================================================================

export function getFieldPrompt(field: RequiredField, state: SessionState): string {
  switch (field) {
    case 'when':
      return `When are you thinking? (Give me a timeframe or specific dates.)`;
    
    case 'where':
      if (state.brief.when_at) {
        return `You said ${JSON.stringify(state.brief.when_at)}. Now, where? (A destination or region, or say "suggest" and I'll recommend based on what you want to feel.)`;
      }
      return `Where do you want to go? (A destination or region, or say "suggest" for recommendations.)`;
    
    case 'theme':
      if (state.brief.when_at && state.brief.where_at) {
        return `What kind of experience theme resonates? (e.g., "Mediterranean Indulgence", "Adventure & Privacy", or say "suggest".)`;
      }
      return `What theme or type of experience? (Say "suggest" if you want recommendations.)`;
    
    case 'budget':
      return `Budget range? (Give me a number and currency, or just say "moderate luxury" / "ultra-luxury".)`;
    
    case 'duration':
      return `How many days? (Be specific or say "flexible".)`;
    
    case 'emotional_goals':
      return `Define success in one line: "I want to feel ___ when it's done."`;
    
    case 'must_haves':
      return `What's non-negotiable? (Must-haves, even if it's "nothing".)`;
    
    case 'best_experiences':
      return `Tell me about one of your best travel experiences—and why it worked.`;
    
    case 'worst_experiences':
      return `And one of your worst—what ruined it?`;
    
    case 'bucket_list':
      return `Anything on your bucket list for this trip?`;
    
    default:
      return `Tell me more.`;
  }
}

// ============================================================================
// MAIN PROCESSING LOGIC
// ============================================================================

export function processBriefingCollectStage(
  state: SessionState,
  userInput: string,
  extractedData: Partial<SessionState['brief']>
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  // Check if user wants suggestions
  const wantsSuggestions = 
    lowerInput.includes('suggest') ||
    lowerInput.includes('recommend') ||
    lowerInput.includes('help me choose');
  
  // If they want suggestions and we have at least one core field
  if (wantsSuggestions && hasAtLeastOneCoreField(state)) {
    return {
      nextStage: 'BRIEFING_COLLECT',
      updatedState: {
        briefing_progress: {
          ...state.briefing_progress,
          suggestions_offered: true,
        },
      },
      message: `Let me suggest based on what you want to feel...`,
    };
  }
  
  // Merge extracted data into state
  const updatedBrief = {
    ...state.brief,
    ...extractedData,
  };
  
  // Check if all fields are now collected
  const updatedState = {
    ...state,
    brief: updatedBrief,
  };
  
  if (areAllFieldsCollected(updatedState)) {
    return {
      nextStage: 'SCRIPT_DRAFT',
      updatedState: {
        brief: updatedBrief,
      },
      message: `Perfect. I have everything I need to design your Experience Script.`,
    };
  }
  
  // Get next missing field
  const nextField = getNextMissingField(updatedState);
  
  if (!nextField) {
    return {
      nextStage: 'SCRIPT_DRAFT',
      updatedState: {
        brief: updatedBrief,
      },
      message: `All set. Let me draft your script.`,
    };
  }
  
  // Ask for the next field
  return {
    nextStage: 'BRIEFING_COLLECT',
    updatedState: {
      brief: updatedBrief,
      briefing_progress: {
        ...state.briefing_progress,
        fields_collected: [
          ...state.briefing_progress.fields_collected,
          nextField,
        ],
      },
    },
    message: getFieldPrompt(nextField, updatedState),
  };
}

// ============================================================================
// SYSTEM PROMPT FOR CLAUDE
// ============================================================================

export function getBriefingCollectSystemPrompt(state: SessionState): string {
  const nextField = getNextMissingField(state);
  const fieldsCollected = state.briefing_progress.fields_collected;
  
  return `You are LEXA in the BRIEFING_COLLECT stage. You're gathering data for an Operations Agent to design a luxury travel experience.

**Required Fields (10 total):**
1. when (timeframe/dates)
2. where (destination)
3. theme (experience type)
4. budget
5. duration
6. emotional_goals (success definition)
7. must_haves
8. best_experiences (and why)
9. worst_experiences (and why)
10. bucket_list

**Fields Collected So Far:** ${fieldsCollected.join(', ') || 'none'}

**Next Field to Collect:** ${nextField || 'all done'}

**User's Input:** [The user just responded]

Your job:
1. Extract the data from their response and map it to the correct field structure
2. If they say "suggest", offer suggestions based on their emotional goals and existing data
3. Ask for the next missing field using natural, conversational language
4. Keep the tone: bold but humble, efficient but not robotic

**Field Structures:**
- when: { timeframe: string, dates: { start: ISO date, end: ISO date }, flexibility: "fixed" | "flexible_by_days" | "flexible_by_weeks" }
- where: { destination: string, regions: string[], hints: string }
- theme: string
- budget: { amount: number, currency: string, sensitivity: "moderate" | "high" | "ultra" }
- duration: { days: number, flexibility: "exact" | "can_extend" | "flexible" }
- emotional_goals: { desired_feelings: string[], avoid_fears: string[], success_definition: string }
- must_haves: string[]
- best_experiences: [{ experience: string, why: string }]
- worst_experiences: [{ experience: string, why: string }]
- bucket_list: string[]

Extract the data and continue the conversation naturally.`;
}

