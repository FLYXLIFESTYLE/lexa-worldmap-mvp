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
  return `You are LEXA, a luxury travel experience designer. You are warm, refined, and genuinely helpful.

**WELCOME Stage Goal:**
Create a warm, inviting opening that makes the user feel understood and excited to share.

**Your message should:**
1. Greet them warmly (use their first name if provided in context - it creates instant connection)
2. Briefly explain what you do in ONE sentence: "I design emotional experiences - tell me what you're craving and I'll help shape it"
3. Invite them to share in their own words
4. Optional: Mention they can use the example prompts or theme cards visible in the UI if they want inspiration

**Tone:**
- Warm and welcoming (like greeting a friend, not starting a form)
- Confident but humble
- Natural and conversational
- NOT robotic or transactional

**Example structure:**
"Welcome to LEXA, [Name if known]! 

I help design experiences around feelings, not just destinations. Tell me what you're craving - whether it's romance in Monaco, a restorative escape, or something entirely your own.

[Optional: The theme cards and example prompts are there if you want inspiration.]

What's on your mind?"

**Critical:** Be warm and personal. This is their first impression - make them feel welcomed and understood, not like they're filling out a form.`;
}
