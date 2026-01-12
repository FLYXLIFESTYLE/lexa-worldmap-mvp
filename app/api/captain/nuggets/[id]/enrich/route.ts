import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { tavilySearch } from '@/lib/integrations/tavily-client';
import { CitationSchema, SourceRefSchema } from '@/lib/brain/poi-contract';
import { z } from 'zod';

export const runtime = 'nodejs';

const BodySchema = z
  .object({
    destination: z.string().min(1).optional(),
    maxResults: z.number().int().min(1).max(8).optional().default(5),
    searchDepth: z.enum(['basic', 'advanced']).optional().default('advanced'),
  })
  .optional();

const NuggetEnrichmentSchema = z.object({
  nugget_type: z
    .enum([
      'note',
      'poi_fragment',
      'brand_signal',
      'event',
      'opening_update',
      'pricing_signal',
      'restriction',
      'other',
    ])
    .optional(),
  destination: z.string().min(1).optional(),
  summary: z.string().min(1).max(600).optional(),
  key_facts: z.array(z.string().min(1)).optional(),
  suggested_poi_name: z.string().min(1).optional(),
  suggested_actions: z.array(z.string().min(1)).optional(),
  importance_0_100: z.number().int().min(0).max(100).optional(),
  citations: z.array(CitationSchema).optional(),
});

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
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

    const tavilyKey = process.env.TAVILY_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    if (!tavilyKey) return NextResponse.json({ error: 'Tavily not configured' }, { status: 500 });
    if (!anthropicKey) return NextResponse.json({ error: 'Claude not configured' }, { status: 500 });

    // Auth via cookies
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Role check (captain or admin)
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    const role = (profile?.role || '').toLowerCase();
    if (!role) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    // Service-role client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server not configured (missing Supabase service key)' }, { status: 500 });
    }
    const admin = createAdminClient(supabaseUrl, serviceKey);

    const { data: nugget, error: fetchError } = await admin
      .from('knowledge_nuggets')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError || !nugget) return NextResponse.json({ error: 'Nugget not found' }, { status: 404 });
    if (role !== 'admin' && nugget.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const text = String(nugget.text || '').trim();
    if (!text) return NextResponse.json({ error: 'Empty nugget text' }, { status: 400 });

    const destination = String(input?.destination || '').trim() || String(nugget.destination || '').trim() || undefined;

    // 1) Tavily search — find supporting sources for this claim/snippet
    const query = destination
      ? `${destination} ${text}`
      : text;
    const tavily = await tavilySearch({
      query,
      searchDepth: input?.searchDepth ?? 'advanced',
      maxResults: input?.maxResults ?? 5,
      topic: 'news',
    });

    const sources = (tavily.results || []).slice(0, input?.maxResults ?? 5);
    if (!sources.length) {
      return NextResponse.json({ error: 'No Tavily results', details: 'Try adding a destination context.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const newSourceRefs = sources
      .map((r, idx) => {
        const url = String(r.url || '').trim();
        const ref = {
          source_type: 'tavily' as const,
          source_id: `tavily:${sha1(url || `${id}:${idx}`)}`,
          source_url: url || null,
          captured_at: nowIso,
          external_ids: null,
          license: null,
        };
        const parsed = SourceRefSchema.safeParse(ref);
        return parsed.success ? parsed.data : null;
      })
      .filter(Boolean) as Array<z.infer<typeof SourceRefSchema>>;

    // 2) Claude classify + extract structured signals from the provided snippets
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

    const system = `You are a careful extraction assistant for LEXA.

CRITICAL RULES:
- Use ONLY the provided sources. If a claim is not supported, omit it.
- Return ONLY valid JSON (no markdown).
- quote_snippet must be copied verbatim from a SNIPPET (max 500 chars).
- Keep summaries short and business-useful.

Task:
Given a snippet (unstructured nugget) and sources, classify what it is and extract actionable structured info.

JSON shape (include only what you can support):
{
  "nugget_type": "note"|"poi_fragment"|"brand_signal"|"event"|"opening_update"|"pricing_signal"|"restriction"|"other",
  "destination": string,
  "summary": string,
  "key_facts": string[],
  "suggested_poi_name": string,
  "suggested_actions": string[],
  "importance_0_100": number,
  "citations": [
    { "source_ref_index": number, "anchor": string, "quote_snippet": string }
  ]
}

Notes:
- source_ref_index refers to SOURCE N above.
- anchor can be "tavily:SOURCE_N".`;

    const userMsg = `NUGGET:\n${text}\n\nDestination context: ${destination || 'unknown'}\n\n${numberedSources}`;

    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });

    const out = resp.content.find((c) => c.type === 'text')?.text || '';
    const jsonText = extractJsonObjectFromText(out);
    if (!jsonText) {
      return NextResponse.json(
        { error: 'Claude output invalid', details: 'No JSON object found in response', sample: out.slice(0, 600) },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: 'Claude output invalid', details: 'Failed to parse JSON', sample: jsonText.slice(0, 600) },
        { status: 502 }
      );
    }

    const extracted = NuggetEnrichmentSchema.safeParse(parsed);
    if (!extracted.success) {
      return NextResponse.json(
        { error: 'Claude output invalid', details: JSON.stringify(extracted.error.flatten()) },
        { status: 502 }
      );
    }

    const existingSourceRefs = Array.isArray(nugget.source_refs) ? nugget.source_refs : [];
    const existingCitations = Array.isArray(nugget.citations) ? nugget.citations : [];
    const sourceOffset = existingSourceRefs.length;

    const shiftedCitations =
      (extracted.data.citations || []).map((c) => ({
        ...c,
        source_ref_index: c.source_ref_index + sourceOffset,
        anchor: c.anchor || `tavily:SOURCE_${c.source_ref_index}`,
      })) || [];

    const nextSourceRefs = [...existingSourceRefs, ...newSourceRefs];
    const nextCitations = [...existingCitations, ...shiftedCitations];

    const nextEnrichment =
      nugget.enrichment && typeof nugget.enrichment === 'object' ? { ...nugget.enrichment } : {};
    nextEnrichment.summary = extracted.data.summary || nextEnrichment.summary;
    nextEnrichment.key_facts = extracted.data.key_facts || nextEnrichment.key_facts;
    nextEnrichment.suggested_poi_name = extracted.data.suggested_poi_name || nextEnrichment.suggested_poi_name;
    nextEnrichment.suggested_actions = extracted.data.suggested_actions || nextEnrichment.suggested_actions;
    nextEnrichment.importance_0_100 =
      typeof extracted.data.importance_0_100 === 'number'
        ? extracted.data.importance_0_100
        : nextEnrichment.importance_0_100;
    nextEnrichment.tavily = {
      query: tavily.query,
      fetched_at: nowIso,
      results: sources.map((r) => ({ title: r.title, url: r.url, score: r.score, publishedDate: r.publishedDate })),
    };

    const updates: Record<string, any> = {
      source_refs: nextSourceRefs,
      citations: nextCitations,
      enrichment: nextEnrichment,
      updated_at: nowIso,
    };
    if (extracted.data.nugget_type) updates.nugget_type = extracted.data.nugget_type;
    if (!nugget.destination && extracted.data.destination) updates.destination = extracted.data.destination;

    const { error: updateError } = await admin.from('knowledge_nuggets').update(updates).eq('id', id);
    if (updateError) {
      return NextResponse.json({ error: 'Failed to save nugget enrichment', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tavily: { query: tavily.query, sources: sources.length } });
  } catch (error) {
    console.error('Nugget enrich error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich nugget', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

