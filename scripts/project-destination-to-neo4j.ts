/**
 * Project Supabase canonical entities for a destination into Neo4j + add initial theme_fit edges.
 *
 * This is a "proof of process" step:
 * - We already ingested Overture + FSQ OS into Supabase (experience_entities + sources)
 * - Now we create Neo4j nodes/edges for graph traversal recommendations
 *
 * Usage:
 *   npm run project:neo4j -- "Monaco"
 *
 * Requirements:
 * - .env or .env.local contains NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD
 * - .env or .env.local contains NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */

import * as neo4j from 'neo4j-driver';
import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

type ThemeName =
  | 'Romance & Intimacy'
  | 'Adventure & Exploration'
  | 'Wellness & Transformation'
  | 'Culinary Excellence'
  | 'Cultural Immersion'
  | 'Pure Luxury & Indulgence'
  | 'Nature & Wildlife'
  | 'Water Sports & Marine'
  | 'Art & Architecture'
  | 'Family Luxury'
  | 'Celebration & Milestones'
  | 'Solitude & Reflection';

const THEMES: ThemeName[] = [
  'Romance & Intimacy',
  'Adventure & Exploration',
  'Wellness & Transformation',
  'Culinary Excellence',
  'Cultural Immersion',
  'Pure Luxury & Indulgence',
  'Nature & Wildlife',
  'Water Sports & Marine',
  'Art & Architecture',
  'Family Luxury',
  'Celebration & Milestones',
  'Solitude & Reflection',
];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function textifyCategories(categories: any): string {
  if (!categories) return '';
  try {
    // common cases:
    // - FSQ raw categories: array of objects { name, id, ... }
    // - Overture categories: object/array with strings
    if (Array.isArray(categories)) {
      return categories
        .map((c) => (typeof c === 'string' ? c : c?.name ?? c?.label ?? JSON.stringify(c)))
        .join(' ');
    }
    if (typeof categories === 'object') {
      return JSON.stringify(categories);
    }
    return String(categories);
  } catch {
    return '';
  }
}

function computeLuxuryBase01(entity: any): { score: number; evidence: string[] } {
  const evidence: string[] = [];
  const tags: string[] = Array.isArray(entity?.tags) ? entity.tags : [];
  const catText = (textifyCategories(entity?.categories) + ' ' + tags.join(' ')).toLowerCase();

  // Very simple priors (proof-of-process, not final)
  let s = 0.45;
  if (catText.includes('hotel') || catText.includes('resort')) s = Math.max(s, 0.65);
  if (catText.includes('spa') || catText.includes('wellness')) s = Math.max(s, 0.7);
  if (catText.includes('fine dining') || catText.includes('restaurant')) s = Math.max(s, 0.6);
  if (catText.includes('yacht') || catText.includes('marina')) s = Math.max(s, 0.65);
  if (catText.includes('museum') || catText.includes('gallery')) s = Math.max(s, 0.55);
  if (catText.includes('casino')) s = Math.max(s, 0.6);
  if (catText.includes('luxury') || catText.includes('boutique')) s = Math.max(s, 0.75);

  // signal density boosts (if present)
  const hasWebsite = !!entity?.website;
  const hasPhone = !!entity?.phone;
  const hasInstagram = !!entity?.instagram;
  const signalBoost = (hasWebsite ? 0.05 : 0) + (hasPhone ? 0.03 : 0) + (hasInstagram ? 0.04 : 0);
  if (signalBoost > 0) evidence.push(`signal_density_boost=${signalBoost.toFixed(2)}`);

  s = Math.min(1, Math.max(0, s + signalBoost));
  evidence.push(`category_prior=${s.toFixed(2)}`);

  return { score: Number(s.toFixed(3)), evidence };
}

function computeThemeFit(entity: any, theme: ThemeName): { fit: number; evidence: string[] } {
  const tags: string[] = Array.isArray(entity?.tags) ? entity.tags : [];
  const catText = (textifyCategories(entity?.categories) + ' ' + tags.join(' ') + ' ' + (entity?.name ?? '')).toLowerCase();
  const evidence: string[] = [];
  let fit = 0.15;

  const has = (k: string) => catText.includes(k);

  switch (theme) {
    case 'Romance & Intimacy': {
      if (has('hotel') || has('resort')) fit = Math.max(fit, 0.6);
      if (has('spa') || has('wellness')) fit = Math.max(fit, 0.65);
      if (has('restaurant') || has('fine dining')) fit = Math.max(fit, 0.55);
      if (has('viewpoint') || has('garden') || has('park')) fit = Math.max(fit, 0.6);
      if (has('wine') || has('cocktail') || has('lounge')) fit = Math.max(fit, 0.5);
      evidence.push('rule:romance_priors');
      break;
    }
    case 'Culinary Excellence': {
      if (has('restaurant') || has('fine dining')) fit = Math.max(fit, 0.7);
      if (has('cafe') || has('bakery')) fit = Math.max(fit, 0.45);
      if (has('wine') || has('bar')) fit = Math.max(fit, 0.5);
      evidence.push('rule:culinary_priors');
      break;
    }
    case 'Wellness & Transformation': {
      if (has('spa') || has('wellness') || has('yoga') || has('gym')) fit = Math.max(fit, 0.75);
      evidence.push('rule:wellness_priors');
      break;
    }
    case 'Water Sports & Marine': {
      if (has('marina') || has('yacht') || has('sailing') || has('diving')) fit = Math.max(fit, 0.75);
      if (has('beach')) fit = Math.max(fit, 0.55);
      evidence.push('rule:marine_priors');
      break;
    }
    case 'Cultural Immersion': {
      if (has('museum') || has('theatre') || has('theater') || has('cathedral') || has('church')) fit = Math.max(fit, 0.7);
      evidence.push('rule:culture_priors');
      break;
    }
    case 'Art & Architecture': {
      if (has('gallery') || has('museum') || has('architecture')) fit = Math.max(fit, 0.7);
      evidence.push('rule:art_priors');
      break;
    }
    case 'Family Luxury': {
      if (has('park') || has('beach') || has('museum') || has('zoo') || has('aquarium')) fit = Math.max(fit, 0.6);
      evidence.push('rule:family_priors');
      break;
    }
    case 'Celebration & Milestones': {
      if (has('nightclub') || has('club') || has('casino') || has('event') || has('wedding')) fit = Math.max(fit, 0.7);
      if (has('bar')) fit = Math.max(fit, 0.5);
      evidence.push('rule:celebration_priors');
      break;
    }
    case 'Nature & Wildlife': {
      if (has('park') || has('trail') || has('nature') || has('beach')) fit = Math.max(fit, 0.65);
      evidence.push('rule:nature_priors');
      break;
    }
    case 'Adventure & Exploration': {
      if (has('hiking') || has('trail') || has('climb') || has('adventure')) fit = Math.max(fit, 0.7);
      evidence.push('rule:adventure_priors');
      break;
    }
    case 'Pure Luxury & Indulgence': {
      if (has('luxury') || has('boutique') || has('jewelry') || has('watch') || has('designer')) fit = Math.max(fit, 0.8);
      if (has('hotel') || has('resort')) fit = Math.max(fit, 0.65);
      evidence.push('rule:luxury_priors');
      break;
    }
    case 'Solitude & Reflection': {
      if (has('park') || has('garden') || has('viewpoint') || has('beach')) fit = Math.max(fit, 0.55);
      evidence.push('rule:solitude_priors');
      break;
    }
    default:
      break;
  }

  fit = Math.min(1, Math.max(0, fit));
  return { fit: Number(fit.toFixed(3)), evidence };
}

function topThemes(entity: any, k: number) {
  const scored = THEMES.map((t) => {
    const { fit, evidence } = computeThemeFit(entity, t);
    return { theme: t, fit, evidence };
  })
    .filter((x) => x.fit >= 0.45)
    .sort((a, b) => b.fit - a.fit);

  return scored.slice(0, k);
}

async function main() {
  const destinationName = process.argv.slice(2).join(' ').trim();
  if (!destinationName) {
    throw new Error('Usage: npm run project:neo4j -- "<Destination Name>"');
  }

  const supabaseAdmin = createSupabaseAdmin();
  const neo4jUri = requireEnv('NEO4J_URI');
  const neo4jUser = requireEnv('NEO4J_USER');
  const neo4jPassword = requireEnv('NEO4J_PASSWORD');

  const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
  const session = driver.session();

  try {
    const { data: dest, error: destErr } = await supabaseAdmin
      .from('destinations_geo')
      .select('*')
      .eq('name', destinationName)
      .maybeSingle();
    if (destErr) throw new Error(destErr.message);
    if (!dest) throw new Error(`Destination not found in Supabase: ${destinationName}`);

    const destId = String(dest.id);
    const destName = String(dest.name);

    // Load entities for destination (keep to a reasonable size for proof-of-process)
    const { data: entities, error: entErr } = await supabaseAdmin
      .from('experience_entities')
      .select('id, kind, name, lat, lon, tags, categories, website, phone, instagram, luxury_score_base, confidence_score')
      .eq('destination_id', destId);
    if (entErr) throw new Error(entErr.message);

    const rows = entities ?? [];
    console.log(`Loaded entities for ${destName}: ${rows.length}`);

    // Create destination node
    await session.run(
      `
      MERGE (d:destination {canonical_id: $canonical_id})
      SET d.name = $name,
          d.type = 'city',
          d.updated_at = datetime()
      `,
      { canonical_id: destId, name: destName }
    );

    let upserted = 0;
    let themed = 0;

    // Process in batches to keep transactions small
    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const tx = session.beginTransaction();
      try {
        for (const e of batch) {
          const canonicalId = String(e.id);
          const name = String(e.name ?? '');
          const lat = typeof e.lat === 'number' ? e.lat : null;
          const lon = typeof e.lon === 'number' ? e.lon : null;
          const tags: string[] = Array.isArray(e.tags) ? e.tags : [];

          const luxury =
            typeof e.luxury_score_base === 'number' ? e.luxury_score_base : computeLuxuryBase01(e).score;
          const confidence = typeof e.confidence_score === 'number' ? e.confidence_score : 0.65;

          await tx.run(
            `
            MERGE (p:poi {canonical_id: $canonical_id})
            SET p.name = $name,
                p.lat = $lat,
                p.lon = $lon,
                p.tags = $tags,
                p.luxury_score_base = $luxury_score_base,
                p.confidence_score = $confidence_score,
                p.updated_at = datetime()
            WITH p
            MATCH (d:destination {canonical_id: $destination_id})
            MERGE (p)-[:LOCATED_IN {confidence: 0.95, source: 'supabase_projection'}]->(d)
            `,
            {
              canonical_id: canonicalId,
              name,
              lat,
              lon,
              tags,
              luxury_score_base: luxury,
              confidence_score: confidence,
              destination_id: destId,
            }
          );

          upserted++;

          const top = topThemes(e, 3);
          for (const t of top) {
            await tx.run(
              `
              MATCH (p:poi {canonical_id: $canonical_id})
              MATCH (t:theme_category {name: $theme_name})
              MERGE (p)-[r:FEATURED_IN]->(t)
              SET r.theme_fit = $theme_fit,
                  r.confidence = $confidence,
                  r.evidence = $evidence,
                  r.source = 'rule_based_bootstrap',
                  r.updated_at = datetime()
              `,
              {
                canonical_id: canonicalId,
                theme_name: t.theme,
                theme_fit: t.fit,
                confidence: Math.min(1, Math.max(0.6, t.fit)),
                evidence: t.evidence.join(';'),
              }
            );
            themed++;
          }
        }

        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw err;
      }

      console.log(`Progress: ${Math.min(rows.length, i + batchSize)}/${rows.length} projected`);
    }

    console.log(`Done. Upserted POIs=${upserted}, theme_edges=${themed}`);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


