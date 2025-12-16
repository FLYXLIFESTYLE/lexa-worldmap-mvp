/**
 * API endpoint for LEXA recommendations
 * Returns personalized POI recommendations based on filters
 */

import { NextResponse } from 'next/server';
import { 
  getRecommendations, 
  getPersonalizedRecommendations,
  RecommendationPresets,
  type RecommendationFilters 
} from '@/lib/lexa/recommendation-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { preset, filters, userId, conversationContext } = body;

    let recommendations;

    // Use preset if provided
    if (preset && preset in RecommendationPresets) {
      const presetFilters = (RecommendationPresets as any)[preset]();
      recommendations = await getRecommendations(presetFilters, userId);
    }
    // Use personalized recommendations if userId and context provided
    else if (userId && conversationContext) {
      recommendations = await getPersonalizedRecommendations(userId, conversationContext);
    }
    // Use custom filters
    else if (filters) {
      recommendations = await getRecommendations(filters as RecommendationFilters, userId);
    }
    // Default: ultra-luxury recommendations
    else {
      recommendations = await getRecommendations(RecommendationPresets.ultraLuxury());
    }

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'LEXA Recommendation API',
    usage: {
      method: 'POST',
      body: {
        preset: 'ultraLuxury | romanticGetaway | adventureSeeker | culturalExplorer | culinaryJourney',
        or: 'filters: { minLuxuryScore, themes, activities, destinations, etc. }',
        or: 'userId + conversationContext for personalized recommendations',
      },
    },
    availablePresets: Object.keys(RecommendationPresets),
  });
}

