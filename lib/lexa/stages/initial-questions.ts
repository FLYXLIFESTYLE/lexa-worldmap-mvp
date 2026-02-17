/**
 * INITIAL_QUESTIONS Stage — Streamlined 3-message flow
 *
 * NEW FLOW (3 messages to script):
 * 1. User shares what they want (any format — "adrenaline + yacht dinner", themes, free text)
 * 2. LEXA acknowledges + asks 1-2 clarifying questions (region, duration, who's joining)
 * 3. User answers → LEXA generates Stage 1 script immediately via Script Engine
 *
 * The old 12-step flow is replaced. We ask the minimum, then generate and refine.
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

  // User can type "restart" any time
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
  // STEP 1: User shares initial desire (THEME_SELECT)
  // Capture EVERYTHING from their first message, then ask clarifiers
  // ========================================================================
  if (intakeStep === 'THEME_SELECT') {
    // Parse theme card selections
    const selected = parseThemeSelection(userInput);
    
    // Extract all hints from free text
    const destination = extractDestinationLoose(userInput);
    const companion = extractCompanionLoose(userInput);
    const days = extractDaysLoose(userInput);
    const month = extractMonthLoose(userInput);

    // Build brief from everything the user gave us
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

    // Store the user's raw text for the Script Engine arc matcher
    const rawUserDesire = userInput.trim();
    
    const isSubstantive = rawUserDesire.length > 10 || selected.length > 0 || destination;

    if (!isSubstantive) {
      // Empty or greeting-only input — show themes
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

    // Substantive input received — move to CLARIFY
    // Store the raw desire for arc matching later
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
      message: buildClarifyMessage(nextBrief, rawUserDesire),
      ui: buildClarifyButtons(nextBrief),
    };
  }

  // ========================================================================
  // STEP 2: Ask what's missing (CLARIFY)
  // User already told us what they want. Ask for missing pieces only.
  // ========================================================================
  if (intakeStep === 'CLARIFY') {
    // Parse the clarifying answers
    const destination = extractDestinationLoose(userInput);
    const days = extractDaysLoose(userInput);
    const month = extractMonthLoose(userInput);
    const companion = extractCompanionLoose(userInput);
    const density = extractPlanningDensityLoose(userInput);

    const nextBrief: Brief = { ...state.brief };

    if (destination && !nextBrief.where_at?.destination) {
      nextBrief.where_at = { destination, regions: [], hints: nextBrief.where_at?.hints || null };
    }
    if (days && !nextBrief.duration?.days) {
      nextBrief.duration = { days, flexibility: 'flexible' };
    }
    if (month && !nextBrief.when_at?.timeframe) {
      nextBrief.when_at = { timeframe: month, dates: null, flexibility: 'flexible_by_days' };
    }
    if (companion && !nextBrief.where_at?.hints) {
      if (!nextBrief.where_at) nextBrief.where_at = { destination: null, regions: [], hints: companion };
      else nextBrief.where_at.hints = companion;
    }

    // Use Claude to extract destination if our heuristic missed it
    if (!nextBrief.where_at?.destination && seemsLikeContainsPlaceName(userInput)) {
      try {
        const extracted = await extractBriefField({
          userMessage: userInput,
          fieldName: 'where',
          currentState: state,
        });
        const value = extracted.fieldValue as Record<string, unknown>;
        const dest = typeof value === 'string' ? value :
          value && typeof value === 'object' && typeof value.destination === 'string' ? value.destination : null;
        if (dest) {
          nextBrief.where_at = {
            destination: String(dest),
            regions: Array.isArray(value?.regions) ? value.regions.map(String) : [],
            hints: nextBrief.where_at?.hints || null,
          };
        }
      } catch { /* ignore */ }
    }

    // Check what we still need
    const hasDuration = !!nextBrief.duration?.days;
    const hasWhere = !!nextBrief.where_at?.destination;

    // If we still don't have duration AND destination, ask once more
    if (!hasDuration && !hasWhere) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          brief: nextBrief,
          briefing_progress: setProgress({
            intake_step: 'CLARIFY',
            intake_questions_asked: 2,
          }),
        },
        message: `Got it. Two quick things so I can design this properly:\n\n1. **Where** are you thinking? (Or I can suggest the perfect fit)\n2. **How long** — a weekend, a week, or longer?`,
        ui: {
          quickReplies: [
            { id: 'fr', label: 'French Riviera', value: 'French Riviera, 7 days', kind: 'other' as const, accent: 'gold' as const },
            { id: 'med', label: 'Mediterranean', value: 'Mediterranean, 8 days', kind: 'other' as const, accent: 'navy' as const },
            { id: 'car', label: 'Caribbean', value: 'Caribbean, 7 days', kind: 'other' as const, accent: 'sky' as const },
            { id: 'suggest', label: 'Surprise me', value: 'Suggest the best fit, 7 days', kind: 'other' as const, accent: 'amber' as const },
          ],
        },
      };
    }

    // Default duration if missing (don't ask again — just default to 7 days)
    if (!hasDuration) {
      nextBrief.duration = { days: 7, flexibility: 'flexible' };
    }

    // Default region if missing
    if (!hasWhere) {
      nextBrief.where_at = { destination: 'French Riviera', regions: [], hints: nextBrief.where_at?.hints || null };
    }

    // Store travel preferences
    const nextPrefs = { ...(state.travel_preferences ?? {}) };
    if (density) nextPrefs.planning_density = density;

    // We have enough — go directly to SCRIPT_DRAFT
    const rawDesire = (state.briefing_progress as Record<string, unknown>).raw_user_desire as string || userInput;

    return {
      nextStage: 'SCRIPT_DRAFT',
      updatedState: {
        brief: nextBrief,
        travel_preferences: nextPrefs,
        briefing_progress: setProgress({
          intake_step: 'DONE',
          intake_questions_asked: (state.briefing_progress.intake_questions_asked || 0) + 1,
          raw_user_desire: rawDesire,
        }),
      },
      message: `Perfect. I have everything I need. Let me design your experience...`,
    };
  }

  // Fallback — restart
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
// SYSTEM PROMPT
// ============================================================================

export function getInitialQuestionsSystemPrompt(): string {
  return `You are LEXA, a world-class luxury yacht experience designer. You are warm, insightful, and genuinely helpful.

**Your Core Promise:** Understand what the user REALLY wants and design an experience that transforms them.

**CRITICAL RULES:**
1. ALWAYS reflect back what the user said. If they said "adrenaline + yacht dinner", your response MUST reference adrenaline and yacht dinners specifically.
2. NEVER give generic destination suggestions that ignore what they told you. If they want adrenaline, suggest adrenaline experiences. If they want romance, suggest romance.
3. Offer 2-3 SPECIFIC ideas that match what they described before asking any question.
4. Ask maximum 1-2 clarifying questions per message (where? how long?). Do NOT interrogate.
5. Be concise. Maximum 150 words per response.
6. If the user gave enough info (what they want + region + duration), skip questions and say "Let me design this for you."

**What you should ask (ONLY if not already provided):**
- Where are you thinking? (offer 2-3 region suggestions that match their vibe)
- How long? (suggest a duration that fits)

**What you should NEVER ask:**
- Budget (we figure that out later)
- Best/worst travel memories (wastes time)
- "What do you want to feel?" (they already told you)
- Planning density / structure preferences
- Weather alternatives

**Remember:** You are a concierge, not a form. 3 messages maximum before delivering a script.`;
}

// ============================================================================
// PROMPT HELPERS
// ============================================================================

function themeSelectPrompt() {
  return `Tell me what you're craving — in your own words, or tap a theme below.\n\nBe specific: "adrenaline experiences with a dinner on a yacht" works better than "something nice."`;
}

function buildClarifyMessage(brief: Brief, rawDesire: string): string {
  const parts: string[] = [];
  
  const hasDuration = !!brief.duration?.days;
  const hasWhere = !!brief.where_at?.destination;
  
  if (hasDuration && hasWhere) {
    return `Love it. I have everything I need — let me design this for you.`;
  }
  
  if (!hasWhere && !hasDuration) {
    parts.push('Two quick things so I can make this real:');
    parts.push('1. **Where** are you thinking? (Or I can suggest the perfect fit)');
    parts.push('2. **How long** — a weekend, a week, or longer?');
  } else if (!hasWhere) {
    parts.push('Where are you thinking? I can suggest the perfect region for this.');
  } else if (!hasDuration) {
    parts.push('How long do you have? A weekend, a week, or more?');
  }
  
  return parts.join('\n');
}

function buildClarifyButtons(brief: Brief): StageTransitionResult['ui'] {
  const hasWhere = !!brief.where_at?.destination;
  const hasDuration = !!brief.duration?.days;

  if (hasWhere && hasDuration) return undefined;

  if (!hasDuration) {
    return {
      quickReplies: [
        { id: 'wknd', label: 'Weekend', value: 'Weekend', kind: 'duration' as const, accent: 'navy' as const },
        { id: 'wk', label: '7 days', value: '7 days', kind: 'duration' as const, accent: 'gold' as const },
        { id: 'ten', label: '10 days', value: '10 days', kind: 'duration' as const, accent: 'amber' as const },
        { id: 'two', label: '2 weeks', value: '14 days', kind: 'duration' as const, accent: 'emerald' as const },
      ],
    };
  }

  return {
    quickReplies: [
      { id: 'fr', label: 'French Riviera', value: 'French Riviera', kind: 'other' as const, accent: 'gold' as const },
      { id: 'med', label: 'Mediterranean', value: 'Mediterranean', kind: 'other' as const, accent: 'navy' as const },
      { id: 'car', label: 'Caribbean', value: 'Caribbean', kind: 'other' as const, accent: 'sky' as const },
      { id: 'suggest', label: 'Surprise me', value: 'Suggest the best fit', kind: 'other' as const, accent: 'amber' as const },
    ],
  };
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

function extractMonthLoose(input: string): string | null {
  const s = input.toLowerCase();
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  for (const m of months) {
    if (s.includes(m)) return m[0].toUpperCase() + m.slice(1);
  }
  // Seasons
  if (s.includes('spring')) return 'Spring';
  if (s.includes('summer')) return 'Summer';
  if (s.includes('autumn') || s.includes('fall')) return 'Autumn';
  if (s.includes('winter')) return 'Winter';
  return null;
}

function extractDaysLoose(input: string): number | null {
  const lower = input.toLowerCase();
  if (/\bweekend\b/.test(lower)) return 3;
  const m = input.match(/\b(\d{1,2})\s*(day|days|nights?)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractDestinationLoose(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const known = [
    'vienna', 'monaco', 'french riviera', 'amalfi', 'adriatic',
    'caribbean', 'bahamas', 'dubai', 'greece', 'italy', 'croatia',
    'mediterranean', 'maldives', 'thailand', 'ibiza', 'mallorca',
    'mykonos', 'santorini', 'st tropez', 'capri', 'sardinia',
    'corsica', 'sicily', 'bvi', 'usvi', 'antigua',
  ];
  for (const k of known) {
    if (lower.includes(k)) return k.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  // Heuristic: extract after "to/in/at"
  const m = raw.match(/\b(?:to|in|at|around|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  if (m?.[1]) return m[1];
  return null;
}

function extractCompanionLoose(input: string): string | null {
  const s = input.toLowerCase();
  if (s.includes('my wife')) return 'your wife';
  if (s.includes('my husband')) return 'your husband';
  if (s.includes('my partner')) return 'your partner';
  if (s.includes('my girlfriend')) return 'your girlfriend';
  if (s.includes('my boyfriend')) return 'your boyfriend';
  if (s.includes('my family')) return 'your family';
  if (s.includes('my friends')) return 'your friends';
  if (s.includes('couple')) return 'as a couple';
  return null;
}

function extractPlanningDensityLoose(input: string): 'curated' | 'balanced' | 'free' | null {
  const s = input.toLowerCase();
  if (s.includes('curated') || s.includes('planned') || s.includes('structured')) return 'curated';
  if (s.includes('balanced') || s.includes('mix')) return 'balanced';
  if (s.includes('free') || s.includes('flexible') || s.includes('spontan')) return 'free';
  return null;
}

function seemsLikeContainsPlaceName(input: string): boolean {
  const raw = input.trim();
  if (!raw) return false;
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(raw)) return false;
  if (/\b(spring|summer|autumn|fall|winter)\b/i.test(raw)) return false;
  return /\b[A-Z][a-z]{2,}\b/.test(raw);
}

function themeUi(): StageTransitionResult['ui'] {
  return {
    quickReplies: [
      ...LEXA_THEMES_12.map((t) => ({
        id: LEXA_THEME_UI[t].id,
        label: t,
        value: t,
        kind: 'theme' as const,
        icon: LEXA_THEME_UI[t].icon,
        accent: LEXA_THEME_UI[t].accent,
        hook: LEXA_THEME_COPY[t].hook,
        description: LEXA_THEME_COPY[t].description,
      })),
      {
        id: 'custom_theme',
        label: 'Describe your own theme',
        value: '__custom_theme__',
        kind: 'other' as const,
        icon: 'Sparkles',
        accent: 'gold' as const,
      },
    ],
    multiSelect: { enabled: true, max: 3, submitLabel: 'Continue' },
  };
}
