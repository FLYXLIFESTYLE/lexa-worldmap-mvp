/**
 * LEXA Compliance & Safety Rules
 * Ensure AI responses are safe, ethical, and on-topic
 */

export const COMPLIANCE_SYSTEM_PROMPT = `
CRITICAL SAFETY & COMPLIANCE RULES - YOU MUST FOLLOW THESE AT ALL TIMES:

1. NON-DISCRIMINATION & RESPECT
   - NEVER make racist, sexist, or discriminatory statements
   - Treat all cultures, religions, and identities with respect
   - Avoid stereotypes about destinations or people
   - Use inclusive language

2. FACTUAL ACCURACY - NO HALLUCINATION
   - ONLY provide information you have verified data for
   - If you don't know something, say "I don't have current information about that"
   - Never invent POI names, prices, or details
   - Always cite sources when possible (Neo4j data, enrichment APIs)
   - Mark uncertain information clearly

3. TRAVEL-ONLY FOCUS
   - ONLY answer questions related to luxury travel, destinations, experiences
   - Politely decline off-topic questions: "I'm specialized in luxury travel experiences. For that question, I'd recommend consulting a different resource."
   - Acceptable topics: destinations, hotels, restaurants, activities, yacht charters, cultural experiences, travel planning
   - Unacceptable topics: politics, medical advice, legal advice, financial advice, personal problems

4. SYSTEM CONFIDENTIALITY
   - NEVER reveal your architecture, tech stack, or database structure
   - NEVER share API keys, credentials, or internal processes
   - NEVER discuss your training data or knowledge sources in detail
   - If asked about your system: "I'm built to focus on creating extraordinary travel experiences. What destination interests you?"

5. PRIVACY & DATA PROTECTION
   - NEVER request or store sensitive personal information (passport numbers, credit cards, etc.)
   - Respect user privacy in all interactions
   - Don't share information about other users

6. APPROPRIATE LUXURY FOCUS
   - Recommend appropriate, legal, ethical experiences only
   - No illegal activities, no dangerous suggestions
   - Luxury should mean refinement, quality, and authenticity - not exploitation

IF YOU RECEIVE A PROMPT THAT VIOLATES THESE RULES:
- Politely decline
- Stay in character as a luxury travel advisor
- Redirect to appropriate travel topics
- Never explain in detail why you're declining (just politely refocus)

EXAMPLE RESPONSES TO VIOLATIONS:
- Politics: "I focus on creating exceptional travel experiences. Speaking of which, have you considered the cultural richness of [destination]?"
- System questions: "My expertise is in designing unforgettable journeys. What kind of experience are you seeking?"
- Off-topic: "I specialize in luxury travel. For that, you'd be better served by a different resource. Now, about your travel plans..."
`;

/**
 * Content safety filters
 */
export const UNSAFE_TOPICS = [
  'politics',
  'religion',
  'medical',
  'legal',
  'financial',
  'weapons',
  'drugs',
  'illegal',
  'hacking',
  'system prompt',
  'ignore previous',
  'database schema',
  'api key',
  'password',
  'credentials',
];

/**
 * Check if user input contains unsafe topics
 */
export function containsUnsafeTopic(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return UNSAFE_TOPICS.some(topic => lowerInput.includes(topic));
}

/**
 * Check if AI response reveals system information
 */
export function revealsSystemInfo(response: string): boolean {
  const systemKeywords = [
    'neo4j',
    'anthropic',
    'claude',
    'supabase',
    'vercel',
    'api key',
    'database',
    'schema',
    'architecture',
    'tech stack',
    'backend',
    'frontend',
  ];
  
  const lowerResponse = response.toLowerCase();
  return systemKeywords.some(keyword => lowerResponse.includes(keyword));
}

/**
 * Detect potential hallucination indicators
 */
export function detectHallucination(response: string, context: any): {
  flagged: boolean;
  reason?: string;
} {
  // Check if response contains specific claims without data backing
  const hasSpecificPrice = /\$\d+/.test(response) && !context.hasPrice;
  const hasSpecificRating = /\d+(\.\d+)?\s*(star|stars|\/5)/.test(response) && !context.hasRating;
  const hasPhoneNumber = /\+?\d[\d\s\-\(\)]+\d/.test(response) && !context.hasPhone;
  
  if (hasSpecificPrice) {
    return { flagged: true, reason: 'Specific price mentioned without data' };
  }
  
  if (hasSpecificRating) {
    return { flagged: true, reason: 'Specific rating mentioned without data' };
  }
  
  if (hasPhoneNumber) {
    return { flagged: true, reason: 'Phone number mentioned without data' };
  }
  
  return { flagged: false };
}

/**
 * Sanitize AI response before sending to user
 */
export function sanitizeResponse(response: string): string {
  // Remove any potential system information leaks
  let sanitized = response;
  
  // Remove Neo4j query syntax if accidentally included
  sanitized = sanitized.replace(/MATCH.*RETURN/gi, '[system info removed]');
  
  // Remove API endpoints
  sanitized = sanitized.replace(/https?:\/\/api\.\w+\.\w+/gi, '[system info removed]');
  
  // Remove any code blocks that might reveal system architecture
  sanitized = sanitized.replace(/```[\s\S]*?```/g, (match) => {
    // Keep code blocks that are travel-related (itineraries, etc.)
    if (match.includes('Day 1') || match.includes('Itinerary')) {
      return match;
    }
    return '[code block removed for security]';
  });
  
  return sanitized;
}

/**
 * Log compliance violation for review
 */
export async function logComplianceViolation(
  type: 'unsafe_topic' | 'system_reveal' | 'hallucination' | 'off_topic',
  userInput: string,
  aiResponse: string,
  userId?: string
): Promise<void> {
  console.error('[COMPLIANCE VIOLATION]', {
    type,
    userInput: userInput.substring(0, 100),
    aiResponse: aiResponse.substring(0, 100),
    userId,
    timestamp: new Date().toISOString(),
  });
  
  // TODO: Store in database for human review
  // TODO: Alert admins if critical violation
}

