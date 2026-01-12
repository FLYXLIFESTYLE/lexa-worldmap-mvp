/**
 * Data Quality Agent for Neo4j
 * Runs daily quality checks: duplicates, unnamed POIs, missing relations, scoring, enrichment
 * 
 * NOTE: For large datasets (200K+ POIs), the agent runs incrementally to avoid timeouts:
 * - Processes 50 duplicates per run
 * - Processes 1000 unnamed POIs per run
 * - Processes 1000 POIs for luxury scoring per run
 * - Processes 1000 relationships for confidence scoring per run
 * - Processes 50 POIs for enrichment per run
 * 
 * Run multiple times or use the daily scheduled job to process all data.
 * With 202,961 POIs, expect ~203 runs to score everything.
 */

import { getNeo4jDriver } from './client';
import { logQualityCheck } from '../services/logger';
import { addSeasonalAvailability } from './relationship-inference';
import { scoreAllUnscored } from './scoring-engine';
import type { Driver, Session } from 'neo4j-driver';
import * as neo4j from 'neo4j-driver';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DuplicateStats {
  duplicatesFound: number;
  poisMerged: number;
  poisDeleted: number;
  propertiesMerged: number;
  relationshipsMerged: number;
}

export interface UnnamedPOIStats {
  checked: number;
  deleted: number;
  enriched?: number;
  failed?: number;
}

export interface RelationStats {
  checked: number;
  created: number;
  byType: {
    LOCATED_IN: number;
    SUPPORTS_ACTIVITY: number;
    HAS_THEME: number;
  };
}

export interface ScoringStats {
  checked: number;
  added: number;
  updated: number;
  byField: {
    luxury_score: number;
    confidence: number;
    evidence: number;
  };
}

export interface EnrichmentStats {
  queued: number;
  enriched: number;
  failed: number;
  cached: number;
  bySource: {
    google: number;
    wikipedia: number;
    osm: number;
  };
  fieldsAdded: {
    description: number;
    rating: number;
    photos: number;
    website: number;
    hours: number;
  };
  apiCost: number;
}

export interface QualityCheckResults {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  duplicates: DuplicateStats;
  unnamedPOIs: UnnamedPOIStats;
  relations: RelationStats;
  scoring: ScoringStats;
  enrichment: EnrichmentStats;
  errors: string[];
}

interface POI {
  id: string;
  name?: string;
  luxury_score?: number;
  updated_at?: string;
  relationshipCount?: number;
  nonNullProperties?: number;
  [key: string]: any;
}

// ============================================================================
// Global State
// ============================================================================

let isRunning = false;
let lastRunResults: QualityCheckResults | null = null;

// ============================================================================
// Main Orchestration Function
// ============================================================================

export async function runFullCheck(): Promise<QualityCheckResults> {
  if (isRunning) {
    throw new Error('Data quality check is already running');
  }

  isRunning = true;
  const results: QualityCheckResults = {
    startTime: new Date(),
    duplicates: {
      duplicatesFound: 0,
      poisMerged: 0,
      poisDeleted: 0,
      propertiesMerged: 0,
      relationshipsMerged: 0,
    },
    unnamedPOIs: {
      checked: 0,
      deleted: 0,
    },
    relations: {
      checked: 0,
      created: 0,
      byType: {
        LOCATED_IN: 0,
        SUPPORTS_ACTIVITY: 0,
        HAS_THEME: 0,
      },
    },
    scoring: {
      checked: 0,
      added: 0,
      updated: 0,
      byField: {
        luxury_score: 0,
        confidence: 0,
        evidence: 0,
      },
    },
    enrichment: {
      queued: 0,
      enriched: 0,
      failed: 0,
      cached: 0,
      bySource: {
        google: 0,
        wikipedia: 0,
        osm: 0,
      },
      fieldsAdded: {
        description: 0,
        rating: 0,
        photos: 0,
        website: 0,
        hours: 0,
      },
      apiCost: 0,
    },
    errors: [],
  };

  try {
    console.log('[Data Quality Agent] Starting full quality check...');

    // Step 1: Find and merge duplicates
    console.log('[Data Quality Agent] Step 1/5: Finding and merging duplicates...');
    results.duplicates = await findAndMergeDuplicates();

    // Step 2: Remove unnamed POIs
    // MVP policy: avoid unnamed POIs because they cannot be reviewed/approved reliably.
    console.log('[Data Quality Agent] Step 2/5: Removing unnamed POIs...');
    results.unnamedPOIs = await removeUnnamedPOIs();

    // Step 3: Ensure relations exist
    console.log('[Data Quality Agent] Step 3/5: Checking and creating relations...');
    results.relations = await ensureRelations();
    
    // Step 3.5: Add seasonal availability relationships
    console.log('[Data Quality Agent] Step 3.5: Adding seasonal availability...');
    const seasonalCount = await addSeasonalAvailability();
    console.log(`[Data Quality Agent] Added ${seasonalCount} seasonal availability relationships`);

    // Step 4: Verify scoring
    console.log('[Data Quality Agent] Step 4/5: Verifying scores...');
    results.scoring = await verifyScoring();

    // Step 5: Enrich POI data
    console.log('[Data Quality Agent] Step 5/5: Enriching POI data...');
    results.enrichment = await enrichPOIData();

    results.endTime = new Date();
    results.duration = results.endTime.getTime() - results.startTime.getTime();

    console.log('[Data Quality Agent] Quality check completed successfully');
    console.log(`[Data Quality Agent] Duration: ${Math.round(results.duration / 1000)}s`);

    lastRunResults = results;
    
    // Log results to file
    await logQualityCheck(results);
    
    return results;
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : String(error));
    console.error('[Data Quality Agent] Quality check failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

// ============================================================================
// Step 1: Find and Merge Duplicates
// ============================================================================

export async function findAndMergeDuplicates(): Promise<DuplicateStats> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  
  const stats: DuplicateStats = {
    duplicatesFound: 0,
    poisMerged: 0,
    poisDeleted: 0,
    propertiesMerged: 0,
    relationshipsMerged: 0,
  };

  try {
    // Find duplicates by source + source_id
    const duplicatesBySource = await findDuplicatesBySource(session);
    console.log(`  Found ${duplicatesBySource.length} duplicate groups by source+source_id`);
    
    // Find duplicates by name + coordinates
    const duplicatesByLocation = await findDuplicatesByLocation(session);
    console.log(`  Found ${duplicatesByLocation.length} duplicate groups by name+coords`);
    
    // Merge all duplicate groups
    const allDuplicates = [...duplicatesBySource, ...duplicatesByLocation];
    stats.duplicatesFound = allDuplicates.length;

    for (const duplicateGroup of allDuplicates) {
      try {
        const mergeResult = await mergeDuplicateGroup(session, duplicateGroup);
        stats.poisMerged++;
        stats.poisDeleted++;
        stats.propertiesMerged += mergeResult.propertiesMerged;
        stats.relationshipsMerged += mergeResult.relationshipsMerged;
      } catch (error) {
        console.error(`  Error merging duplicate group:`, error);
      }
    }

    return stats;
  } finally {
    await session.close();
  }
}

async function findDuplicatesBySource(session: Session): Promise<POI[][]> {
  const result = await session.run(`
    MATCH (p:poi)
    WITH p.source AS source, p.source_id AS source_id, COLLECT(p) AS duplicates
    WHERE SIZE(duplicates) > 1
    RETURN duplicates
    LIMIT 100
  `);

  return result.records.map(record => 
    record.get('duplicates').map((poi: any) => ({
      id: poi.identity.toString(),
      ...poi.properties,
    }))
  );
}

async function findDuplicatesByLocation(session: Session): Promise<POI[][]> {
  // Optimized: Use name index first, then distance check
  const result = await session.run(`
    MATCH (p1:poi)
    WHERE p1.name IS NOT NULL 
      AND p1.lat IS NOT NULL 
      AND p1.lon IS NOT NULL
    WITH p1
    LIMIT 1000
    MATCH (p2:poi)
    WHERE p2.name = p1.name
      AND id(p1) < id(p2)
      AND p2.lat IS NOT NULL
      AND p2.lon IS NOT NULL
      AND point.distance(
        point({latitude: p1.lat, longitude: p1.lon}),
        point({latitude: p2.lat, longitude: p2.lon})
      ) < 100
    RETURN COLLECT(DISTINCT p1) + COLLECT(DISTINCT p2) as duplicates
    LIMIT 50
  `);

  return result.records.map(record =>
    record.get('duplicates').map((poi: any) => ({
      id: poi.identity.toString(),
      ...poi.properties,
    }))
  );
}

async function mergeDuplicateGroup(
  session: Session,
  duplicates: POI[]
): Promise<{ propertiesMerged: number; relationshipsMerged: number }> {
  // Calculate priority for each POI
  const poisWithPriority = duplicates.map(poi => ({
    poi,
    priority: calculatePriority(poi),
  }));

  // Sort by priority (highest first)
  poisWithPriority.sort((a, b) => b.priority - a.priority);

  const keptPOI = poisWithPriority[0].poi;
  const duplicatePOI = poisWithPriority[1].poi;

  // Merge properties
  const propertiesMerged = await mergeProperties(session, keptPOI, duplicatePOI);

  // Merge relationships
  const relationshipsMerged = await mergeRelationships(session, keptPOI, duplicatePOI);

  // Delete duplicate
  // Convert ID to Neo4j Integer to handle 64-bit node IDs safely
  const duplicateIdValue = typeof duplicatePOI.id === 'object' && duplicatePOI.id?.toNumber 
    ? neo4j.int(duplicatePOI.id.toNumber())
    : neo4j.int(Number(duplicatePOI.id));
  
  await session.run(`
    MATCH (p:poi)
    WHERE id(p) = $duplicateId
    DETACH DELETE p
  `, { duplicateId: duplicateIdValue });

  console.log(`  Merged POI ${duplicatePOI.id} into ${keptPOI.id}`);

  return { propertiesMerged, relationshipsMerged };
}

function calculatePriority(poi: POI): number {
  let score = 0;

  // Luxury score (highest priority) - weight: 1000
  score += (poi.luxury_score || 0) * 1000;

  // Relationship count - weight: 100
  score += (poi.relationshipCount || 0) * 100;

  // Property completeness - weight: 10
  const nonNullProps = Object.values(poi).filter(v => v !== null && v !== undefined).length;
  score += nonNullProps * 10;

  // Recency (days since epoch) - weight: 0.01
  if (poi.updated_at) {
    score += (new Date(poi.updated_at).getTime() / 86400000) * 0.01;
  }

  return score;
}

async function mergeProperties(
  session: Session,
  keptPOI: POI,
  duplicatePOI: POI
): Promise<number> {
  let mergedCount = 0;

  // Properties to merge
  const propertiesToCheck = [
    'description',
    'website',
    'phone',
    'rating',
    'price_level',
    'opening_hours',
    'photos',
  ];

  const updates: Record<string, any> = {};

  for (const prop of propertiesToCheck) {
    if (!keptPOI[prop] && duplicatePOI[prop]) {
      updates[prop] = duplicatePOI[prop];
      mergedCount++;
    } else if (
      prop === 'luxury_score' &&
      (duplicatePOI[prop] || 0) > (keptPOI[prop] || 0)
    ) {
      updates[prop] = duplicatePOI[prop];
      mergedCount++;
    }
  }

  if (Object.keys(updates).length > 0) {
    // Convert ID to Neo4j Integer to handle 64-bit node IDs safely
    const keptIdValue = typeof keptPOI.id === 'object' && keptPOI.id?.toNumber 
      ? neo4j.int(keptPOI.id.toNumber())
      : neo4j.int(Number(keptPOI.id));
    
    await session.run(`
      MATCH (p:poi)
      WHERE id(p) = $keptId
      SET p += $updates
    `, {
      keptId: keptIdValue,
      updates,
    });
  }

  return mergedCount;
}

async function mergeRelationships(
  session: Session,
  keptPOI: POI,
  duplicatePOI: POI
): Promise<number> {
  let mergedCount = 0;

  // Merge each relationship type
  const relationshipTypes = ['LOCATED_IN', 'SUPPORTS_ACTIVITY', 'HAS_THEME'];

  for (const relType of relationshipTypes) {
    const result = await session.run(`
      MATCH (duplicate:poi)-[r1:${relType}]->(target)
      WHERE id(duplicate) = $duplicateId
      
      OPTIONAL MATCH (kept:poi)-[r2:${relType}]->(target)
      WHERE id(kept) = $keptId
      
      WITH duplicate, kept, r1, r2, target
      WHERE r2 IS NULL OR (r1.confidence > COALESCE(r2.confidence, 0))
      
      MERGE (kept)-[newRel:${relType}]->(target)
      SET newRel.confidence = r1.confidence,
          newRel.evidence = r1.evidence,
          newRel.updated_at = datetime()
      
      RETURN count(newRel) as merged
    `, {
      // Convert IDs to Neo4j Integer to handle 64-bit node IDs safely
      keptId: typeof keptPOI.id === 'object' && keptPOI.id?.toNumber 
        ? neo4j.int(keptPOI.id.toNumber())
        : neo4j.int(Number(keptPOI.id)),
      duplicateId: typeof duplicatePOI.id === 'object' && duplicatePOI.id?.toNumber 
        ? neo4j.int(duplicatePOI.id.toNumber())
        : neo4j.int(Number(duplicatePOI.id)),
    });

    mergedCount += result.records[0]?.get('merged')?.toNumber() || 0;
  }

  return mergedCount;
}

// ============================================================================
// Step 2: Remove Unnamed POIs
// ============================================================================

export async function removeUnnamedPOIs(): Promise<UnnamedPOIStats> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // First, count unnamed POIs
    const countResult = await session.run(`
      MATCH (p:poi)
      WHERE p.name IS NULL 
        OR p.name = '' 
        OR trim(p.name) = ''
        OR p.name STARTS WITH 'Unnamed POI'
        OR p.name STARTS WITH 'unnamed poi'
        OR p.name =~ '(?i)^unnamed.*'
      RETURN count(p) as total
    `);
    
    const total = countResult.records[0]?.get('total')?.toNumber() || 0;
    console.log(`  Found ${total} unnamed POIs`);

    if (total === 0) {
      return { checked: 0, deleted: 0 };
    }

    // Delete unnamed POIs (in batches of 1000 to avoid timeout)
    const deleteResult = await session.run(`
      MATCH (p:poi)
      WHERE p.name IS NULL 
        OR p.name = '' 
        OR trim(p.name) = ''
        OR p.name STARTS WITH 'Unnamed POI'
        OR p.name STARTS WITH 'unnamed poi'
        OR p.name =~ '(?i)^unnamed.*'
      WITH p LIMIT 1000
      DETACH DELETE p
      RETURN count(p) as deleted
    `);

    const deleted = deleteResult.records[0]?.get('deleted')?.toNumber() || 0;

    console.log(`  Deleted ${deleted} unnamed POIs (${total - deleted} remaining)`);

    return {
      checked: total,
      deleted,
    };
  } finally {
    await session.close();
  }
}

// ============================================================================
// Step 3: Ensure Relations
// ============================================================================

export async function ensureRelations(): Promise<RelationStats> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  const stats: RelationStats = {
    checked: 0,
    created: 0,
    byType: {
      LOCATED_IN: 0,
      SUPPORTS_ACTIVITY: 0,
      HAS_THEME: 0,
    },
  };

  try {
    console.log('  Checking and creating missing relationships...');

    // 1. LOCATED_IN: POI → Destination (based on destination_name property)
    const locatedInResult = await session.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:LOCATED_IN]->()
        AND p.destination_name IS NOT NULL
      WITH p
      MERGE (d:destination {name: p.destination_name})
      SET
        // If we don't know the kind (legacy data), treat it as city by default.
        d.kind = coalesce(d.kind, 'city'),
        d.canonical_id = coalesce(
          d.canonical_id,
          toLower(replace(replace(trim(toString(p.destination_name)), " ", "-"), ".", ""))
        ),
        d.updated_at = datetime()
      MERGE (p)-[:LOCATED_IN]->(d)
      RETURN count(p) as created
    `);
    stats.byType.LOCATED_IN = locatedInResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ LOCATED_IN: ${stats.byType.LOCATED_IN} created`);

    // 2. IN_AREA: Destination → Area (based on geographic hierarchy)
    const inAreaResult = await session.run(`
      MATCH (d:destination)
      WHERE NOT (d)-[:IN_AREA]->()
        AND d.area_name IS NOT NULL
      WITH d
      MATCH (a:area {name: d.area_name})
      MERGE (d)-[:IN_AREA]->(a)
      RETURN count(d) as created
    `);
    const inAreaCount = inAreaResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ IN_AREA: ${inAreaCount} created`);

    // 3. IN_REGION: Area → Region (based on geographic hierarchy)
    const inRegionResult = await session.run(`
      MATCH (a:area)
      WHERE NOT (a)-[:IN_REGION]->()
        AND a.region_name IS NOT NULL
      WITH a
      MATCH (r:region {name: a.region_name})
      MERGE (a)-[:IN_REGION]->(r)
      RETURN count(a) as created
    `);
    const inRegionCount = inRegionResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ IN_REGION: ${inRegionCount} created`);

    // 4. IN_CONTINENT: Region → Continent (based on geographic hierarchy)
    const inContinentResult = await session.run(`
      MATCH (r:region)
      WHERE NOT (r)-[:IN_CONTINENT]->()
        AND r.continent_name IS NOT NULL
      WITH r
      MATCH (c:continent {name: r.continent_name})
      MERGE (r)-[:IN_CONTINENT]->(c)
      RETURN count(r) as created
    `);
    const inContinentCount = inContinentResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ IN_CONTINENT: ${inContinentCount} created`);

    // 5. SUPPORTS_ACTIVITY: Already created during import, but check for orphans
    const supportsActivityResult = await session.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:SUPPORTS_ACTIVITY]->()
        AND p.type IS NOT NULL
      WITH p
      MATCH (at:activity_type)
      WHERE toLower(at.name) = toLower(p.type)
      MERGE (p)-[:SUPPORTS_ACTIVITY {confidence: 0.7, evidence: 'type_inference'}]->(at)
      RETURN count(p) as created
    `);
    stats.byType.SUPPORTS_ACTIVITY = supportsActivityResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ SUPPORTS_ACTIVITY: ${stats.byType.SUPPORTS_ACTIVITY} created`);

    // 6. HAS_THEME: Already created during import, but check for orphans
    const hasThemeResult = await session.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:HAS_THEME]->()
        AND p.luxury_score > 70
      WITH p
      MATCH (tc:theme_category)
      WHERE tc.name IN ['Luxury', 'Premium Experience']
      MERGE (p)-[:HAS_THEME {confidence: 0.6, evidence: 'luxury_score_inference'}]->(tc)
      RETURN count(p) as created
    `);
    stats.byType.HAS_THEME = hasThemeResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ HAS_THEME: ${stats.byType.HAS_THEME} created`);

    // 7. PROMINENT_IN: POI → Destination (for high luxury score POIs)
    const prominentInResult = await session.run(`
      MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
      WHERE NOT (p)-[:PROMINENT_IN]->(d)
        AND p.luxury_score >= 85
      MERGE (p)-[:PROMINENT_IN {confidence: 0.8, reason: 'high_luxury_score'}]->(d)
      RETURN count(p) as created
    `);
    const prominentInCount = prominentInResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ PROMINENT_IN: ${prominentInCount} created`);

    // 8. BELONGS_TO: POI → Experience Category (based on type/amenity)
    const belongsToResult = await session.run(`
      MATCH (p:poi)
      WHERE NOT (p)-[:BELONGS_TO]->(:experience_category)
        AND p.type IS NOT NULL
      WITH p
      MATCH (ec:experience_category)
      WHERE toLower(ec.name) CONTAINS toLower(p.type)
      MERGE (p)-[:BELONGS_TO]->(ec)
      RETURN count(p) as created
    `);
    const belongsToCount = belongsToResult.records[0]?.get('created')?.toNumber() || 0;
    console.log(`    ✓ BELONGS_TO: ${belongsToCount} created`);

    stats.created =
      stats.byType.LOCATED_IN +
      inAreaCount +
      inRegionCount +
      inContinentCount +
      stats.byType.SUPPORTS_ACTIVITY +
      stats.byType.HAS_THEME +
      prominentInCount +
      belongsToCount;

    console.log(`  Total relationships created: ${stats.created}`);

    return stats;
  } finally {
    await session.close();
  }
}

// ============================================================================
// Step 4: Verify Scoring
// ============================================================================

export async function verifyScoring(): Promise<ScoringStats> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  const stats: ScoringStats = {
    checked: 0,
    added: 0,
    updated: 0,
    byField: {
      luxury_score: 0,
      confidence: 0,
      evidence: 0,
    },
  };

  try {
    // Count POIs without luxury_score
    const countResult = await session.run(`
      MATCH (p:poi)
      WHERE p.luxury_score IS NULL
      RETURN count(p) as missing
    `);
    const missing = countResult.records[0]?.get('missing')?.toNumber() || 0;
    stats.checked = missing;

    console.log(`  Found ${missing} POIs without luxury_score`);

    if (missing > 0) {
      console.log(`  Calculating luxury scores...`);
      
      // Score unscored POIs (limit to 100 per run to avoid timeouts)
      const scoringResult = await scoreAllUnscored();
      
      stats.byField.luxury_score = scoringResult.scored;
      stats.added = scoringResult.scored;
      
      console.log(`  ✓ Added luxury scores to ${scoringResult.scored} POIs`);
      console.log(`  ✓ Average luxury score: ${scoringResult.avgScore}`);
      
      if (scoringResult.failed > 0) {
        console.log(`  ⚠ Failed to score ${scoringResult.failed} POIs`);
      }
    }

    // Check for relationships without confidence scores (limited batch to avoid timeout)
    const relConfidenceResult = await session.run(`
      MATCH ()-[r]->()
      WHERE r.confidence IS NULL
        AND type(r) IN [
          'EVOKES', 'AMPLIFIES_DESIRE', 'MITIGATES_FEAR', 'RELATES_TO',
          'SUPPORTS_ACTIVITY', 'HAS_THEME', 'FEATURED_IN'
        ]
      WITH r LIMIT 1000
      SET r.confidence = 0.7, r.evidence = 'legacy_data'
      RETURN count(r) as updated
    `);
    
    const relConfidenceUpdated = relConfidenceResult.records[0]?.get('updated')?.toNumber() || 0;
    stats.byField.confidence = relConfidenceUpdated;
    
    if (relConfidenceUpdated > 0) {
      console.log(`  ✓ Added default confidence to ${relConfidenceUpdated} relationships`);
    }

    stats.updated = stats.byField.confidence;

    return stats;
  } finally {
    await session.close();
  }
}

// ============================================================================
// Step 5: Enrich POI Data
// ============================================================================

export async function enrichPOIData(): Promise<EnrichmentStats> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  const stats: EnrichmentStats = {
    queued: 0,
    enriched: 0,
    failed: 0,
    cached: 0,
    bySource: {
      google: 0,
      wikipedia: 0,
      osm: 0,
    },
    fieldsAdded: {
      description: 0,
      rating: 0,
      photos: 0,
      website: 0,
      hours: 0,
    },
    apiCost: 0,
  };

  try {
    // Get POIs that need enrichment (limit to 50 per run for budget control)
    const result = await session.run(`
      MATCH (p:poi)
      WHERE p.enriched_at IS NULL OR 
            datetime(p.enriched_at) < datetime() - duration('P30D')
      RETURN p.name as name, 
             p.lat as lat, 
             p.lon as lon,
             p.luxury_score as luxury_score,
             p.description as description,
             p.website as website,
             p.rating as rating,
             id(p) as id
      ORDER BY p.luxury_score DESC
      LIMIT 50
    `);

    stats.queued = result.records.length;
    console.log(`  Found ${stats.queued} POIs to enrich`);

    // Note: Actual enrichment is commented out to avoid API costs during development
    // Uncomment when ready to use in production
    
    /*
    for (const record of result.records) {
      try {
        const poi = {
          name: record.get('name'),
          lat: record.get('lat'),
          lon: record.get('lon'),
          id: record.get('id').toString(),
        };

        // Enrich from Google Places
        const googleData = await enrichFromGoogle(poi);
        if (googleData) stats.bySource.google++;

        // Enrich from Wikipedia
        const wikiData = await enrichFromWikipedia(poi);
        if (wikiData) stats.bySource.wikipedia++;

        // Merge and save to database
        // ... (implementation details)

        stats.enriched++;
      } catch (error) {
        stats.failed++;
        console.error(`  Error enriching POI:`, error);
      }
    }
    */

    console.log(`  Enrichment module ready (disabled for now to avoid API costs)`);
    console.log(`  ${stats.queued} POIs queued for enrichment when enabled`);

    return stats;
  } finally {
    await session.close();
  }
}

// ============================================================================
// Status Functions
// ============================================================================

export function isAgentRunning(): boolean {
  return isRunning;
}

export function getLastRunResults(): QualityCheckResults | null {
  return lastRunResults;
}

