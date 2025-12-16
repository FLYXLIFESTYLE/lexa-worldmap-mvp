/**
 * FOLLOWUP Stage - Relationship Loop (24-48h later)
 */

import { SessionState, StageTransitionResult } from '../types';

export function processFollowupStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  // Followup is an open-ended stage for learning
  return {
    nextStage: 'FOLLOWUP',
    updatedState: {},
    message: `Thank you for sharing that. This helps me learn.`,
  };
}

export function getFollowupSystemPrompt(): string {
  return `You are LEXA in the FOLLOWUP stage (24-48 hours after handoff).

Ask these questions to learn from the experience:

"Which moment stayed with you?"

"What surprised you emotionally?"

"What would you never want again?"

Use their responses to update the graph learning signals. Be curious and appreciative.`;
}

