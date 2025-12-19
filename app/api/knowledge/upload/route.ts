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
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let uploadRecordId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const keepFile = formData.get('keep_file') === 'true';

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

    // Create upload tracking record
    const { data: uploadRecord, error: createError } = await supabase
      .from('upload_tracking')
      .insert({
        filename: file.name,
        file_type: type,
        file_size: file.size,
        uploaded_by: attribution.contributedBy,
        processing_status: 'processing',
        keep_file: keepFile,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create upload record:', createError);
    } else {
      uploadRecordId = uploadRecord.id;
    }

    // Read file into memory
    const text = await file.text();
    
    // Optionally save file to storage
    let filePath: string | null = null;
    let fileUrl: string | null = null;
    
    if (keepFile && attribution.contributedBy) {
      const storageKey = `${attribution.contributedBy}/${Date.now()}_${file.name}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('knowledge-uploads')
        .upload(storageKey, file);

      if (!storageError && storageData) {
        filePath = storageData.path;
        
        const { data: urlData } = supabase.storage
          .from('knowledge-uploads')
          .getPublicUrl(storageData.path);
        
        fileUrl = urlData.publicUrl;
      } else {
        console.error('Storage upload failed:', storageError);
      }
    }
    
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
    const extractedDestinations = new Set<string>();
    const extractedActivities = new Set<string>();
    const extractedThemes = new Set<string>();

    // Process each conversation
    for (const conv of toProcess) {
      const extracted = await processConversation(conv);
      
      // Collect extracted entities
      extracted.destinations?.forEach(d => extractedDestinations.add(d.name));
      extracted.activities?.forEach(a => extractedActivities.add(a.name));
      extracted.themes?.forEach(t => extractedThemes.add(t.name));
      
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

    // Update upload record with results
    if (uploadRecordId) {
      await supabase
        .from('upload_tracking')
        .update({
          pois_extracted: totalPOIs,
          relationships_created: totalRelationships,
          wisdom_created: totalWisdom,
          extracted_destinations: Array.from(extractedDestinations),
          extracted_activities: Array.from(extractedActivities),
          extracted_themes: Array.from(extractedThemes),
          processing_status: 'completed',
          file_path: filePath,
          file_url: fileUrl,
        })
        .eq('id', uploadRecordId);
    }

    return NextResponse.json({
      success: true,
      uploadId: uploadRecordId,
      stats: {
        poisExtracted: totalPOIs,
        relationshipsCreated: totalRelationships,
        wisdomCreated: totalWisdom,
        destinations: Array.from(extractedDestinations),
        activities: Array.from(extractedActivities),
        themes: Array.from(extractedThemes),
      },
      fileStored: keepFile && !!filePath,
      message: `Processed ${toProcess.length} conversation(s)`,
    });
  } catch (error) {
    console.error('Upload processing error:', error);
    
    // Update upload record with error
    if (uploadRecordId) {
      await supabase
        .from('upload_tracking')
        .update({
          processing_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', uploadRecordId);
    }
    
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

