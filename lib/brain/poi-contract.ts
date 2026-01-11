import { z } from 'zod';

/**
 * Canonical POI contract (code version).
 *
 * This mirrors docs/LEXA_CANONICAL_POI_CONTRACT.md and is used to keep
 * ingestion + enrichment outputs consistent.
 *
 * IMPORTANT:
 * - Store facts + provenance + short citations only (no full page text).
 * - Keep it simple (MVP).
 */

export const SourceTypeSchema = z.enum([
  // Human / internal
  'upload',
  'paste',
  'manual',
  'captain_edit',
  // Open data
  'osm',
  'overture',
  'wikidata',
  // Web discovery / real-time
  'url_scrape',
  'tavily',
  // Future paid enrichers (keep behind feature flags + legal review)
  'google_places',
  'foursquare',
]);

export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SourceRefSchema = z.object({
  source_type: SourceTypeSchema,
  source_id: z.string().min(1),
  source_url: z.string().url().optional().nullable(),
  captured_at: z.string().min(1), // ISO string
  external_ids: z
    .record(z.string(), z.union([z.string(), z.number(), z.null()]))
    .optional()
    .nullable(),
  license: z.string().optional().nullable(),
});

export type SourceRef = z.infer<typeof SourceRefSchema>;

export const CitationSchema = z.object({
  source_ref_index: z.number().int().min(0),
  anchor: z.string().min(1),
  quote_snippet: z.string().min(1).max(500),
  hash: z.string().min(1).optional().nullable(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const EmotionalSignalSchema = z.object({
  kind: z.enum(['Emotion', 'EmotionalTag', 'Desire', 'Fear']),
  code: z.string().min(1).optional(), // for canonical Emotion/Desire/Fear when available
  name: z.string().min(1),
  intensity_1_10: z.number().int().min(1).max(10),
  evidence: z.string().min(1).max(500),
  confidence_0_1: z.number().min(0).max(1).optional(),
  citations: z.array(CitationSchema).optional(),
});

export type EmotionalSignal = z.infer<typeof EmotionalSignalSchema>;

export const PricingSchema = z
  .object({
    amount: z.number().optional().nullable(),
    currency: z.string().min(1).optional().nullable(),
    unit: z.string().min(1).optional().nullable(),
    range: z
      .object({
        low: z.number().optional().nullable(),
        high: z.number().optional().nullable(),
      })
      .optional()
      .nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .default({});

export type Pricing = z.infer<typeof PricingSchema>;

export const ClientArchetypeSchema = z.object({
  name: z.string().min(1),
  match_score_0_100: z.number().int().min(0).max(100),
  why: z.string().min(1).max(500),
  pain_points_solved: z.array(z.string().min(1)).optional().default([]),
  confidence_0_1: z.number().min(0).max(1).optional(),
});

export type ClientArchetype = z.infer<typeof ClientArchetypeSchema>;

export const CanonicalPoiDraftSchema = z.object({
  // Identity (drafts use extracted_pois.id; canonical poi_uid exists in Neo4j)
  name: z.string().min(1),
  destination: z.string().min(1).optional().nullable(),
  category: z.string().min(1).optional().nullable(),

  // Location
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.string().optional().nullable(),

  // Content
  description: z.string().optional().nullable(),
  themes: z.array(z.string().min(1)).optional().default([]),
  keywords: z.array(z.string().min(1)).optional().default([]),
  luxury_indicators: z.array(z.string().min(1)).optional().default([]),

  // Trust / workflow
  confidence_score_0_100: z.number().int().min(0).max(100).optional().default(50),
  verified: z.boolean().optional().default(false),

  // Emotional / personalization
  emotional_map: z.array(EmotionalSignalSchema).optional().default([]),
  sensory_triggers: z.array(z.string().min(1)).optional().default([]),
  client_archetypes: z.array(ClientArchetypeSchema).optional().default([]),
  conversation_triggers: z.array(z.string().min(1)).optional().default([]),
  pricing: PricingSchema.optional().default({}),

  // Provenance
  source_refs: z.array(SourceRefSchema).min(1),
  citations: z.array(CitationSchema).optional().default([]),

  // Extra structured facets (MVP-safe)
  enrichment: z.record(z.any()).optional().default({}),
});

export type CanonicalPoiDraft = z.infer<typeof CanonicalPoiDraftSchema>;

/**
 * Simple heuristic used to block obvious junk names (paragraph fragments).
 * Keep it conservative: only block clear garbage.
 */
export function looksLikeBadPoiName(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return true;
  if (n.length > 120) return true;
  if (/[.!?].*[.!?]/.test(n)) return true; // multiple sentences
  if ((n.match(/,/g) || []).length >= 3) return true;
  if (/^(by|and|it|this|they|the)\b/i.test(n)) return true;
  return false;
}

