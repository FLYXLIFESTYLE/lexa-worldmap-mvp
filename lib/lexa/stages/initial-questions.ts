/**
 * INITIAL_QUESTIONS Stage (Experience-first concierge intake)
 *
 * Flow:
 * 1) User selects 1–3 themes (from the 12 canonical theme categories)
 * 2) Ask why + what they want to feel (and what to avoid)
 * 3) Ask for best recent travel memory (+ optional worst)
 * 4) Present a concierge "hook" + high-level emotional direction + signature highlights (no destination required)
 * 5) If user confirms direction, proceed to logistics (duration / timing / destination / budget)
 */

import { SessionState, StageTransitionResult, Brief } from '../types';
import { formatThemeMenu, parseThemeSelection } from '../themes';
import { searchDestinationEvents, searchWeather } from '@/lib/integrations/tavily-client';

export async function processInitialQuestionsStage(
  state: SessionState,
  userInput: string
): Promise<StageTransitionResult> {
  const intakeStep = state.briefing_progress.intake_step ?? 'THEME_SELECT';
  const questionsAsked = state.briefing_progress.intake_questions_asked ?? 0;
  const logisticsStep = state.briefing_progress.logistics_step ?? 'DURATION';

  const setBrief = (patch: Partial<Brief>) => ({ ...state.brief, ...patch });
  const setProgress = (patch: Partial<SessionState['briefing_progress']>) => ({
    ...state.briefing_progress,
    ...patch,
  });

  // User can type "restart" any time during intake.
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

  if (intakeStep === 'THEME_SELECT') {
    const selected = parseThemeSelection(userInput);
    if (selected.length === 0) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          briefing_progress: setProgress({ intake_step: 'THEME_SELECT', intake_questions_asked: questionsAsked }),
        },
        message: themeSelectPrompt(),
      };
    }

    const primary = selected[0] ?? null;
    return {
      nextStage: 'INITIAL_QUESTIONS',
      updatedState: {
        brief: setBrief({ theme: primary, themes: selected }),
        briefing_progress: setProgress({ intake_step: 'THEME_WHY', intake_questions_asked: 1 }),
      },
      message: themeWhyPrompt(selected),
    };
  }

  if (intakeStep === 'THEME_WHY') {
    const desired = extractFeelings(userInput);
    const avoid = extractAvoid(userInput);

    return {
      nextStage: 'INITIAL_QUESTIONS',
      updatedState: {
        emotions: {
          ...state.emotions,
          desired: mergeUnique(state.emotions.desired, desired),
          avoid_fears: mergeUnique(state.emotions.avoid_fears, avoid),
        },
        briefing_progress: setProgress({ intake_step: 'MEMORY', intake_questions_asked: 2 }),
      },
      message: memoryPrompt(),
    };
  }

  if (intakeStep === 'MEMORY') {
    const best = userInput.trim();
    const bestItem = best ? [{ experience: best, why: '' }] : [];

    const selectedThemes = state.brief.themes?.length ? state.brief.themes : state.brief.theme ? [state.brief.theme] : [];
    const hook = buildHook(selectedThemes, state.emotions.desired);
    const highlights = buildSignatureHighlights(selectedThemes, state.emotions.desired);

    return {
      nextStage: 'INITIAL_QUESTIONS',
      updatedState: {
        brief: setBrief({ best_experiences: [...state.brief.best_experiences, ...bestItem] }),
        micro_wow: { delivered: true, hook },
        script: { ...state.script, signature_moments: highlights },
        briefing_progress: setProgress({ intake_step: 'HOOK_CONFIRM', intake_questions_asked: 3 }),
      },
      message: hookConfirmPrompt({
        themes: selectedThemes,
        hook,
        highlights,
        isTrial: true,
      }),
    };
  }

  if (intakeStep === 'HOOK_CONFIRM') {
    const yes = looksLikeYes(userInput);
    const no = looksLikeNo(userInput);

    if (no) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          briefing_progress: setProgress({ intake_step: 'THEME_SELECT', intake_questions_asked: 0 }),
          micro_wow: { ...state.micro_wow, delivered: false, hook: null },
          script: { ...state.script, signature_moments: [] },
        },
        message: `Understood. Let’s recalibrate—no ego, just accuracy.\n\nPick 1–3 themes again:\n${formatThemeMenu()}\n\nReply with numbers (e.g. "2, 4") or names.`,
      };
    }

    if (!yes) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          briefing_progress: setProgress({ intake_step: 'HOOK_CONFIRM', intake_questions_asked: 3 }),
        },
        message: `Quick check—does that direction feel right? Reply "yes" or "no".`,
      };
    }

    return {
      nextStage: 'INITIAL_QUESTIONS',
      updatedState: {
        briefing_progress: setProgress({ intake_step: 'LOGISTICS', intake_questions_asked: 3, logistics_step: 'DURATION' }),
      },
      message: durationPrompt(),
    };
  }

  if (intakeStep === 'LOGISTICS') {
    // Adaptive parsing: user may answer multiple items at once.
    const days = extractDaysLoose(userInput);
    const month = extractMonthLoose(userInput);
    const budget = extractBudgetLoose(userInput);
    const destination = extractDestinationLoose(userInput);

    const next: Partial<SessionState> = {};
    const nextBrief: any = { ...state.brief };
    const nextPrefs: any = { ...(state.travel_preferences ?? {}) };

    if (days && !nextBrief.duration) nextBrief.duration = { days, flexibility: 'flexible' };
    if (month && !nextBrief.when_at) {
      nextBrief.when_at = { timeframe: month, dates: null, flexibility: 'flexible_by_days' };
    }
    if (destination && !nextBrief.where_at?.destination) {
      nextBrief.where_at = { destination, regions: [], hints: '' };
    }
    if (budget && !nextBrief.budget) {
      nextBrief.budget = { amount: budget.amount, currency: budget.currency, sensitivity: null };
    }

    // Planning density preference (curated vs flexible)
    const density = extractPlanningDensityLoose(userInput);
    if (density && !nextPrefs.planning_density) nextPrefs.planning_density = density;

    // Alternatives preference
    const includeAlt = extractIncludeAlternativesLoose(userInput);
    if (typeof includeAlt === 'boolean' && typeof nextPrefs.include_alternatives !== 'boolean') {
      nextPrefs.include_alternatives = includeAlt;
    }

    next.brief = nextBrief;
    next.travel_preferences = nextPrefs;

    // Decide what to ask next based on missing fields.
    const hasDuration = !!nextBrief.duration?.days;
    const hasWhen = !!nextBrief.when_at?.timeframe;
    const hasWhere = !!nextBrief.where_at?.destination;
    const hasBudget = !!nextBrief.budget?.amount;
    const hasStructure = !!nextPrefs.planning_density;
    const hasAlternativesPref = typeof nextPrefs.include_alternatives === 'boolean';

    // If user gave a destination + month, apply gentle seasonal guidance.
    if (hasWhere && hasWhen) {
      const seasonal = seasonalGuidance(nextBrief.where_at.destination, nextBrief.when_at.timeframe);
      const alreadyShownForThisCombo =
        !!state.briefing_progress.seasonal_guidance_shown &&
        state.briefing_progress.seasonal_guidance_shown.destination.toLowerCase() ===
          String(nextBrief.where_at.destination).toLowerCase() &&
        state.briefing_progress.seasonal_guidance_shown.month.toLowerCase() ===
          String(nextBrief.when_at.timeframe).toLowerCase();

      if (seasonal?.type === 'caution') {
        // Show this warning once per (destination, month) combo, otherwise it becomes a loop.
        if (alreadyShownForThisCombo) {
          // continue
        } else {
        return {
          nextStage: 'INITIAL_QUESTIONS',
          updatedState: {
            ...next,
            briefing_progress: setProgress({
              intake_step: 'LOGISTICS',
              logistics_step: logisticsStep,
              seasonal_guidance_shown: {
                destination: String(nextBrief.where_at.destination),
                month: String(nextBrief.when_at.timeframe),
              },
            }),
          },
          message: seasonal.message + `\n\nAlso: if weather shifts or plans change, you can always come back here and I'll give you elegant alternatives that still fit your themes.`,
        };
        }
      }
    }

    // Optional Tavily real-time snapshot (best-effort, only when we have where+when).
    // This is intentionally small so it feels like concierge context, not a report.
    let realtimeNote: string | null = null;
    if (hasWhere && hasWhen) {
      try {
        const dest = String(nextBrief.where_at.destination);
        const m = String(nextBrief.when_at.timeframe);
        const [w, e] = await Promise.all([searchWeather(dest, m), searchDestinationEvents(dest, m)]);
        const weatherLine = w.results?.[0]?.title ? `Weather: ${w.results[0].title}` : null;
        const eventLine = e.results?.[0]?.title ? `Events: ${e.results[0].title}` : null;
        const lines = [weatherLine, eventLine].filter(Boolean);
        if (lines.length) realtimeNote = `Quick real-time snapshot (I can refine later):\n- ${lines.join('\n- ')}`;
      } catch {
        // Ignore if Tavily isn't configured or request fails.
      }
    }

    if (!hasDuration) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          ...next,
          briefing_progress: setProgress({ intake_step: 'LOGISTICS', logistics_step: 'DURATION' }),
        },
        message: durationPrompt(),
      };
    }

    if (!hasStructure) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          ...next,
          briefing_progress: setProgress({ intake_step: 'LOGISTICS', logistics_step: 'STRUCTURE' }),
        },
        message: structurePrompt(nextBrief.duration?.days),
      };
    }

    if (!hasWhen) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          ...next,
          briefing_progress: setProgress({ intake_step: 'LOGISTICS', logistics_step: 'WHEN' }),
        },
        message: whenPrompt(nextBrief.duration?.days),
      };
    }

    if (!hasWhere) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          ...next,
          briefing_progress: setProgress({ intake_step: 'LOGISTICS', logistics_step: 'WHERE' }),
        },
        message: wherePrompt(nextBrief.when_at?.timeframe),
      };
    }

    if (!hasBudget) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          ...next,
          briefing_progress: setProgress({ intake_step: 'LOGISTICS', logistics_step: 'BUDGET' }),
        },
        message: budgetPrompt(),
      };
    }

    if (!hasAlternativesPref) {
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          ...next,
          briefing_progress: setProgress({ intake_step: 'LOGISTICS', logistics_step: 'ALTERNATIVES' }),
        },
        message: alternativesPrompt() + (realtimeNote ? `\n\n${realtimeNote}` : ''),
      };
    }

    // All logistics collected: move to COMMIT (next phase can route into destination suggestions + retrieval).
    return {
      nextStage: 'COMMIT',
      updatedState: {
        ...next,
        briefing_progress: setProgress({ intake_step: 'LOGISTICS', logistics_step: 'DONE' }),
      },
      message:
        `Perfect. I have enough to start designing this properly.\n\nReassurance: if weather shifts or something is sold out, come back in the moment — I'll adapt your plan with options that still match your themes.\n\nIf you want, one last nuance: do you want this to feel more private and quiet, more social and vibrant, or more ultra-indulgent?` +
        (realtimeNote ? `\n\n${realtimeNote}` : ''),
    };
  }

  return {
    nextStage: 'INITIAL_QUESTIONS',
    updatedState: {
      briefing_progress: setProgress({ intake_step: 'THEME_SELECT', intake_questions_asked: 0 }),
    },
    message: themeSelectPrompt(),
  };
}

export function getInitialQuestionsSystemPrompt(): string {
  // This stage is handled deterministically in code (not by Claude).
  // We keep the system prompt for future optional LLM enrichment.
  return `You are LEXA, a world-class concierge and experience designer.
The app will ask the user to pick 1–3 of 12 themes, then ask why/feelings, then a best memory, then present a hook + highlights.
Keep responses refined, emotionally intelligent, and concise.`;
}

function themeSelectPrompt() {
  return `Before we talk destinations, I want to understand what you want to feel.\n\nChoose 1-3 themes:\n${formatThemeMenu()}\n\nReply with numbers (e.g. \"2, 4, 8\") or names (e.g. \"Wellness, Culinary\").`;
}

function themeWhyPrompt(themes: string[]) {
  const t = themes.join(' + ');
  return `Beautiful. ${t}.\n\nQuestion 2/3: what made you choose those — and what do you want to feel when you’re living this trip? (If there’s something you want to avoid, tell me that too.)`;
}

function memoryPrompt() {
  return `Question 3/3: tell me about the *best* moment from your last great holiday — the 60 seconds you still replay. What made it unforgettable?\n\n(Optional: what ruined a past trip, so I never repeat it?)`;
}

function hookConfirmPrompt(params: { themes: string[]; hook: string; highlights: string[]; isTrial: boolean }) {
  const intro = params.isTrial
    ? `You can decide after this: if I don't feel like your concierge, you can walk away — no pressure.`
    : '';

  const themeLine = params.themes.length ? `Themes: ${params.themes.join(' · ')}` : '';

  return [
    intro,
    themeLine,
    '',
    `Here’s the direction I’d design for you:`,
    `**${params.hook}**`,
    '',
    `Signature highlights (no destination required yet):`,
    ...params.highlights.map((h) => `- ${h}`),
    '',
    `Does this feel like the right emotional direction? Reply **yes** or **no**.`,
  ]
    .filter(Boolean)
    .join('\n');
}

function logisticsPrompt() {
  return `Good. Now we make it real.\n\nTell me:\n1) How many days?\n2) When do you want to go (month or dates)?\n3) Any destinations you’re drawn to — or should I suggest the best fit?\n\nReply in one message; bullets are fine.`;
}

function looksLikeYes(input: string) {
  const s = input.trim().toLowerCase();
  if (!s) return false;
  if (s.length <= 3 && (s === 'y' || s === 'ye' || s === 'yes')) return true;
  return /\b(yes|yeah|yep|correct|exactly|nailed it|that's it|thats it)\b/.test(s);
}

function looksLikeNo(input: string) {
  const s = input.trim().toLowerCase();
  if (!s) return false;
  if (s.length <= 3 && (s === 'n' || s === 'no')) return true;
  // Important: do NOT include generic words like "off" (breaks on "off-season").
  return /\b(no|nope|not really|not quite|wrong|miss)\b/.test(s);
}

function mergeUnique(a: string[], b: string[]) {
  const out = [...a];
  for (const x of b) if (x && !out.includes(x)) out.push(x);
  return out;
}

function extractFeelings(input: string): string[] {
  const s = input.toLowerCase();
  const vocab = [
    'peace',
    'calm',
    'alive',
    'aliveness',
    'romance',
    'connection',
    'intimacy',
    'freedom',
    'adventure',
    'confidence',
    'reset',
    'renewal',
    'joy',
    'awe',
    'belonging',
    'luxury',
  ];
  return vocab.filter((w) => s.includes(w)).slice(0, 5);
}

function extractAvoid(input: string): string[] {
  const s = input.toLowerCase();
  const vocab = ['crowds', 'touristy', 'stress', 'rushed', 'pretense', 'pretence', 'noise', 'chaos', 'boring'];
  return vocab.filter((w) => s.includes(w)).slice(0, 5);
}

function buildHook(themes: string[], desiredFeelings: string[]) {
  const t = themes.slice(0, 2).join(' + ') || 'your taste';
  const f = desiredFeelings[0] ? ` — built around ${desiredFeelings[0]}` : '';
  return `An experience designed for ${t}${f}: intimate, intentional, and unmistakably “you.”`;
}

function buildSignatureHighlights(themes: string[], desiredFeelings: string[]) {
  const t = themes.map((x) => x.toLowerCase()).join(' ');
  const out: string[] = [];

  if (t.includes('water') || t.includes('marine')) out.push('A private water moment at the perfect light — no crowds, no noise.');
  if (t.includes('culinary')) out.push('A single, unforgettable meal: chef’s story, local ingredients, and a table you won’t find online.');
  if (t.includes('wellness')) out.push('A reset ritual you can feel in your nervous system — slow mornings, body care, and silence.');
  if (t.includes('romance')) out.push('A “just us” scene: a view, a drink, and time that doesn’t rush you.');
  if (t.includes('art') || t.includes('architecture')) out.push('A private culture window — one place, one story, one detail you’ll remember.');
  if (t.includes('adventure') || t.includes('exploration')) out.push('A controlled edge: something thrilling, but designed to feel safe and elevated.');

  out.push('A signature arrival moment that instantly shifts you into holiday mode.');
  out.push('One micro-wow every day: small, curated, and deeply personal.');

  const feeling = desiredFeelings[0];
  if (feeling) out.push(`A closing moment that locks in the feeling you came for: ${feeling}.`);

  return out.slice(0, 6);
}

function extractMonthLoose(input: string): string | null {
  const s = input.toLowerCase();
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];
  for (const m of months) {
    if (s.includes(m)) return m[0].toUpperCase() + m.slice(1);
  }
  return null;
}

function extractDaysLoose(input: string): number | null {
  const m = input.match(/\b(\d{1,2})\s*(day|days|nacht|nights)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function durationPrompt() {
  return `To shape the rhythm properly, I need one practical detail.\n\nHow long do you want to enjoy this experience?\nFor example: 5-7 days, 10 days, 2 weeks.`;
}

function whenPrompt(days?: number | null) {
  const hint = days ? ` (for ${days} days)` : '';
  return `Thank you${hint}. Timing changes everything — weather, crowd energy, even what feels effortless.\n\nWhen would you like to travel? (month is enough)`;
}

function wherePrompt(month?: string | null) {
  const m = month ? ` for ${month}` : '';
  return `Got it${m}. Now — do you already have a destination in mind, or would you like me to suggest the best fit for your themes?`;
}

function budgetPrompt() {
  return `Last piece so I recommend in the right universe.\n\nWhat budget range should I design within? (Ballpark is fine — per week, per trip, or per night.)`;
}

function structurePrompt(days?: number | null) {
  const short = days !== null && days !== undefined && days <= 4;
  const example = short
    ? `For a short trip, some people love 1–2 beautifully curated moments — others want more unplanned time together.`
    : `Some people want a beautifully curated arc; others want wide open breathing room.`;

  return `${example}\n\nDo you want this to feel more:\n- "curated" (a few planned highlights)\n- "balanced"\n- "free" (mostly flexible time)\n\nYou can always come back here and I can help you find great experiences that are actually available at that time.`;
}

function alternativesPrompt() {
  return `One more preference so I protect the experience.\n\nIf weather is unpredictable or plans change, would you like me to include a couple of bad-weather alternatives (and backups in general) that still match your themes?\n\nMy recommendation is **yes** (it keeps the trip smooth) — but you can also say **no** if you prefer to decide in the moment.\n\nReply: "yes", "no", or "only if needed".`;
}

function extractBudgetLoose(input: string): { amount: number; currency: string } | null {
  const s = input.trim();
  const lower = s.toLowerCase();

  // Guardrails: avoid mis-parsing durations like "10 days" as a budget.
  const hasCurrencySignal =
    s.includes('€') ||
    s.includes('$') ||
    s.includes('£') ||
    /\b(eur|usd|gbp|euro|dollar|pound|budget)\b/i.test(s);
  if (!hasCurrencySignal) return null;
  if (/\b(day|days|night|nights|nacht)\b/i.test(s) && !/[€$£]/.test(s) && !/\b(eur|usd|gbp)\b/i.test(s)) {
    return null;
  }

  // Very simple: look for a number and an optional currency symbol/code.
  const m = s.match(/(?:(€|\\$|£)\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)(?:\s*(k|K|m|M))?\s*(?:€|\\$|£|eur|usd|gbp)?/);
  if (!m) return null;
  const sym = m[1];
  const rawNum = m[2].replace(/,/g, '');
  const scale = m[3]?.toLowerCase();
  let n = Number(rawNum);
  if (!Number.isFinite(n)) return null;
  if (scale === 'k') n *= 1000;
  if (scale === 'm') n *= 1000000;

  const currency =
    sym === '€' || lower.includes('eur') || lower.includes('euro')
      ? 'EUR'
      : sym === '£' || lower.includes('gbp') || lower.includes('pound')
        ? 'GBP'
        : sym === '$' || lower.includes('usd') || lower.includes('dollar')
          ? 'USD'
          : 'EUR';

  return { amount: Math.round(n), currency };
}

function extractDestinationLoose(input: string): string | null {
  const s = input.toLowerCase();
  const known = ['monaco', 'french riviera', 'amalfi', 'adriatic', 'caribbean', 'bahamas', 'dubai', 'greece', 'italy'];
  for (const k of known) {
    if (s.includes(k)) return k.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

function extractPlanningDensityLoose(input: string): 'curated' | 'balanced' | 'free' | null {
  const s = input.toLowerCase();
  if (s.includes('curated') || s.includes('planned') || s.includes('plan') || s.includes('structured')) return 'curated';
  if (s.includes('balanced') || s.includes('mix') || s.includes('bit of both')) return 'balanced';
  if (s.includes('free') || s.includes('flexible') || s.includes('spont') || s.includes('unplanned')) return 'free';
  return null;
}

function extractIncludeAlternativesLoose(input: string): boolean | null {
  const s = input.toLowerCase().trim();
  if (!s) return null;
  if (s.includes('only if') || s.includes('if needed') || s.includes('just in case')) return true;
  if (looksLikeYes(s)) return true;
  if (looksLikeNo(s)) return false;
  return null;
}

function seasonalGuidance(destination: string, month: string): { type: 'caution'; message: string } | null {
  const d = destination.toLowerCase();
  const m = month.toLowerCase();

  const isWinter = ['november', 'december', 'january', 'february'].some((x) => m.includes(x));
  if (!isWinter) return null;

  const isMonacoLike = d.includes('monaco') || d.includes('riviera') || d.includes('adriatic');
  if (!isMonacoLike) return null;

  return {
    type: 'caution',
    message:
      `One quick concierge note: ${destination} in ${month} can feel quieter — some places reduce hours and the energy is more off-season.\n\nIf you're choosing it intentionally, I'm in. But if what you want is sun + effortless water moments, would you rather I suggest a better-fit region for ${month} (e.g. Caribbean), or do you want ${destination} for a specific reason?`,
  };
}

