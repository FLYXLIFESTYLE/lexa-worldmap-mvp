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
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id; // UUID from Supabase Auth
    
    // 2. Check rate limit
    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }
    
    // 3. Parse request body
    const body = await request.json();
    const { message: userMessage, sessionId } = body;
    
    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
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
    
    // 5. Insert user message
    await supabaseAdmin.from('lexa_messages').insert({
      session_id: session.id,
      user_id: userId,
      role: 'user',
      content: userMessage,
      meta: {},
    });
    
    // 6. Process message based on current stage
    let assistantMessage: string;
    let updatedState: Partial<SessionState> = {};
    
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
    
    // 10. Insert assistant message
    await supabaseAdmin.from('lexa_messages').insert({
      session_id: session.id,
      user_id: userId,
      role: 'assistant',
      content: assistantMessage,
      meta: { stage: newState.stage },
    });
    
    // 11. Return response
    return NextResponse.json({
      message: assistantMessage,
      sessionId: session.id,
      stage: newState.stage,
      voiceEnabled: newState.client.voice_reply_enabled,
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

