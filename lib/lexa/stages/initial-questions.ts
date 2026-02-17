/**
 * INITIAL_QUESTIONS Stage — Fast path to script
 *
 * RULE: Generate a script as fast as possible.
 * - If user gives destination + duration in message 1 → generate script immediately
 * - If user gives partial info → ask ONE short question, then generate
 * - NEVER ask more than 2 questions total before generating
 */

import { SessionState, StageTransitionResult, Brief } from '../types';
import { LEXA_THEMES_12, LEXA_THEME_UI, LEXA_THEME_COPY, parseThemeSelection } from '../themes';
import { extractBriefField } from '@/lib/lexa/claude-client';

export async function processInitialQuestionsStage(
  state: SessionState,
  userInput: string
): Promise<StageTransitionResult> {
  const intakeStep = state.briefing_progress.intake_step ?? 'THEME_SELECT';

  const setBrief = (patch: Partial<Brief>) => ({ ...state.brief, ...patch });
  const setProgress = (patch: Partial<SessionState['briefing_progress']>) => ({
    ...state.briefing_progress,
    ...patch,
  });

  if (userInput.trim().toLowerCase() === 'restart') {
    return {
      nextStage: 'INITIAL_QUESTIONS',
      updatedState: {
        brief: setBrief({ theme: null, themes: [], best_experiences: [], worst_experiences: [] }),
        emotions: { ...state.emotions, desired: [], avoid_fears: [], success_definition: null, current_state: null },
        micro_wow: { ...state.micro_wow, delivered: false, hook: null },
        script: { ...state.script, signature_moments: [] },
        briefing_progress: setProgress({ intake_step: 'THEME_SELECT', intake_questions_asked: 0 }),
      },
      message: themeSelectPrompt(),
    };
  }

  // ========================================================================
  // STEP 1: THEME_SELECT — User's first substantive message
  // ========================================================================
  if (intakeStep === 'THEME_SELECT') {
    const selected = parseThemeSelection(userInput);
    const destination = extractDestinationLoose(userInput);
    const companion = extractCompanionLoose(userInput);
    const days = extractDaysLoose(userInput);
    const month = extractMonthLoose(userInput);

    const nextBrief: Brief = { ...state.brief };

    if (selected.length > 0) {
      nextBrief.theme = selected[0];
      nextBrief.themes = selected;
    }
    if (destination) {
      nextBrief.where_at = { destination, regions: [], hints: companion || null };
    } else if (companion) {
      nextBrief.where_at = { ...(nextBrief.where_at || { destination: null, regions: [] }), hints: companion };
    }
    if (days) {
      nextBrief.duration = { days, flexibility: 'flexible' };
    }
    if (month) {
      nextBrief.when_at = { timeframe: month, dates: null, flexibility: 'flexible_by_days' };
    }

    // If user also mentioned a destination via Claude extraction
    if (!nextBrief.where_at?.destination && seemsLikeContainsPlaceName(userInput)) {
      try {
        const extracted = await extractBriefField({ userMessage: userInput, fieldName: 'where', currentState: state });
        const value = extracted.fieldValue as Record<string, unknown>;
        const dest = typeof value === 'string' ? value :
          value && typeof value === 'object' && typeof value.destination === 'string' ? value.destination : null;
        if (dest) {
          nextBrief.where_at = { destination: String(dest), regions: [], hints: nextBrief.where_at?.hints || null };
        }
      } catch { /* ignore */ }
    }

    const rawUserDesire = userInput.trim();
    const isSubstantive = rawUserDesire.length > 10 || selected.length > 0 || !!destination;

    if (!isSubstantive) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          brief: nextBrief,
          briefing_progress: setProgress({ intake_step: 'THEME_SELECT', intake_questions_asked: 0 }),
        },
        message: themeSelectPrompt(),
        ui: themeUi(),
      };
    }

    // KEY DECISION: Do we have enough to generate a script RIGHT NOW?
    const hasWhere = !!nextBrief.where_at?.destination;
    const hasDuration = !!nextBrief.duration?.days;

    // If we have destination + duration → go straight to SCRIPT_DRAFT
    if (hasWhere && hasDuration) {
      return {
        nextStage: 'SCRIPT_DRAFT',
        updatedState: {
          brief: nextBrief,
          briefing_progress: setProgress({
            intake_step: 'DONE',
            intake_questions_asked: 1,
            raw_user_desire: rawUserDesire,
          }),
        },
        message: 'I have everything I need. Designing your experience now...',
      };
    }

    // If we have destination but no duration → default to 7 days and generate
    if (hasWhere && !hasDuration) {
      nextBrief.duration = { days: 7, flexibility: 'flexible' };
      return {
        nextStage: 'SCRIPT_DRAFT',
        updatedState: {
          brief: nextBrief,
          briefing_progress: setProgress({
            intake_step: 'DONE',
            intake_questions_asked: 1,
            raw_user_desire: rawUserDesire,
          }),
        },
        message: 'Designing your experience now...',
      };
    }

    // No destination → ask ONE question: where?
    return {
      nextStage: 'INITIAL_QUESTIONS',
      updatedState: {
        brief: nextBrief,
        briefing_progress: setProgress({
          intake_step: 'CLARIFY',
          intake_questions_asked: 1,
          raw_user_desire: rawUserDesire,
        }),
      },
      message: 'Where are you thinking? Or I can suggest the perfect fit.',
      ui: {
        quickReplies: [
          { id: 'fr', label: 'French Riviera', value: 'French Riviera', kind: 'other' as const, accent: 'gold' as const },
          { id: 'monaco', label: 'Monaco', value: 'Monaco', kind: 'other' as const, accent: 'navy' as const },
          { id: 'car', label: 'Caribbean', value: 'Caribbean', kind: 'other' as const, accent: 'sky' as const },
          { id: 'suggest', label: 'Surprise me', value: 'Surprise me', kind: 'other' as const, accent: 'amber' as const },
        ],
      },
    };
  }

  // ========================================================================
  // STEP 2: CLARIFY — We asked one question, now use the answer + generate
  // ========================================================================
  if (intakeStep === 'CLARIFY') {
    const destination = extractDestinationLoose(userInput);
    const days = extractDaysLoose(userInput);

    const nextBrief: Brief = { ...state.brief };

    if (destination) {
      nextBrief.where_at = { destination, regions: [], hints: nextBrief.where_at?.hints || null };
    }
    if (days) {
      nextBrief.duration = { days, flexibility: 'flexible' };
    }

    // Claude extraction fallback for destination
    if (!nextBrief.where_at?.destination && seemsLikeContainsPlaceName(userInput)) {
      try {
        const extracted = await extractBriefField({ userMessage: userInput, fieldName: 'where', currentState: state });
        const value = extracted.fieldValue as Record<string, unknown>;
        const dest = typeof value === 'string' ? value :
          value && typeof value === 'object' && typeof value.destination === 'string' ? value.destination : null;
        if (dest) {
          nextBrief.where_at = { destination: String(dest), regions: [], hints: nextBrief.where_at?.hints || null };
        }
      } catch { /* ignore */ }
    }

    // "Surprise me" → default to French Riviera
    if (!nextBrief.where_at?.destination) {
      const lower = userInput.toLowerCase();
      if (lower.includes('surprise') || lower.includes('suggest') || lower.includes('you choose') || lower.includes('anywhere')) {
        nextBrief.where_at = { destination: 'French Riviera', regions: [], hints: null };
      }
    }

    // Default duration if still missing
    if (!nextBrief.duration?.days) {
      nextBrief.duration = { days: 7, flexibility: 'flexible' };
    }

    // Default destination if still missing (don't ask again — just pick)
    if (!nextBrief.where_at?.destination) {
      nextBrief.where_at = { destination: 'French Riviera', regions: [], hints: null };
    }

    const rawDesire = state.briefing_progress.raw_user_desire || userInput;

    // Go to SCRIPT_DRAFT — no more questions
    return {
      nextStage: 'SCRIPT_DRAFT',
      updatedState: {
        brief: nextBrief,
        briefing_progress: setProgress({
          intake_step: 'DONE',
          intake_questions_asked: 2,
          raw_user_desire: rawDesire,
        }),
      },
      message: 'Designing your experience now...',
    };
  }

  // Fallback
  return {
    nextStage: 'INITIAL_QUESTIONS',
    updatedState: {
      briefing_progress: setProgress({ intake_step: 'THEME_SELECT', intake_questions_asked: 0 }),
    },
    message: themeSelectPrompt(),
    ui: themeUi(),
  };
}

// ============================================================================
// SYSTEM PROMPT — Strict brevity rules
// ============================================================================

export function getInitialQuestionsSystemPrompt(): string {
  return `You are LEXA, a luxury experience designer. Be CONCISE.

STRICT RULES:
1. Maximum 60 words per response. No exceptions.
2. Acknowledge what the user said in ONE sentence.
3. Ask maximum ONE question. Never two.
4. Do NOT list suggestions, destinations, or ideas. Save that for the script.
5. Do NOT write paragraphs. Keep it conversational — like a text message, not an email.
6. If the user gave destination + duration + what they want, say "Let me design this for you" and STOP.

BAD response (too long):
"Monaco is a beautiful choice for romance – there's something intoxicating about that blend of Mediterranean glamour... [300 words] ...What draws you most to Monaco?"

GOOD response (concise):
"Monaco for a romantic weekend — love that. Let me design this for you."

You are a concierge at a yacht club. You speak in short, confident sentences. Not essays.`;
}

// ============================================================================
// HELPERS
// ============================================================================

function themeSelectPrompt() {
  return `Tell me what you're craving — in your own words, or tap a theme below.`;
}

function extractMonthLoose(input: string): string | null {
  const s = input.toLowerCase();
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  for (const m of months) {
    if (s.includes(m)) return m[0].toUpperCase() + m.slice(1);
  }
  if (s.includes('spring')) return 'Spring';
  if (s.includes('summer')) return 'Summer';
  if (s.includes('autumn') || s.includes('fall')) return 'Autumn';
  if (s.includes('winter')) return 'Winter';
  return null;
}

function extractDaysLoose(input: string): number | null {
  const lower = input.toLowerCase();
  if (/\bweekend\b/.test(lower)) return 3;
  if (/\blong weekend\b/.test(lower)) return 4;
  if (/\b(a|one) week\b/.test(lower)) return 7;
  if (/\btwo weeks\b/.test(lower)) return 14;
  const m = input.match(/\b(\d{1,2})\s*(day|days|nights?)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractDestinationLoose(input: string): string | null {
  const lower = input.toLowerCase();
  const known: [string, string][] = [
    ['monaco', 'Monaco'], ['french riviera', 'French Riviera'], ['amalfi', 'Amalfi Coast'],
    ['adriatic', 'Adriatic'], ['caribbean', 'Caribbean'], ['bahamas', 'Bahamas'],
    ['dubai', 'Dubai'], ['greece', 'Greece'], ['italy', 'Italy'], ['croatia', 'Croatia'],
    ['mediterranean', 'Mediterranean'], ['maldives', 'Maldives'], ['thailand', 'Thailand'],
    ['ibiza', 'Ibiza'], ['mallorca', 'Mallorca'], ['mykonos', 'Mykonos'],
    ['santorini', 'Santorini'], ['st tropez', 'St Tropez'], ['capri', 'Capri'],
    ['sardinia', 'Sardinia'], ['corsica', 'Corsica'], ['sicily', 'Sicily'],
    ['bvi', 'BVI'], ['usvi', 'USVI'], ['antigua', 'Antigua'], ['vienna', 'Vienna'],
    ['balearics', 'Balearics'], ['cyclades', 'Cyclades'],
  ];
  for (const [key, label] of known) {
    if (lower.includes(key)) return label;
  }
  const m = input.match(/\b(?:to|in|at|around|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  if (m?.[1]) return m[1];
  return null;
}

function extractCompanionLoose(input: string): string | null {
  const s = input.toLowerCase();
  if (s.includes('my wife') || s.includes('my spouse')) return 'your wife';
  if (s.includes('my husband')) return 'your husband';
  if (s.includes('my partner')) return 'your partner';
  if (s.includes('my girlfriend')) return 'your girlfriend';
  if (s.includes('my boyfriend')) return 'your boyfriend';
  if (s.includes('my family')) return 'your family';
  if (s.includes('my friends')) return 'your friends';
  if (s.includes('couple') || s.includes('romantic')) return 'as a couple';
  return null;
}

function seemsLikeContainsPlaceName(input: string): boolean {
  const raw = input.trim();
  if (!raw) return false;
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(raw)) return false;
  if (/\b(spring|summer|autumn|fall|winter|weekend)\b/i.test(raw)) return false;
  return /\b[A-Z][a-z]{2,}\b/.test(raw);
}

function themeUi(): StageTransitionResult['ui'] {
  return {
    quickReplies: [
      ...LEXA_THEMES_12.map((t) => ({
        id: LEXA_THEME_UI[t].id, label: t, value: t,
        kind: 'theme' as const, icon: LEXA_THEME_UI[t].icon,
        accent: LEXA_THEME_UI[t].accent, hook: LEXA_THEME_COPY[t].hook,
        description: LEXA_THEME_COPY[t].description,
      })),
      { id: 'custom_theme', label: 'Describe your own', value: '__custom_theme__', kind: 'other' as const, icon: 'Sparkles', accent: 'gold' as const },
    ],
    multiSelect: { enabled: true, max: 3, submitLabel: 'Continue' },
  };
}
