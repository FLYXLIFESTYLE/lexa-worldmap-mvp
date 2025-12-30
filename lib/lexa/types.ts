/**
 * LEXA UI Agent - Type Definitions
 * Complete TypeScript interfaces for the conversation state machine
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type ConversationStage =
  | 'WELCOME'
  | 'INITIAL_QUESTIONS'
  | 'DISARM'
  | 'MIRROR'
  | 'MICRO_WOW'
  | 'COMMIT'
  | 'BRIEFING_FAST'
  | 'BRIEFING_DEEP'
  | 'BRIEFING_COLLECT'
  | 'SCRIPT_DRAFT'
  | 'REFINE'
  | 'HANDOFF'
  | 'FOLLOWUP';

export type UserRole = 'user' | 'assistant' | 'system';

export type IntentMode = 'EXPERIENCE_SCRIPT' | 'QUICK_RECOMMENDATION' | 'FOLLOWUP';

export type BudgetSensitivity = 'moderate' | 'high' | 'ultra';
export type TimeFlexibility = 'fixed' | 'flexible_by_days' | 'flexible_by_weeks';
export type DurationFlexibility = 'exact' | 'can_extend' | 'flexible';

// ============================================================================
// BRIEF DATA STRUCTURES
// ============================================================================

export interface WhenData {
  timeframe: string | null; // e.g., "June 2026"
  dates: {
    start: string | null; // ISO date
    end: string | null; // ISO date
  } | null;
  flexibility: TimeFlexibility | null;
}

export interface WhereData {
  destination: string | null; // e.g., "French Riviera"
  regions: string[]; // e.g., ["Nice", "Monaco", "Antibes"]
  hints: string | null; // Additional context from conversation
}

export interface BudgetData {
  amount: number | null;
  currency: string; // e.g., "USD"
  sensitivity: BudgetSensitivity | null;
}

export interface DurationData {
  days: number | null;
  flexibility: DurationFlexibility | null;
}

export interface ExperienceItem {
  experience: string;
  why: string;
}

export interface EmotionalGoals {
  desired_feelings: string[]; // e.g., ["peace", "aliveness", "intimacy"]
  avoid_fears: string[]; // e.g., ["isolation", "crowds", "pretense"]
  success_definition: string | null;
}

export interface Brief {
  // Core trio (at least ONE required before recommendations)
  when_at: WhenData | null;
  where_at: WhereData | null;
  theme: string | null; // primary theme (legacy)
  themes: string[]; // 1-3 themes chosen by the user (experience-first onboarding)
  
  // Required additional fields
  budget: BudgetData | null;
  duration: DurationData | null;
  must_haves: string[];
  bucket_list: string[];
  
  // Experience learning
  best_experiences: ExperienceItem[];
  worst_experiences: ExperienceItem[];
}

// ============================================================================
// SESSION STATE (single source of truth)
// ============================================================================

export interface SessionState {
  stage: ConversationStage;
  
  client: {
    name: string | null;
    language: string;
    voice_reply_enabled: boolean;
  };

  travel_preferences?: {
    // How structured should the trip feel?
    planning_density?: 'curated' | 'balanced' | 'free';
    // Should LEXA proactively include bad-weather / backup options?
    include_alternatives?: boolean;
  };
  
  intent: {
    mode: IntentMode;
    urgency: 'fast' | 'deep' | null;
  };
  
  brief: Brief;
  
  emotions: {
    desired: string[];
    avoid_fears: string[];
    current_state: string | null;
    success_definition: string | null;
  };
  
  signals: {
    skepticism: number; // 0.0 to 1.0
    arrogance: number; // 0.0 to 1.0
    trust: number; // 0.0 to 1.0
  };
  
  micro_wow: {
    delivered: boolean;
    hook: string | null;
  };
  
  script: {
    draft_id: string | null;
    theme: string | null;
    signature_moments: string[];
    protocols: string[];
    legacy_artifact: string | null;
  };
  
  briefing_progress: {
    fields_collected: string[]; // Track which fields have been collected
    suggestions_offered: boolean;
    retry_count: number; // For MIRROR stage retries
    intake_step?: 'THEME_SELECT' | 'THEME_WHY' | 'MEMORY' | 'HOOK_CONFIRM' | 'LOGISTICS';
    intake_questions_asked?: number; // counts “big questions” asked before the hook (target: 3)
    logistics_step?: 'DURATION' | 'STRUCTURE' | 'WHEN' | 'WHERE' | 'BUDGET' | 'ALTERNATIVES' | 'DONE';
    seasonal_guidance_shown?: {
      destination: string;
      month: string;
    } | null;
  };
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  role: UserRole;
  content: string;
  meta: Record<string, any>;
  created_at: string;
}

// ============================================================================
// EXPERIENCE BRIEF (for Operations Agent)
// ============================================================================

export interface ExperienceBrief {
  id: string;
  session_id: string;
  user_id: string;
  
  when_at: WhenData | null;
  where_at: WhereData | null;
  theme: string | null;
  
  budget: BudgetData | null;
  duration: DurationData | null;
  emotional_goals: EmotionalGoals;
  must_haves: string[];
  best_experiences: ExperienceItem[];
  worst_experiences: ExperienceItem[];
  bucket_list: string[];
  
  additional_context: {
    trust_score: number;
    skepticism: number;
    conversation_tone: string;
    micro_wow_delivered: boolean;
    [key: string]: any;
  };
  
  status: 'draft' | 'complete' | 'in_progress' | 'delivered';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STATE MACHINE HELPERS
// ============================================================================

export interface StageTransitionResult {
  nextStage: ConversationStage;
  updatedState: Partial<SessionState>;
  message: string;
}

export interface ExtractedSignals {
  skepticism?: number;
  trust?: number;
  arrogance?: number;
  emotions?: {
    desired?: string[];
    avoid_fears?: string[];
    current_state?: string;
  };
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

export const DEFAULT_SESSION_STATE: SessionState = {
  stage: 'WELCOME',
  
  client: {
    name: null,
    language: 'en',
    voice_reply_enabled: false,
  },

  travel_preferences: {
    planning_density: undefined,
    include_alternatives: undefined,
  },
  
  intent: {
    mode: 'EXPERIENCE_SCRIPT',
    urgency: null,
  },
  
  brief: {
    when_at: null,
    where_at: null,
    theme: null,
    themes: [],
    budget: null,
    duration: null,
    must_haves: [],
    bucket_list: [],
    best_experiences: [],
    worst_experiences: [],
  },
  
  emotions: {
    desired: [],
    avoid_fears: [],
    current_state: null,
    success_definition: null,
  },
  
  signals: {
    skepticism: 0.0,
    arrogance: 0.0,
    trust: 0.0,
  },
  
  micro_wow: {
    delivered: false,
    hook: null,
  },
  
  script: {
    draft_id: null,
    theme: null,
    signature_moments: [],
    protocols: [],
    legacy_artifact: null,
  },
  
  briefing_progress: {
    fields_collected: [],
    suggestions_offered: false,
    retry_count: 0,
    seasonal_guidance_shown: null,
  },
};

// ============================================================================
// RECOMMENDATION TYPES (for MICRO_WOW stage)
// ============================================================================

export interface Recommendation {
  type: 'activity' | 'destination' | 'experience';
  name: string;
  protocol: string; // How it's delivered (privacy/time/crowds)
  why: string; // Why it matches their emotions/fears
  neo4j_id?: string; // For later integration
}

export interface SuggestionEngineInput {
  when_at?: WhenData;
  where_at?: WhereData;
  theme?: string;
  emotions: {
    desired: string[];
    avoid_fears: string[];
  };
}

export interface SuggestionEngineOutput {
  destination?: string;
  theme?: string;
  reasoning: string;
}

