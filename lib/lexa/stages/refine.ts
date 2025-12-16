/**
 * REFINE Stage - Max 3 Edits
 */

import { SessionState, StageTransitionResult } from '../types';

export function processRefineStage(
  state: SessionState,
  userInput: string,
  refinementCount: number = 0
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  const isDone =
    lowerInput.includes('perfect') ||
    lowerInput.includes('ready') ||
    lowerInput.includes('done') ||
    lowerInput.includes('good') ||
    lowerInput.includes('handoff');
  
  if (isDone) {
    return {
      nextStage: 'HANDOFF',
      updatedState: {},
      message: `Excellent. Preparing your handoff.`,
    };
  }
  
  if (refinementCount >= 3) {
    return {
      nextStage: 'HANDOFF',
      updatedState: {},
      message: `We've refined this 3 times. It's ready. Moving to handoff.`,
    };
  }
  
  return {
    nextStage: 'REFINE',
    updatedState: {},
    message: `Adjusting... (${refinementCount + 1}/3 refinements)`,
  };
}

export function getRefineSystemPrompt(refinementCount: number): string {
  return `You are LEXA in the REFINE stage. The user wants to adjust the Experience Script.

**Refinement Count:** ${refinementCount}/3 (max 3 refinements)

Ask these questions ONE at a time:

1. "What should feel more private?"
2. "More intensity or more calm?"
3. "Is this a memory for you—or a legacy for someone else?"

If they say "done" / "perfect" / "ready" at any point, move to HANDOFF.

After 3 refinements, automatically move to HANDOFF with: "We've refined this 3 times. It's ready."

Keep adjustments surgical. Bold but humble.`;
}

