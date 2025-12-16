/**
 * HANDOFF Stage - Operations Agent Handoff
 */

import { SessionState, StageTransitionResult, ExperienceBrief } from '../types';

export function processHandoffStage(
  state: SessionState,
  userInput: string
): StageTransitionResult {
  const lowerInput = userInput.toLowerCase();
  
  const wantsOperationalBrief = lowerInput.includes('operational') || lowerInput.includes('crew');
  const wantsBooking = lowerInput.includes('booking');
  const wantsSycc = lowerInput.includes('sycc') || lowerInput.includes('script');
  
  if (wantsOperationalBrief || wantsBooking || wantsSycc) {
    return {
      nextStage: 'FOLLOWUP',
      updatedState: {},
      message: `Generating that now. You'll receive it within 24 hours.`,
    };
  }
  
  return {
    nextStage: 'FOLLOWUP',
    updatedState: {},
    message: `Your Experience Script is complete. I'll check in with you in 24-48 hours to see how it's landing.`,
  };
}

export function getHandoffSystemPrompt(): string {
  return `You are LEXA in the HANDOFF stage. The Experience Script is complete.

Present these options:

"If you want, I can now:

- Generate the Operational Brief (for crew/concierge).
- Generate the Booking Requirements (partners).
- Turn this into a SYCC-ready Travel Script™."

Then move to FOLLOWUP stage.

**Critical Backend Action:**
At this stage, the system will automatically create an \`experience_briefs\` record in Supabase with status='complete' for the Operations Agent to consume.`;
}

// ============================================================================
// CREATE EXPERIENCE BRIEF FOR OPERATIONS AGENT
// ============================================================================

export function createExperienceBriefFromState(
  state: SessionState,
  sessionId: string,
  userId: string
): Omit<ExperienceBrief, 'id' | 'created_at' | 'updated_at'> {
  return {
    session_id: sessionId,
    user_id: userId,
    
    when_at: state.brief.when_at,
    where_at: state.brief.where_at,
    theme: state.brief.theme,
    
    budget: state.brief.budget,
    duration: state.brief.duration,
    emotional_goals: {
      desired_feelings: state.emotions.desired,
      avoid_fears: state.emotions.avoid_fears,
      success_definition: state.emotions.success_definition || '',
    },
    must_haves: state.brief.must_haves,
    best_experiences: state.brief.best_experiences,
    worst_experiences: state.brief.worst_experiences,
    bucket_list: state.brief.bucket_list,
    
    additional_context: {
      trust_score: state.signals.trust,
      skepticism: state.signals.skepticism,
      conversation_tone: deriveConversationTone(state.signals),
      micro_wow_delivered: state.micro_wow.delivered,
      script_theme: state.script.theme,
      signature_moments: state.script.signature_moments,
      protocols: state.script.protocols,
    },
    
    status: 'complete',
  };
}

function deriveConversationTone(signals: SessionState['signals']): string {
  if (signals.skepticism > 0.7) {
    return signals.trust > 0.6 ? 'skeptical_then_engaged' : 'skeptical_throughout';
  }
  if (signals.trust > 0.7) {
    return 'trusting_and_open';
  }
  return 'cautiously_optimistic';
}

