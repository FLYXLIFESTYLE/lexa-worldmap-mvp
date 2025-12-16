/**
 * LEXA UI Agent - Core State Machine
 * Deterministic conversation flow with 10+ stages
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

export function transitionStage(
  currentState: SessionState,
  userInput: string
): StageTransitionResult {
  const stage = currentState.stage;

  switch (stage) {
    case 'WELCOME':
      return handleWelcomeStage(currentState, userInput);
    
    case 'INITIAL_QUESTIONS':
      return handleInitialQuestionsStage(currentState, userInput);
    
    case 'DISARM':
      return handleDisarmStage(currentState, userInput);
    
    case 'MIRROR':
      return handleMirrorStage(currentState, userInput);
    
    case 'MICRO_WOW':
      return handleMicroWowStage(currentState, userInput);
    
    case 'COMMIT':
      return handleCommitStage(currentState, userInput);
    
    case 'BRIEFING_FAST':
    case 'BRIEFING_DEEP':
    case 'BRIEFING_COLLECT':
      return handleBriefingStages(currentState, userInput);
    
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
    
    case 'DISARM':
      return getDisarmPrompt(state);
    
    case 'MIRROR':
      return getMirrorPrompt(state);
    
    case 'MICRO_WOW':
      return getMicroWowPrompt(state);
    
    case 'COMMIT':
      return getCommitPrompt(state);
    
    case 'BRIEFING_FAST':
    case 'BRIEFING_DEEP':
    case 'BRIEFING_COLLECT':
      return getBriefingPrompt(state);
    
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
  // At least ONE of the core trio must be provided
  return !!(when_at || where_at || theme);
}

export function areAllBriefFieldsCollected(state: SessionState): boolean {
  const { brief, emotions } = state;
  
  const requiredFields = [
    brief.when,
    brief.where,
    brief.theme,
    brief.budget,
    brief.duration,
    brief.must_haves.length > 0,
    brief.best_experiences.length > 0,
    brief.worst_experiences.length > 0,
    brief.bucket_list.length > 0,
    emotions.success_definition,
  ];
  
  return requiredFields.every(field => !!field);
}

// ============================================================================
// INDIVIDUAL STAGE HANDLERS
// ============================================================================

function handleWelcomeStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  // Check if user wants voice
  const wantsVoice = lowerInput.includes('voice') || lowerInput.includes('speak');
  
  return {
    nextStage: 'INITIAL_QUESTIONS',
    updatedState: {
      client: {
        ...state.client,
        voice_reply_enabled: wantsVoice,
      },
    },
    message: `Perfect. Let's begin.`,
  };
}

async function handleInitialQuestionsStage(
  state: SessionState,
  userInput: string
): Promise<StageTransitionResult> {
  // Import the handler from initial-questions stage
  const { processInitialQuestionsStage } = await import('./stages/initial-questions');
  return await processInitialQuestionsStage(state, userInput);
}

function handleDisarmStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  // Extract emotional signals from user response
  // This will be enhanced with Claude integration
  
  return {
    nextStage: 'MIRROR',
    updatedState: {
      emotions: {
        ...state.emotions,
        current_state: 'analyzing', // Will be replaced by Claude extraction
      },
    },
    message: `I'm listening. Tell me more.`,
  };
}

function handleMirrorStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  // Check for score (will be enhanced with Claude)
  const scoreMatch = lowerInput.match(/(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
  
  if (score >= 7) {
    return {
      nextStage: 'MICRO_WOW',
      updatedState: {
        signals: {
          ...state.signals,
          trust: 0.7 + (score - 7) * 0.1,
        },
      },
      message: `Good. Now let me show you what I mean.`,
    };
  } else if (score >= 4 && state.briefing_progress.retry_count < 1) {
    return {
      nextStage: 'MIRROR',
      updatedState: {
        briefing_progress: {
          ...state.briefing_progress,
          retry_count: state.briefing_progress.retry_count + 1,
        },
      },
      message: `What part is wrong: the feeling, the blocker, or both?`,
    };
  } else {
    return {
      nextStage: 'DISARM',
      updatedState: {},
      message: `Let me try again. Give me one sentence: "I want to feel ___, but I'm tired of ___."`,
    };
  }
}

function handleMicroWowStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  return {
    nextStage: 'COMMIT',
    updatedState: {
      micro_wow: {
        delivered: true,
        hook: 'stub_recommendation', // Will be replaced by actual recommender
      },
    },
    message: `If you like this direction, I'll design a full Experience Script.`,
  };
}

function handleCommitStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  const wantsFast = lowerInput.includes('fast') || lowerInput.includes('quick') || lowerInput.includes('2');
  const wantsDeep = lowerInput.includes('deep') || lowerInput.includes('detail') || lowerInput.includes('7');
  
  if (wantsFast) {
    return {
      nextStage: 'BRIEFING_FAST',
      updatedState: {
        intent: {
          ...state.intent,
          urgency: 'fast',
        },
      },
      message: `Fast Path it is. Let's get the essentials.`,
    };
  } else {
    return {
      nextStage: 'BRIEFING_DEEP',
      updatedState: {
        intent: {
          ...state.intent,
          urgency: 'deep',
        },
      },
      message: `Deep Path chosen. This will be worth it.`,
    };
  }
}

function handleBriefingStages(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  // Move to BRIEFING_COLLECT if not already there
  if (state.stage !== 'BRIEFING_COLLECT') {
    return {
      nextStage: 'BRIEFING_COLLECT',
      updatedState: {},
      message: `Let's gather what I need to design this.`,
    };
  }
  
  // Check if all fields are collected
  if (areAllBriefFieldsCollected(state)) {
    return {
      nextStage: 'SCRIPT_DRAFT',
      updatedState: {},
      message: `Perfect. I have everything I need.`,
    };
  }
  
  // Continue collecting (detailed logic in briefing-collect.ts)
  return {
    nextStage: 'BRIEFING_COLLECT',
    updatedState: {},
    message: `Next question coming...`,
  };
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
  
  const isDone = lowerInput.includes('done') || lowerInput.includes('perfect') || lowerInput.includes('ready');
  
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
// PROMPT GETTERS (exact prompts for each stage)
// ============================================================================

function getWelcomePrompt(state: SessionState): string {
  return `I'm LEXA. I don't give lists. I design the feeling behind the decision.

Give me 90 seconds and three questions. If you don't feel understood, we stop.

Do you want replies by text only, or text + voice?`;
}

function getInitialQuestionsPrompt(state: SessionState): string {
  return `Three questions to begin:

**When** might you travel? 
**Where** does your imagination wander? 
**What kind of experience** are you seeking?

Share whatever comes to mind first. One answer is enough to start.`;
}

function getDisarmPrompt(state: SessionState): string {
  const { skepticism, arrogance } = state.signals;
  
  if (skepticism > 0.5 || arrogance > 0.5) {
    return `What would make even a perfect experience feel pointless to you?`;
  }
  
  if (state.emotions.current_state === 'tired' || state.emotions.current_state === 'burned_out') {
    return `When did luxury last work on you—what did it give you emotionally?`;
  }
  
  return `What feeling do you want more than anything right now?`;
}

function getMirrorPrompt(state: SessionState): string {
  const desired = state.emotions.desired[0] || 'something meaningful';
  const avoid = state.emotions.avoid_fears[0] || 'disappointment';
  
  return `Here's my hypothesis. You're not chasing luxury. You're chasing ${desired}, and what ruins it is ${avoid}.

How close am I—0 to 10?`;
}

function getMicroWowPrompt(state: SessionState): string {
  return `I'm not recommending [activity]. I'm recommending [protocol version].

Because you want [desired feeling] and you want to avoid [fear].

If you like this direction, I'll design a full Experience Script.`;
}

function getCommitPrompt(state: SessionState): string {
  return `Choose your path:

**Fast Path (2 minutes)**: a strong first draft.

**Deep Path (7 minutes)**: built to change how this feels.`;
}

function getBriefingPrompt(state: SessionState): string {
  return `Let me gather what I need to design this experience.`;
}

function getScriptDraftPrompt(state: SessionState): string {
  return `**Your Experience Script**

[Title / Theme]

[Why this will work on you]

**3 Signature Moments:**
- [Moment 1]
- [Moment 2]
- [Moment 3]

**Protocols:**
- [Privacy/Time/Crowds/Safety]

**Legacy Artifact:**
- [Memory keeper]

Two refinements: more private or more social? more calm or more edge?`;
}

function getRefinePrompt(state: SessionState): string {
  return `What should feel more private?

More intensity or more calm?

Is this a memory for you—or a legacy for someone else?`;
}

function getHandoffPrompt(state: SessionState): string {
  return `If you want, I can now:

- Generate the Operational Brief (for crew/concierge).
- Generate the Booking Requirements (partners).
- Turn this into a SYCC-ready Travel Script™.`;
}

function getFollowupPrompt(state: SessionState): string {
  return `Which moment stayed with you?

What surprised you emotionally?

What would you never want again?`;
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

