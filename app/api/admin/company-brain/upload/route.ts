/**
 * Company Brain Upload: Extract insights from historic chat documents
 *
 * Purpose: Mine 5 years of ChatGPT conversations for:
 * - Experience script examples
 * - Client insights and patterns
 * - Design philosophy
 * - Successful strategies
 * - Outdated content (to exclude from retrieval)
 *
 * Flow:
 * 1. Upload document (PDF, Word, text)
 * 2. Extract text
 * 3. Claude analyzes and structures into sections
 * 4. Store sections with metadata (category, date, keep/outdated flag)
 * 5. User reviews and approves sections
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// pdf-parse uses CommonJS, import via require in Node.js route
const pdf = require('pdf-parse');

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large documents

const SectionSchema = z.object({
  type: z.enum(['script_example', 'client_insight', 'design_principle', 'feature_idea', 'outdated_content', 'vendor_relationship', 'pricing_strategy']),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string()).optional(),
  date_context: z.string().optional(), // When this was relevant (e.g., "2021-2022")
  status: z.enum(['keep', 'outdated', 'needs_review']).optional().default('needs_review'),
  confidence: z.number().min(0).max(1).optional(),
});

const ExtractionResultSchema = z.object({
  document_summary: z.string().min(1).max(1000),
  total_sections: z.number().int().min(0),
  sections: z.array(SectionSchema),
  metadata: z.object({
    date_range: z.string().optional(),
    main_themes: z.array(z.string()).optional(),
    extraction_confidence: z.number().min(0).max(1).optional(),
  }).optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const, user: null };

  const { data: profile } = await supabase.from('captain_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403 as const, user: null };

  return { ok: true as const, status: 200 as const, user };
}

async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop();

  // PDF files
  if (ext === 'pdf') {
    try {
      const data = await pdf(buffer);
      return data.text || '';
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Text files (.txt, .md, etc.)
  if (ext === 'txt' || ext === 'md') {
    try {
      return buffer.toString('utf-8');
    } catch {
      throw new Error('Failed to extract text from file');
    }
  }

  // Word documents (.doc, .docx) - TODO: Add mammoth or similar library
  if (ext === 'doc' || ext === 'docx') {
    throw new Error('Word document support coming soon. Please export as PDF or text for now.');
  }

  throw new Error(`Unsupported file type: ${ext}. Please use PDF or text files.`);
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(fileBuffer, file.name);

    if (!text || text.length < 100) {
      return NextResponse.json({ error: 'Document too short or empty' }, { status: 400 });
    }

    // Claude extraction with structured output
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const MODEL = 'claude-sonnet-4-5-20250929';

    const system = `You are a company knowledge archaeologist for LEXA, a luxury travel AI.

Your job: Extract structured insights from historic ChatGPT conversations (5 years of company knowledge).

WHAT TO EXTRACT:

1. **Experience Script Examples** (CRITICAL)
   - Full script narratives or fragments
   - Emotional arcs (arrival → immersion → peak → integration)
   - Signature moments (unique, memorable experiences)
   - Upsell psychology (how premium was framed)

2. **Client Insights** (VALUABLE)
   - Client archetypes and what worked for them
   - Emotional triggers (what drives bookings)
   - Objections and how to overcome them
   - Success patterns

3. **Design Principles** (FOUNDATIONAL)
   - How to structure experiences
   - Luxury definitions and philosophy
   - Emotional intelligence approach
   - Pricing psychology

4. **Feature Ideas** (PRIORITIZE)
   - Ideas mentioned multiple times = high signal
   - Revenue-generating opportunities
   - Competitive differentiators

5. **Outdated Content** (EXCLUDE FROM RETRIEVAL)
   - Technical debt from old thinking
   - Superseded approaches
   - Context-specific ideas no longer relevant

OUTPUT FORMAT (valid JSON):
{
  "document_summary": "Brief 1-2 sentence summary of this conversation",
  "total_sections": number,
  "sections": [
    {
      "type": "script_example" | "client_insight" | "design_principle" | "feature_idea" | "outdated_content" | "vendor_relationship" | "pricing_strategy",
      "title": "Short descriptive title",
      "content": "Full content (max 5000 chars)",
      "tags": ["theme", "destination", "archetype"],
      "date_context": "2021-2022" (when this was relevant),
      "status": "keep" | "outdated" | "needs_review",
      "confidence": 0.0-1.0 (extraction confidence)
    }
  ],
  "metadata": {
    "date_range": "2021-2023",
    "main_themes": ["experience_design", "pricing", "emotional_intelligence"],
    "extraction_confidence": 0.85
  }
}

CRITICAL RULES:
- Only extract substantial insights (not small talk or technical debugging)
- Mark outdated content clearly (status: "outdated")
- Prioritize script examples (these train AIlessia)
- Keep sections focused (1 idea per section)
- Use exact quotes where valuable`;

    const userMsg = `Analyze this document and extract structured sections:\n\n${text.slice(0, 100000)}`; // Max 100k chars

    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.3,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });

    const rawOut = resp.content.find((c) => c.type === 'text')?.text || '';
    
    // Extract JSON from response
    const jsonMatch = rawOut.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        error: 'Claude output invalid',
        details: 'No JSON found in response',
        sample: rawOut.slice(0, 500),
      }, { status: 502 });
    }

    let extracted: unknown;
    try {
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({
        error: 'Claude output invalid',
        details: 'JSON parse failed',
        sample: jsonMatch[0].slice(0, 500),
      }, { status: 502 });
    }

    const parsed = ExtractionResultSchema.safeParse(extracted);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Extraction schema validation failed',
        details: JSON.stringify(parsed.error.flatten()),
      }, { status: 502 });
    }

    const result = parsed.data;

    // Store in Supabase
    const uploadRecord = {
      user_id: auth.user!.id,
      filename: file.name,
      file_size: file.size,
      document_type: 'historic_chat',
      extraction_summary: result.document_summary,
      total_sections: result.total_sections,
      metadata: result.metadata || {},
      created_at: new Date().toISOString(),
    };

    const { data: upload, error: uploadErr } = await supabaseAdmin
      .from('company_brain_uploads')
      .insert(uploadRecord)
      .select('id')
      .single();

    if (uploadErr || !upload) {
      return NextResponse.json({
        error: 'Failed to store upload record',
        details: uploadErr?.message,
      }, { status: 500 });
    }

    // Store sections
    const sectionRecords = result.sections.map((s) => ({
      upload_id: upload.id,
      section_type: s.type,
      title: s.title,
      content: s.content,
      tags: s.tags || [],
      date_context: s.date_context,
      status: s.status || 'needs_review',
      confidence: s.confidence || 0.8,
      created_at: new Date().toISOString(),
    }));

    const { error: sectionsErr } = await supabaseAdmin
      .from('company_brain_sections')
      .insert(sectionRecords);

    if (sectionsErr) {
      return NextResponse.json({
        error: 'Failed to store sections',
        details: sectionsErr.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      upload_id: upload.id,
      filename: file.name,
      summary: result.document_summary,
      total_sections: result.total_sections,
      sections_by_type: result.sections.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Company brain upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
