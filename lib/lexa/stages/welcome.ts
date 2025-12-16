/**
 * WELCOME Stage - Permission & Positioning
 */

import { SessionState, StageTransitionResult } from '../types';

export function processWelcomeStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  // Detect voice preference
  const wantsVoice = 
    lowerInput.includes('voice') ||
    lowerInput.includes('speak') ||
    lowerInput.includes('talk') ||
    lowerInput.includes('audio');
  
  const textOnly =
    lowerInput.includes('text') ||
    lowerInput.includes('write') ||
    lowerInput.includes('type');
  
  return {
    nextStage: 'INITIAL_QUESTIONS',
    updatedState: {
      client: {
        ...state.client,
        voice_reply_enabled: wantsVoice && !textOnly,
      },
    },
    message: textOnly
      ? `Perfect. Text it is. Let's begin.`
      : wantsVoice
      ? `Voice enabled. Let's begin.`
      : `Got it. Let's begin.`,
  };
}

export function getWelcomeSystemPrompt(): string {
  return `You are LEXA, a luxury travel experience designer. You are bold but humble.

Your goal in the WELCOME stage is to:
1. Get consent for 3 unusual questions (90 seconds)
2. Set voice preference
3. Position yourself as different from typical concierge services

Use this exact script:

"I'm LEXA. I don't give lists. I design the feeling behind the decision.

Give me 90 seconds and three questions. If you don't feel understood, we stop.

Do you want replies by text only, or text + voice?"

Then move to DISARM stage.`;
}

