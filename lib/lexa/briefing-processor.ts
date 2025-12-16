/**
 * Briefing Processor - Integrates all 10 required fields collection
 * Combines state machine, Claude extraction, and suggestion engine
 */

import { SessionState } from './types';
import { extractBriefField } from './claude-client';
import { suggestDestinationAndTheme } from './suggestion-engine';
import { 
  getNextMissingField,
  getFieldPrompt,
  areAllFieldsCollected,
  hasAtLeastOneCoreField 
} from './stages/briefing-collect';

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

export interface BriefingProcessResult {
  updatedState: Partial<SessionState>;
  nextPrompt: string;
  isComplete: boolean;
  suggestionOffered?: boolean;
}

export async function processBriefingInput(
  currentState: SessionState,
  userInput: string
): Promise<BriefingProcessResult> {
  const lowerInput = userInput.toLowerCase();
  
  // Check if user wants suggestions
  const wantsSuggestions = 
    lowerInput.includes('suggest') ||
    lowerInput.includes('recommend') ||
    lowerInput.includes('help me');
  
  // If they want suggestions and we have at least one core field
  if (wantsSuggestions && hasAtLeastOneCoreField(currentState)) {
    const suggestion = suggestDestinationAndTheme({
      when_at: currentState.brief.when_at || undefined,
      where_at: currentState.brief.where_at || undefined,
      theme: currentState.brief.theme || undefined,
      emotions: {
        desired: currentState.emotions.desired,
        avoid_fears: currentState.emotions.avoid_fears,
      },
    });
    
    let suggestionMessage = `Based on what you want to feel, here's what I suggest:\n\n`;
    
    if (suggestion.destination) {
      suggestionMessage += `**Destination:** ${suggestion.destination}\n`;
    }
    if (suggestion.theme) {
      suggestionMessage += `**Theme:** ${suggestion.theme}\n`;
    }
    suggestionMessage += `\n${suggestion.reasoning}\n\nDoes this resonate?`;
    
    return {
      updatedState: {
        briefing_progress: {
          ...currentState.briefing_progress,
          suggestions_offered: true,
        },
      },
      nextPrompt: suggestionMessage,
      isComplete: false,
      suggestionOffered: true,
    };
  }
  
  // Determine which field we're currently collecting
  const currentField = getNextMissingField(currentState);
  
  if (!currentField) {
    // All fields collected!
    return {
      updatedState: {},
      nextPrompt: 'Perfect. I have everything I need to design your Experience Script.',
      isComplete: true,
    };
  }
  
  // Extract the field from user input using Claude
  const extraction = await extractBriefField({
    userMessage: userInput,
    fieldName: currentField,
    currentState,
  });
  
  // Merge extracted data into state
  const updatedBrief = { ...currentState.brief };
  const updatedEmotions = { ...currentState.emotions };
  
  // Map extracted data to the correct field
  if (extraction.fieldValue && extraction.confidence > 0.3) {
    switch (currentField) {
      case 'when':
        updatedBrief.when_at = normalizeWhenData(extraction.fieldValue);
        break;
      case 'where':
        updatedBrief.where_at = normalizeWhereData(extraction.fieldValue);
        break;
      case 'theme':
        updatedBrief.theme = extraction.fieldValue as string;
        break;
      case 'budget':
        updatedBrief.budget = normalizeBudgetData(extraction.fieldValue);
        break;
      case 'duration':
        updatedBrief.duration = normalizeDurationData(extraction.fieldValue);
        break;
      case 'emotional_goals':
        updatedEmotions.success_definition = extraction.fieldValue as string;
        break;
      case 'must_haves':
        updatedBrief.must_haves = normalizeArray(extraction.fieldValue);
        break;
      case 'best_experiences':
        updatedBrief.best_experiences = normalizeExperiences(extraction.fieldValue);
        break;
      case 'worst_experiences':
        updatedBrief.worst_experiences = normalizeExperiences(extraction.fieldValue);
        break;
      case 'bucket_list':
        updatedBrief.bucket_list = normalizeArray(extraction.fieldValue);
        break;
    }
  }
  
  // Create updated state
  const newState: SessionState = {
    ...currentState,
    brief: updatedBrief,
    emotions: updatedEmotions,
    briefing_progress: {
      ...currentState.briefing_progress,
      fields_collected: [
        ...currentState.briefing_progress.fields_collected,
        currentField,
      ],
    },
  };
  
  // Check if all fields are now collected
  if (areAllFieldsCollected(newState)) {
    return {
      updatedState: {
        brief: updatedBrief,
        emotions: updatedEmotions,
        briefing_progress: newState.briefing_progress,
      },
      nextPrompt: 'Perfect. I have everything I need. Let me design your Experience Script.',
      isComplete: true,
    };
  }
  
  // Get the next field to collect
  const nextField = getNextMissingField(newState);
  const nextPrompt = nextField ? getFieldPrompt(nextField, newState) : 'All set!';
  
  return {
    updatedState: {
      brief: updatedBrief,
      emotions: updatedEmotions,
      briefing_progress: newState.briefing_progress,
    },
    nextPrompt,
    isComplete: false,
  };
}

// ============================================================================
// DATA NORMALIZATION HELPERS
// ============================================================================

function normalizeWhenData(rawData: any): any {
  if (typeof rawData === 'string') {
    return {
      timeframe: rawData,
      dates: null,
      flexibility: 'flexible_by_days',
    };
  }
  return rawData;
}

function normalizeWhereData(rawData: any): any {
  if (typeof rawData === 'string') {
    return {
      destination: rawData,
      regions: [],
      hints: null,
    };
  }
  return rawData;
}

function normalizeBudgetData(rawData: any): any {
  if (typeof rawData === 'number') {
    return {
      amount: rawData,
      currency: 'USD',
      sensitivity: 'moderate',
    };
  }
  if (typeof rawData === 'string') {
    const lowerRaw = rawData.toLowerCase();
    if (lowerRaw.includes('ultra')) {
      return { amount: null, currency: 'USD', sensitivity: 'ultra' as const };
    }
    if (lowerRaw.includes('high')) {
      return { amount: null, currency: 'USD', sensitivity: 'high' as const };
    }
    return { amount: null, currency: 'USD', sensitivity: 'moderate' as const };
  }
  return rawData;
}

function normalizeDurationData(rawData: any): any {
  if (typeof rawData === 'number') {
    return {
      days: rawData,
      flexibility: 'exact',
    };
  }
  if (typeof rawData === 'string') {
    const match = rawData.match(/(\d+)/);
    if (match) {
      return {
        days: parseInt(match[1]),
        flexibility: rawData.toLowerCase().includes('flexible') ? 'flexible' : 'exact',
      };
    }
  }
  return rawData;
}

function normalizeArray(rawData: any): string[] {
  if (Array.isArray(rawData)) {
    return rawData;
  }
  if (typeof rawData === 'string') {
    return [rawData];
  }
  return [];
}

function normalizeExperiences(rawData: any): Array<{ experience: string; why: string }> {
  if (Array.isArray(rawData)) {
    return rawData;
  }
  if (typeof rawData === 'object' && rawData.experience && rawData.why) {
    return [rawData];
  }
  if (typeof rawData === 'string') {
    return [{
      experience: rawData,
      why: 'User mentioned this experience',
    }];
  }
  return [];
}

