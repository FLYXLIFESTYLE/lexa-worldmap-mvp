/**
 * LEXA Chat API Route
 * Main conversation endpoint - handles all stage transitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured, supabaseAdmin } from '@/lib/supabase/client';
import { AUTH_DISABLED, BYPASS_USER_ID, BYPASS_USER_NAME } from '@/lib/auth/user-access';
import { SessionState } from '@/lib/lexa/types';
import { transitionStage, getNextStagePrompt } from '@/lib/lexa/state-machine';
import { generateResponseWithRetry, checkRateLimit } from '@/lib/lexa/claude-client';
import { processBriefingInput } from '@/lib/lexa/briefing-processor';
import { createExperienceBriefFromState } from '@/lib/lexa/stages/handoff';
import { formatThemeMenu } from '@/lib/lexa/themes';
import { retrieveBrainCandidatesV2 } from '@/lib/brain/retrieve-v2';
import { isNeo4jConfigured } from '@/lib/neo4j/client';
import { getClaudeOnlyContextNote } from '@/lib/lexa/claude-only-context';
import {
  appendChatMessage,
  loadConversationHistory,
  loadOrCreateChatSession,
  loadUserProfile,
  persistUserProfileMemory,
  saveChatSession,
} from '@/lib/lexa/chat-persistence';
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
    const supabaseUnavailable = !isSupabaseAdminConfigured;
    const neo4jUnavailable = !isNeo4jConfigured();
    const offlineContextNote = getClaudeOnlyContextNote({ supabaseUnavailable, neo4jUnavailable });

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
    const DEV_USER_UUID = BYPASS_USER_ID;
    const looksLikeUuid = (s: unknown) =>
      typeof s === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
    if ((authError || !user) && isProd && !AUTH_DISABLED) {
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
    
    // 3. Personalization name (refined after profile load below)
    let userName: string | null = AUTH_DISABLED ? BYPASS_USER_NAME : null;
    let userEmail: string | null = user?.email ?? null;

    if (user?.email && !userName) {
      if (user.user_metadata?.full_name) {
        userName = String(user.user_metadata.full_name).split(' ')[0];
      } else {
        const prefix = user.email.split('@')[0];
        userName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
    }
    
    // 4. Load or create session (Supabase or in-memory fallback)
    let session;
    let sessionState: SessionState;

    try {
      const loaded = await loadOrCreateChatSession(sessionId, userId);
      session = loaded.session;
      sessionState = loaded.sessionState;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to create session';
      return NextResponse.json({ error: message }, { status: loadError instanceof Error && loadError.message === 'Session not found' ? 404 : 500 });
    }

    const userProfile = await loadUserProfile(userId);
    if (userProfile.first_name) {
      userName = userProfile.first_name;
    } else if (userProfile.full_name) {
      userName = userProfile.full_name.split(' ')[0];
    }
    const storedEmotionalProfile = userProfile.emotional_profile;
    const storedGuestPreferences = userProfile.guest_preferences;
    const conversationHistory = await loadConversationHistory(session);

    // 5. Insert user message (skip for synthetic start)
    let userMessageId: string | null = null;
    if (!isSyntheticStart) {
      userMessageId = await appendChatMessage(session, userId, 'user', userMessage, {});
    }
    
    // 6. Process message based on current stage
    let assistantMessage: string;
    let updatedState: Partial<SessionState> = {};
    let ui: any = null;
    let assistantMessageId: string | null = null;

    if (sessionState.stage === 'WELCOME' || sessionState.stage === 'INITIAL_QUESTIONS') {
      // STREAMLINED FLOW: state machine handles transitions + Claude generates response
      
      // 1. State transition (determines next step and captures user data)
      const transition = await transitionStage(sessionState, isSyntheticStart ? '' : userMessage);
      ui = transition.ui ?? null;
      updatedState = {
        ...updatedState,
        ...transition.updatedState,
        stage: transition.nextStage,
      };

      // 2. If transitioning to SCRIPT_DRAFT, generate Script Engine output (Neo4j required)
      if (transition.nextStage === 'SCRIPT_DRAFT' && isNeo4jConfigured()) {
        try {
          const { generateScriptEngineOutput } = await import('@/lib/lexa/stages/script-draft');
          const mergedState = { ...sessionState, ...transition.updatedState } as SessionState;
          
          // Also pass the raw user desire to the arc matcher
          const rawDesire = (mergedState.briefing_progress as any)?.raw_user_desire || userMessage;
          
          // Use the Script Engine to generate Stage 1
          const { matchArcsFromText } = await import('@/lib/script-engine/arc-matcher');
          const { generateStage1 } = await import('@/lib/script-engine/stages/stage1');
          
          const region = mergedState.brief?.where_at?.destination || 'French Riviera';
          const duration = mergedState.brief?.duration?.days || 7;
          
          const { matches, journey_type } = await matchArcsFromText(rawDesire);
          
          if (matches.length > 0) {
            const stage1 = await generateStage1({
              arc_code: matches[0].arc_code,
              journey_type,
              region,
              duration,
              guest_keywords: rawDesire.split(/\s+/).filter((w: string) => w.length > 3),
              emotional_profile: {
                desired_feelings: (storedEmotionalProfile.desired_feelings as string[]) || [],
                avoid_fears: (storedEmotionalProfile.avoid_fears as string[]) || [],
                activity_interests: (storedGuestPreferences.activity_interests as string[]) || [],
              },
            });

            // Store in state for the system prompt to use
            updatedState = {
              ...updatedState,
              script: {
                ...(sessionState.script || {}),
                engine_output: stage1 as any,
                arc_code: matches[0].arc_code,
              },
            };

            // Build the script display directly as the assistant message
            const scriptLines = [
              `## ${stage1.experience_name}\u2122`,
              `*${stage1.tagline}*`,
              '',
              '\u2500\u2500\u2500',
              '',
              stage1.hook,
              '',
              '\u2500\u2500\u2500',
              '',
              stage1.description,
              '',
              '\u2500\u2500\u2500',
              '',
              '### A Glimpse of What Awaits',
              '',
              ...stage1.highlights.map(h => `\u25C8 **${h.title}**\n${h.description}`),
              '',
              '\u2500\u2500\u2500',
              '',
              `### ${stage1.target_profile.intro}`,
              '',
              ...stage1.target_profile.criteria.map(c => `\u25C6 ${c}`),
              '',
              '\u2500\u2500\u2500',
              '',
              `**${stage1.quick_facts.duration}** \u00B7 **${stage1.quick_facts.region}** \u00B7 **${stage1.quick_facts.type}**`,
              '',
              '\u2500\u2500\u2500',
              '',
              '*What would you like to adjust? I can change the intensity, the region, the duration, or refine specific moments. Or say "perfect" to finalise.*',
            ];

            assistantMessage = scriptLines.join('\n');
            updatedState.stage = 'REFINE';
            
            ui = {
              quickReplies: [
                { id: 'perfect', label: 'Perfect — save it', value: 'perfect', kind: 'other', accent: 'gold' },
                { id: 'more_intense', label: 'More intense', value: 'Make it more intense and adventurous', kind: 'other', accent: 'amber' },
                { id: 'more_calm', label: 'More calm', value: 'Make it calmer and more restorative', kind: 'other', accent: 'navy' },
                { id: 'different_region', label: 'Different region', value: 'Suggest a different region', kind: 'other', accent: 'emerald' },
              ],
            };
          } else {
            // No arc match — fallback to Claude-generated script
            const systemPrompt = getSystemPromptForStage({ ...sessionState, stage: 'SCRIPT_DRAFT' } as SessionState);
            const claudeResponse = await generateResponseWithRetry({
              sessionState,
              userMessage,
              systemPrompt,
              conversationHistory,
            });
            assistantMessage = claudeResponse.assistantMessage;
          }
        } catch (err) {
          console.error('[Chat] Script Engine error, falling back to Claude:', err);
          const systemPrompt = getSystemPromptForStage({ ...sessionState, stage: 'SCRIPT_DRAFT' } as SessionState);
          const claudeResponse = await generateResponseWithRetry({
            sessionState,
            userMessage,
            systemPrompt,
            conversationHistory,
          });
          assistantMessage = claudeResponse.assistantMessage;
        }
      } else if (transition.nextStage === 'SCRIPT_DRAFT') {
        let systemPrompt = getSystemPromptForStage({ ...sessionState, stage: 'SCRIPT_DRAFT' } as SessionState);
        systemPrompt += offlineContextNote;
        const claudeResponse = await generateResponseWithRetry({
          sessionState: { ...sessionState, stage: 'SCRIPT_DRAFT' } as SessionState,
          userMessage,
          systemPrompt,
          conversationHistory,
        });
        assistantMessage = claudeResponse.assistantMessage;
        updatedState.stage = 'REFINE';
      } else {
        // Not yet at SCRIPT_DRAFT — generate Claude response for clarification
        let systemPrompt = getSystemPromptForStage(sessionState);
        
        if (userName && sessionState.stage === 'WELCOME') {
          systemPrompt = `${systemPrompt}\n\n**User context:**\n- First name: ${userName}\n- Email: ${userEmail || 'unknown'}\n\nUse their first name naturally in your welcome message.`;
        }
        
        // Inject stored emotional profile + preferences into Claude's context
        systemPrompt += buildProfileContext(storedEmotionalProfile, storedGuestPreferences);
        systemPrompt += offlineContextNote;
        
        // Add the user's actual words to the prompt so Claude reflects them back
        if (sessionState.stage === 'INITIAL_QUESTIONS' && !isSyntheticStart) {
          const briefContext = [];
          if (sessionState.brief?.theme) briefContext.push(`Theme: ${sessionState.brief.theme}`);
          if (sessionState.brief?.where_at?.destination) briefContext.push(`Destination: ${sessionState.brief.where_at.destination}`);
          if (sessionState.brief?.duration?.days) briefContext.push(`Duration: ${sessionState.brief.duration.days} days`);
          
          systemPrompt += `\n\n**What the user has told us so far:**\n${briefContext.join('\n') || 'First message from user'}\n\n**CRITICAL:** Your response MUST acknowledge and reflect back what the user just said. Do NOT ignore their input.`;
        }
        
        const claudeResponse = await generateResponseWithRetry({
          sessionState,
          userMessage: isSyntheticStart ? 'Hello' : userMessage,
          systemPrompt,
          conversationHistory,
        });
        
        assistantMessage = claudeResponse.assistantMessage;
      }
      
    } else if (sessionState.stage === 'BRIEFING_COLLECT' ||
               sessionState.stage === 'BRIEFING_FAST' ||
               sessionState.stage === 'BRIEFING_DEEP') {
      // Legacy briefing stages — redirect to SCRIPT_DRAFT
      const transition = await transitionStage(sessionState, userMessage);
      updatedState = { ...transition.updatedState, stage: transition.nextStage };
      assistantMessage = transition.message || 'Let me design your experience now.';
      
    } else {
      // REFINE, HANDOFF, FOLLOWUP, etc.
      let systemPrompt = getSystemPromptForStage(sessionState);
      const grounding = neo4jUnavailable
        ? null
        : await buildGroundedPoiContext(sessionState, storedEmotionalProfile, storedGuestPreferences);
      if (grounding) systemPrompt = `${systemPrompt}\n\n${grounding}`;
      systemPrompt += offlineContextNote;
      
      const claudeResponse = await generateResponseWithRetry({
        sessionState,
        userMessage,
        systemPrompt,
        conversationHistory,
      });
      
      assistantMessage = claudeResponse.assistantMessage;
      
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
    
    // 8. Handle HANDOFF stage - create experience brief + trigger Stage 2
    if (
      newState.stage === 'HANDOFF' &&
      sessionState.stage !== 'HANDOFF' &&
      !session.memoryOnly &&
      isSupabaseAdminConfigured
    ) {
      const experienceBrief = createExperienceBriefFromState(
        newState,
        session.id,
        userId
      );
      
      // Save the Script Engine Stage 1 output in the brief's metadata
      const scriptEngineOutput = (newState.script as any)?.engine_output || null;
      const arcCode = (newState.script as any)?.arc_code || null;
      
      if (scriptEngineOutput) {
        experienceBrief.additional_context = {
          ...experienceBrief.additional_context,
          script_engine_output: scriptEngineOutput,
          arc_code: arcCode,
        };
        // Also store hook and description for the script library card
        (experienceBrief as any).hook = scriptEngineOutput.hook;
        (experienceBrief as any).description = scriptEngineOutput.description;
        (experienceBrief as any).theme_category = scriptEngineOutput.experience_name;
      }
      
      const { data: insertedBrief } = await supabaseAdmin
        .from('experience_briefs')
        .insert(experienceBrief)
        .select('id')
        .single();
      
      // Trigger async Stage 2 generation in background (non-blocking)
      if (scriptEngineOutput && arcCode && insertedBrief?.id) {
        (async () => {
          try {
            const { generateStage2 } = await import('@/lib/script-engine/stages/stage2');
            const region = newState.brief?.where_at?.destination || 'French Riviera';
            const duration = newState.brief?.duration?.days || 7;
            
            const stage2 = await generateStage2({
              script_id: insertedBrief.id,
              stage1: scriptEngineOutput,
              arc_code: arcCode,
              region,
              duration,
              journey_type: scriptEngineOutput.journey_type || 'INDIVIDUAL',
            });
            
            // Store Stage 2 output in the experience brief
            await supabaseAdmin
              .from('experience_briefs')
              .update({
                additional_context: {
                  ...experienceBrief.additional_context,
                  script_engine_output: scriptEngineOutput,
                  arc_code: arcCode,
                  stage2_output: stage2,
                  stage2_generated_at: new Date().toISOString(),
                },
              })
              .eq('id', insertedBrief.id);
            
            console.log(`[HANDOFF] Stage 2 generated for brief ${insertedBrief.id}`);
          } catch (err) {
            console.error('[HANDOFF] Stage 2 background generation failed:', err);
          }
        })();
      }
    }
    
    // 9. Update session
    await saveChatSession(session, newState);

    // 9b. Update durable user profile memory (best-effort, Supabase only)
    await persistUserProfileMemory(session, userId, newState, userMessage, isSyntheticStart);
    
    // 10. Insert assistant message
    assistantMessageId = await appendChatMessage(session, userId, 'assistant', assistantMessage, {
      stage: newState.stage,
      ui,
    });
    
    // 11. Return response
    return NextResponse.json({
      message: assistantMessage,
      sessionId: session.id,
      stage: newState.stage,
      voiceEnabled: newState.client.voice_reply_enabled,
      ui,
      userMessageId,
      assistantMessageId,
      memoryOnly: session.memoryOnly,
      offlineMode: session.memoryOnly || neo4jUnavailable,
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

async function buildGroundedPoiContext(
  state: SessionState,
  emotionalProfile?: Record<string, unknown>,
  guestPrefs?: Record<string, unknown>
): Promise<string | null> {
  const destination = (state.brief?.where_at?.destination || '').trim();
  if (!destination || !isNeo4jConfigured()) return null;

  try {
    // Combine themes from session + guest preferences for richer grounding
    const sessionThemes =
      state.brief?.themes?.length ? state.brief.themes : state.brief?.theme ? [state.brief.theme] : [];
    const prefThemes = (guestPrefs?.activity_interests as string[]) || [];
    const selectedThemes = [...new Set([...sessionThemes, ...prefThemes])];

    const res = await retrieveBrainCandidatesV2({
      destination,
      themes: selectedThemes.length > 0 ? selectedThemes : undefined,
      limit: 12,
      includeDrafts: true,
    });

    const header = [
      '## Grounded Knowledge (Real POIs from Neo4j)',
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
    return null;
  }
}

/**
 * Build a short context block from the stored emotional profile + guest preferences.
 * Injected into Claude's system prompt so LEXA knows the user's history.
 */
function buildProfileContext(
  emotionalProfile: Record<string, unknown>,
  guestPreferences: Record<string, unknown>
): string {
  const parts: string[] = [];

  // Emotional profile
  const feelings = emotionalProfile.desired_feelings as string[] | undefined;
  const fears = emotionalProfile.avoid_fears as string[] | undefined;
  const personality = emotionalProfile.personality_signals as string[] | undefined;
  const companion = emotionalProfile.companion_type as string | undefined;
  const arcCode = emotionalProfile.matched_arc_code as string | undefined;

  if (feelings?.length || fears?.length || personality?.length) {
    parts.push('\n## What LEXA knows about this user (from previous conversations):');
    if (feelings?.length) parts.push(`- They desire: ${feelings.join(', ')}`);
    if (fears?.length) parts.push(`- They want to avoid: ${fears.join(', ')}`);
    if (personality?.length) parts.push(`- Personality: ${personality.join(', ')}`);
    if (companion) parts.push(`- Travels: ${companion}`);
    if (arcCode) parts.push(`- Matched arc: ${arcCode}`);
  }

  // Guest preferences
  const dietary = guestPreferences.dietary_restrictions as string[] | undefined;
  const allergies = guestPreferences.allergies as string[] | undefined;
  const wellnessFocus = guestPreferences.wellness_focus as string[] | undefined;
  const activityInterests = guestPreferences.activity_interests as string[] | undefined;
  const pace = guestPreferences.pace_preference as string | undefined;

  const prefParts: string[] = [];
  if (dietary?.length && !dietary.includes('No restrictions')) prefParts.push(`Dietary: ${dietary.join(', ')}`);
  if (allergies?.length && !allergies.includes('None')) prefParts.push(`Allergies: ${allergies.join(', ')}`);
  if (wellnessFocus?.length) prefParts.push(`Wellness: ${wellnessFocus.join(', ')}`);
  if (activityInterests?.length) prefParts.push(`Interests: ${activityInterests.join(', ')}`);
  if (pace) prefParts.push(`Pace: ${pace}`);

  if (prefParts.length) {
    parts.push('\n## Guest preferences (use these to personalise):');
    prefParts.forEach(p => parts.push(`- ${p}`));
  }

  return parts.length > 0 ? '\n' + parts.join('\n') : '';
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

  if (step === 'THEME_SELECT') {
    return `STRICT: Maximum 30 words. Acknowledge what the user said in one sentence. If they didn't say anything yet, ask what they're craving. Do NOT list suggestions or destinations. Do NOT write paragraphs.`;
  }

  if (step === 'CLARIFY') {
    return `STRICT: Maximum 30 words. Ask ONE thing: where do they want to go? Nothing else. No suggestions, no lists, no paragraphs.`;
  }
  
  return 'STRICT: Maximum 30 words. Be concise.';
}

function buildIntakeFallbackSystemPrompt(state: SessionState): string {
  // Deprecated - keeping for backwards compatibility
  return buildIntakeGuidanceNote(state) || 'Be helpful and warm. Offer ideas before asking questions.';
}

