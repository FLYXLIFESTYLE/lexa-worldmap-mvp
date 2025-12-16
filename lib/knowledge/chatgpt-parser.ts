/**
 * ChatGPT Conversation Parser
 * 
 * Parses exported ChatGPT conversations (JSON format) and extracts
 * structured conversation threads for AI processing.
 */

export interface ChatGPTMessage {
  id: string;
  author: {
    role: 'user' | 'assistant' | 'system';
  };
  content: {
    parts: string[];
  };
  create_time: number;
  metadata?: Record<string, any>;
}

export interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, { message?: ChatGPTMessage; parent?: string; children?: string[] }>;
  moderation_results: any[];
  current_node: string;
}

export interface ChatGPTExport {
  conversations: ChatGPTConversation[];
}

export interface ParsedConversation {
  id: string;
  title: string;
  created: Date;
  updated: Date;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  fullText: string;
  messageCount: number;
}

/**
 * Parse ChatGPT export JSON file
 */
export function parseChatGPTExport(jsonData: any): ChatGPTExport {
  // ChatGPT export can be either an array of conversations
  // or an object with a conversations property
  if (Array.isArray(jsonData)) {
    return { conversations: jsonData };
  } else if (jsonData.conversations && Array.isArray(jsonData.conversations)) {
    return jsonData;
  } else {
    throw new Error('Invalid ChatGPT export format');
  }
}

/**
 * Extract conversation thread from ChatGPT's mapping structure
 */
export function extractConversationThread(conversation: ChatGPTConversation): ParsedConversation {
  const messages: ParsedConversation['messages'] = [];
  
  // Find the root message (usually has no parent)
  let currentId = conversation.current_node;
  const visitedIds = new Set<string>();
  
  // Traverse the conversation tree
  const messageChain: ChatGPTMessage[] = [];
  
  // Build full chain by following parent links
  while (currentId && !visitedIds.has(currentId)) {
    visitedIds.add(currentId);
    const node = conversation.mapping[currentId];
    
    if (node?.message) {
      messageChain.unshift(node.message); // Add to beginning
    }
    
    currentId = node?.parent || '';
  }
  
  // Convert to our format
  for (const msg of messageChain) {
    if (!msg.author || !msg.content?.parts) continue;
    
    const role = msg.author.role;
    if (role !== 'user' && role !== 'assistant') continue;
    
    const content = msg.content.parts.join('\n').trim();
    if (!content) continue;
    
    messages.push({
      role,
      content,
      timestamp: new Date(msg.create_time * 1000),
    });
  }
  
  // Generate full text (user and assistant messages combined)
  const fullText = messages
    .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join('\n\n');
  
  return {
    id: conversation.id || conversation.title.substring(0, 20).replace(/\s+/g, '_'),
    title: conversation.title,
    created: new Date(conversation.create_time * 1000),
    updated: new Date(conversation.update_time * 1000),
    messages,
    fullText,
    messageCount: messages.length,
  };
}

/**
 * Filter conversations relevant to travel
 * Returns only conversations that likely contain travel content
 */
export function filterTravelConversations(
  conversations: ParsedConversation[]
): ParsedConversation[] {
  const travelKeywords = [
    'travel', 'trip', 'vacation', 'holiday', 'destination', 'hotel', 'resort',
    'restaurant', 'beach', 'museum', 'attraction', 'itinerary', 'visit',
    'tourism', 'cruise', 'flight', 'airport', 'booking', 'reservation',
    'mediterranean', 'adriatic', 'europe', 'asia', 'caribbean', 'luxury',
    'adventure', 'cultural', 'romantic', 'honeymoon', 'getaway',
  ];
  
  return conversations.filter(conv => {
    const searchText = (conv.title + ' ' + conv.fullText).toLowerCase();
    
    // Check if conversation contains travel keywords
    const matchCount = travelKeywords.filter(keyword => 
      searchText.includes(keyword)
    ).length;
    
    // Require at least 2 keyword matches to reduce false positives
    return matchCount >= 2;
  });
}

/**
 * Parse and filter ChatGPT export in one go
 */
export function parseChatGPTExportForTravel(jsonData: any): ParsedConversation[] {
  const exportData = parseChatGPTExport(jsonData);
  const parsed = exportData.conversations.map(extractConversationThread);
  const travelConvs = filterTravelConversations(parsed);
  
  console.log(`Total conversations: ${exportData.conversations.length}`);
  console.log(`Parsed successfully: ${parsed.length}`);
  console.log(`Travel-related: ${travelConvs.length}`);
  
  return travelConvs;
}

/**
 * Split large conversation into processable chunks
 * (for very long conversations that exceed token limits)
 */
export function chunkConversation(
  conversation: ParsedConversation,
  maxTokens: number = 8000 // Conservative estimate
): ParsedConversation[] {
  // Rough token estimate: 1 token ≈ 4 characters
  const charLimit = maxTokens * 4;
  
  if (conversation.fullText.length <= charLimit) {
    return [conversation];
  }
  
  const chunks: ParsedConversation[] = [];
  let currentMessages: ParsedConversation['messages'] = [];
  let currentLength = 0;
  let chunkIndex = 0;
  
  for (const message of conversation.messages) {
    const messageLength = message.content.length;
    
    if (currentLength + messageLength > charLimit && currentMessages.length > 0) {
      // Create chunk
      chunks.push({
        id: `${conversation.id}_chunk${chunkIndex}`,
        title: `${conversation.title} (Part ${chunkIndex + 1})`,
        created: conversation.created,
        updated: conversation.updated,
        messages: currentMessages,
        fullText: currentMessages
          .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
          .join('\n\n'),
        messageCount: currentMessages.length,
      });
      
      currentMessages = [];
      currentLength = 0;
      chunkIndex++;
    }
    
    currentMessages.push(message);
    currentLength += messageLength;
  }
  
  // Add remaining messages
  if (currentMessages.length > 0) {
    chunks.push({
      id: `${conversation.id}_chunk${chunkIndex}`,
      title: `${conversation.title} (Part ${chunkIndex + 1})`,
      created: conversation.created,
      updated: conversation.updated,
      messages: currentMessages,
      fullText: currentMessages
        .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n\n'),
      messageCount: currentMessages.length,
    });
  }
  
  return chunks;
}

export default {
  parseChatGPTExport,
  extractConversationThread,
  filterTravelConversations,
  parseChatGPTExportForTravel,
  chunkConversation,
};

