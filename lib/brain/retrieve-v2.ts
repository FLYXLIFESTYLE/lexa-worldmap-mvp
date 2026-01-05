import { getNeo4jDriver } from '@/lib/neo4j/client';
import { supabaseAdmin } from '@/lib/supabase/client';

export type BrainCandidateSource = 'neo4j' | 'draft';

export type BrainCandidate = {
  source: BrainCandidateSource;
  approved: boolean; // trusted / approved for use
  label: 'APPROVED' | 'UNAPPROVED_DRAFT' | 'VERIFIED_DRAFT';
  name: string;
  type: string;
  destination: string | null;
  confidence: number; // 0..1
  luxury: number; // 0..1
  theme_fit: number; // 0..1
  recency_score: number; // 0..1
  score: number; // 0..1
  // Traceability
  poi_uid?: string | null;
  source_id?: string | null;
  source_kind?: string | null;
  updated_at?: string | null;
  notes?: string | null;
};

export type BrainRetrieveV2Input = {
  destination: string;
  theme?: string | null;
  themes?: string[] | null;
  limit?: number;
  includeDrafts?: boolean;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeScoreMaybe0to10or0to100(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  // Heuristic: >10 likely 0..100
  return clamp01(v > 10 ? v / 100 : v / 10);
}

function normalizeConfidence(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  // Heuristic: >1 likely 0..100
  return clamp01(v > 1 ? v / 100 : v);
}

function recencyScoreFromIso(iso: string | null | undefined): number {
  if (!iso) return 0.2; // neutral default
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0.2;
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(days) || days < 0) return 0.2;
  // 0 days -> 1, 90 days -> ~0.5, 180 -> ~0.33
  return clamp01(1 / (1 + days / 90));
}

function computeRankScore(params: {
  approvedBoost: number; // 0..1
  confidence: number;
  themeFit: number;
  luxury: number;
  recency: number;
}): number {
  const { approvedBoost, confidence, themeFit, luxury, recency } = params;
  // Simple, explainable weighting (sum to 1.0)
  return clamp01(
    approvedBoost * 0.35 +
      confidence * 0.25 +
      themeFit * 0.20 +
      luxury * 0.10 +
      recency * 0.10
  );
}

export async function retrieveBrainCandidatesV2(
  input: BrainRetrieveV2Input
): Promise<{
  destination: string;
  theme: string | null;
  usedThemes: string[];
  candidates: BrainCandidate[];
  counts: { neo4j: number; drafts: number; returned: number };
}> {
  const destination = (input.destination || '').trim();
  if (!destination) {
    return {
      destination: '',
      theme: input.theme ?? null,
      usedThemes: [],
      candidates: [],
      counts: { neo4j: 0, drafts: 0, returned: 0 },
    };
  }

  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const includeDrafts = input.includeDrafts ?? true;

  const usedThemes =
    (Array.isArray(input.themes) && input.themes.filter(Boolean).map((t) => String(t).trim()).filter(Boolean)) ||
    [];
  const theme = (input.theme || '').trim() || null;
  if (theme && usedThemes.length === 0) usedThemes.push(theme);

  // 1) Neo4j candidates (primary)
  const driver = getNeo4jDriver();
  const session = driver.session();
  let neo4jRows: any[] = [];
  try {
    const query = usedThemes.length
      ? `
        MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
        WHERE toLower(d.name) CONTAINS toLower($destination)
        OPTIONAL MATCH (p)-[r1:FEATURED_IN]->(t1:theme_category)
        WHERE t1.name IN $themes
        OPTIONAL MATCH (p)-[r2:HAS_THEME]->(t2:theme_category)
        WHERE t2.name IN $themes
        WITH p, d,
          max(coalesce(r1.theme_fit, 0.0)) AS tf1,
          max(coalesce(r2.confidence, 0.0)) AS tf2,
          coalesce(p.updated_at, p.enriched_at, p.created_at) AS updated_at
        WITH p, d, updated_at,
          CASE WHEN tf1 > tf2 THEN tf1 ELSE tf2 END AS theme_fit,
          coalesce(p.luxury_score_base, p.luxury_score, 0.0) AS luxury,
          coalesce(p.confidence_score, p.luxury_confidence, 0.0) AS confidence,
          coalesce(p.source, '') AS source_kind
        WITH p, d, updated_at, theme_fit, luxury, confidence, source_kind
        RETURN
          p.name AS name,
          coalesce(p.type, p.category, 'poi') AS type,
          d.name AS destination_name,
          updated_at AS updated_at,
          theme_fit AS theme_fit,
          luxury AS luxury,
          confidence AS confidence,
          source_kind AS source_kind,
          coalesce(p.poi_uid, p.canonical_id, null) AS poi_uid,
          coalesce(p.source_id, null) AS source_id
        ORDER BY (luxury * confidence * (0.2 + theme_fit)) DESC
        LIMIT 50
      `
      : `
        MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
        WHERE toLower(d.name) CONTAINS toLower($destination)
        WITH p, d,
          coalesce(p.updated_at, p.enriched_at, p.created_at) AS updated_at,
          coalesce(p.luxury_score_base, p.luxury_score, 0.0) AS luxury,
          coalesce(p.confidence_score, p.luxury_confidence, 0.0) AS confidence,
          coalesce(p.source, '') AS source_kind
        RETURN
          p.name AS name,
          coalesce(p.type, p.category, 'poi') AS type,
          d.name AS destination_name,
          updated_at AS updated_at,
          0.0 AS theme_fit,
          luxury AS luxury,
          confidence AS confidence,
          source_kind AS source_kind,
          coalesce(p.poi_uid, p.canonical_id, null) AS poi_uid,
          coalesce(p.source_id, null) AS source_id
        ORDER BY (luxury * confidence) DESC
        LIMIT 50
      `;

    const res = await session.run(query, { destination, themes: usedThemes });
    neo4jRows = res.records.map((r) => ({
      name: r.get('name'),
      type: r.get('type'),
      destination_name: r.get('destination_name'),
      updated_at: r.get('updated_at'),
      theme_fit: r.get('theme_fit'),
      luxury: r.get('luxury'),
      confidence: r.get('confidence'),
      source_kind: r.get('source_kind'),
      poi_uid: r.get('poi_uid'),
      source_id: r.get('source_id'),
    }));
  } catch {
    neo4jRows = [];
  } finally {
    await session.close();
  }

  const neo4jCandidates: BrainCandidate[] = neo4jRows
    .filter((r) => r?.name)
    .map((r) => {
      const sourceKind = String(r.source_kind || '');
      const approved = ['captain_extracted', 'manual'].includes(sourceKind);
      const confidence = normalizeConfidence(r.confidence);
      const luxury = normalizeScoreMaybe0to10or0to100(r.luxury);
      const theme_fit = clamp01(Number(r.theme_fit) || 0);
      const updated_at = r.updated_at ? String(r.updated_at) : null;
      const recency = recencyScoreFromIso(updated_at);
      const approvedBoost = approved ? 1 : 0.5; // still allow non-approved Neo4j, but lower
      const score = computeRankScore({
        approvedBoost,
        confidence,
        themeFit: theme_fit,
        luxury,
        recency,
      });

      return {
        source: 'neo4j',
        approved,
        label: approved ? 'APPROVED' : 'UNAPPROVED_DRAFT',
        name: String(r.name),
        type: String(r.type || 'poi'),
        destination: String(r.destination_name || destination),
        confidence,
        luxury,
        theme_fit,
        recency_score: recency,
        score,
        poi_uid: r.poi_uid ? String(r.poi_uid) : null,
        source_id: r.source_id ? String(r.source_id) : null,
        source_kind: sourceKind || null,
        updated_at,
      };
    });

  // 2) Draft candidates (fallback) from Supabase extracted_pois
  let draftCandidates: BrainCandidate[] = [];
  if (includeDrafts) {
    try {
      let q = supabaseAdmin
        .from('extracted_pois')
        .select('id,name,category,destination,description,confidence_score,luxury_score,verified,promoted_to_main,created_at,updated_at')
        .eq('promoted_to_main', false)
        .ilike('destination', `%${destination}%`)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (theme) {
        q = q.or(`name.ilike.%${theme}%,description.ilike.%${theme}%,category.ilike.%${theme}%`);
      }

      const { data } = await q;
      const rows = (data || []) as any[];

      draftCandidates = rows.map((r) => {
        const verified = !!r.verified;
        const confidence = clamp01((Number(r.confidence_score) || 0) / 100);
        const luxury = clamp01((Number(r.luxury_score) || 0) / 10);
        const updated_at = (r.updated_at || r.created_at || null) as string | null;
        const recency = recencyScoreFromIso(updated_at);
        const theme_fit =
          theme && typeof theme === 'string'
            ? clamp01(
                String(r.category || '').toLowerCase().includes(theme.toLowerCase()) ||
                  String(r.description || '').toLowerCase().includes(theme.toLowerCase()) ||
                  String(r.name || '').toLowerCase().includes(theme.toLowerCase())
                  ? 0.6
                  : 0.1
              )
            : 0.1;
        const approvedBoost = verified ? 0.8 : 0.2;
        const score = computeRankScore({
          approvedBoost,
          confidence,
          themeFit: theme_fit,
          luxury,
          recency,
        });

        return {
          source: 'draft',
          approved: false,
          label: verified ? 'VERIFIED_DRAFT' : 'UNAPPROVED_DRAFT',
          name: String(r.name || ''),
          type: String(r.category || 'poi'),
          destination: r.destination ? String(r.destination) : null,
          confidence,
          luxury,
          theme_fit,
          recency_score: recency,
          score,
          source_id: r.id ? String(r.id) : null,
          source_kind: 'extracted_pois',
          updated_at,
          notes: verified ? 'Verified but not promoted yet' : null,
        };
      });
    } catch {
      draftCandidates = [];
    }
  }

  const merged = [...neo4jCandidates, ...draftCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    destination,
    theme,
    usedThemes,
    candidates: merged,
    counts: { neo4j: neo4jCandidates.length, drafts: draftCandidates.length, returned: merged.length },
  };
}

