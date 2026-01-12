import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { searchPOIInfo, tavilySearch } from '@/lib/integrations/tavily-client';
import { CitationSchema, looksLikeBadPoiName, SourceRefSchema } from '@/lib/brain/poi-contract';
import { z } from 'zod';

export const runtime = 'nodejs';

const BodySchema = z
  .object({
    // optional override if destination is missing/incorrect in the draft
    destination: z.string().min(1).optional(),
    // cost control
    maxResults: z.number().int().min(1).max(8).optional().default(5),
    searchDepth: z.enum(['basic', 'advanced']).optional().default('advanced'),
  })
  .optional();

const EnrichmentPatchSchema = z.object({
  category: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  description: z.string().min(1).max(1200).optional(),
  booking_info: z.string().min(1).max(800).optional(),
  best_time: z.string().min(1).max(300).optional(),
  luxury_score: z.number().int().min(0).max(10).optional(),
  luxury_indicators: z.array(z.string().min(1)).optional(),
  themes: z.array(z.string().min(1)).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  emotional_map: z.array(z.any()).optional(),
  sensory_triggers: z.array(z.string().min(1)).optional(),
  conversation_triggers: z.array(z.string().min(1)).optional(),
  client_archetypes: z.array(z.any()).optional(),
  pricing: z.record(z.string(), z.any()).optional(),
  confidence_score: z.number().int().min(0).max(100).optional(),
  emotion_confidence: z.number().int().min(0).max(100).optional(),
  luxury_score_confidence: z.number().int().min(0).max(100).optional(),
  citations: z.array(CitationSchema).optional(),
  website_url: z.string().url().optional(),
});

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function isEmptyText(v: unknown): boolean {
  return !v || (typeof v === 'string' && v.trim() === '');
}

function extractJsonObjectFromText(raw: string): string | null {
  const t = String(raw || '').trim();
  if (!t) return null;

  // 1) Handle fenced code blocks (```json ... ```)
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const cand = fenced[1].trim();
    if (cand.startsWith('{') && cand.endsWith('}')) return cand;
  }

  // 2) Fallback: take substring from first "{" to last "}"
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return t.slice(first, last + 1);
  }

  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsedBody = BodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsedBody.error.flatten() }, { status: 400 });
    }
    const input = parsedBody.data;

    // Optional feature flag (keep safe; default ON if key present)
    const tavilyKey = process.env.TAVILY_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    if (!tavilyKey) {
      return NextResponse.json({ error: 'Tavily not configured', details: 'Missing TAVILY_API_KEY' }, { status: 500 });
    }
    if (!anthropicKey) {
      return NextResponse.json({ error: 'Claude not configured', details: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
    }

    // Auth via cookies
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check (captain or admin)
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    const role = (profile?.role || '').toLowerCase();
    if (!role) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Service-role client (bypass RLS safely, but we still check ownership unless admin)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server not configured (missing Supabase service key)' }, { status: 500 });
    }
    const admin = createAdminClient(supabaseUrl, serviceKey);

    const { data: poi, error: fetchError } = await admin
      .from('extracted_pois')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError || !poi) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }
    if (role !== 'admin' && poi.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const poiName = String(poi.name || '').trim();
    if (looksLikeBadPoiName(poiName)) {
      return NextResponse.json(
        {
          error: 'POI name looks invalid',
          details:
            'This POI name looks like a sentence/paragraph fragment. Please edit it to the real place name first, then enrich.',
        },
        { status: 400 }
      );
    }

    const destination =
      String(input?.destination || '').trim() || String(poi.destination || '').trim() || undefined;

    // 1) Tavily search (real-time)
    const tavilyResult = destination
      ? await searchPOIInfo(poiName, destination)
      : await tavilySearch({
          query: `${poiName} official website reviews booking`,
          searchDepth: input?.searchDepth ?? 'advanced',
          maxResults: input?.maxResults ?? 5,
        });

    const nowIso = new Date().toISOString();
    const sources = (tavilyResult.results || []).slice(0, input?.maxResults ?? 5);
    if (!sources.length) {
      return NextResponse.json({ error: 'No Tavily results', details: 'Try again with a destination set.' }, { status: 400 });
    }

    // Convert Tavily results into source_refs (no full text stored)
    const newSourceRefs = sources.map((r, idx) => {
      const url = String(r.url || '').trim();
      const ref = {
        source_type: 'tavily' as const,
        source_id: `tavily:${sha1(url || `${poiName}:${idx}`)}`,
        source_url: url || null,
        captured_at: nowIso,
        external_ids: null,
        license: null,
      };
      const parsed = SourceRefSchema.safeParse(ref);
      if (!parsed.success) return null;
      return parsed.data;
    }).filter(Boolean) as Array<z.infer<typeof SourceRefSchema>>;

    // 2) Claude extraction (ONLY from Tavily snippets we provide)
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const MODEL = 'claude-sonnet-4-5-20250929';

    const numberedSources = sources
      .map((r, i) => {
        const title = String(r.title || '').slice(0, 140);
        const url = String(r.url || '');
        const content = String(r.content || '').slice(0, 900);
        return `SOURCE ${i}:\nTITLE: ${title}\nURL: ${url}\nSNIPPET:\n${content}\n`;
      })
      .join('\n');

    const system = `You are a careful data extraction assistant for LEXA.

CRITICAL RULES:
- Use ONLY the provided sources. If a fact is not supported, output null/omit it.
- Do NOT invent hours, prices, awards, or claims.
- Return ONLY valid JSON. No markdown.
- Any quote_snippet must be copied verbatim from a SNIPPET (max 500 chars).
- Prefer short, investor-safe descriptions (<= 1200 chars).

Task:
Given a POI name and destination context, extract a useful enrichment patch for a travel assistant.

JSON shape (only include fields you are confident about):
{
  "category": string,
  "destination": string,
  "description": string,
  "website_url": string,
  "booking_info": string,
  "best_time": string,
  "luxury_score": 0-10,
  "luxury_indicators": string[],
  "themes": string[],
  "keywords": string[],
  "pricing": object,
  "confidence_score": 0-100,
  "emotion_confidence": 0-100,
  "luxury_score_confidence": 0-100,
  "citations": [
    { "source_ref_index": number, "anchor": string, "quote_snippet": string }
  ]
}

Notes:
- source_ref_index refers to SOURCE N above.
- anchor can be "tavily:SOURCE_N".`;

    const userMsg = `POI: ${poiName}\nDestination: ${destination || 'unknown'}\n\n${numberedSources}`;

    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });

    const rawOut = resp.content.find((c) => c.type === 'text')?.text || '';
    const jsonText = extractJsonObjectFromText(rawOut);
    if (!jsonText) {
      return NextResponse.json(
        {
          error: 'Claude output invalid',
          details: 'No JSON object found in response',
          sample: rawOut.slice(0, 600),
        },
        { status: 502 }
      );
    }

    let patchRaw: unknown;
    try {
      patchRaw = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: 'Claude output invalid', details: 'Failed to parse JSON', sample: jsonText.slice(0, 600) },
        { status: 502 }
      );
    }

    const patchParsed = EnrichmentPatchSchema.safeParse(patchRaw);
    if (!patchParsed.success) {
      return NextResponse.json(
        { error: 'Claude output invalid', details: JSON.stringify(patchParsed.error.flatten()) },
        { status: 502 }
      );
    }
    const patch = patchParsed.data;

    // 3) Merge into extracted_pois (facts + provenance + citations)
    const existingSourceRefs = Array.isArray(poi.source_refs) ? poi.source_refs : [];
    const existingCitations = Array.isArray(poi.citations) ? poi.citations : [];
    const sourceOffset = existingSourceRefs.length;

    const shiftedCitations =
      (patch.citations || []).map((c) => ({
        ...c,
        source_ref_index: c.source_ref_index + sourceOffset,
        anchor: c.anchor || `tavily:SOURCE_${c.source_ref_index}`,
      })) || [];

    const nextSourceRefs = [...existingSourceRefs, ...newSourceRefs];
    const nextCitations = [...existingCitations, ...shiftedCitations];

    const nextEnrichment =
      poi.enrichment && typeof poi.enrichment === 'object' ? { ...poi.enrichment } : {};
    nextEnrichment.tavily = {
      query: tavilyResult.query,
      fetched_at: nowIso,
      results: sources.map((r) => ({
        title: r.title,
        url: r.url,
        score: r.score,
        publishedDate: r.publishedDate,
      })),
    };
    if (patch.website_url) nextEnrichment.website_url = patch.website_url;

    // Minimal “don’t destroy captain edits” rule: only fill empty fields.
    const updates: Record<string, any> = {
      source_refs: nextSourceRefs,
      citations: nextCitations,
      enrichment: nextEnrichment,
      updated_at: nowIso,
      enhanced: true,
    };

    if (!destination && patch.destination) updates.destination = patch.destination;
    if (isEmptyText(poi.category) && patch.category) updates.category = patch.category;
    if (isEmptyText(poi.description) && patch.description) updates.description = patch.description;
    if (isEmptyText(poi.booking_info) && patch.booking_info) updates.booking_info = patch.booking_info;
    if (isEmptyText(poi.best_time) && patch.best_time) updates.best_time = patch.best_time;
    if ((poi.luxury_score === null || poi.luxury_score === undefined) && typeof patch.luxury_score === 'number') {
      updates.luxury_score = patch.luxury_score;
    }
    if (Array.isArray(patch.luxury_indicators) && patch.luxury_indicators.length && (!Array.isArray(poi.luxury_indicators) || poi.luxury_indicators.length === 0)) {
      updates.luxury_indicators = patch.luxury_indicators;
    }
    if (Array.isArray(patch.themes) && patch.themes.length && (!Array.isArray(poi.themes) || poi.themes.length === 0)) {
      updates.themes = patch.themes;
    }
    if (Array.isArray(patch.keywords) && patch.keywords.length && (!Array.isArray(poi.keywords) || poi.keywords.length === 0)) {
      updates.keywords = patch.keywords;
    }

    // “Brain fields” (migration 020) — only fill if empty
    if (Array.isArray(patch.emotional_map) && patch.emotional_map.length && (!Array.isArray(poi.emotional_map) || poi.emotional_map.length === 0)) {
      updates.emotional_map = patch.emotional_map;
    }
    if (Array.isArray(patch.sensory_triggers) && patch.sensory_triggers.length && (!Array.isArray(poi.sensory_triggers) || poi.sensory_triggers.length === 0)) {
      updates.sensory_triggers = patch.sensory_triggers;
    }
    if (Array.isArray(patch.conversation_triggers) && patch.conversation_triggers.length && (!Array.isArray(poi.conversation_triggers) || poi.conversation_triggers.length === 0)) {
      updates.conversation_triggers = patch.conversation_triggers;
    }
    if (Array.isArray(patch.client_archetypes) && patch.client_archetypes.length && (!Array.isArray(poi.client_archetypes) || poi.client_archetypes.length === 0)) {
      updates.client_archetypes = patch.client_archetypes;
    }
    if (patch.pricing && Object.keys(patch.pricing).length && (!poi.pricing || (typeof poi.pricing === 'object' && Object.keys(poi.pricing).length === 0))) {
      updates.pricing = patch.pricing;
    }
    if ((poi.emotion_confidence === null || poi.emotion_confidence === undefined) && typeof patch.emotion_confidence === 'number') {
      updates.emotion_confidence = patch.emotion_confidence;
    }
    if ((poi.luxury_score_confidence === null || poi.luxury_score_confidence === undefined) && typeof patch.luxury_score_confidence === 'number') {
      updates.luxury_score_confidence = patch.luxury_score_confidence;
    }
    if ((poi.confidence_score === null || poi.confidence_score === undefined) && typeof patch.confidence_score === 'number') {
      updates.confidence_score = patch.confidence_score;
    }

    const { error: updateError } = await admin.from('extracted_pois').update(updates).eq('id', id);
    if (updateError) {
      return NextResponse.json({ error: 'Failed to save enrichment', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated_fields: Object.keys(updates),
      tavily: { query: tavilyResult.query, sources: sources.length },
    });
  } catch (error) {
    console.error('POI enrich error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich POI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

