/**
 * AI Knowledge Processor
 * 
 * Uses Claude AI to extract structured travel knowledge from conversations
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ParsedConversation } from './chatgpt-parser';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ExtractedPOI {
  name: string;
  type: string;
  destination?: string;
  description?: string;
  luxuryIndicators: string[];
  confidence: number;
}

export interface ExtractedRelationship {
  from: string;
  fromType: 'poi' | 'destination';
  relationType: string;
  to: string;
  toType: 'destination' | 'theme' | 'activity' | 'emotion' | 'desire' | 'season';
  confidence: number;
  evidence: string;
}

export interface ExtractedWisdom {
  topic: string;
  content: string;
  appliesTo: string[]; // Destinations or POIs
  tags: string[];
  confidence: number;
}

export interface ExtractedKnowledge {
  pois: ExtractedPOI[];
  relationships: ExtractedRelationship[];
  wisdom: ExtractedWisdom[];
  metadata: {
    conversationId: string;
    conversationTitle: string;
    processedAt: Date;
    tokenCount?: number;
  };
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert travel knowledge extractor. Analyze conversations about travel and extract structured data for a luxury travel recommendation system.

**Extract:**

1. **POIs** (Points of Interest): Hotels, restaurants, beaches, attractions, etc.
   - Name (exact as mentioned)
   - Type (hotel, restaurant, beach, museum, etc.)
   - Destination/Location
   - Description (if discussed)
   - Luxury indicators (5-star, Michelin-starred, exclusive, private, etc.)
   - Confidence (0.6-1.0)

2. **Relationships**:
   - POI → Destination (LOCATED_IN)
   - POI → Theme (HAS_THEME: Romance, Adventure, Culture, Culinary, etc.)
   - POI → Activity (SUPPORTS_ACTIVITY: Dining, Swimming, Sailing, etc.)
   - POI → Emotion (EVOKES: Peace, Excitement, Romance, etc.)
   - POI → Desire (AMPLIFIES_DESIRE: Discovery, Connection, Luxury, etc.)
   - POI → Season (AVAILABLE_IN: Summer, Winter, etc.)
   
   Include:
   - Confidence (0.6-1.0)
   - Evidence (brief explanation)

3. **Travel Wisdom** (Captain's Knowledge):
   - Best times to visit
   - Insider tips
   - Things to avoid
   - Hidden gems
   - Local insights
   - Practical advice
   
   For each:
   - Topic category
   - Content (the actual advice)
   - Where it applies (destinations/POIs)
   - Tags
   - Confidence

**Confidence Scoring:**
- **0.9-1.0**: Explicit statement with details ("The Hotel du Cap is a 5-star resort in Antibes")
- **0.75-0.89**: Strong implication with context ("We stayed at this exclusive Riviera hotel")
- **0.6-0.74**: Reasonable inference ("It's perfect for romantic getaways")
- **<0.6**: Don't include (too uncertain)

**Important:**
- Only extract travel-related information
- Be conservative with confidence scores
- Preserve exact names and spellings
- If unsure about a relationship, use lower confidence
- Skip generic/vague statements

**Output Format (JSON only, no markdown):**
{
  "pois": [
    {
      "name": "Hotel du Cap-Eden-Roc",
      "type": "luxury_resort",
      "destination": "French Riviera",
      "description": "Iconic luxury resort on the Cap d'Antibes peninsula",
      "luxuryIndicators": ["5-star", "iconic", "exclusive", "private beach"],
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "from": "Hotel du Cap-Eden-Roc",
      "fromType": "poi",
      "relationType": "EVOKES",
      "to": "Romance",
      "toType": "emotion",
      "confidence": 0.85,
      "evidence": "User described romantic sunset dinners and couples' experiences"
    }
  ],
  "wisdom": [
    {
      "topic": "Best Time to Visit",
      "content": "Visit the French Riviera in May-June or September-October for perfect weather and fewer crowds",
      "appliesTo": ["French Riviera"],
      "tags": ["timing", "seasonal", "crowds"],
      "confidence": 0.9
    }
  ]
}`;

/**
 * Process a conversation and extract travel knowledge
 */
export async function processConversation(
  conversation: ParsedConversation
): Promise<ExtractedKnowledge> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this travel conversation and extract structured knowledge:\n\n${conversation.fullText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = content.text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json?\n?/i, '').replace(/\n?```$/,'').trim();
    }

    const extracted = JSON.parse(jsonText);

    return {
      pois: extracted.pois || [],
      relationships: extracted.relationships || [],
      wisdom: extracted.wisdom || [],
      metadata: {
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        processedAt: new Date(),
        tokenCount: message.usage.input_tokens + message.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error(`Error processing conversation ${conversation.id}:`, error);
    
    // Return empty result on error
    return {
      pois: [],
      relationships: [],
      wisdom: [],
      metadata: {
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        processedAt: new Date(),
      },
    };
  }
}

/**
 * Process multiple conversations in batch with rate limiting
 */
export async function batchProcessConversations(
  conversations: ParsedConversation[],
  options: {
    batchSize?: number;
    delayMs?: number; // Delay between batches
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<ExtractedKnowledge[]> {
  const {
    batchSize = 5,
    delayMs = 2000,
    onProgress,
  } = options;

  const results: ExtractedKnowledge[] = [];
  
  for (let i = 0; i < conversations.length; i += batchSize) {
    const batch = conversations.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(conv => processConversation(conv))
    );
    
    results.push(...batchResults);
    
    // Progress callback
    if (onProgress) {
      onProgress(results.length, conversations.length);
    }
    
    // Rate limiting delay (except for last batch)
    if (i + batchSize < conversations.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Calculate total cost estimate for processing conversations
 */
export function estimateProcessingCost(conversations: ParsedConversation[]): {
  estimatedTokens: number;
  estimatedCostUSD: number;
} {
  // Rough estimate: 1 token ≈ 4 characters
  const totalChars = conversations.reduce((sum, conv) => sum + conv.fullText.length, 0);
  const estimatedInputTokens = Math.ceil(totalChars / 4);
  
  // Output tokens (estimated): ~20% of input
  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.2);
  
  const totalTokens = estimatedInputTokens + estimatedOutputTokens;
  
  // Claude Sonnet pricing (as of 2024)
  const inputCostPer1M = 3.00;
  const outputCostPer1M = 15.00;
  
  const inputCost = (estimatedInputTokens / 1_000_000) * inputCostPer1M;
  const outputCost = (estimatedOutputTokens / 1_000_000) * outputCostPer1M;
  
  return {
    estimatedTokens: totalTokens,
    estimatedCostUSD: inputCost + outputCost,
  };
}

export default {
  processConversation,
  batchProcessConversations,
  estimateProcessingCost,
};

