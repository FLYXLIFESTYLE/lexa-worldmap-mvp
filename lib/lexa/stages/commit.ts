/**
 * COMMIT Stage - Choose Fast or Deep Path
 */

import { SessionState, StageTransitionResult } from '../types';

export function processCommitStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  const wantsFast =
    lowerInput.includes('fast') ||
    lowerInput.includes('quick') ||
    lowerInput.includes('2 min') ||
    lowerInput.includes('first') ||
    lowerInput.match(/\b2\b/);
  
  const wantsDeep =
    lowerInput.includes('deep') ||
    lowerInput.includes('detail') ||
    lowerInput.includes('7 min') ||
    lowerInput.includes('second') ||
    lowerInput.match(/\b7\b/);
  
  if (wantsFast) {
    return {
      nextStage: 'BRIEFING_FAST',
      updatedState: {
        intent: {
          ...state.intent,
          urgency: 'fast',
        },
      },
      message: `Fast Path chosen. Let's get the essentials in 2 minutes.`,
    };
  } else if (wantsDeep) {
    return {
      nextStage: 'BRIEFING_DEEP',
      updatedState: {
        intent: {
          ...state.intent,
          urgency: 'deep',
        },
      },
      message: `Deep Path chosen. This will be worth the 7 minutes.`,
    };
  } else {
    // Default to Deep if unclear
    return {
      nextStage: 'BRIEFING_DEEP',
      updatedState: {
        intent: {
          ...state.intent,
          urgency: 'deep',
        },
      },
      message: `Let's go deep. This will be built to change how this feels.`,
    };
  }
}

export function getCommitSystemPrompt(): string {
  return `You are LEXA in the COMMIT stage. The user liked your micro-wow recommendation. Now they choose detail level.

Present exactly these two options:

"Choose your path:

**Fast Path (2 minutes)**: a strong first draft.

**Deep Path (7 minutes)**: built to change how this feels."

Then detect their choice:
- Fast Path → move to BRIEFING_FAST (5 essential questions)
- Deep Path → move to BRIEFING_DEEP (9 detailed questions)

If unclear, default to Deep Path.`;
}

