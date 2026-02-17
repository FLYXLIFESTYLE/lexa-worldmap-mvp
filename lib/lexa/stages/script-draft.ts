/**
 * SCRIPT_DRAFT Stage - Deliver the Experience Script
 *
 * Integrates with the LEXA Script Engine for arc-matched,
 * emotionally-driven experience generation.
 */

import { SessionState, StageTransitionResult } from '../types';
import { matchArcsFromText } from '@/lib/script-engine/arc-matcher';
import type { Stage1Output } from '@/lib/script-engine/types';

/**
 * Try to generate a Stage 1 output using the Script Engine.
 * Falls back to null if the engine cannot match an arc.
 */
export async function generateScriptEngineOutput(
  state: SessionState
): Promise<Stage1Output | null> {
  try {
    // Collect all text from the session for keyword matching
    const textParts: string[] = [];
    if (state.brief.theme) textParts.push(state.brief.theme);
    if (state.brief.must_haves?.length) textParts.push(state.brief.must_haves.join(' '));
    if (state.brief.bucket_list?.length) textParts.push(state.brief.bucket_list.join(' '));
    if (state.emotions?.desired?.length) textParts.push(state.emotions.desired.join(' '));
    const fullText = textParts.join(' ');

    if (!fullText.trim()) return null;

    const { matches, journey_type } = await matchArcsFromText(fullText);
    if (matches.length === 0) return null;

    // Dynamic import to avoid circular dependency issues
    const { generateStage1 } = await import('@/lib/script-engine/stages/stage1');

    const region = state.brief.where_at?.destination || state.brief.where_at?.region || 'French Riviera';
    const duration = state.brief.duration?.days || 8;

    const stage1 = await generateStage1({
      arc_code: matches[0].arc_code,
      journey_type,
      region: typeof region === 'string' ? region : 'French Riviera',
      duration: typeof duration === 'number' ? duration : 8,
      guest_keywords: textParts,
    });

    return stage1;
  } catch (err) {
    console.error('[ScriptDraft] Script Engine generation failed, using fallback:', err);
    return null;
  }
}

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

  // If the Script Engine has generated a Stage 1 output, use it
  // The script engine output is stored in state.script.engine_output
  const engineOutput = (state.script as Record<string, unknown>)?.engine_output as Stage1Output | undefined;

  if (engineOutput) {
    return `You are LEXA delivering the SCRIPT_DRAFT. The Script Engine has generated a personalised experience.

Present this experience to the user using the data below. Format it beautifully in chat — intimate, poetic, not salesy.

## ${engineOutput.experience_name}\u2122
*${engineOutput.tagline}*

---

${engineOutput.hook}

---

${engineOutput.description}

---

### A Glimpse of What Awaits

${engineOutput.highlights.map(h => `\u25C8 **${h.title}**\n  ${h.description}`).join('\n\n')}

---

### ${engineOutput.target_profile.intro}

${engineOutput.target_profile.criteria.map(c => `\u25C6 ${c}`).join('\n')}

---

**${engineOutput.quick_facts.duration}** | **${engineOutput.quick_facts.region}** | **${engineOutput.quick_facts.type}**

---

*Would you like to see the day-by-day journey? I can save it to your account.*

Present this naturally in conversation. Do NOT add anything beyond what is provided — it has been carefully crafted.
After presenting, ask: "Two refinements: more private or more social? more calm or more edge?"`;
  }

  // Fallback: use the original prompt if Script Engine did not generate output
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

