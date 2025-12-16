/**
 * Luxury & Confidence Scoring Engine
 * 
 * This module handles two types of scoring:
 * 1. Luxury Score (0-100): How luxurious a POI is
 * 2. Confidence Score (0.0-1.0): How certain we are about relationships
 */

import { getNeo4jDriver } from './client';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================================================
// LUXURY SCORE (POI Node Property)
// ============================================================================

/**
 * Calculate luxury score for a POI based on multiple factors
 * 
 * Scoring Criteria:
 * - Base score from POI type (5-point scale)
 * - Price indicators (+10-30 points)
 * - Ratings & reviews (+0-20 points)
 * - Amenities & features (+0-25 points)
 * - Exclusivity indicators (+0-20 points)
 * - Location prestige (+0-15 points)
 */
export async function calculateLuxuryScore(poiData: {
  type?: string;
  name?: string;
  price_level?: number;
  rating?: number;
  review_count?: number;
  amenities?: string[];
  description?: string;
  keywords?: string[];
  michelin_stars?: number;
  forbes_stars?: number;
  destination_luxury_score?: number;
}): Promise<{
  luxury_score: number;
  confidence: number;
  evidence: string[];
}> {
  let score = 0;
  const evidence: string[] = [];
  let confidence = 0.5; // Base confidence

  // 1. BASE SCORE FROM TYPE (0-40 points)
  const typeScores: Record<string, number> = {
    // Premium (40 points)
    'michelin_restaurant': 40,
    'five_star_hotel': 40,
    'luxury_resort': 40,
    'private_villa': 40,
    'yacht_club': 40,
    'private_jet_terminal': 40,
    'exclusive_spa': 40,
    
    // High-end (30 points)
    'fine_dining': 30,
    'boutique_hotel': 30,
    'golf_club': 30,
    'marina': 30,
    'luxury_shopping': 30,
    'wine_estate': 30,
    'casino': 30,
    
    // Upscale (20 points)
    'restaurant': 20,
    'hotel': 20,
    'spa': 20,
    'beach_club': 20,
    'museum': 20,
    'theater': 20,
    'art_gallery': 20,
    
    // Standard (10 points)
    'cafe': 10,
    'bar': 10,
    'beach': 10,
    'park': 10,
    'viewpoint': 10,
    
    // Basic (5 points)
    'attraction': 5,
    'shop': 5,
    'market': 5,
  };

  const normalizedType = poiData.type?.toLowerCase().replace(/\s+/g, '_') || '';
  const baseScore = typeScores[normalizedType] || 10; // Default 10 if type unknown
  score += baseScore;
  evidence.push(`Base type '${poiData.type}': ${baseScore} pts`);
  confidence += 0.2;

  // 2. PRICE LEVEL (0-30 points)
  if (poiData.price_level) {
    const priceScore = poiData.price_level * 6; // $$$$ = 24 points
    score += priceScore;
    evidence.push(`Price level ${poiData.price_level}/5: ${priceScore} pts`);
    confidence += 0.15;
  }

  // 3. RATINGS & REVIEWS (0-20 points)
  if (poiData.rating && poiData.rating >= 4.5) {
    const ratingScore = Math.min(20, (poiData.rating - 4.5) * 40);
    score += ratingScore;
    evidence.push(`High rating ${poiData.rating}: ${Math.round(ratingScore)} pts`);
    confidence += 0.1;
  }

  if (poiData.review_count && poiData.review_count > 100) {
    const reviewBonus = Math.min(10, Math.log10(poiData.review_count) * 3);
    score += reviewBonus;
    evidence.push(`Review validation: ${Math.round(reviewBonus)} pts`);
    confidence += 0.1;
  }

  // 4. LUXURY INDICATORS (0-25 points)
  const luxuryKeywords = [
    'michelin', 'starred', 'exclusive', 'private', 'luxury', 'premium',
    'five-star', '5-star', 'boutique', 'haute', 'gourmet', 'fine dining',
    'concierge', 'butler', 'suite', 'penthouse', 'villa', 'yacht',
    'champagne', 'caviar', 'truffle', 'vintage', 'bespoke', 'artisan'
  ];

  const description = (poiData.description || '').toLowerCase();
  const name = (poiData.name || '').toLowerCase();
  const keywordMatches = luxuryKeywords.filter(keyword => 
    description.includes(keyword) || name.includes(keyword)
  );

  if (keywordMatches.length > 0) {
    const keywordScore = Math.min(25, keywordMatches.length * 5);
    score += keywordScore;
    evidence.push(`Luxury keywords (${keywordMatches.length}): ${keywordScore} pts`);
    confidence += 0.15;
  }

  // 5. PRESTIGE AWARDS (0-30 points)
  if (poiData.michelin_stars) {
    const michelinScore = poiData.michelin_stars * 15; // 1 star = 15, 3 stars = 45
    score += michelinScore;
    evidence.push(`${poiData.michelin_stars} Michelin star(s): ${michelinScore} pts`);
    confidence += 0.25;
  }

  if (poiData.forbes_stars) {
    const forbesScore = poiData.forbes_stars * 10;
    score += forbesScore;
    evidence.push(`${poiData.forbes_stars} Forbes star(s): ${forbesScore} pts`);
    confidence += 0.2;
  }

  // 6. AMENITIES (0-15 points)
  const luxuryAmenities = [
    'spa', 'pool', 'concierge', 'valet', 'butler', 'helipad',
    'private beach', 'wine cellar', 'infinity pool', 'rooftop',
    'michelin restaurant', 'private chef', 'yacht', 'golf course'
  ];

  if (poiData.amenities && poiData.amenities.length > 0) {
    const amenityMatches = poiData.amenities.filter(amenity =>
      luxuryAmenities.some(luxury => amenity.toLowerCase().includes(luxury))
    );
    const amenityScore = Math.min(15, amenityMatches.length * 3);
    score += amenityScore;
    evidence.push(`Luxury amenities (${amenityMatches.length}): ${amenityScore} pts`);
    confidence += 0.1;
  }

  // 7. DESTINATION PRESTIGE (0-10 points)
  if (poiData.destination_luxury_score && poiData.destination_luxury_score >= 70) {
    const destScore = 10;
    score += destScore;
    evidence.push(`Prestigious destination: ${destScore} pts`);
    confidence += 0.05;
  }

  // Normalize score to 0-100
  score = Math.min(100, Math.max(0, score));
  
  // Normalize confidence to 0-1
  confidence = Math.min(1.0, Math.max(0.3, confidence));

  return {
    luxury_score: Math.round(score),
    confidence: parseFloat(confidence.toFixed(2)),
    evidence,
  };
}

/**
 * AI-powered luxury scoring using Claude
 * For complex cases where rule-based scoring is insufficient
 */
export async function aiLuxuryScoring(poiData: {
  name: string;
  type?: string;
  description?: string;
  amenities?: string[];
  price_level?: number;
  rating?: number;
}): Promise<{
  luxury_score: number;
  confidence: number;
  reasoning: string;
}> {
  const prompt = `Analyze this Point of Interest and rate its luxury level from 0-100.

POI Details:
- Name: ${poiData.name}
- Type: ${poiData.type || 'Unknown'}
- Description: ${poiData.description || 'N/A'}
- Amenities: ${poiData.amenities?.join(', ') || 'N/A'}
- Price Level: ${poiData.price_level ? '$'.repeat(poiData.price_level) : 'N/A'}
- Rating: ${poiData.rating || 'N/A'}/5

Luxury Scoring Guide:
90-100: Ultra-luxury (Michelin 3-star, Forbes 5-star, exclusive private experiences)
80-89: High luxury (Michelin 1-2 star, Forbes 4-star, premium boutique)
70-79: Upscale luxury (Fine dining, 4-5 star hotels, exclusive venues)
60-69: Upper-midscale (Quality restaurants, good hotels, premium attractions)
50-59: Comfortable (Standard restaurants, 3-star hotels)
Below 50: Budget/Standard (Basic amenities)

Respond in JSON:
{
  "luxury_score": 85,
  "confidence": 0.9,
  "reasoning": "Brief explanation of score"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      luxury_score: Math.min(100, Math.max(0, result.luxury_score)),
      confidence: Math.min(1.0, Math.max(0.0, result.confidence)),
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.error('AI luxury scoring failed:', error);
    // Fallback to rule-based scoring
    const fallback = await calculateLuxuryScore(poiData);
    return {
      luxury_score: fallback.luxury_score,
      confidence: fallback.confidence,
      reasoning: fallback.evidence.join('; '),
    };
  }
}

// ============================================================================
// CONFIDENCE SCORE (Relationship Property)
// ============================================================================

/**
 * Calculate confidence score for a relationship
 * 
 * Factors:
 * - Source reliability (import=0.9, enrichment=0.8, AI=0.6-0.95)
 * - Explicitness (explicit statement=0.9, inferred=0.6-0.8)
 * - Agreement (multiple sources agree = higher confidence)
 * - Recency (newer data = slightly higher confidence)
 */
export function calculateRelationshipConfidence(params: {
  source: 'import' | 'enrichment' | 'ai_explicit' | 'ai_implicit';
  evidence: string;
  agreementCount?: number; // How many sources agree
  dataAge?: number; // Days since data was added
}): number {
  let confidence = 0.5; // Base

  // Source reliability
  const sourceScores = {
    import: 0.9,           // Human-curated data
    enrichment: 0.8,       // External API data
    ai_explicit: 0.85,     // User explicitly stated
    ai_implicit: 0.65,     // AI inferred from context
  };
  confidence = sourceScores[params.source];

  // Agreement boost
  if (params.agreementCount && params.agreementCount > 1) {
    const agreementBoost = Math.min(0.15, (params.agreementCount - 1) * 0.05);
    confidence += agreementBoost;
  }

  // Evidence quality
  const evidenceKeywords = ['explicitly', 'stated', 'confirmed', 'verified'];
  const hasStrongEvidence = evidenceKeywords.some(keyword =>
    params.evidence.toLowerCase().includes(keyword)
  );
  if (hasStrongEvidence) {
    confidence += 0.05;
  }

  // Recency penalty (very slight)
  if (params.dataAge && params.dataAge > 365) {
    confidence -= 0.05;
  }

  // Normalize to 0-1
  return Math.min(1.0, Math.max(0.3, parseFloat(confidence.toFixed(2))));
}

// ============================================================================
// Batch Scoring Functions
// ============================================================================

/**
 * Score all POIs without luxury_score in database
 */
export async function scoreAllUnscored(): Promise<{
  scored: number;
  failed: number;
  avgScore: number;
}> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  let scored = 0;
  let failed = 0;
  let totalScore = 0;

  try {
    // Get POIs without luxury_score
    const result = await session.run(`
      MATCH (p:poi)
      WHERE p.luxury_score IS NULL
      RETURN 
        id(p) as id,
        p.name as name,
        p.type as type,
        p.description as description,
        p.price_level as price_level,
        p.rating as rating,
        p.review_count as review_count,
        p.amenities as amenities,
        p.michelin_stars as michelin_stars,
        p.forbes_stars as forbes_stars
      LIMIT 1000
    `);

    console.log(`Found ${result.records.length} POIs to score...`);

    for (const record of result.records) {
      try {
        const poiId = record.get('id').toString();
        const poiData = {
          name: record.get('name'),
          type: record.get('type'),
          description: record.get('description'),
          price_level: record.get('price_level'),
          rating: record.get('rating'),
          review_count: record.get('review_count'),
          amenities: record.get('amenities'),
          michelin_stars: record.get('michelin_stars'),
          forbes_stars: record.get('forbes_stars'),
        };

        // Calculate luxury score
        const scoring = await calculateLuxuryScore(poiData);

        // Update POI in database
        await session.run(`
          MATCH (p:poi)
          WHERE id(p) = $id
          SET 
            p.luxury_score = $luxury_score,
            p.luxury_confidence = $confidence,
            p.luxury_evidence = $evidence,
            p.scored_at = datetime()
        `, {
          id: parseInt(poiId),
          luxury_score: scoring.luxury_score,
          confidence: scoring.confidence,
          evidence: scoring.evidence.join('; '),
        });

        scored++;
        totalScore += scoring.luxury_score;

        if (scored % 50 === 0) {
          console.log(`  Scored ${scored} POIs...`);
        }
      } catch (error) {
        failed++;
        console.error('  Error scoring POI:', error);
      }
    }

    const avgScore = scored > 0 ? Math.round(totalScore / scored) : 0;

    console.log(`✓ Scored ${scored} POIs (${failed} failed)`);
    console.log(`  Average luxury score: ${avgScore}`);

    return { scored, failed, avgScore };
  } finally {
    await session.close();
  }
}

/**
 * Update confidence scores for all relationships based on agreement
 */
export async function recalculateRelationshipConfidence(): Promise<number> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Find relationships where multiple sources created the same relationship
    const result = await session.run(`
      MATCH (p:poi)-[r]-(target)
      WHERE r.confidence IS NOT NULL
      WITH p, type(r) as relType, target, count(r) as agreementCount
      WHERE agreementCount > 1
      MATCH (p)-[r]-(target)
      WHERE type(r) = relType
      SET r.confidence = CASE
        WHEN agreementCount >= 3 THEN 0.95
        WHEN agreementCount = 2 THEN r.confidence + 0.1
        ELSE r.confidence
      END
      RETURN count(r) as updated
    `);

    const updated = result.records[0]?.get('updated')?.toNumber() || 0;
    console.log(`✓ Updated confidence for ${updated} relationships`);
    return updated;
  } finally {
    await session.close();
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  calculateLuxuryScore,
  aiLuxuryScoring,
  calculateRelationshipConfidence,
  scoreAllUnscored,
  recalculateRelationshipConfidence,
};

