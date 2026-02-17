/**
 * LEXA UI Agent - Core State Machine
 *
 * STREAMLINED FLOW (3-4 messages to script):
 *
 *   WELCOME → INITIAL_QUESTIONS (1-2 messages) → SCRIPT_DRAFT → REFINE → HANDOFF → FOLLOWUP
 *
 * The old stages (DISARM, MIRROR, MICRO_WOW, COMMIT, BRIEFING_*)
 * are bypassed. Users get a script in 3 messages, then refine.
 */

import {
  SessionState,
  ConversationStage,
  StageTransitionResult,
  DEFAULT_SESSION_STATE,
} from './types';

// ============================================================================
// STAGE TRANSITION LOGIC
// ============================================================================

export async function transitionStage(
  currentState: SessionState,
  userInput: string
): Promise<StageTransitionResult> {
  const stage = currentState.stage;

  switch (stage) {
    case 'WELCOME':
      return handleWelcomeStage(currentState, userInput);

    case 'INITIAL_QUESTIONS':
      return await handleInitialQuestionsStage(currentState, userInput);

    // Legacy stages — redirect to INITIAL_QUESTIONS to avoid getting stuck
    case 'DISARM':
    case 'MIRROR':
    case 'MICRO_WOW':
    case 'COMMIT':
    case 'BRIEFING_FAST':
    case 'BRIEFING_DEEP':
    case 'BRIEFING_COLLECT':
      return {
        nextStage: 'INITIAL_QUESTIONS',
        updatedState: {
          briefing_progress: {
            ...currentState.briefing_progress,
            intake_step: 'CLARIFY',
          },
        },
        message: `Let me focus on what matters. Tell me where and how long, and I'll design your experience.`,
      };

    case 'SCRIPT_DRAFT':
      return handleScriptDraftStage(currentState, userInput);

    case 'REFINE':
      return handleRefineStage(currentState, userInput);

    case 'HANDOFF':
      return handleHandoffStage(currentState, userInput);

    case 'FOLLOWUP':
      return handleFollowupStage(currentState, userInput);

    default:
      return {
        nextStage: 'WELCOME',
        updatedState: {},
        message: 'Something went wrong. Let\'s start over.',
      };
  }
}

// ============================================================================
// STAGE PROMPT GENERATION
// ============================================================================

export function getNextStagePrompt(state: SessionState): string {
  const stage = state.stage;

  switch (stage) {
    case 'WELCOME':
      return getWelcomePrompt(state);

    case 'INITIAL_QUESTIONS':
      return getInitialQuestionsPrompt(state);

    case 'SCRIPT_DRAFT':
      return getScriptDraftPrompt(state);

    case 'REFINE':
      return getRefinePrompt(state);

    case 'HANDOFF':
      return getHandoffPrompt(state);

    case 'FOLLOWUP':
      return getFollowupPrompt(state);

    default:
      return 'I\'m LEXA. Let\'s start fresh.';
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function canProgressToBriefing(state: SessionState): boolean {
  const { when_at, where_at, theme } = state.brief;
  return !!(when_at || where_at || theme);
}

export function areAllBriefFieldsCollected(state: SessionState): boolean {
  const { brief } = state;
  // Streamlined: we only need destination + duration to generate a script
  return !!(brief.where_at?.destination && brief.duration?.days);
}

// ============================================================================
// INDIVIDUAL STAGE HANDLERS
// ============================================================================

function handleWelcomeStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  return {
    nextStage: 'INITIAL_QUESTIONS',
    updatedState: {
      client: {
        ...state.client,
        voice_reply_enabled: false,
      },
      briefing_progress: {
        ...state.briefing_progress,
        intake_step: 'THEME_SELECT',
        intake_questions_asked: 0,
      },
    },
    message:
      `Welcome to LEXA.\n\nTell me what you're craving — in your own words. Be specific.\n\nFor example: "Adrenaline experiences on the French Riviera with a sunset dinner on a yacht" or "A quiet wellness retreat for two in Greece."\n\nYou can also tap a theme below, or hold the microphone to speak.`,
  };
}

async function handleInitialQuestionsStage(
  state: SessionState,
  userInput: string
): Promise<StageTransitionResult> {
  const { processInitialQuestionsStage } = await import('./stages/initial-questions');
  return await processInitialQuestionsStage(state, userInput);
}

function handleScriptDraftStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  return {
    nextStage: 'REFINE',
    updatedState: {
      script: {
        ...state.script,
        draft_id: `draft_${Date.now()}`,
      },
    },
    message: `Here's your Experience Script. Ready to refine?`,
  };
}

function handleRefineStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();

  const isDone = lowerInput.includes('done') || lowerInput.includes('perfect') ||
    lowerInput.includes('ready') || lowerInput.includes('love it') ||
    lowerInput.includes('yes') || lowerInput.includes('book');

  if (isDone) {
    return {
      nextStage: 'HANDOFF',
      updatedState: {},
      message: `Excellent. Let me prepare your handoff.`,
    };
  }

  return {
    nextStage: 'REFINE',
    updatedState: {},
    message: `Adjusting...`,
  };
}

function handleHandoffStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  return {
    nextStage: 'FOLLOWUP',
    updatedState: {},
    message: `Your Experience Script is ready. I'll check in with you in 24-48 hours.`,
  };
}

function handleFollowupStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  return {
    nextStage: 'FOLLOWUP',
    updatedState: {},
    message: `Thank you for sharing that.`,
  };
}

// ============================================================================
// PROMPT GETTERS
// ============================================================================

function getWelcomePrompt(state: SessionState): string {
  return `Welcome to LEXA.\n\nTell me what you're craving — in your own words.\n\nWhat's on your mind?`;
}

function getInitialQuestionsPrompt(state: SessionState): string {
  return `Tell me what kind of experience you're looking for. Be as specific as you like — I'll design around exactly what you describe.`;
}

function getScriptDraftPrompt(state: SessionState): string {
  return `Here's your Experience Script — designed around what you described.`;
}

function getRefinePrompt(state: SessionState): string {
  return `What would you like to adjust? I can make it more intense, more intimate, change the region, or refine specific moments.`;
}

function getHandoffPrompt(state: SessionState): string {
  return `Your Experience Script is complete. I can now:\n\n- Save it to your account\n- Generate the full day-by-day journey\n- Prepare booking assets for your charter team`;
}

function getFollowupPrompt(state: SessionState): string {
  return `How did it feel? Which moment stayed with you?`;
}

// ============================================================================
// INITIALIZE SESSION
// ============================================================================

export function initializeSession(userId: string): SessionState {
  return {
    ...DEFAULT_SESSION_STATE,
    client: {
      ...DEFAULT_SESSION_STATE.client,
    },
  };
}
