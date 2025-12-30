/**
 * LEXA Chat API Route
 * Main conversation endpoint - handles all stage transitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { SessionState, DEFAULT_SESSION_STATE } from '@/lib/lexa/types';
import { transitionStage, getNextStagePrompt } from '@/lib/lexa/state-machine';
import { generateResponseWithRetry, checkRateLimit } from '@/lib/lexa/claude-client';
import { processBriefingInput } from '@/lib/lexa/briefing-processor';
import { createExperienceBriefFromState } from '@/lib/lexa/stages/handoff';
import { profilePatchFromState, mergeProfileJson } from '@/lib/lexa/profile';
import { formatThemeMenu } from '@/lib/lexa/themes';
import {
  getWelcomeSystemPrompt,
  getDisarmSystemPrompt,
  getMirrorSystemPrompt,
  getMicroWowSystemPrompt,
  getCommitSystemPrompt,
  getBriefingCollectSystemPrompt,
  getScriptDraftSystemPrompt,
  getRefineSystemPrompt,
  getHandoffSystemPrompt,
  getFollowupSystemPrompt,
} from '@/lib/lexa/stages';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate with Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Development-friendly fallback:
    // In production we require auth; in dev we allow a test userId so you can iterate on conversation quickly.
    const body = await request.json();
    const { message: userMessage, sessionId, userId: devUserId } = body;

    const isProd = process.env.NODE_ENV === 'production';
    const DEV_USER_UUID = '00000000-0000-0000-0000-000000000001';
    const looksLikeUuid = (s: unknown) =>
      typeof s === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
    if ((authError || !user) && isProd) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user?.id ?? (looksLikeUuid(devUserId) ? devUserId : DEV_USER_UUID);
    
    // 2. Check rate limit
    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }
    
    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const isSyntheticStart = userMessage.trim() === '__start__';
    
    // 4. Load or create session
    let session: any;
    let sessionState: SessionState;
    
    if (sessionId) {
      // Load existing session
      const { data, error } = await supabaseAdmin
        .from('lexa_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      
      session = data;
      sessionState = data.state as SessionState;
    } else {
      // Create new session
      const newState = { ...DEFAULT_SESSION_STATE };
      
      const { data, error } = await supabaseAdmin
        .from('lexa_sessions')
        .insert({
          user_id: userId,
          stage: newState.stage,
          state: newState,
        })
        .select()
        .single();
      
      if (error || !data) {
        console.error('Failed to create session:', error);
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }
      
      session = data;
      sessionState = newState;
    }
    
    // 5. Insert user message (skip for synthetic start)
    let userMessageId: string | null = null;
    if (!isSyntheticStart) {
      const { data: insertedUserMsg, error: userInsErr } = await supabaseAdmin
        .from('lexa_messages')
        .insert({
          session_id: session.id,
          user_id: userId,
          role: 'user',
          content: userMessage,
          meta: {},
        })
        .select('id')
        .single();

      if (!userInsErr && insertedUserMsg?.id) userMessageId = insertedUserMsg.id;
      if (userInsErr) console.warn('Failed to capture user message id:', userInsErr);
    }
    
    // 6. Process message based on current stage
    let assistantMessage: string;
    let updatedState: Partial<SessionState> = {};
    let ui: any = null;
    let assistantMessageId: string | null = null;
    
    // Special handling for BRIEFING_COLLECT stage
    if (sessionState.stage === 'BRIEFING_COLLECT' || 
        sessionState.stage === 'BRIEFING_FAST' ||
        sessionState.stage === 'BRIEFING_DEEP') {
      
      const briefingResult = await processBriefingInput(sessionState, userMessage);
      updatedState = briefingResult.updatedState;
      assistantMessage = briefingResult.nextPrompt;
      
      if (briefingResult.isComplete) {
        updatedState.stage = 'SCRIPT_DRAFT';
      }
    } else if (sessionState.stage === 'WELCOME' || sessionState.stage === 'INITIAL_QUESTIONS') {
      // Hybrid onboarding/intake:
      // - Deterministic state machine for reliability and consistent structure
      // - Claude fallback for unexpected user questions so it still feels "smart like ChatGPT"
      const transition = await transitionStage(sessionState, isSyntheticStart ? '' : userMessage);

      assistantMessage = transition.message;
      ui = transition.ui ?? null;
      updatedState = {
        ...updatedState,
        ...transition.updatedState,
        stage: transition.nextStage,
      };

      const likelyStuck =
        sessionState.stage === 'INITIAL_QUESTIONS' &&
        transition.nextStage === 'INITIAL_QUESTIONS';

      if (likelyStuck && looksLikeUserQuestion(userMessage)) {
        const systemPrompt = buildIntakeFallbackSystemPrompt(sessionState);
        const claudeResponse = await generateResponseWithRetry({
          sessionState,
          userMessage,
          systemPrompt,
        });
        assistantMessage = claudeResponse.assistantMessage;
        // Keep state unchanged; next user message will be parsed deterministically.

        // Log "uncertainty" event for learning (best-effort; safe if migration not applied yet)
        try {
          await supabaseAdmin.from('lexa_interaction_events').insert({
            user_id: userId,
            session_id: session.id,
            event_type: 'uncertain_fallback_claude',
            payload: {
              stage: sessionState.stage,
              intake_step: sessionState.briefing_progress?.intake_step ?? null,
              logistics_step: sessionState.briefing_progress?.logistics_step ?? null,
              user_message_id: userMessageId,
              reason: 'user_question_during_intake',
            },
          });
        } catch (e) {
          console.warn('lexa_interaction_events insert skipped/failed:', e);
        }
      }
    } else {
      // Use Claude for conversational stages
      const systemPrompt = getSystemPromptForStage(sessionState);
      
      const claudeResponse = await generateResponseWithRetry({
        sessionState,
        userMessage,
        systemPrompt,
      });
      
      assistantMessage = claudeResponse.assistantMessage;
      
      // Apply state machine transition
      const transition = await transitionStage(sessionState, userMessage);
      updatedState = {
        ...updatedState,
        ...transition.updatedState,
        stage: transition.nextStage,
      };
    }
    
    // 7. Merge updated state
    const newState: SessionState = {
      ...sessionState,
      ...updatedState,
    };
    
    // 8. Handle HANDOFF stage - create experience brief
    if (newState.stage === 'HANDOFF' && sessionState.stage !== 'HANDOFF') {
      const experienceBrief = createExperienceBriefFromState(
        newState,
        session.id,
        userId
      );
      
      await supabaseAdmin
        .from('experience_briefs')
        .insert(experienceBrief);
    }
    
    // 9. Update session
    await supabaseAdmin
      .from('lexa_sessions')
      .update({
        stage: newState.stage,
        state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    // 9b. Update durable user profile memory (best-effort)
    try {
      const patch = profilePatchFromState(newState);
      const { data: existing } = await supabaseAdmin
        .from('lexa_user_profiles')
        .select('emotional_profile,preferences')
        .eq('user_id', userId)
        .maybeSingle();

      await supabaseAdmin.from('lexa_user_profiles').upsert(
        {
          user_id: userId,
          emotional_profile: mergeProfileJson(existing?.emotional_profile, patch.emotional_profile),
          preferences: mergeProfileJson(existing?.preferences, patch.preferences),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    } catch (e) {
      // Don’t break chat if profile persistence fails (migration may not be applied yet).
      console.warn('lexa_user_profiles upsert skipped/failed:', e);
    }
    
    // 10. Insert assistant message (capture id so UI can submit thumbs up/down feedback)
    const { data: insertedAssistantMsg, error: asstInsErr } = await supabaseAdmin
      .from('lexa_messages')
      .insert({
        session_id: session.id,
        user_id: userId,
        role: 'assistant',
        content: assistantMessage,
        meta: { stage: newState.stage, ui },
      })
      .select('id')
      .single();

    if (!asstInsErr && insertedAssistantMsg?.id) assistantMessageId = insertedAssistantMsg.id;
    if (asstInsErr) console.warn('Failed to capture assistant message id:', asstInsErr);
    
    // 11. Return response
    return NextResponse.json({
      message: assistantMessage,
      sessionId: session.id,
      stage: newState.stage,
      voiceEnabled: newState.client.voice_reply_enabled,
      ui,
      userMessageId,
      assistantMessageId,
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// SYSTEM PROMPT ROUTER
// ============================================================================

function getSystemPromptForStage(state: SessionState): string {
  switch (state.stage) {
    case 'WELCOME':
      return getWelcomeSystemPrompt();
    case 'DISARM':
      return getDisarmSystemPrompt(state);
    case 'MIRROR':
      return getMirrorSystemPrompt(state);
    case 'MICRO_WOW':
      return getMicroWowSystemPrompt(state);
    case 'COMMIT':
      return getCommitSystemPrompt();
    case 'BRIEFING_FAST':
    case 'BRIEFING_DEEP':
    case 'BRIEFING_COLLECT':
      return getBriefingCollectSystemPrompt(state);
    case 'SCRIPT_DRAFT':
      return getScriptDraftSystemPrompt(state);
    case 'REFINE':
      return getRefineSystemPrompt(0); // TODO: Track refinement count
    case 'HANDOFF':
      return getHandoffSystemPrompt();
    case 'FOLLOWUP':
      return getFollowupSystemPrompt();
    default:
      return 'You are LEXA, a luxury travel experience designer.';
  }
}

function looksLikeUserQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (t.includes('?')) return true;
  // Common question starters
  if (/^(what|why|how|when|where|which|can you|could you|do you|is it|are you)\b/.test(t)) return true;
  // “Help” style
  if (t.includes('help') || t.includes('explain')) return true;
  return false;
}

function buildIntakeFallbackSystemPrompt(state: SessionState): string {
  const intakeStep = state.briefing_progress.intake_step ?? 'THEME_SELECT';
  const logisticsStep = state.briefing_progress.logistics_step ?? 'DURATION';

  const selectedThemes =
    state.brief?.themes?.length ? state.brief.themes : state.brief?.theme ? [state.brief.theme] : [];

  const nextAsk =
    intakeStep === 'THEME_SELECT'
      ? `Ask them to choose 1–3 themes from this list:\n${formatThemeMenu()}`
      : intakeStep === 'THEME_WHY'
        ? `Ask: why those themes + what they want to feel (and what to avoid).`
        : intakeStep === 'MEMORY'
          ? `Ask: the best moment from their last great holiday (optional: worst).`
          : intakeStep === 'HOOK_CONFIRM'
            ? `Ask: does the direction feel right? (yes/no)`
            : // LOGISTICS
              logisticsStep === 'DURATION'
              ? `Ask: how many days (give examples).`
              : logisticsStep === 'STRUCTURE'
                ? `Ask: curated vs balanced vs free (and reassure they can come back).`
                : logisticsStep === 'WHEN'
                  ? `Ask: when (month is enough) and why timing matters.`
                  : logisticsStep === 'WHERE'
                    ? `Ask: destination in mind or should LEXA suggest.`
                    : logisticsStep === 'BUDGET'
                      ? `Ask: budget range (ballpark is fine).`
                      : logisticsStep === 'ALTERNATIVES'
                        ? `Ask: consent for bad-weather alternatives; recommend yes softly.`
                        : `Ask one concise next question.`;

  const themeContext = selectedThemes.length ? `Current themes: ${selectedThemes.join(' · ')}` : '';

  return `You are LEXA, a world-class concierge and experience designer.

The user is in the structured intake flow, but they asked an unexpected question. Your job:
1) Answer their question briefly and clearly (1–3 sentences).
2) Then smoothly guide them back to the intake with ONE next question.

Constraints:
- Be warm, refined, and confident.
- No interrogation tone.
- Keep it short (under ~90 words).
- Do not mention "system prompts" or "state machines".

${themeContext}

Next step you must guide toward:
${nextAsk}`;
}

