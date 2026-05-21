/**
 * Chat persistence with in-memory fallback for private single-user use.
 * When Supabase is missing or unreachable, sessions live in server memory only.
 */

import { randomUUID } from 'crypto';
import { AUTH_DISABLED } from '@/lib/auth/user-access';
import { isSupabaseAdminConfigured, supabaseAdmin } from '@/lib/supabase/client';
import { DEFAULT_SESSION_STATE, SessionState } from '@/lib/lexa/types';

export const CHAT_MEMORY_FALLBACK_ENABLED =
  AUTH_DISABLED || process.env.LEXA_CHAT_MEMORY_FALLBACK === 'true';

export type ChatSessionRecord = {
  id: string;
  user_id: string;
  stage: string;
  state: SessionState;
  memoryOnly: boolean;
};

export type StoredChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const memorySessions = new Map<string, ChatSessionRecord>();
const memoryMessages = new Map<string, StoredChatMessage[]>();

export function serializeSessionState(state: SessionState): SessionState {
  return JSON.parse(JSON.stringify(state)) as SessionState;
}

export type ClientSessionSync = {
  sessionState?: SessionState;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
};

function seedMemoryMessages(
  sessionId: string,
  history?: { role: 'user' | 'assistant'; content: string }[]
) {
  if (!history?.length) return;
  memoryMessages.set(
    sessionId,
    history.map((m) => ({
      id: randomUUID(),
      role: m.role,
      content: m.content,
    }))
  );
}

function rehydrateMemorySession(
  sessionId: string,
  userId: string,
  state: SessionState,
  history?: { role: 'user' | 'assistant'; content: string }[]
): ChatSessionRecord {
  const session: ChatSessionRecord = {
    id: sessionId,
    user_id: userId,
    stage: state.stage,
    state,
    memoryOnly: true,
  };
  memorySessions.set(sessionId, session);
  seedMemoryMessages(sessionId, history);
  return session;
}

function createMemorySession(userId: string, state: SessionState): ChatSessionRecord {
  const session: ChatSessionRecord = {
    id: randomUUID(),
    user_id: userId,
    stage: state.stage,
    state,
    memoryOnly: true,
  };
  memorySessions.set(session.id, session);
  memoryMessages.set(session.id, []);
  return session;
}

export async function loadOrCreateChatSession(
  sessionId: string | null | undefined,
  userId: string,
  clientSync?: ClientSessionSync
): Promise<{ session: ChatSessionRecord; sessionState: SessionState }> {
  if (sessionId) {
    if (isSupabaseAdminConfigured) {
      const { data, error } = await supabaseAdmin
        .from('lexa_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (data && !error) {
        return {
          session: { ...data, memoryOnly: false },
          sessionState: data.state as SessionState,
        };
      }
    }

    const memorySession = memorySessions.get(sessionId);
    if (memorySession && memorySession.user_id === userId) {
      return { session: memorySession, sessionState: memorySession.state };
    }

    if (clientSync?.sessionState && CHAT_MEMORY_FALLBACK_ENABLED) {
      const state = serializeSessionState(clientSync.sessionState);
      const session = rehydrateMemorySession(
        sessionId,
        userId,
        state,
        clientSync.conversationHistory
      );
      return { session, sessionState: state };
    }

    if (!CHAT_MEMORY_FALLBACK_ENABLED) {
      throw new Error('Session not found');
    }

    console.warn('[Chat] Session not found in DB or memory; starting a fresh in-memory session.');
  }

  const newState = serializeSessionState({ ...DEFAULT_SESSION_STATE });

  if (isSupabaseAdminConfigured) {
    const { data, error } = await supabaseAdmin
      .from('lexa_sessions')
      .insert({
        user_id: userId,
        stage: newState.stage,
        state: newState,
      })
      .select()
      .single();

    if (data && !error) {
      return {
        session: { ...data, memoryOnly: false },
        sessionState: newState,
      };
    }

    console.warn('[Chat] Supabase session create failed; using in-memory fallback:', error?.message);
  }

  if (!CHAT_MEMORY_FALLBACK_ENABLED) {
    throw new Error(
      isSupabaseAdminConfigured
        ? 'Failed to create session'
        : 'Database not configured. Set Supabase env vars or enable auth bypass for memory-only chat.'
    );
  }

  const session = createMemorySession(userId, newState);
  return { session, sessionState: newState };
}

export async function loadUserProfile(userId: string): Promise<{
  emotional_profile: Record<string, unknown>;
  guest_preferences: Record<string, unknown>;
  full_name: string | null;
  first_name: string | null;
}> {
  if (!isSupabaseAdminConfigured) {
    return { emotional_profile: {}, guest_preferences: {}, full_name: null, first_name: null };
  }

  try {
    const { data } = await supabaseAdmin
      .from('lexa_user_profiles')
      .select('emotional_profile, guest_preferences, full_name, first_name')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      emotional_profile: (data?.emotional_profile as Record<string, unknown>) || {},
      guest_preferences: (data?.guest_preferences as Record<string, unknown>) || {},
      full_name: data?.full_name ?? null,
      first_name: data?.first_name ?? null,
    };
  } catch {
    return { emotional_profile: {}, guest_preferences: {}, full_name: null, first_name: null };
  }
}

export async function loadConversationHistory(
  session: ChatSessionRecord,
  clientHistory?: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  if (session.memoryOnly) {
    const stored = (memoryMessages.get(session.id) || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    if (stored.length > 0) return stored;
    return (clientHistory || []).slice(-20);
  }

  if (!isSupabaseAdminConfigured) return [];

  try {
    const { data } = await supabaseAdmin
      .from('lexa_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(20);

    return (data || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  } catch {
    return [];
  }
}

export async function appendChatMessage(
  session: ChatSessionRecord,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  meta: Record<string, unknown> = {}
): Promise<string | null> {
  if (session.memoryOnly) {
    const id = randomUUID();
    const list = memoryMessages.get(session.id) || [];
    list.push({ id, role, content });
    memoryMessages.set(session.id, list);
    return id;
  }

  if (!isSupabaseAdminConfigured) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('lexa_messages')
      .insert({
        session_id: session.id,
        user_id: userId,
        role,
        content,
        meta,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[Chat] Failed to persist message:', error.message);
      return null;
    }

    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveChatSession(
  session: ChatSessionRecord,
  newState: SessionState
): Promise<void> {
  session.stage = newState.stage;
  session.state = newState;

  if (session.memoryOnly) {
    memorySessions.set(session.id, session);
    return;
  }

  if (!isSupabaseAdminConfigured) return;

  try {
    await supabaseAdmin
      .from('lexa_sessions')
      .update({
        stage: newState.stage,
        state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);
  } catch (error) {
    console.warn('[Chat] Failed to update session in Supabase:', error);
  }
}

export async function persistUserProfileMemory(
  session: ChatSessionRecord,
  userId: string,
  newState: SessionState,
  userMessage: string,
  isSyntheticStart: boolean
): Promise<void> {
  if (session.memoryOnly || !isSupabaseAdminConfigured) return;

  try {
    const { profilePatchFromState, mergeProfileJson } = await import('@/lib/lexa/profile');

    let emotionalExtraction = null;
    if (!isSyntheticStart && userMessage.length >= 15) {
      try {
        const { extractEmotionalSignals } = await import('@/lib/lexa/emotional-extractor');
        const { data: epData } = await supabaseAdmin
          .from('lexa_user_profiles')
          .select('emotional_profile')
          .eq('user_id', userId)
          .maybeSingle();
        const ep = epData?.emotional_profile || {};
        emotionalExtraction = await extractEmotionalSignals(userMessage, {
          desired_feelings: ep.desired_feelings || [],
          avoid_fears: ep.avoid_fears || [],
          life_context: ep.life_context || null,
          personality_signals: ep.personality_signals || [],
          companion_type: ep.companion_type || null,
          urgency: ep.urgency || null,
        });
      } catch {
        // Non-blocking
      }
    }

    const patch = profilePatchFromState(newState, emotionalExtraction);
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
  } catch (error) {
    console.warn('[Chat] Profile persistence skipped:', error);
  }
}
