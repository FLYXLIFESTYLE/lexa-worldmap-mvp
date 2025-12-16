/**
 * Knowledge Ingestion System
 * Main orchestrator for importing travel knowledge into LEXA
 */

export * from './chatgpt-parser';
export * from './ai-processor';
export * from './knowledge-ingestor';

import { 
  parseChatGPTExportForTravel, 
  chunkConversation,
  type ParsedConversation 
} from './chatgpt-parser';
import { 
  batchProcessConversations, 
  estimateProcessingCost 
} from './ai-processor';
import { batchIngestKnowledge } from './knowledge-ingestor';

/**
 * Complete pipeline: Parse → Process → Ingest ChatGPT conversations
 */
export async function importChatGPTConversations(
  jsonData: any,
  options: {
    onParseComplete?: (count: number) => void;
    onProcessProgress?: (processed: number, total: number) => void;
    onIngestProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<{
  conversationsParsed: number;
  conversationsProcessed: number;
  poisCreated: number;
  poisUpdated: number;
  relationshipsCreated: number;
  wisdomCreated: number;
  errors: string[];
  estimatedCostUSD: number;
  actualTokensUsed: number;
}> {
  console.log('[Knowledge Import] Starting ChatGPT import pipeline...');
  
  // Step 1: Parse JSON
  console.log('[Knowledge Import] Step 1/3: Parsing conversations...');
  const conversations = parseChatGPTExportForTravel(jsonData);
  
  if (options.onParseComplete) {
    options.onParseComplete(conversations.length);
  }
  
  // Chunk large conversations
  const chunkedConversations: ParsedConversation[] = [];
  for (const conv of conversations) {
    const chunks = chunkConversation(conv);
    chunkedConversations.push(...chunks);
  }
  
  console.log(`[Knowledge Import] ${conversations.length} conversations → ${chunkedConversations.length} chunks`);
  
  // Estimate cost
  const costEstimate = estimateProcessingCost(chunkedConversations);
  console.log(`[Knowledge Import] Estimated cost: $${costEstimate.estimatedCostUSD.toFixed(2)}`);
  
  // Step 2: Process with AI
  console.log('[Knowledge Import] Step 2/3: Extracting knowledge with AI...');
  const extracted = await batchProcessConversations(chunkedConversations, {
    onProgress: options.onProcessProgress,
  });
  
  // Calculate actual token usage
  const actualTokens = extracted.reduce(
    (sum, e) => sum + (e.metadata.tokenCount || 0),
    0
  );
  
  console.log(`[Knowledge Import] Extracted knowledge from ${extracted.length} conversations`);
  console.log(`[Knowledge Import] Total POIs: ${extracted.reduce((sum, e) => sum + e.pois.length, 0)}`);
  console.log(`[Knowledge Import] Total relationships: ${extracted.reduce((sum, e) => sum + e.relationships.length, 0)}`);
  console.log(`[Knowledge Import] Total wisdom: ${extracted.reduce((sum, e) => sum + e.wisdom.length, 0)}`);
  
  // Step 3: Ingest to Neo4j
  console.log('[Knowledge Import] Step 3/3: Ingesting to Neo4j...');
  const knowledgeArray = extracted.map(e => ({
    knowledge: e,
    sourceMetadata: {
      source: 'chatgpt_conversation' as const,
      sourceId: e.metadata.conversationId,
      sourceTitle: e.metadata.conversationTitle,
      sourceDate: e.metadata.processedAt,
      author: 'chatgpt',
    },
  }));
  
  const { totalStats } = await batchIngestKnowledge(knowledgeArray, options.onIngestProgress);
  
  console.log('[Knowledge Import] Import complete!');
  console.log(`[Knowledge Import] POIs created: ${totalStats.poisCreated}`);
  console.log(`[Knowledge Import] POIs updated: ${totalStats.poisUpdated}`);
  console.log(`[Knowledge Import] Relationships created: ${totalStats.relationshipsCreated}`);
  console.log(`[Knowledge Import] Wisdom created: ${totalStats.wisdomCreated}`);
  console.log(`[Knowledge Import] Errors: ${totalStats.errors.length}`);
  
  return {
    conversationsParsed: conversations.length,
    conversationsProcessed: extracted.length,
    poisCreated: totalStats.poisCreated,
    poisUpdated: totalStats.poisUpdated,
    relationshipsCreated: totalStats.relationshipsCreated,
    wisdomCreated: totalStats.wisdomCreated,
    errors: totalStats.errors,
    estimatedCostUSD: costEstimate.estimatedCostUSD,
    actualTokensUsed: actualTokens,
  };
}

export default {
  importChatGPTConversations,
};

