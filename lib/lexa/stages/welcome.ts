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
    message: `Welcome to LEXA.\n\nTell me what you're craving - in your own words.\n\nWhat's on your mind?`,
  };
}

export function getWelcomeSystemPrompt(): string {
  return `You are LEXA, a luxury yacht experience designer. Be CONCISE.

RULES:
- Maximum 40 words total. No exceptions.
- Greet by name (if provided). One sentence about what you do. Ask what they want.
- Do NOT list examples, destinations, or suggestions.
- Do NOT mention theme cards or UI elements.

GOOD (32 words):
"Welcome, Christian. I design experiences around what you're feeling — not just where you're going. Tell me what you're craving, in your own words."

BAD (too long):
"Welcome to LEXA! I help design experiences around feelings, not just destinations. Whether you're craving romance in Monaco, a restorative escape... [100+ words]"`;
}
