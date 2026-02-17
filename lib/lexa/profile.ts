import type { SessionState } from './types';
import type { EmotionalExtraction } from './emotional-extractor';

/**
 * Convert the current session state into a durable user profile patch.
 * Now includes data from the emotional extractor and the Script Engine.
 */
export function profilePatchFromState(
  state: SessionState,
  emotionalExtraction?: EmotionalExtraction | null
) {
  const themes = (state.brief?.themes?.length ? state.brief.themes : state.brief?.theme ? [state.brief.theme] : [])
    .filter(Boolean) as string[];

  // Build emotional profile — combine session state + extraction
  const emotional_profile: Record<string, unknown> = {
    themes,
    // From session state (legacy fields)
    desired_feelings: state.emotions?.desired ?? [],
    avoid_fears: state.emotions?.avoid_fears ?? [],
    best_experiences: state.brief?.best_experiences ?? [],
    worst_experiences: state.brief?.worst_experiences ?? [],
    last_hook: state.micro_wow?.hook ?? null,
    last_signature_highlights: state.script?.signature_moments ?? [],
    signals: state.signals ?? {},
    updated_from_stage: state.stage,
  };

  // Merge in emotional extraction data (richer, from Claude analysis)
  if (emotionalExtraction) {
    emotional_profile.desired_feelings = mergeUnique(
      emotional_profile.desired_feelings as string[],
      emotionalExtraction.desired_feelings
    );
    emotional_profile.avoid_fears = mergeUnique(
      emotional_profile.avoid_fears as string[],
      emotionalExtraction.avoid_fears
    );
    emotional_profile.life_context = emotionalExtraction.life_context;
    emotional_profile.personality_signals = emotionalExtraction.personality_signals;
    emotional_profile.companion_type = emotionalExtraction.companion_type;
    emotional_profile.urgency = emotionalExtraction.urgency;
  }

  // Include Script Engine arc code if available
  const arcCode = (state.script as Record<string, unknown>)?.arc_code;
  if (arcCode) {
    emotional_profile.matched_arc_code = arcCode;
  }

  const preferences = {
    language: state.client?.language ?? 'en',
    voice_reply_enabled: !!state.client?.voice_reply_enabled,
    planning_density: state.travel_preferences?.planning_density ?? null,
    include_alternatives: state.travel_preferences?.include_alternatives ?? null,
  };

  return { emotional_profile, preferences };
}

export function mergeProfileJson(oldObj: unknown, patch: unknown) {
  const safeOld = oldObj && typeof oldObj === 'object' ? oldObj : {};
  const safePatch = patch && typeof patch === 'object' ? patch : {};
  return { ...safeOld, ...safePatch };
}

function mergeUnique(a: string[], b: string[]): string[] {
  const set = new Set([...(a || []), ...(b || [])].map(s => String(s).toLowerCase().trim()).filter(Boolean));
  return Array.from(set);
}
