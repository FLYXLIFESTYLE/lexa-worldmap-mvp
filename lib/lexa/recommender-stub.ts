/**
 * Recommender Stub - For MICRO_WOW stage
 * Returns hardcoded recommendations, structured for Neo4j integration
 */

import { Recommendation, SessionState } from './types';

export function getRecommendation(state: SessionState): Recommendation {
  const desired = state.emotions.desired[0] || 'peace';
  const avoid = state.emotions.avoid_fears[0] || 'crowds';
  
  // Hardcoded recommendations based on emotions
  // Will be replaced by Neo4j POI queries
  
  if (desired.toLowerCase().includes('peace') || desired.toLowerCase().includes('calm')) {
    return {
      type: 'experience',
      name: 'Private Sunrise Sailing',
      protocol: 'Just you and a captain. No photographer. No schedule. Anchor where you feel it.',
      why: `You want ${desired} and you want to avoid ${avoid}. This gives you space without isolation.`,
    };
  }
  
  if (desired.toLowerCase().includes('alive') || desired.toLowerCase().includes('excitement')) {
    return {
      type: 'experience',
      name: 'Cave Diving with Marine Biologist',
      protocol: 'Small group (max 4). Expert guide. No "influencer" moments. Real discovery.',
      why: `You want ${desired} without ${avoid}. This is aliveness earned, not performed.`,
    };
  }
  
  if (desired.toLowerCase().includes('intimate') || desired.toLowerCase().includes('connection')) {
    return {
      type: 'experience',
      name: 'Private Chef Experience',
      protocol: 'On your terrace. They cook, you talk. No service theater. Just real food and conversation.',
      why: `You want ${desired} without ${avoid}. This is connection without pretense.`,
    };
  }
  
  // Default recommendation
  return {
    type: 'experience',
    name: 'Curated Hidden Experience',
    protocol: 'Designed for privacy. No crowds. No performance. Just the experience.',
    why: `You want ${desired} without ${avoid}. This is built for that.`,
  };
}

/**
 * Future: Query Neo4j for POI-based recommendations
 * - Filter by destination
 * - Match emotional goals
 * - Apply privacy/crowd protocols
 * - Return top recommendation with reasoning
 */
export async function getRecommendationFromNeo4j(
  state: SessionState
): Promise<Recommendation> {
  // TODO: Implement Neo4j query
  // For now, use stub
  return getRecommendation(state);
}

