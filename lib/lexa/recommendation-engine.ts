/**
 * LEXA Recommendation Engine
 * 
 * Uses luxury scores and confidence scores to provide intelligent,
 * personalized travel recommendations.
 */

import { getNeo4jDriver } from '@/lib/neo4j';

export interface RecommendationFilters {
  // Luxury filtering
  minLuxuryScore?: number;
  maxLuxuryScore?: number;
  luxuryCategories?: ('ultra' | 'high' | 'upscale' | 'mid' | 'standard')[];
  
  // Confidence filtering
  minConfidence?: number;
  
  // Location filtering
  destinations?: string[];
  regions?: string[];
  countries?: string[];
  
  // Theme/Activity filtering
  themes?: string[];
  activities?: string[];
  
  // Emotional filtering (user preferences)
  desiredEmotions?: string[];
  desiresToAmplify?: string[];
  fearsToMitigate?: string[];
  
  // Other filters
  excludeVisited?: boolean; // For logged-in users
  limit?: number;
}

export interface RecommendedPOI {
  id: string;
  name: string;
  type: string;
  luxury_score: number;
  description?: string;
  destination?: string;
  
  // Match scores
  relevanceScore: number; // 0-100: how well it matches user preferences
  confidenceScore: number; // 0.0-1.0: certainty of the match
  
  // Relationship matches
  emotions: Array<{ name: string; confidence: number }>;
  themes: Array<{ name: string; confidence: number }>;
  activities: Array<{ name: string; confidence: number }>;
  
  // Why this was recommended
  reasonsForRecommendation: string[];
}

/**
 * Get personalized POI recommendations based on filters and user preferences
 */
export async function getRecommendations(
  filters: RecommendationFilters,
  userId?: string
): Promise<RecommendedPOI[]> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Build Cypher query dynamically
    let query = `MATCH (p:poi)\n`;
    const params: Record<string, any> = {};
    const whereConditions: string[] = [];
    const scoreFactors: string[] = [];

    // Luxury score filtering
    if (filters.minLuxuryScore !== undefined) {
      whereConditions.push(`p.luxury_score >= $minLuxuryScore`);
      params.minLuxuryScore = filters.minLuxuryScore;
      scoreFactors.push(`(p.luxury_score / 100.0) * 30`); // 30% weight
    }

    if (filters.maxLuxuryScore !== undefined) {
      whereConditions.push(`p.luxury_score <= $maxLuxuryScore`);
      params.maxLuxuryScore = filters.maxLuxuryScore;
    }

    // Luxury category filtering
    if (filters.luxuryCategories && filters.luxuryCategories.length > 0) {
      const categoryConditions: string[] = [];
      if (filters.luxuryCategories.includes('ultra')) {
        categoryConditions.push(`p.luxury_score >= 90`);
      }
      if (filters.luxuryCategories.includes('high')) {
        categoryConditions.push(`(p.luxury_score >= 80 AND p.luxury_score < 90)`);
      }
      if (filters.luxuryCategories.includes('upscale')) {
        categoryConditions.push(`(p.luxury_score >= 70 AND p.luxury_score < 80)`);
      }
      if (filters.luxuryCategories.includes('mid')) {
        categoryConditions.push(`(p.luxury_score >= 50 AND p.luxury_score < 70)`);
      }
      if (filters.luxuryCategories.includes('standard')) {
        categoryConditions.push(`p.luxury_score < 50`);
      }
      whereConditions.push(`(${categoryConditions.join(' OR ')})`);
    }

    // Location filtering
    if (filters.destinations && filters.destinations.length > 0) {
      query += `MATCH (p)-[:LOCATED_IN]->(d:destination)\n`;
      whereConditions.push(`d.name IN $destinations`);
      params.destinations = filters.destinations;
      scoreFactors.push(`20`); // 20 points for destination match
    }

    // Theme filtering with confidence
    if (filters.themes && filters.themes.length > 0) {
      query += `OPTIONAL MATCH (p)-[theme_rel:HAS_THEME]->(t:theme_category)\n`;
      whereConditions.push(`t.name IN $themes`);
      params.themes = filters.themes;
      params.minConfidence = filters.minConfidence || 0.7;
      whereConditions.push(`theme_rel.confidence >= $minConfidence`);
      scoreFactors.push(`count(DISTINCT t) * 15`); // 15 points per theme match
    }

    // Activity filtering with confidence
    if (filters.activities && filters.activities.length > 0) {
      query += `OPTIONAL MATCH (p)-[activity_rel:SUPPORTS_ACTIVITY]->(a:activity_type)\n`;
      whereConditions.push(`a.name IN $activities`);
      params.activities = filters.activities;
      if (!params.minConfidence) {
        params.minConfidence = filters.minConfidence || 0.7;
        whereConditions.push(`activity_rel.confidence >= $minConfidence`);
      }
      scoreFactors.push(`count(DISTINCT a) * 15`); // 15 points per activity match
    }

    // Emotional preference filtering
    if (filters.desiredEmotions && filters.desiredEmotions.length > 0) {
      query += `OPTIONAL MATCH (p)-[emotion_rel:EVOKES]->(e:Emotion)\n`;
      whereConditions.push(`e.name IN $desiredEmotions`);
      params.desiredEmotions = filters.desiredEmotions;
      if (!params.minConfidence) {
        params.minConfidence = filters.minConfidence || 0.7;
      }
      whereConditions.push(`emotion_rel.confidence >= $minConfidence`);
      scoreFactors.push(`count(DISTINCT e) * 20`); // 20 points per emotion match (high value)
    }

    // Add WHERE clause
    if (whereConditions.length > 0) {
      query += `WHERE ${whereConditions.join(' AND ')}\n`;
    }

    // Calculate relevance score
    const scoreCalculation = scoreFactors.length > 0 
      ? scoreFactors.join(' + ') 
      : '50'; // Default base score

    query += `
      // Get all relationships for context
      OPTIONAL MATCH (p)-[e_rel:EVOKES]->(emotion:Emotion)
      OPTIONAL MATCH (p)-[t_rel:HAS_THEME]->(theme:theme_category)
      OPTIONAL MATCH (p)-[a_rel:SUPPORTS_ACTIVITY]->(activity:activity_type)
      OPTIONAL MATCH (p)-[:LOCATED_IN]->(dest:destination)
      
      WITH p, dest,
        collect(DISTINCT {name: emotion.name, confidence: e_rel.confidence}) as emotions,
        collect(DISTINCT {name: theme.name, confidence: t_rel.confidence}) as themes,
        collect(DISTINCT {name: activity.name, confidence: a_rel.confidence}) as activities,
        (${scoreCalculation}) as relevanceScore,
        avg(coalesce(e_rel.confidence, t_rel.confidence, a_rel.confidence, 0.8)) as avgConfidence
      
      WHERE relevanceScore > 0
      
      RETURN 
        id(p) as id,
        p.name as name,
        p.type as type,
        p.luxury_score as luxury_score,
        p.description as description,
        dest.name as destination,
        toInteger(CASE 
          WHEN relevanceScore > 100 THEN 100 
          ELSE relevanceScore 
        END) as relevanceScore,
        avgConfidence as confidenceScore,
        emotions,
        themes,
        activities
      
      ORDER BY relevanceScore DESC, luxury_score DESC
      LIMIT $limit
    `;

    params.limit = filters.limit || 10;

    // Execute query
    const result = await session.run(query, params);

    // Format results
    const recommendations: RecommendedPOI[] = result.records.map(record => {
      const emotions = record.get('emotions').filter((e: any) => e.name);
      const themes = record.get('themes').filter((t: any) => t.name);
      const activities = record.get('activities').filter((a: any) => a.name);
      
      // Generate reasons for recommendation
      const reasons: string[] = [];
      
      if (filters.minLuxuryScore && record.get('luxury_score') >= filters.minLuxuryScore) {
        const luxuryLevel = 
          record.get('luxury_score') >= 90 ? 'ultra-luxury' :
          record.get('luxury_score') >= 80 ? 'high luxury' :
          record.get('luxury_score') >= 70 ? 'upscale' : 'premium';
        reasons.push(`Meets your ${luxuryLevel} preference (score: ${record.get('luxury_score')})`);
      }
      
      if (filters.desiredEmotions && emotions.length > 0) {
        const matchedEmotions = emotions
          .filter((e: any) => filters.desiredEmotions?.includes(e.name))
          .map((e: any) => e.name);
        if (matchedEmotions.length > 0) {
          reasons.push(`Evokes ${matchedEmotions.join(', ')} feelings`);
        }
      }
      
      if (filters.themes && themes.length > 0) {
        const matchedThemes = themes
          .filter((t: any) => filters.themes?.includes(t.name))
          .map((t: any) => t.name);
        if (matchedThemes.length > 0) {
          reasons.push(`Matches ${matchedThemes.join(', ')} themes`);
        }
      }
      
      if (filters.activities && activities.length > 0) {
        const matchedActivities = activities
          .filter((a: any) => filters.activities?.includes(a.name))
          .map((a: any) => a.name);
        if (matchedActivities.length > 0) {
          reasons.push(`Supports ${matchedActivities.join(', ')} activities`);
        }
      }

      return {
        id: record.get('id').toString(),
        name: record.get('name'),
        type: record.get('type'),
        luxury_score: record.get('luxury_score'),
        description: record.get('description'),
        destination: record.get('destination'),
        relevanceScore: record.get('relevanceScore'),
        confidenceScore: parseFloat(record.get('confidenceScore').toFixed(2)),
        emotions,
        themes,
        activities,
        reasonsForRecommendation: reasons.length > 0 ? reasons : ['High quality match for your preferences'],
      };
    });

    return recommendations;
  } finally {
    await session.close();
  }
}

/**
 * Get recommendations for a specific user based on their conversation history
 */
export async function getPersonalizedRecommendations(
  userId: string,
  conversationContext?: {
    selectedDestinations?: string[];
    selectedThemes?: string[];
    mentionedActivities?: string[];
    expressedEmotions?: string[];
  }
): Promise<RecommendedPOI[]> {
  // Infer preferences from conversation context
  const filters: RecommendationFilters = {
    minLuxuryScore: 70, // Default to upscale+
    minConfidence: 0.75, // Only high-confidence matches
    limit: 15,
  };

  if (conversationContext?.selectedDestinations) {
    filters.destinations = conversationContext.selectedDestinations;
  }

  if (conversationContext?.selectedThemes) {
    filters.themes = conversationContext.selectedThemes;
  }

  if (conversationContext?.mentionedActivities) {
    filters.activities = conversationContext.mentionedActivities;
  }

  if (conversationContext?.expressedEmotions) {
    filters.desiredEmotions = conversationContext.expressedEmotions;
  }

  return getRecommendations(filters, userId);
}

/**
 * Quick filter presets for common use cases
 */
export const RecommendationPresets = {
  ultraLuxury: (): RecommendationFilters => ({
    minLuxuryScore: 90,
    minConfidence: 0.85,
    limit: 10,
  }),
  
  romanticGetaway: (): RecommendationFilters => ({
    minLuxuryScore: 75,
    themes: ['Romance', 'Romantic Getaway', 'Couples'],
    desiredEmotions: ['Romance', 'Intimacy', 'Peace'],
    minConfidence: 0.8,
    limit: 12,
  }),
  
  adventureSeeker: (): RecommendationFilters => ({
    minLuxuryScore: 60,
    themes: ['Adventure', 'Outdoor', 'Sports'],
    desiredEmotions: ['Excitement', 'Adventure', 'Discovery'],
    activities: ['Hiking', 'Sailing', 'Water Sports'],
    minConfidence: 0.75,
    limit: 15,
  }),
  
  culturalExplorer: (): RecommendationFilters => ({
    minLuxuryScore: 65,
    themes: ['Culture', 'History', 'Art'],
    activities: ['Museums', 'Cultural Sites', 'Art Galleries'],
    minConfidence: 0.75,
    limit: 15,
  }),
  
  culinaryJourney: (): RecommendationFilters => ({
    minLuxuryScore: 80,
    themes: ['Culinary', 'Fine Dining', 'Wine & Dine'],
    activities: ['Fine Dining', 'Wine Tasting'],
    minConfidence: 0.8,
    limit: 10,
  }),
};

export default {
  getRecommendations,
  getPersonalizedRecommendations,
  RecommendationPresets,
};

