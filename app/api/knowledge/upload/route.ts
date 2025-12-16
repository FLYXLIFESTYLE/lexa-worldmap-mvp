/**
 * Knowledge Upload API
 * Handles file uploads and processes them with AI
 */

import { NextResponse } from 'next/server';
import { 
  parseChatGPTExportForTravel,
  processConversation,
  ingestKnowledge,
  type ParsedConversation 
} from '@/lib/knowledge';
import { getCurrentUserAttribution } from '@/lib/knowledge/track-contribution';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get contribution attribution for current user
    const attribution = await getCurrentUserAttribution('upload', file.name, type);
    
    if (!attribution) {
      return NextResponse.json(
        { error: 'User not authenticated or no captain profile found' },
        { status: 401 }
      );
    }

    // Read file into memory (not saved to disk)
    const text = await file.text();
    
    let conversations: ParsedConversation[] = [];

    // Process based on file type
    switch (type) {
      case 'chatgpt':
        conversations = parseChatGPTExportForTravel(JSON.parse(text));
        break;
      
      case 'transcript':
        conversations = parseTranscript(text, file.name);
        break;
      
      case 'text':
      case 'pdf':
      case 'docx':
        conversations = parseTextDocument(text, file.name);
        break;
      
      default:
        conversations = parseTextDocument(text, file.name);
    }

    // Limit processing for demo (first 5 conversations)
    const toProcess = conversations.slice(0, 5);

    let totalPOIs = 0;
    let totalRelationships = 0;
    let totalWisdom = 0;

    // Process each conversation
    for (const conv of toProcess) {
      const extracted = await processConversation(conv);
      
      // Ingest to Neo4j with attribution
      const stats = await ingestKnowledge(extracted, {
        source: type,
        sourceId: `${file.name}_${conv.id}`,
        sourceTitle: file.name,
        sourceDate: new Date(),
        author: attribution.contributorName,
        contributedBy: attribution.contributedBy,
        contributorName: attribution.contributorName,
        contributionType: attribution.contributionType,
      });

      totalPOIs += stats.poisCreated + stats.poisUpdated;
      totalRelationships += stats.relationshipsCreated;
      totalWisdom += stats.wisdomCreated;
    }
    
    // File is automatically garbage collected from memory
    // No storage, no cleanup needed

    return NextResponse.json({
      success: true,
      stats: {
        poisExtracted: totalPOIs,
        relationshipsCreated: totalRelationships,
        wisdomCreated: totalWisdom,
      },
      message: `Processed ${toProcess.length} conversation(s)`,
    });
  } catch (error) {
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Parse VTT/SRT transcript to conversation format
 */
function parseTranscript(text: string, filename: string): ParsedConversation[] {
  // Remove timestamp lines (00:00:00.000 --> 00:00:05.000)
  const cleanText = text
    .split('\n')
    .filter(line => !line.match(/^\d{2}:\d{2}:\d{2}/) && line.trim() !== '')
    .join('\n');

  return [{
    id: filename,
    title: `Transcript: ${filename}`,
    created: new Date(),
    updated: new Date(),
    messages: [{
      role: 'user',
      content: cleanText,
      timestamp: new Date(),
    }],
    fullText: cleanText,
    messageCount: 1,
  }];
}

/**
 * Parse general text document to conversation format
 */
function parseTextDocument(text: string, filename: string): ParsedConversation[] {
  // Split into paragraphs and treat as single conversation
  return [{
    id: filename,
    title: filename.replace(/\.[^/.]+$/, ''), // Remove extension
    created: new Date(),
    updated: new Date(),
    messages: [{
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }],
    fullText: text.trim(),
    messageCount: 1,
  }];
}

