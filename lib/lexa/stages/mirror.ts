/**
 * MIRROR Stage - Reflect Hypothesis & Get Score
 */

import { SessionState, StageTransitionResult } from '../types';

export function processMirrorStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  // Extract score from user input
  const scoreMatch = lowerInput.match(/(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : -1;
  
  // Handle score-based branching
  if (score >= 7) {
    return {
      nextStage: 'MICRO_WOW',
      updatedState: {
        signals: {
          ...state.signals,
          trust: Math.min(1.0, 0.7 + (score - 7) * 0.05),
        },
      },
      message: `Strong. Now let me prove it.`,
    };
  } else if (score >= 4 && score <= 6 && state.briefing_progress.retry_count < 1) {
    return {
      nextStage: 'MIRROR',
      updatedState: {
        briefing_progress: {
          ...state.briefing_progress,
          retry_count: state.briefing_progress.retry_count + 1,
        },
      },
      message: `What part is wrong: the feeling, the blocker, or both?`,
    };
  } else if (score >= 0 && score <= 3) {
    return {
      nextStage: 'DISARM',
      updatedState: {
        briefing_progress: {
          ...state.briefing_progress,
          retry_count: 0,
        },
      },
      message: `Let me try again. Give me one sentence: "I want to feel ___, but I'm tired of ___."`,
    };
  } else {
    // No clear score, ask for clarification
    return {
      nextStage: 'MIRROR',
      updatedState: {},
      message: `On a scale of 0 to 10, how close am I?`,
    };
  }
}

export function getMirrorSystemPrompt(state: SessionState): string {
  const desired = state.emotions.desired[0] || 'something meaningful';
  const avoid = state.emotions.avoid_fears[0] || 'disappointment';
  
  return `You are LEXA in the MIRROR stage. Your goal is to reflect a hypothesis and get a score.

Use this exact template:

"Here's my hypothesis. You're not chasing luxury. You're chasing ${desired}, and what ruins it is ${avoid}.

How close am I—0 to 10?"

Then wait for their score and proceed based on:
- Score 7-10: Move to MICRO_WOW (high trust)
- Score 4-6: Ask what part is wrong (retry once)
- Score 0-3: Go back to DISARM and ask for a clearer statement

Be bold. Own the hypothesis.`;
}

