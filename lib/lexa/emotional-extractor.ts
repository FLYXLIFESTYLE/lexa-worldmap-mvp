/**
 * Emotional Profile Extractor
 *
 * Uses Claude to automatically extract emotional signals from user messages.
 * This runs on every user message to build the emotional profile passively,
 * without asking the user explicit questions about their feelings.
 *
 * Extracts:
 * - desired_feelings: what they want to feel
 * - avoid_fears: what they want to avoid
 * - journey_type_signals: individual/couples/family/group hints
 * - personality_signals: archetype indicators
 * - life_context: what's going on in their life
 */

import Anthropic from '@anthropic-ai/sdk';

export interface EmotionalExtraction {
  desired_feelings: string[];
  avoid_fears: string[];
  life_context: string | null;
  personality_signals: string[];
  companion_type: string | null;
  urgency: 'low' | 'medium' | 'high' | null;
}

/**
 * Extract emotional signals from a user message.
 * Designed to be fast (short prompt, small response).
 */
export async function extractEmotionalSignals(
  userMessage: string,
  existingProfile?: Partial<EmotionalExtraction>
): Promise<EmotionalExtraction> {
  // Default result (no signals)
  const defaults: EmotionalExtraction = {
    desired_feelings: existingProfile?.desired_feelings || [],
    avoid_fears: existingProfile?.avoid_fears || [],
    life_context: existingProfile?.life_context || null,
    personality_signals: existingProfile?.personality_signals || [],
    companion_type: existingProfile?.companion_type || null,
    urgency: existingProfile?.urgency || null,
  };

  // Skip very short messages or button clicks
  if (userMessage.trim().length < 15) return defaults;

  try {
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Extract emotional signals from this user message for a luxury travel experience platform. Be concise.

User message: "${userMessage}"

Return ONLY valid JSON with these fields (use empty arrays/null if nothing detected):
{
  "desired_feelings": ["feeling1", "feeling2"],
  "avoid_fears": ["fear1"],
  "life_context": "brief context or null",
  "personality_signals": ["signal1"],
  "companion_type": "solo/couple/family/friends or null",
  "urgency": "low/medium/high or null"
}

Examples of desired_feelings: adrenaline, romance, peace, adventure, luxury, freedom, connection, restoration, celebration, discovery, escape, thrill
Examples of avoid_fears: crowds, tourists, boredom, pretentious, rushing, generic, cold, rain
Examples of personality_signals: thrill-seeker, romantic, foodie, wellness-focused, culture-lover, achiever, explorer

Return ONLY the JSON, no explanation.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaults;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<EmotionalExtraction>;

    // Merge with existing data (keep unique values)
    return {
      desired_feelings: mergeUnique(defaults.desired_feelings, parsed.desired_feelings || []),
      avoid_fears: mergeUnique(defaults.avoid_fears, parsed.avoid_fears || []),
      life_context: parsed.life_context || defaults.life_context,
      personality_signals: mergeUnique(defaults.personality_signals, parsed.personality_signals || []),
      companion_type: parsed.companion_type || defaults.companion_type,
      urgency: parsed.urgency || defaults.urgency,
    };
  } catch {
    // If Claude fails, return what we already have
    return defaults;
  }
}

function mergeUnique(existing: string[], incoming: string[]): string[] {
  const set = new Set([...existing, ...incoming].map(s => s.toLowerCase().trim()).filter(Boolean));
  return Array.from(set).slice(0, 10); // Cap at 10 items
}
