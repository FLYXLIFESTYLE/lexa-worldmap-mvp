/**
 * Cron: Refresh Stale POIs (Task #8)
 *
 * Purpose:
 * - Finds POIs where next_refresh_at has passed (enrichment is stale)
 * - Re-enriches them with fresh Tavily data
 * - Updates freshness timestamps
 *
 * Schedule: Daily at 3 AM (low traffic, after main import/enrich cycles)
 *
 * Why:
 * - POI data gets stale (restaurants close, hotels renovate, prices change)
 * - Freshness tracking ensures LEXA's recommendations stay current
 * - Automated re-enrichment maintains data quality without manual work
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { searchPOIInfo } from '@/lib/integrations/tavily-client';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

function isVercelCron(req: Request): boolean {
  const h = req.headers.get('x-vercel-cron');
  if (h) return true;
  const ua = String(req.headers.get('user-agent') || '').toLowerCase();
  if (ua.includes('vercel-cron')) return true;
  try {
    const secret = process.env.CRON_SECRET || '';
    if (secret) {
      const url = new URL(req.url);
      const token = url.searchParams.get('token') || '';
      if (token && token === secret) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

const EnrichmentPatchSchema = z.object({
  description: z.string().min(1).max(2400).optional(),
  luxury_score: z.number().int().min(0).max(10).optional(),
  keywords: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  website_url: z.string().url().optional(),
  booking_info: z.string().optional(),
  best_time: z.string().optional(),
  confidence_score: z.number().int().min(0).max(100).optional(),
});

export async function GET(req: Request) {
  try {
    if (!isVercelCron(req)) {
      return NextResponse.json({ error: 'Forbidden (cron only)' }, { status: 403 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 10), 50); // Max 50 per run

    // Find stale POIs using helper function
    const { data: stalePois, error: staleErr } = await supabaseAdmin.rpc('find_stale_pois', { p_limit: limit });
    if (staleErr) {
      return NextResponse.json({ error: 'Failed to find stale POIs', details: staleErr.message }, { status: 500 });
    }

    if (!stalePois || stalePois.length === 0) {
      return NextResponse.json({
        success: true,
        mode: 'refresh_stale',
        refreshed: 0,
        note: 'No stale POIs found (all POIs are fresh or have no refresh schedule)',
      });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const MODEL = 'claude-sonnet-4-5-20250929';
    const nowIso = new Date().toISOString();

    const processed: Array<{ id: string; name: string; ok: boolean; error?: string }> = [];

    for (const poi of stalePois) {
      try {
        const poiName = String(poi.name || '').trim();
        const destination = String(poi.destination || '').trim();
        if (!poiName || !destination) continue;

        // 1) Tavily search
        const tavilyResult = await searchPOIInfo(poiName, destination);
        const sources = (tavilyResult.results || []).slice(0, 5);
        if (!sources.length) {
          processed.push({ id: String(poi.id), name: poiName, ok: false, error: 'No Tavily results' });
          continue;
        }

        const newSourceRefs = sources.map((r, idx) => ({
          source_type: 'tavily' as const,
          source_id: `tavily:${Date.now()}:${idx}`,
          source_url: String(r.url || ''),
          captured_at: nowIso,
        }));

        const numberedSources = sources
          .map((r, i) => {
            const title = String(r.title || '').slice(0, 140);
            const url = String(r.url || '');
            const content = String(r.content || '').slice(0, 900);
            return `SOURCE ${i}:\nTITLE: ${title}\nURL: ${url}\nSNIPPET:\n${content}\n`;
          })
          .join('\n');

        const system = `You are refreshing stale POI data for LEXA.

CRITICAL RULES:
- Use ONLY the provided sources. If not supported, omit the field.
- Return ONLY valid JSON (no markdown).
- Keep descriptions investor-safe and concise (<= 1200 chars).

Task: Extract updated fields for this POI.

JSON shape (only include what changed/improved):
{
  "description": string,
  "luxury_score": 0-10,
  "keywords": string[],
  "themes": string[],
  "website_url": string,
  "booking_info": string,
  "best_time": string,
  "confidence_score": 70-100
}`;

        const userMsg = `POI: ${poiName}\nDestination: ${destination}\nRefreshing stale data (last enriched ${poi.days_since_enrichment} days ago).\n\n${numberedSources}`;

        const resp = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 900,
          system,
          messages: [{ role: 'user', content: userMsg }],
        });

        const out = resp.content.find((c) => c.type === 'text')?.text || '';
        const jsonMatch = out.match(/\{[\s\S]*\}$/);
        if (!jsonMatch) {
          processed.push({ id: String(poi.id), name: poiName, ok: false, error: 'No JSON in Claude output' });
          continue;
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {
          processed.push({ id: String(poi.id), name: poiName, ok: false, error: 'JSON parse failed' });
          continue;
        }

        const extracted = EnrichmentPatchSchema.safeParse(parsedJson);
        if (!extracted.success) {
          processed.push({ id: String(poi.id), name: poiName, ok: false, error: 'Schema validation failed' });
          continue;
        }

        // Refresh: OVERWRITE fields (this is intentional; we're updating stale data)
        const updates: Record<string, any> = {
          updated_at: nowIso,
        };

        if (extracted.data.description) updates.description = extracted.data.description;
        if (typeof extracted.data.luxury_score === 'number') updates.luxury_score = extracted.data.luxury_score;
        if (extracted.data.keywords) updates.keywords = extracted.data.keywords;
        if (extracted.data.themes) updates.themes = extracted.data.themes;
        if (extracted.data.website_url) updates.website_url = extracted.data.website_url;
        if (extracted.data.booking_info) updates.booking_info = extracted.data.booking_info;
        if (extracted.data.best_time) updates.best_time = extracted.data.best_time;
        if (typeof extracted.data.confidence_score === 'number') {
          updates.confidence_score = Math.max(extracted.data.confidence_score, 70);
        }

        const updateErr = (await supabaseAdmin.from('extracted_pois').update(updates).eq('id', poi.id)).error;
        if (updateErr) {
          processed.push({ id: String(poi.id), name: poiName, ok: false, error: updateErr.message });
          continue;
        }

        // Update freshness timestamps
        try {
          await supabaseAdmin.rpc('mark_poi_enriched', { p_poi_id: poi.id, p_refresh_days: 90 });
        } catch {
          // Fallback
          try {
            const nextRefresh = new Date();
            nextRefresh.setDate(nextRefresh.getDate() + 90);
            await supabaseAdmin
              .from('extracted_pois')
              .update({
                last_enriched_at: nowIso,
                next_refresh_at: nextRefresh.toISOString(),
              })
              .eq('id', poi.id);
          } catch {
            // ignore
          }
        }

        // Log URL sources
        try {
          const contributedFields = Object.keys(updates).filter((k) => !['updated_at'].includes(k));
          const urlSourceRows = sources.map((r: any) => ({
            poi_id: poi.id,
            url: String(r.url || ''),
            url_title: String(r.title || '').slice(0, 200) || null,
            url_domain: (() => {
              try {
                return new URL(r.url).hostname;
              } catch {
                return null;
              }
            })(),
            contributed_fields: contributedFields,
            provider: 'tavily',
            provider_metadata: { score: r.score, refreshed_at: nowIso },
            last_checked_at: nowIso,
          }));
          await supabaseAdmin.from('poi_url_sources').upsert(urlSourceRows, { onConflict: 'poi_id,url' });
        } catch {
          // ignore
        }

        processed.push({ id: String(poi.id), name: poiName, ok: true });
      } catch (e: any) {
        processed.push({ id: String(poi.id), name: poiName, ok: false, error: String(e?.message || e) });
      }
    }

    const refreshed = processed.filter((p) => p.ok).length;
    const failed = processed.filter((p) => !p.ok).length;

    return NextResponse.json({
      success: true,
      mode: 'refresh_stale',
      found_stale: stalePois.length,
      refreshed,
      failed,
      processed_sample: processed.slice(0, 10),
      note: 'Stale POIs re-enriched with fresh Tavily data',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
