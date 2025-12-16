/**
 * Relationship Inference System
 * 
 * This module handles AI-powered inference of psychological and contextual
 * relationships when processing unstructured user input during LEXA conversations.
 * 
 * Use Cases:
 * - User describes desires/fears → Link POIs to emotions
 * - User mentions activities → Create SUPPORTS_ACTIVITY relations
 * - User discusses themes → Create HAS_THEME relations
 * - User shares experiences → Create EVOKES relations
 */

import { getNeo4jDriver } from './client';
import { calculateRelationshipConfidence } from './scoring-engine';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface InferredRelationship {
  fromType: string;
  fromId: string;
  relationType: string;
  toType: string;
  toId: string;
  confidence: number;
  evidence: string;
}

interface InferenceResult {
  relationships: InferredRelationship[];
  reasoning: string;
}

/**
 * Infer relationships from unstructured user input using Claude AI
 * 
 * @param userInput - Raw text from user conversation
 * @param context - Additional context (current POIs, destination, etc.)
 * @returns Inferred relationships with confidence scores
 */
export async function inferRelationshipsFromText(
  userInput: string,
  context?: {
    currentPOIs?: string[];
    destination?: string;
    themes?: string[];
  }
): Promise<InferenceResult> {
  const systemPrompt = `You are a relationship inference engine for a luxury travel database.

Your job is to analyze user input and infer relationships between entities in our Neo4j graph database.

Entity Types:
- poi (Point of Interest)
- destination
- theme_category
- activity_type
- experience_category
- Emotion (Joy, Excitement, Peace, Adventure, Romance, etc.)
- Desire (Connection, Discovery, Transformation, Indulgence, etc.)
- Fear (Crowds, Heights, Water, Isolation, etc.)
- Need (Relaxation, Challenge, Culture, Nature, etc.)

Relationship Types to Infer:

1. EVOKES: POI → Emotion
   Example: "The sunset at Santorini made me feel peaceful" → (Santorini)-[:EVOKES {confidence: 0.9}]->(Peace)

2. AMPLIFIES_DESIRE: POI → Desire
   Example: "I want to discover hidden gems" → (HiddenPOI)-[:AMPLIFIES_DESIRE {confidence: 0.8}]->(Discovery)

3. MITIGATES_FEAR: POI → Fear
   Example: "I'm afraid of crowds, so prefer secluded beaches" → (SecludedBeach)-[:MITIGATES_FEAR {confidence: 0.85}]->(Crowds)

4. RELATES_TO: POI → Need/Constraint
   Example: "I need relaxation and wellness" → (SpaResort)-[:RELATES_TO {confidence: 0.9}]->(Relaxation)

5. SUPPORTS_ACTIVITY: POI → Activity Type
   Example: "I want to go sailing" → (Marina)-[:SUPPORTS_ACTIVITY {confidence: 0.8}]->(Sailing)

6. HAS_THEME: POI → Theme Category
   Example: "I'm interested in wine tasting experiences" → (Vineyard)-[:HAS_THEME {confidence: 0.85}]->(Culinary)

7. FEATURED_IN: POI → Theme/Experience
   Example: "This villa is perfect for romantic getaways" → (Villa)-[:FEATURED_IN {confidence: 0.9}]->(Romance)

8. AVAILABLE_IN: POI → Time Period
   Example: "Best visited in summer" → (BeachClub)-[:AVAILABLE_IN {season: 'summer', confidence: 0.8}]

9. PROMINENT_IN: POI → Destination
   Example: "The Eiffel Tower defines Paris" → (EiffelTower)-[:PROMINENT_IN {confidence: 0.95}]->(Paris)

Return JSON in this format:
{
  "relationships": [
    {
      "fromType": "poi",
      "fromId": "unique_identifier or name",
      "relationType": "EVOKES",
      "toType": "Emotion",
      "toId": "Peace",
      "confidence": 0.9,
      "evidence": "User explicitly mentioned feeling peaceful"
    }
  ],
  "reasoning": "Brief explanation of inference logic"
}

IMPORTANT:
- Only infer relationships with confidence >= 0.6
- Use exact entity names from the context if provided
- For new entities, use clear, standardized names
- Include evidence for each relationship
`;

  const userPrompt = `User Input: "${userInput}"

${context ? `Context:
- Current POIs: ${context.currentPOIs?.join(', ') || 'None'}
- Destination: ${context.destination || 'Unknown'}
- Active Themes: ${context.themes?.join(', ') || 'None'}
` : ''}

Analyze this input and infer relevant relationships for our luxury travel database.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { relationships: [], reasoning: 'No valid JSON found in response' };
    }

    const result = JSON.parse(jsonMatch[0]) as InferenceResult;
    return result;
  } catch (error) {
    console.error('Error inferring relationships:', error);
    return { relationships: [], reasoning: 'Error during inference' };
  }
}

/**
 * Create inferred relationships in Neo4j database
 * 
 * @param relationships - Array of inferred relationships
 * @returns Count of successfully created relationships
 */
export async function createInferredRelationships(
  relationships: InferredRelationship[]
): Promise<number> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  let created = 0;

  try {
    for (const rel of relationships) {
      // Skip low-confidence relationships
      if (rel.confidence < 0.6) {
        continue;
      }

      try {
        // Dynamic Cypher query based on relationship type
        const query = `
          MATCH (from:${rel.fromType} {name: $fromId})
          MERGE (to:${rel.toType} {name: $toId})
          MERGE (from)-[r:${rel.relationType}]->(to)
          ON CREATE SET
            r.confidence = $confidence,
            r.evidence = $evidence,
            r.created_at = datetime(),
            r.inferred_by = 'ai'
          ON MATCH SET
            r.confidence = CASE
              WHEN $confidence > r.confidence THEN $confidence
              ELSE r.confidence
            END,
            r.updated_at = datetime()
          RETURN r
        `;

        await session.run(query, {
          fromId: rel.fromId,
          toId: rel.toId,
          confidence: rel.confidence,
          evidence: rel.evidence,
        });

        created++;
      } catch (error) {
        console.error(`Failed to create relationship: ${rel.relationType}`, error);
      }
    }

    return created;
  } finally {
    await session.close();
  }
}

/**
 * Infer and create relationships in one step (convenience function)
 */
export async function inferAndCreateRelationships(
  userInput: string,
  context?: {
    currentPOIs?: string[];
    destination?: string;
    themes?: string[];
  }
): Promise<{
  inferred: number;
  created: number;
  reasoning: string;
}> {
  const result = await inferRelationshipsFromText(userInput, context);
  const created = await createInferredRelationships(result.relationships);

  return {
    inferred: result.relationships.length,
    created,
    reasoning: result.reasoning,
  };
}

/**
 * Add seasonal AVAILABLE_IN relationships based on best visit times
 */
export async function addSeasonalAvailability(): Promise<number> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Infer seasonal availability based on POI type and location
    const result = await session.run(`
      MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
      WHERE p.type IN ['beach', 'beach_club', 'yacht_club', 'water_sports']
        AND NOT (p)-[:AVAILABLE_IN]->()
      WITH p, d
      MERGE (p)-[:AVAILABLE_IN {
        season: 'summer',
        months: ['May', 'June', 'July', 'August', 'September'],
        confidence: 0.8,
        reason: 'beach_seasonal_inference'
      }]->(:season {name: 'Summer'})
      RETURN count(p) as created
    `);

    return result.records[0]?.get('created')?.toNumber() || 0;
  } finally {
    await session.close();
  }
}

export default {
  inferRelationshipsFromText,
  createInferredRelationships,
  inferAndCreateRelationships,
  addSeasonalAvailability,
};

