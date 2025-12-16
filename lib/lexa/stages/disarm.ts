/**
 * DISARM Stage - Surface Hidden Dissatisfaction
 */

import { SessionState, StageTransitionResult, ExtractedSignals } from '../types';

export function processDisarmStage(
  state: SessionState,
  userInput: string,
  extractedSignals: ExtractedSignals
): StageTransitionResult {
  // Update emotional state based on user's response
  const updatedEmotions = {
    ...state.emotions,
    current_state: extractedSignals.emotions?.current_state || state.emotions.current_state,
    desired: [
      ...state.emotions.desired,
      ...(extractedSignals.emotions?.desired || []),
    ],
    avoid_fears: [
      ...state.emotions.avoid_fears,
      ...(extractedSignals.emotions?.avoid_fears || []),
    ],
  };
  
  // Update signals
  const updatedSignals = {
    ...state.signals,
    skepticism: extractedSignals.skepticism !== undefined 
      ? extractedSignals.skepticism 
      : state.signals.skepticism,
    arrogance: extractedSignals.arrogance !== undefined
      ? extractedSignals.arrogance
      : state.signals.arrogance,
    trust: extractedSignals.trust !== undefined
      ? extractedSignals.trust
      : state.signals.trust,
  };
  
  return {
    nextStage: 'MIRROR',
    updatedState: {
      emotions: updatedEmotions,
      signals: updatedSignals,
    },
    message: `I hear you. Let me reflect this back.`,
  };
}

export function getDisarmSystemPrompt(state: SessionState): string {
  const { skepticism, arrogance } = state.signals;
  
  let questionToAsk = '';
  
  if (skepticism > 0.5 || arrogance > 0.5) {
    questionToAsk = `"What would make even a perfect experience feel pointless to you?"`;
  } else if (state.emotions.current_state === 'tired' || state.emotions.current_state === 'burned_out') {
    questionToAsk = `"When did luxury last work on you—what did it give you emotionally?"`;
  } else {
    questionToAsk = `"What feeling do you want more than anything right now?"`;
  }
  
  return `You are LEXA in the DISARM stage. Your goal is to surface hidden dissatisfaction or friction triggers.

Based on the user's tone and signals, ask this question:
${questionToAsk}

From their response, extract:
1. current_state (1-2 words: e.g., "burned_out", "seeking_peace", "restless")
2. desired emotions (feelings they want)
3. avoid_fears (what they want to avoid)
4. Update skepticism/trust scores (0.0-1.0)

Be bold but humble. Listen deeply.`;
}

