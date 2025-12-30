import type { SessionState } from './types';

/**
 * Convert the current session state into a durable user profile patch.
 * Keep this conservative: store what the user actually said + stable inferences.
 */
export function profilePatchFromState(state: SessionState) {
  const themes = (state.brief?.themes?.length ? state.brief.themes : state.brief?.theme ? [state.brief.theme] : [])
    .filter(Boolean) as string[];

  const emotional_profile = {
    themes,
    desired_feelings: state.emotions?.desired ?? [],
    avoid_fears: state.emotions?.avoid_fears ?? [],
    best_experiences: state.brief?.best_experiences ?? [],
    worst_experiences: state.brief?.worst_experiences ?? [],
    last_hook: state.micro_wow?.hook ?? null,
    last_signature_highlights: state.script?.signature_moments ?? [],
    signals: state.signals ?? {},
    updated_from_stage: state.stage,
  };

  const preferences = {
    language: state.client?.language ?? 'en',
    voice_reply_enabled: !!state.client?.voice_reply_enabled,
    planning_density: state.travel_preferences?.planning_density ?? null,
    include_alternatives: state.travel_preferences?.include_alternatives ?? null,
  };

  return { emotional_profile, preferences };
}

export function mergeProfileJson(oldObj: any, patch: any) {
  // Shallow merge, but arrays overwrite (to keep “latest truth” simple).
  const safeOld = oldObj && typeof oldObj === 'object' ? oldObj : {};
  const safePatch = patch && typeof patch === 'object' ? patch : {};
  return { ...safeOld, ...safePatch };
}


