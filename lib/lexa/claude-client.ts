/**
 * Anthropic Claude Integration
 * LLM wrapper for LEXA conversational responses
 */

import Anthropic from '@anthropic-ai/sdk';
import { SessionState, ExtractedSignals } from './types';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 1024;

// ============================================================================
// MAIN CLAUDE INTERFACE
// ============================================================================

export interface ClaudeRequest {
  sessionState: SessionState;
  userMessage: string;
  systemPrompt: string;
}

export interface ClaudeResponse {
  assistantMessage: string;
  extractedSignals: ExtractedSignals;
  rawResponse?: string;
}

export async function generateResponse(
  request: ClaudeRequest
): Promise<ClaudeResponse> {
  const { sessionState, userMessage, systemPrompt } = request;
  
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(systemPrompt, sessionState),
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });
    
    const assistantMessage = extractTextFromResponse(response);
    const extractedSignals = extractSignalsFromResponse(assistantMessage, sessionState);
    
    return {
      assistantMessage,
      extractedSignals,
      rawResponse: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('Claude API error:', error);
    
    // Fallback response
    return {
      assistantMessage: 'I\'m having trouble connecting. Can you repeat that?',
      extractedSignals: {},
    };
  }
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(stagePrompt: string, state: SessionState): string {
  const userLanguage = (state as any).userProfile?.preferred_language || 'en';
  const languageInstruction = userLanguage !== 'en' 
    ? `\n**Important**: Respond in ${getLanguageName(userLanguage)} (${userLanguage}). Maintain your sophisticated tone in this language.`
    : '';
  
  const basePersonality = `You are LEXA, a sophisticated luxury travel experience designer for the world's most discerning travelers.${languageInstruction}

**Your refined character:**
- **Elegantly confident**: You speak with quiet authority, never needing to prove yourself
- **Perceptively intuitive**: You read between the lines, understanding unstated desires  
- **Refined but warm**: Professional excellence meets genuine human connection
- **Helpful and knowledgeable**: Like an expert friend, you SHOW your expertise by offering concrete ideas
- **Decisively focused**: You guide toward singular, meaningful outcomes rather than overwhelming with options

**Your conversation style (CRITICAL - this is how you help):**
1. **Acknowledge** what they want - show you understand the feeling/desire
2. **Paint the picture** - Describe why the destination/experience resonates
3. **Offer 2-3 concrete ideas** - Specific places, activities, or signature moments (not generic lists!)
4. **THEN ask** your next thoughtful question to deepen understanding

**Example:**
User: "I want a romantic weekend in Vienna with my wife"
You: "Vienna is a wonderful choice for romance! The city has such a beautiful blend of imperial grandeur, cozy coffee culture, and artistic charm that makes it perfect for couples.

A few highlights that could make your trip special:

For atmosphere: Stroll through the Schönbrunn Palace gardens at sunset, wander the cobblestone streets of the historic center, or take an evening walk along the Danube Canal where it's lit up beautifully.

For experiences: Catching a classical concert (even just a short one in an intimate venue), sharing Sachertorte at a traditional Viennese café like Café Central or Demel, or visiting the Belvedere Palace to see Klimt's "The Kiss" together.

For food: The Naschmarkt is also lovely for browsing and grabbing a casual bite.

What draws you most - the atmosphere and architecture, the cultural experiences, or discovering Vienna through its food scene?"

**See the difference?** You're being helpful AND insightful, not just asking questions!

**Your edge (inventive + anticipatory):**
- Propose *original* signature moments by combining themes, emotions, constraints, and logistics into bespoke experiences (not generic tourist ideas)
- When a user is vague, anticipate what they're likely optimizing for (privacy, intimacy, story, energy, meaning) and weave in suggestions while clarifying
- Creativity must be **safe, legal, and feasible**. If an idea touches safety/regulations (drones, balloons, actors, etc.), propose a safer alternative or include the necessary professional/permit framing

**Anti-hallucination rule for creativity (critical):**
- You may invent **cross-domain adaptations** (e.g., supercar-world concepts adapted to yachts; culinary concepts adapted to fashion), but do NOT present speculative ideas as confirmed facts
- If you are not sure something is possible, phrase it as a *concept* and propose a quick feasibility check (vendor + permits + location constraints + budget/timeline)
- Never claim that permits/clearances are "easy" or guaranteed. When uncertain, recommend a specialist partner and a safer backup

**Current engagement:**
- Stage: ${state.stage}
- Trust level: ${state.signals.trust.toFixed(2)}
- Client clarity: ${(1 - state.signals.skepticism).toFixed(2)}
- Desired experience: ${state.emotions.desired.join(', ') || 'discovering'}
- Avoiding: ${state.emotions.avoid_fears.join(', ') || 'yet to be revealed'}

**Your mandate for this interaction:**
${stagePrompt}

**Communication principles:**
- **Tone**: Refined, professional, quietly confident - like a knowledgeable friend
- **Length**: Be as helpful as needed! Don't artificially restrict yourself. Give ideas, paint pictures, then ask.
- **Pace**: One elegant question at a time at the END of your response; never rush
- **Depth**: Listen for emotional truth beneath surface statements
- **Style**: Avoid generic luxury clichés; be precise, be real, BE HELPFUL
- **Language**: Use "you" not "we"; be direct without being casual

**Forbidden:**
- Generic phrases like "amazing", "unforgettable", "once-in-a-lifetime" (unless truly warranted)
- Overly casual language or emojis
- Multiple questions in one response
- Spray-gun recommendations (be selective!)
- Being unhelpful by ONLY asking questions without offering ANY ideas`;

  return basePersonality;
}

// Helper to get full language name
function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    fr: 'French / Français',
    de: 'German / Deutsch',
    it: 'Italian / Italiano',
    es: 'Spanish / Español',
    ru: 'Russian / Русский',
    ar: 'Arabic / العربية',
    zh: 'Chinese / 中文'
  };
  return names[code] || 'English';
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

function extractTextFromResponse(response: Anthropic.Message): string {
  const textContent = response.content.find((c) => c.type === 'text');
  if (textContent && textContent.type === 'text') {
    return textContent.text;
  }
  return '';
}

function extractSignalsFromResponse(
  assistantMessage: string,
  currentState: SessionState
): ExtractedSignals {
  // Simple heuristic-based signal extraction
  // In production, this could use Claude's structured output or a separate extraction call
  
  const lowerMessage = assistantMessage.toLowerCase();
  const signals: ExtractedSignals = {};
  
  // Extract emotional keywords
  const emotionKeywords = {
    desired: [] as string[],
    avoid_fears: [] as string[],
  };
  
  const positiveEmotions = ['peace', 'joy', 'freedom', 'connection', 'intimacy', 'aliveness', 'significance', 'meaning'];
  const negativeEmotions = ['isolation', 'crowds', 'pretense', 'rush', 'performance', 'superficial', 'disappointment'];
  
  for (const emotion of positiveEmotions) {
    if (lowerMessage.includes(emotion)) {
      emotionKeywords.desired.push(emotion);
    }
  }
  
  for (const fear of negativeEmotions) {
    if (lowerMessage.includes(fear)) {
      emotionKeywords.avoid_fears.push(fear);
    }
  }
  
  if (emotionKeywords.desired.length > 0 || emotionKeywords.avoid_fears.length > 0) {
    signals.emotions = emotionKeywords;
  }
  
  // Extract trust/skepticism signals (simple heuristics)
  // In production, use more sophisticated NLP or Claude's analysis
  
  return signals;
}

// ============================================================================
// STRUCTURED DATA EXTRACTION
// ============================================================================

export interface BriefFieldExtractionRequest {
  userMessage: string;
  fieldName: string;
  currentState: SessionState;
}

export interface BriefFieldExtractionResponse {
  fieldValue: any;
  confidence: number;
  reasoning: string;
}

export async function extractBriefField(
  request: BriefFieldExtractionRequest
): Promise<BriefFieldExtractionResponse> {
  const { userMessage, fieldName, currentState } = request;
  
  const systemPrompt = `You are a data extraction assistant for LEXA.

Extract the "${fieldName}" field from the user's message.

**Field Definitions:**
- when: { timeframe: string, dates: { start: ISO, end: ISO }, flexibility: "fixed" | "flexible_by_days" | "flexible_by_weeks" }
- where: { destination: string, regions: string[], hints: string }
- theme: string (e.g., "Mediterranean Indulgence")
- budget: { amount: number, currency: string, sensitivity: "moderate" | "high" | "ultra" }
- duration: { days: number, flexibility: "exact" | "can_extend" | "flexible" }
- must_haves: string[]
- best_experiences: { experience: string, why: string }[]
- worst_experiences: { experience: string, why: string }[]
- bucket_list: string[]

Return ONLY valid JSON matching the field structure. If the user's message doesn't contain clear data for this field, return null.`;
  
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Extract "${fieldName}" from: "${userMessage}"`,
        },
      ],
    });
    
    const text = extractTextFromResponse(response);
    
    // Try to parse JSON from the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const fieldValue = JSON.parse(jsonMatch[0]);
        return {
          fieldValue,
          confidence: 0.8,
          reasoning: `Extracted ${fieldName} from user input`,
        };
      }
    } catch (e) {
      // Not valid JSON
    }
    
    // Fallback: return the text as-is for simple string fields
    return {
      fieldValue: text.trim(),
      confidence: 0.5,
      reasoning: `Interpreted ${fieldName} as plain text`,
    };
    
  } catch (error) {
    console.error('Brief field extraction error:', error);
    return {
      fieldValue: null,
      confidence: 0,
      reasoning: 'Extraction failed',
    };
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

export async function generateResponseWithRetry(
  request: ClaudeRequest,
  maxRetries: number = 3
): Promise<ClaudeResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateResponse(request);
    } catch (error) {
      lastError = error as Error;
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  console.error(`Claude API failed after ${maxRetries} attempts:`, lastError);
  
  return {
    assistantMessage: 'I\'m having trouble right now. Let\'s try again in a moment.',
    extractedSignals: {},
  };
}

// ============================================================================
// RATE LIMITING (simple in-memory)
// ============================================================================

interface RateLimitState {
  requests: number[];
  maxPerMinute: number;
}

const rateLimitState: RateLimitState = {
  requests: [],
  maxPerMinute: 50, // Anthropic's default
};

export function checkRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove old requests
  rateLimitState.requests = rateLimitState.requests.filter(t => t > oneMinuteAgo);
  
  if (rateLimitState.requests.length >= rateLimitState.maxPerMinute) {
    return false; // Rate limit exceeded
  }
  
  rateLimitState.requests.push(now);
  return true;
}
