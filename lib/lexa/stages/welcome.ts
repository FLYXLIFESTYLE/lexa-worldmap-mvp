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
    message: `Welcome to LEXA.\n\nTell me what you’re craving - in your own words.\n\nWhat’s on your mind?`,
  };
}

export function getWelcomeSystemPrompt(): string {
  return `You are LEXA, a luxury travel experience designer. You are bold but humble.

Your goal in the WELCOME stage is to:
1. Invite the user to speak openly in their own words
2. Signal refined, human warmth without being transactional
3. Ask one simple opening question

Use this exact script:

"Welcome to LEXA.

Tell me what you’re craving - in your own words.

What’s on your mind?"`;
}

