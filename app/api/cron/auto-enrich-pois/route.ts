import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';
import { tavilySearch } from '@/lib/integrations/tavily-client';
import { CitationSchema, looksLikeBadPoiName, SourceRefSchema } from '@/lib/brain/poi-contract';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  batch: z.coerce.number().int().min(1).max(5).optional().default(1),
  maxResults: z.coerce.number().int().min(1).max(5).optional().default(3),
  searchDepth: z.enum(['basic', 'advanced']).optional().default('basic'),
  destination: z.string().min(1).optional(),
});

// Default values for Vercel cron (when no query params provided)
const CRON_DEFAULTS = {
  batch: 1,
  maxResults: 3,
  searchDepth: 'basic' as const,
};

const nullToUndefined = (v: unknown) => (v === null ? undefined : v);
const opt = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(nullToUndefined, schema.optional());

const EnrichmentPatchSchema = z.object({
  category: opt(z.string().min(1)),
  destination: opt(z.string().min(1)),
  description: opt(z.string().min(1).max(1200)),
  booking_info: opt(z.string().min(1).max(800)),
  best_time: opt(z.string().min(1).max(300)),
  luxury_score: opt(z.number().int().min(0).max(10)),
  luxury_indicators: opt(z.array(z.string().min(1))),
  themes: opt(z.array(z.string().min(1))),
  keywords: opt(z.array(z.string().min(1))),
  website_url: opt(z.string().url()),
  citations: opt(z.array(CitationSchema)),
});

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function isVercelCron(req: Request): boolean {
  // Vercel Cron adds this header. It's not a perfect security mechanism,
  // but it's enough for MVP automation without hardcoding secrets in repo.
  const h = req.headers.get('x-vercel-cron');
  return !!h;
}

function needsEnrichment(p: any): boolean {
  const desc = String(p?.description || '').trim();
  const lux = typeof p?.luxury_score === 'number' ? p.luxury_score : null;
  const keywords = Array.isArray(p?.keywords) ? p.keywords : [];
  const themes = Array.isArray(p?.themes) ? p.themes : [];
  return !desc || lux === null || keywords.length === 0 || themes.length === 0;
}

function tooSoon(p: any, nowMs: number): boolean {
  const last = (p?.enrichment as any)?.agent_auto_enrich?.last_attempt_at;
  if (!last || typeof last !== 'string') return false;
  const lastMs = Date.parse(last);
  if (!Number.isFinite(lastMs)) return false;
  // Don't retry more than once per 12 hours per POI
  return nowMs - lastMs < 12 * 60 * 60 * 1000;
}

export async function GET(req: Request) {
  try {
    if (!isVercelCron(req)) {
      return NextResponse.json({ error: 'Forbidden (cron only)' }, { status: 403 });
    }

    const url = new URL(req.url);
    // Use defaults when called from Vercel cron (no query params) or parse from URL
    const parsed = QuerySchema.safeParse({
      batch: url.searchParams.get('batch') ?? CRON_DEFAULTS.batch,
      maxResults: url.searchParams.get('maxResults') ?? CRON_DEFAULTS.maxResults,
      searchDepth: url.searchParams.get('searchDepth') ?? CRON_DEFAULTS.searchDepth,
      destination: url.searchParams.get('destination') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
    }

    const tavilyKey = process.env.TAVILY_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    if (!tavilyKey) return NextResponse.json({ error: 'Tavily not configured' }, { status: 500 });
    if (!anthropicKey) return NextResponse.json({ error: 'Claude not configured' }, { status: 500 });

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    // Load a small window of candidates, then filter in code.
    let q = supabaseAdmin
      .from('extracted_pois')
      .select(
        'id,name,destination,category,description,luxury_score,keywords,themes,source_refs,citations,enrichment,updated_at,promoted_to_main'
      )
      .eq('promoted_to_main', false)
      .order('updated_at', { ascending: true })
      .limit(50);
    if (parsed.data.destination) q = q.eq('destination', parsed.data.destination);

    const { data: rows, error } = await q;
    if (error) return NextResponse.json({ error: 'Failed to load POIs', details: error.message }, { status: 500 });

    const candidates = (rows || [])
      .filter((p: any) => {
        const name = String(p?.name || '').trim();
        const dest = String(p?.destination || '').trim();
        if (!name || !dest) return false;
        if (looksLikeBadPoiName(name)) return false;
        const sourceRefs = Array.isArray(p?.source_refs) ? p.source_refs : [];
        if (sourceRefs.length < 1) return false;
        if (!needsEnrichment(p)) return false;
        if (tooSoon(p, nowMs)) return false;
        return true;
      })
      .slice(0, parsed.data.batch);

    if (!candidates.length) {
      return NextResponse.json({ success: true, processed: 0, message: 'No candidates found' });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const MODEL = 'claude-sonnet-4-5-20250929';

    const processed: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const poi of candidates) {
      try {
        const poiId = String(poi.id);
        const poiName = String(poi.name || '').trim();
        const destination = String(poi.destination || '').trim();

        const tavily = await tavilySearch({
          query: `${poiName} ${destination}`,
          searchDepth: parsed.data.searchDepth,
          maxResults: parsed.data.maxResults,
          topic: 'general',
        });

        const sources = (tavily.results || []).slice(0, parsed.data.maxResults);
        if (!sources.length) {
          processed.push({ id: poiId, ok: false, error: 'No Tavily results' });
          continue;
        }

        const newSourceRefs = sources
          .map((r, idx) => {
            const url = String(r.url || '').trim();
            const ref = {
              source_type: 'tavily' as const,
              source_id: `tavily:${sha1(url || `${poiId}:${idx}`)}`,
              source_url: url || null,
              captured_at: nowIso,
              external_ids: null,
              license: null,
            };
            const parsedRef = SourceRefSchema.safeParse(ref);
            return parsedRef.success ? parsedRef.data : null;
          })
          .filter(Boolean);

        const numberedSources = sources
          .map((r, i) => {
            const title = String(r.title || '').slice(0, 140);
            const url = String(r.url || '');
            const content = String(r.content || '').slice(0, 900);
            return `SOURCE ${i}:\nTITLE: ${title}\nURL: ${url}\nSNIPPET:\n${content}\n`;
          })
          .join('\n');

        const system = `You are a careful enrichment assistant for LEXA.

CRITICAL RULES:
- Use ONLY the provided sources. If a claim is not supported, omit it.
- Return ONLY valid JSON (no markdown).
- quote_snippet must be copied verbatim from a SNIPPET (max 500 chars).
- Keep descriptions short and business-useful (max 1200 chars).

Task:
Given a POI name and destination, extract missing fields for a luxury travel assistant.

JSON shape (include only what you can support):
{
  "category": string,
  "destination": string,
  "description": string,
  "booking_info": string,
  "best_time": string,
  "luxury_score": number,
  "luxury_indicators": string[],
  "themes": string[],
  "keywords": string[],
  "website_url": string,
  "citations": [
    { "source_ref_index": number, "anchor": string, "quote_snippet": string }
  ]
}

Notes:
- source_ref_index refers to SOURCE N above.
- anchor can be "tavily:SOURCE_N".`;

        const userMsg = `POI:\n${poiName}\nDestination: ${destination}\n\n${numberedSources}`;

        const resp = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 900,
          system,
          messages: [{ role: 'user', content: userMsg }],
        });

        const out = resp.content.find((c) => c.type === 'text')?.text || '';
        const jsonMatch = out.match(/\{[\s\S]*\}$/);
        if (!jsonMatch) throw new Error('Claude output invalid (no JSON object)');

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Claude output invalid (JSON parse failed)');
        }

        const extracted = EnrichmentPatchSchema.safeParse(parsedJson);
        if (!extracted.success) {
          throw new Error(`Claude output invalid (${JSON.stringify(extracted.error.flatten())})`);
        }

        const existingSourceRefs = Array.isArray(poi.source_refs) ? poi.source_refs : [];
        const existingCitations = Array.isArray(poi.citations) ? poi.citations : [];
        const sourceOffset = existingSourceRefs.length;

        const shiftedCitations =
          (extracted.data.citations || []).map((c) => ({
            ...c,
            source_ref_index: c.source_ref_index + sourceOffset,
            anchor: c.anchor || `tavily:SOURCE_${c.source_ref_index}`,
          })) || [];

        const nextSourceRefs = [...existingSourceRefs, ...(newSourceRefs as any[])];
        const nextCitations = [...existingCitations, ...shiftedCitations];

        const nextEnrichment =
          poi.enrichment && typeof poi.enrichment === 'object' ? { ...(poi.enrichment as any) } : {};
        const prevAgent = nextEnrichment.agent_auto_enrich && typeof nextEnrichment.agent_auto_enrich === 'object'
          ? nextEnrichment.agent_auto_enrich
          : {};
        nextEnrichment.agent_auto_enrich = {
          ...prevAgent,
          last_attempt_at: nowIso,
          last_query: tavily.query,
          sources_used: sources.length,
        };

        // Only fill missing fields (do not overwrite Captain edits).
        const updates: Record<string, any> = {
          source_refs: nextSourceRefs,
          citations: nextCitations,
          enrichment: nextEnrichment,
          updated_at: nowIso,
        };

        const currentDesc = String(poi.description || '').trim();
        if (!currentDesc && extracted.data.description) updates.description = extracted.data.description;
        if (!poi.category && extracted.data.category) updates.category = extracted.data.category;
        if (!poi.destination && extracted.data.destination) updates.destination = extracted.data.destination;
        if ((poi.luxury_score === null || poi.luxury_score === undefined) && typeof extracted.data.luxury_score === 'number') {
          updates.luxury_score = extracted.data.luxury_score;
        }
        if ((!Array.isArray(poi.keywords) || poi.keywords.length === 0) && extracted.data.keywords) updates.keywords = extracted.data.keywords;
        if ((!Array.isArray(poi.themes) || poi.themes.length === 0) && extracted.data.themes) updates.themes = extracted.data.themes;

        // Mark as enhanced if we changed anything besides provenance.
        const changedAny =
          'description' in updates ||
          'category' in updates ||
          'destination' in updates ||
          'luxury_score' in updates ||
          'keywords' in updates ||
          'themes' in updates;
        if (changedAny) updates.enhanced = true;

        const { error: updateErr } = await supabaseAdmin.from('extracted_pois').update(updates).eq('id', poiId);
        if (updateErr) throw new Error(updateErr.message);

        processed.push({ id: poiId, ok: true });
      } catch (e: any) {
        processed.push({ id: String(poi.id), ok: false, error: String(e?.message || e) });
      }
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      results: processed,
      note: 'This job runs in small batches to control cost and avoid timeouts.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

