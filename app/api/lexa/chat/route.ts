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
import { retrieveBrainCandidatesV2 } from '@/lib/brain/retrieve-v2';
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
    
    // 3. Load user metadata for personalization
    let userName: string | null = null;
    let userEmail: string | null = null;
    
    if (user?.email) {
      userEmail = user.email;
      // Extract first name from email (before @) as fallback
      userName = user.email.split('@')[0];
      
      // Try to get actual name from user metadata or profile
      try {
        const { data: profile } = await supabaseAdmin
          .from('lexa_user_profiles')
          .select('full_name, first_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.first_name) {
          userName = profile.first_name;
        } else if (profile?.full_name) {
          userName = profile.full_name.split(' ')[0];
        }
        
        // Also check user_metadata from auth
        if (user.user_metadata?.full_name && !profile?.full_name) {
          userName = user.user_metadata.full_name.split(' ')[0];
        }
      } catch {
        // Fallback already set from email
      }
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
      // New approach: ALWAYS use Claude for warm, helpful responses
      // State machine handles state transitions, Claude handles conversation quality
      
      // 1. Get state transition logic (for state updates and UI)
      const transition = await transitionStage(sessionState, isSyntheticStart ? '' : userMessage);
      ui = transition.ui ?? null;
      updatedState = {
        ...updatedState,
        ...transition.updatedState,
        stage: transition.nextStage,
      };
      
      // 2. Generate warm, helpful response via Claude with full guidelines
      let systemPrompt = getSystemPromptForStage(sessionState);
      
      // Add user personalization context
      if (userName && sessionState.stage === 'WELCOME') {
        systemPrompt = `${systemPrompt}\n\n**User context:**\n- First name: ${userName}\n- Email: ${userEmail || 'unknown'}\n\nUse their first name naturally in your welcome message to create warmth and personalization.`;
      }
      
      // Add guidance based on current intake step
      if (sessionState.stage === 'INITIAL_QUESTIONS') {
        const intakeStep = sessionState.briefing_progress?.intake_step;
        const guidanceNote = buildIntakeGuidanceNote(sessionState, intakeStep);
        if (guidanceNote) {
          systemPrompt = `${systemPrompt}\n\n${guidanceNote}`;
        }
      }
      
      const claudeResponse = await generateResponseWithRetry({
        sessionState,
        userMessage: isSyntheticStart ? 'Hello' : userMessage,
        systemPrompt,
      });
      
      assistantMessage = claudeResponse.assistantMessage;
      
    } else {
      // Use Claude for conversational stages
      let systemPrompt = getSystemPromptForStage(sessionState);
      const grounding = await buildGroundedPoiContext(sessionState);
      if (grounding) systemPrompt = `${systemPrompt}\n\n${grounding}`;
      
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

async function buildGroundedPoiContext(state: SessionState): Promise<string | null> {
  // Step 3 (Brain v2): Grounded retrieval to avoid hallucinated venue names.
  // Only run when we have a destination; keep results small to avoid token bloat.
  const destination = (state.brief?.where_at?.destination || '').trim();
  if (!destination) return null;

  try {
    const selectedThemes =
      state.brief?.themes?.length ? state.brief.themes : state.brief?.theme ? [state.brief.theme] : [];

    const res = await retrieveBrainCandidatesV2({
      destination,
      themes: selectedThemes,
      limit: 8,
      includeDrafts: true,
    });

    const header = [
      '## Grounded Knowledge (Neo4j first, drafts as fallback)',
      `Destination: ${res.canonicalDestination || res.destination}`,
      res.canonicalDestination && res.canonicalDestination !== res.destination
        ? `Matched from: ${res.destination}`
        : '',
      res.usedThemes.length ? `Themes: ${res.usedThemes.join(', ')}` : '',
      '',
      'Rules:',
      '- If you name a specific venue, prefer APPROVED items.',
      '- If you use a DRAFT item, explicitly label it as “unapproved draft”.',
      '- Never invent venue names.',
      '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!res.candidates.length) {
      return (
        header +
        'No matching items were retrieved. Keep recommendations generic and label them as concepts (not factual venue picks).'
      );
    }

    const lines = res.candidates.map((c, idx) => {
      const tag = c.label === 'APPROVED' ? '[APPROVED]' : c.label === 'VERIFIED_DRAFT' ? '[VERIFIED DRAFT]' : '[DRAFT]';
      const note = c.notes ? ` — ${c.notes}` : '';
      return `${idx + 1}. ${tag} ${c.name} (${c.type}) — ${c.destination || res.destination}${note}`;
    });

    return [header, ...lines].join('\n');
  } catch {
    // If Neo4j retrieval fails, don't block chat — just omit grounding.
    return null;
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

function buildIntakeGuidanceNote(state: SessionState, intakeStep?: string): string {
  const step = intakeStep ?? state.briefing_progress?.intake_step ?? 'THEME_SELECT';
  const logisticsStep = state.briefing_progress?.logistics_step ?? 'DURATION';
  const selectedThemes = state.brief?.themes?.length ? state.brief.themes : state.brief?.theme ? [state.brief.theme] : [];
  
  let guidance = '';
  
  if (step === 'THEME_SELECT') {
    guidance = `**Current goal:** The user just started. They may describe what they want in their own words, or they may select from theme categories visible in the UI.

**Your job:**
1) Welcome them warmly (use their name if provided)
2) Reflect what they said if they gave input, or invite them to share what's on their mind
3) Optionally mention the theme cards visible in the UI as inspiration (don't force it)
4) Ask ONE warm question to understand their emotional goal

Remember: BE HELPFUL! If they mentioned a destination or desire, reflect it back and offer a few initial ideas before asking your question.`;
  } else if (step === 'THEME_WHY') {
    const themeContext = selectedThemes.length ? `They chose: ${selectedThemes.join(' + ')}` : 'They described their own theme/desire';
    guidance = `**Current goal:** Understand WHY they want this experience and what they want to FEEL.

${themeContext}

**Your job:**
1) Acknowledge their theme/desire warmly
2) Offer 2-3 initial ideas of what this could look like (destinations, moments, or experiences)
3) Then ask: what do they want to feel, and what do they want to avoid?

Be warm and helpful, not interrogative!`;
  } else if (step === 'MEMORY') {
    guidance = `**Current goal:** Understand their past peak experiences to design better.

**Your job:**
1) Thank them for sharing their feelings/desires
2) Offer 1-2 ideas of signature moments that could deliver those feelings
3) Then gently ask: what was the best moment from their last great holiday, and what made it work?

Optional: mention they can also share what ruined a trip, so you can design around it.`;
  } else if (step === 'HOOK_CONFIRM') {
    const hook = state.micro_wow?.hook || 'your experience direction';
    const highlights = state.script?.signature_moments || [];
    guidance = `**Current goal:** Present the emotional direction you'd design for them and get confirmation.

Your hook: "${hook}"
Signature highlights: ${highlights.length ? highlights.join('; ') : 'None yet'}

**Your job:**
1) Present the hook and 3-5 signature highlights in an inspiring way
2) Ask if this feels like the right emotional direction (yes/no)

Make it feel like a proposal, not a quiz!`;
  } else if (step === 'LOGISTICS') {
    const whatWeKnow = [];
    if (state.brief?.duration?.days) whatWeKnow.push(`${state.brief.duration.days} days`);
    if (state.brief?.when_at?.timeframe) whatWeKnow.push(state.brief.when_at.timeframe);
    if (state.brief?.where_at?.destination) whatWeKnow.push(state.brief.where_at.destination);
    
    guidance = `**Current goal:** Gather practical details (duration, timing, destination) to make the experience real.

What we know so far: ${whatWeKnow.length ? whatWeKnow.join(', ') : 'Nothing yet'}

**Your job:**
1) Acknowledge the emotional direction you've established
2) Offer initial destination suggestions based on their themes/desires (2-3 options with brief why)
3) Then ask about practical details: How many days? When? Any destinations in mind?

You can ask about multiple logistics in ONE question if it flows naturally - but still offer ideas first!`;
  }
  
  return guidance || '';
}

function buildIntakeFallbackSystemPrompt(state: SessionState): string {
  // Deprecated - keeping for backwards compatibility
  return buildIntakeGuidanceNote(state) || 'Be helpful and warm. Offer ideas before asking questions.';
}

