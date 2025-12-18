/**
 * ChatNeo4j API - Natural Language Interface to Neo4j
 * 
 * Converts natural language questions into Cypher queries using Claude AI
 * Executes queries safely and returns formatted results
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequest {
  question: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface QueryResult {
  cypherQuery: string;
  results: any[];
  summary: string;
  rowCount: number;
}

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, conversationHistory = [] }: ChatRequest = await req.json();

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Generate Cypher query using Claude
    const cypherQuery = await generateCypherQuery(question, conversationHistory);

    // Safety check - prevent destructive operations
    if (isDestructiveQuery(cypherQuery)) {
      return NextResponse.json({
        error: 'Query not allowed',
        message: 'Destructive operations (DELETE, REMOVE, SET) are not permitted in ChatNeo4j. Use the admin UI for data modifications.',
      }, { status: 403 });
    }

    // Execute query
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      const result = await session.run(cypherQuery, {}, { timeout: 10000 });
      
      const records = result.records.map(record => {
        const obj: any = {};
        record.keys.forEach(key => {
          const value = record.get(key);
          // Handle Neo4j types
          if (value && typeof value === 'object') {
            if (value.constructor.name === 'Integer') {
              obj[key] = value.toNumber();
            } else if (value.properties) {
              obj[key] = value.properties;
            } else {
              obj[key] = value;
            }
          } else {
            obj[key] = value;
          }
        });
        return obj;
      });

      // Generate natural language summary
      const summary = await generateSummary(question, cypherQuery, records);

      const queryResult: QueryResult = {
        cypherQuery,
        results: records,
        summary,
        rowCount: records.length,
      };

      return NextResponse.json({
        success: true,
        data: queryResult,
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('ChatNeo4j error:', error);
    
    return NextResponse.json({
      error: 'Query failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Try rephrasing your question or making it more specific.',
    }, { status: 500 });
  }
}

/**
 * Generate Cypher query from natural language using Claude
 */
async function generateCypherQuery(
  question: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  
  const systemPrompt = `You are a Neo4j Cypher query expert for a luxury travel database called LEXA.

DATABASE SCHEMA:
Nodes:
- poi (Point of Interest): name, type, destination_name, lat, lon, luxury_score (0-10), luxury_confidence (0-1), source, captain_comments
- destination: name, region, country, description
- theme: name, description
- activity_type: name, description
- Emotion: name, valence
- Desire: name, intensity
- Fear: name, severity

Relationships:
- (poi)-[:LOCATED_IN]->(destination)
- (poi)-[:HAS_THEME]->(theme)
- (poi)-[:SUPPORTS_ACTIVITY]->(activity_type)
- (poi)-[:EVOKES]->(Emotion)
- (poi)-[:AMPLIFIES_DESIRE]->(Desire)
- (poi)-[:MITIGATES_FEAR]->(Fear)
- (activity_type)-[:EVOKES]->(Emotion)
- (activity_type)-[:AMPLIFIES_DESIRE]->(Desire)
- (activity_type)-[:MITIGATES_FEAR]->(Fear)
- (destination)-[:IN_REGION]->(region)
- (destination)-[:IN_COUNTRY]->(country)
- (theme)-[:AVAILABLE_IN]->(destination)

IMPORTANT RULES:
1. Generate ONLY the Cypher query, no explanations
2. Use ONLY read operations (MATCH, RETURN, WHERE, ORDER BY, LIMIT)
3. NO write operations (CREATE, DELETE, SET, REMOVE, MERGE)
4. Always include LIMIT to prevent huge result sets (default: 50, max: 1000)
5. Use proper WHERE clauses for filtering
6. Case-insensitive matching: toLower(n.property) CONTAINS toLower($param)
7. Return useful properties, not just node IDs
8. Handle null values with COALESCE or IS NOT NULL (Neo4j does NOT support NULLS LAST/FIRST syntax)
9. Use descriptive aliases for clarity
10. All relationship names MUST be UPPERCASE (e.g., EVOKES, LOCATED_IN, SUPPORTS_ACTIVITY)

EXAMPLES:

Q: "Show me luxury POIs in St. Tropez"
A: MATCH (p:poi) WHERE (toLower(p.destination_name) CONTAINS 'st. tropez' OR toLower(p.destination_name) CONTAINS 'st tropez' OR toLower(p.destination_name) CONTAINS 'saint tropez') AND p.luxury_score IS NOT NULL RETURN p.name, p.type, p.luxury_score, p.destination_name, p.lat, p.lon ORDER BY p.luxury_score DESC LIMIT 50

Q: "How many POIs do we have worldwide?"
A: MATCH (p:poi) RETURN count(p) as total_pois

Q: "Show me beach clubs with luxury score above 8"
A: MATCH (p:poi) WHERE (toLower(p.type) CONTAINS 'beach' OR toLower(p.name) CONTAINS 'beach club') AND p.luxury_score > 8 RETURN p.name, p.destination_name, p.luxury_score, p.luxury_confidence ORDER BY p.luxury_score DESC LIMIT 50

Q: "Show me 10 POIs in Croatia"
A: MATCH (p:poi) WHERE toLower(p.destination_name) CONTAINS 'croatia' OR toLower(p.destination_name) CONTAINS 'dubrovnik' OR toLower(p.destination_name) CONTAINS 'split' OR toLower(p.destination_name) CONTAINS 'hvar' RETURN p.name, p.type, p.destination_name, COALESCE(p.luxury_score, 0) as luxury_score ORDER BY luxury_score DESC LIMIT 10

Q: "What destinations have the most POIs?"
A: MATCH (p:poi) WHERE p.destination_name IS NOT NULL WITH p.destination_name as destination, count(p) as poi_count ORDER BY poi_count DESC LIMIT 20 RETURN destination, poi_count

Q: "Find snorkeling spots worldwide"
A: MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type) WHERE toLower(a.name) CONTAINS 'snorkel' RETURN p.name, p.destination_name, COALESCE(p.luxury_score, 0) as luxury_score, p.lat, p.lon ORDER BY luxury_score DESC LIMIT 100

Q: "Show me POIs that evoke joy"
A: MATCH (p:poi)-[:EVOKES]->(e:Emotion) WHERE toLower(e.name) CONTAINS 'joy' RETURN p.name, p.type, p.destination_name, COALESCE(p.luxury_score, 0) as luxury_score, e.name as emotion ORDER BY luxury_score DESC LIMIT 50

Q: "Find POIs that amplify desire for luxury"
A: MATCH (p:poi)-[:AMPLIFIES_DESIRE]->(d:Desire) WHERE toLower(d.name) CONTAINS 'luxury' RETURN p.name, p.type, p.destination_name, COALESCE(p.luxury_score, 0) as luxury_score, d.name as desire ORDER BY luxury_score DESC LIMIT 50

Now generate a Cypher query for the user's question. Return ONLY the Cypher query, nothing else.`;

  const messages: any[] = [
    ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
    { role: 'user', content: question }
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const cypherQuery = response.content[0].type === 'text' 
    ? response.content[0].text.trim()
    : '';

  // Clean up the query (remove markdown code blocks if present)
  return cypherQuery
    .replace(/```cypher\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

/**
 * Generate natural language summary of results using Claude
 */
async function generateSummary(
  question: string,
  cypherQuery: string,
  results: any[]
): Promise<string> {
  
  const systemPrompt = `You are a helpful assistant that explains database query results in natural language.

Given a user's question, the Cypher query executed, and the results, provide a clear, concise summary.

RULES:
1. Start with a direct answer to the question
2. Highlight key insights or patterns
3. Be specific with numbers and names
4. If no results: explain why and suggest alternatives
5. Keep it conversational and helpful
6. Maximum 3-4 sentences`;

  const userPrompt = `Question: "${question}"

Cypher Query: ${cypherQuery}

Results: ${JSON.stringify(results.slice(0, 10), null, 2)}
${results.length > 10 ? `\n(Showing first 10 of ${results.length} results)` : ''}

Provide a natural language summary:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return response.content[0].type === 'text' 
    ? response.content[0].text.trim()
    : 'Results retrieved successfully.';
}

/**
 * Check if query contains destructive operations
 */
function isDestructiveQuery(cypherQuery: string): boolean {
  const destructiveKeywords = [
    'DELETE',
    'REMOVE',
    'SET',
    'CREATE',
    'MERGE',
    'DETACH',
  ];

  const upperQuery = cypherQuery.toUpperCase();
  return destructiveKeywords.some(keyword => upperQuery.includes(keyword));
}

