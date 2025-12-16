/**
 * SCRIPT_DRAFT Stage - Deliver the Experience Script
 */

import { SessionState, StageTransitionResult } from '../types';

export function processScriptDraftStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  const wantsRefinement = 
    lowerInput.includes('change') ||
    lowerInput.includes('adjust') ||
    lowerInput.includes('more') ||
    lowerInput.includes('less');
  
  if (wantsRefinement) {
    return {
      nextStage: 'REFINE',
      updatedState: {},
      message: `What should I adjust?`,
    };
  }
  
  const isDone =
    lowerInput.includes('perfect') ||
    lowerInput.includes('ready') ||
    lowerInput.includes('done') ||
    lowerInput.includes('yes');
  
  if (isDone) {
    return {
      nextStage: 'HANDOFF',
      updatedState: {},
      message: `Excellent. Let me prepare the handoff.`,
    };
  }
  
  return {
    nextStage: 'REFINE',
    updatedState: {},
    message: `Tell me what needs to change.`,
  };
}

export function getScriptDraftSystemPrompt(state: SessionState): string {
  const { brief, emotions, signals } = state;
  
  return `You are LEXA delivering the SCRIPT_DRAFT. This is the "wow" deliverable.

**User's Brief:**
- When: ${JSON.stringify(brief.when_at)}
- Where: ${JSON.stringify(brief.where_at)}
- Theme: ${brief.theme}
- Budget: ${JSON.stringify(brief.budget)}
- Duration: ${JSON.stringify(brief.duration)}
- Emotional Goals: ${JSON.stringify(emotions)}
- Must-Haves: ${brief.must_haves.join(', ')}
- Bucket List: ${brief.bucket_list.join(', ')}

**Trust Score:** ${signals.trust}

Create an Experience Script using this EXACT format:

**[Title / Theme Promise]** (1 line, evocative)

**Why this will work on you:** (2 lines explaining emotional fit + friction blockers addressed)

**3 Signature Moments:**
- [Moment 1: Specific, emotionally resonant]
- [Moment 2: Builds on emotional arc]
- [Moment 3: Culminating experience]

**Protocols:**
- Privacy: [How crowds/privacy is managed]
- Time: [Pacing, no rush]
- Safety: [Risk mitigation]
- Authenticity: [No performative luxury]

**Legacy Artifact:**
- [One tangible memory keeper]

**Refinements:**
"Two refinements: more private or more social? more calm or more edge?"

Make it investor-grade. Make it personal. Make it feel like you designed THIS for THEM.`;
}

