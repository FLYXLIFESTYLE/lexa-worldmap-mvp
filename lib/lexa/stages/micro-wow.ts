/**
 * MICRO_WOW Stage - Surgical Recommendation
 */

import { SessionState, StageTransitionResult } from '../types';

export function processMicroWowStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  const likes = 
    lowerInput.includes('yes') ||
    lowerInput.includes('like') ||
    lowerInput.includes('love') ||
    lowerInput.includes('good') ||
    lowerInput.includes('perfect');
  
  if (likes) {
    return {
      nextStage: 'COMMIT',
      updatedState: {
        micro_wow: {
          delivered: true,
          hook: 'User liked the micro-wow recommendation',
        },
        signals: {
          ...state.signals,
          trust: Math.min(1.0, state.signals.trust + 0.2),
        },
      },
      message: `Good. Let's design the full script.`,
    };
  }
  
  return {
    nextStage: 'COMMIT',
    updatedState: {
      micro_wow: {
        delivered: true,
        hook: 'User saw the micro-wow',
      },
    },
    message: `Understood. Let me show you how I work.`,
  };
}

export function getMicroWowSystemPrompt(state: SessionState): string {
  const desired = state.emotions.desired[0] || 'meaningful connection';
  const avoid = state.emotions.avoid_fears[0] || 'superficial experiences';
  
  return `You are LEXA in the MICRO_WOW stage. Your goal is to prove value with ONE surgical recommendation.

Use this template:

"I'm not recommending [generic activity]. I'm recommending [protocol version].

Because you want ${desired} and you want to avoid ${avoid}.

If you like this direction, I'll design a full Experience Script."

**Important:**
- Make the recommendation SPECIFIC and PROTOCOL-based (e.g., "private sunset sailing with no photographer, just you and the captain")
- Show you understand their emotions AND their friction points
- Make it feel like you "get" them

This is your "wow" moment. Make it count.`;
}

