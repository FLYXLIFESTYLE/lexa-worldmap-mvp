/**
 * Knowledge Ingestor
 * 
 * Ingests extracted knowledge into Neo4j database
 */

import { getNeo4jDriver } from '@/lib/neo4j';
import { calculateLuxuryScore } from '@/lib/neo4j/scoring-engine';
import type { ExtractedKnowledge, ExtractedPOI, ExtractedRelationship, ExtractedWisdom } from './ai-processor';

export interface IngestionStats {
  poisCreated: number;
  poisUpdated: number;
  relationshipsCreated: number;
  wisdomCreated: number;
  errors: string[];
}

/**
 * Ingest extracted knowledge into Neo4j
 */
export async function ingestKnowledge(
  knowledge: ExtractedKnowledge,
  sourceMetadata: {
    source: string; // 'chatgpt_conversation' | 'manual' | 'web' | 'document'
    sourceId: string;
    sourceTitle?: string;
    sourceDate?: Date;
    author?: string;
    // New attribution fields
    contributedBy?: string;
    contributorName?: string;
    contributionType?: string;
    sourceUrl?: string;
    coordinates?: { lat: number; lon: number };
    photoUrls?: string[];
    uniqueRequests?: string;
    neverThoughtPossible?: string;
    bestPractices?: {
      toys?: string;
      activities?: string;
      concierge?: string;
      agents?: string;
    };
  }
): Promise<IngestionStats> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  
  const stats: IngestionStats = {
    poisCreated: 0,
    poisUpdated: 0,
    relationshipsCreated: 0,
    wisdomCreated: 0,
    errors: [],
  };

  try {
    // 1. Ingest POIs
    for (const poi of knowledge.pois) {
      try {
        await ingestPOI(session, poi, sourceMetadata, stats);
      } catch (error) {
        stats.errors.push(`POI ${poi.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Ingest Relationships
    for (const rel of knowledge.relationships) {
      try {
        await ingestRelationship(session, rel, sourceMetadata, stats);
      } catch (error) {
        stats.errors.push(`Relationship ${rel.from} → ${rel.to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. Ingest Wisdom
    for (const wisdom of knowledge.wisdom) {
      try {
        await ingestWisdom(session, wisdom, sourceMetadata, stats);
      } catch (error) {
        stats.errors.push(`Wisdom ${wisdom.topic}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return stats;
  } finally {
    await session.close();
  }
}

/**
 * Ingest a single POI
 */
async function ingestPOI(
  session: any,
  poi: ExtractedPOI,
  sourceMetadata: any,
  stats: IngestionStats
): Promise<void> {
  // Calculate luxury score
  const scoring = await calculateLuxuryScore({
    name: poi.name,
    type: poi.type,
    description: poi.description,
    keywords: poi.luxuryIndicators,
  });

  // Create or update POI
  const result = await session.run(`
    MERGE (p:poi {name: $name})
    ON CREATE SET
      p.poi_uid = randomUUID(),
      p.type = $type,
      p.description = $description,
      p.luxury_score_base = $luxury_score_base,
      p.confidence_score = $confidence_score,
      p.score_evidence = $score_evidence,
      p.source = $source,
      p.source_id = $source_id,
      p.source_title = $source_title,
      p.source_date = $source_date,
      p.extraction_confidence = $extraction_confidence,
      p.created_at = datetime(),
      p.updated_at = datetime()
    ON MATCH SET
      p.description = CASE 
        WHEN p.description IS NULL THEN $description 
        ELSE p.description 
      END,
      p.luxury_score_base = CASE
        WHEN $luxury_score_base > coalesce(p.luxury_score_base, p.luxury_score, p.luxuryScore, 0) THEN $luxury_score_base
        ELSE p.luxury_score_base
      END,
      p.updated_at = datetime()
    RETURN p, 
           CASE WHEN p.created_at = p.updated_at THEN 'created' ELSE 'updated' END as action
  `, {
    name: poi.name,
    type: poi.type,
    description: poi.description || null,
    luxury_score_base: scoring.luxury_score,
    confidence_score: scoring.confidence,
    score_evidence: JSON.stringify({
      source: sourceMetadata.source,
      rules: scoring.evidence,
      inputs: {
        keywords: poi.luxuryIndicators || [],
      },
    }),
    source: sourceMetadata.source,
    source_id: sourceMetadata.sourceId,
    source_title: sourceMetadata.sourceTitle || null,
    source_date: sourceMetadata.sourceDate || null,
    extraction_confidence: poi.confidence,
  });

  const action = result.records[0]?.get('action');
  if (action === 'created') {
    stats.poisCreated++;
  } else {
    stats.poisUpdated++;
  }

  // Link to destination if specified
  if (poi.destination) {
    await session.run(`
      MATCH (p:poi {name: $poiName})
      MERGE (d:destination {name: $destination})
      MERGE (p)-[:LOCATED_IN {
        confidence: 0.9,
        source: $source,
        created_at: datetime()
      }]->(d)
    `, {
      poiName: poi.name,
      destination: poi.destination,
      source: sourceMetadata.source,
    });
  }
}

/**
 * Ingest a relationship
 */
async function ingestRelationship(
  session: any,
  rel: ExtractedRelationship,
  sourceMetadata: any,
  stats: IngestionStats
): Promise<void> {
  // Build Cypher query dynamically based on node types
  const fromLabel = rel.fromType === 'poi' ? 'poi' : 'destination';
  const toLabel = 
    rel.toType === 'destination' ? 'destination' :
    rel.toType === 'theme' ? 'theme_category' :
    rel.toType === 'activity' ? 'activity_type' :
    rel.toType === 'emotion' ? 'Emotion' :
    rel.toType === 'desire' ? 'Desire' :
    rel.toType === 'season' ? 'season' :
    'Entity'; // Fallback

  const query = `
    MATCH (from:${fromLabel} {name: $fromName})
    MERGE (to:${toLabel} {name: $toName})
    MERGE (from)-[r:${rel.relationType}]->(to)
    ON CREATE SET
      r.confidence = $confidence,
      r.evidence = $evidence,
      r.source = $source,
      r.source_id = $source_id,
      r.created_at = datetime(),
      r.inferred_by = 'ai'
    ON MATCH SET
      r.confidence = CASE
        WHEN $confidence > r.confidence THEN $confidence
        ELSE r.confidence
      END,
      r.updated_at = datetime()
    RETURN r
  `;

  await session.run(query, {
    fromName: rel.from,
    toName: rel.to,
    confidence: rel.confidence,
    evidence: rel.evidence,
    source: sourceMetadata.source,
    source_id: sourceMetadata.sourceId,
  });

  stats.relationshipsCreated++;
}

/**
 * Ingest travel wisdom as a Knowledge node
 */
async function ingestWisdom(
  session: any,
  wisdom: ExtractedWisdom,
  sourceMetadata: any,
  stats: IngestionStats
): Promise<void> {
  // Create Knowledge node
  const result = await session.run(`
    CREATE (k:Knowledge {
      knowledge_id: randomUUID(),
      content: $content,
      topic: $topic,
      confidence: $confidence,
      tags: $tags,
      
      source: $source,
      source_id: $source_id,
      source_title: $source_title,
      source_date: $source_date,
      author: $author,
      
      created_at: datetime(),
      verified: false,
      upvotes: 0,
      downvotes: 0
    })
    RETURN k
  `, {
    content: wisdom.content,
    topic: wisdom.topic,
    confidence: wisdom.confidence,
    tags: wisdom.tags,
    source: sourceMetadata.source,
    source_id: sourceMetadata.sourceId,
    source_title: sourceMetadata.sourceTitle || null,
    source_date: sourceMetadata.sourceDate || null,
    author: sourceMetadata.author || 'ai_extracted',
  });

  const knowledgeId = result.records[0].get('k').properties.knowledge_id;

  // Link to destinations/POIs
  for (const target of wisdom.appliesTo) {
    // Try to link as destination first
    await session.run(`
      MATCH (k:Knowledge {knowledge_id: $knowledgeId})
      OPTIONAL MATCH (d:destination {name: $target})
      OPTIONAL MATCH (p:poi {name: $target})
      FOREACH (_ IN CASE WHEN d IS NOT NULL THEN [1] ELSE [] END |
        MERGE (k)-[:APPLIES_TO]->(d)
      )
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (k)-[:RELATES_TO]->(p)
      )
    `, {
      knowledgeId,
      target,
    });
  }

  stats.wisdomCreated++;
}

/**
 * Batch ingest multiple knowledge extractions
 */
export async function batchIngestKnowledge(
  knowledgeArray: Array<{
    knowledge: ExtractedKnowledge;
    sourceMetadata: Parameters<typeof ingestKnowledge>[1];
  }>,
  onProgress?: (processed: number, total: number) => void
): Promise<{
  totalStats: IngestionStats;
  individualStats: IngestionStats[];
}> {
  const totalStats: IngestionStats = {
    poisCreated: 0,
    poisUpdated: 0,
    relationshipsCreated: 0,
    wisdomCreated: 0,
    errors: [],
  };
  const individualStats: IngestionStats[] = [];

  for (let i = 0; i < knowledgeArray.length; i++) {
    const { knowledge, sourceMetadata } = knowledgeArray[i];
    
    const stats = await ingestKnowledge(knowledge, sourceMetadata);
    individualStats.push(stats);
    
    // Aggregate stats
    totalStats.poisCreated += stats.poisCreated;
    totalStats.poisUpdated += stats.poisUpdated;
    totalStats.relationshipsCreated += stats.relationshipsCreated;
    totalStats.wisdomCreated += stats.wisdomCreated;
    totalStats.errors.push(...stats.errors);
    
    if (onProgress) {
      onProgress(i + 1, knowledgeArray.length);
    }
  }

  return { totalStats, individualStats };
}

export default {
  ingestKnowledge,
  batchIngestKnowledge,
};

