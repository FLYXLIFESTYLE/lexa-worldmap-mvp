/**
 * API Route: Get Theme Categories from Neo4j
 * GET /api/lexa/themes
 */

import { NextResponse } from 'next/server';
import { getThemeCategories, getAllDestinationNames } from '@/lib/neo4j/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'categories' or 'destinations'

    if (type === 'destinations') {
      const destinations = await getAllDestinationNames();
      return NextResponse.json({ destinations });
    }

    // Default: return theme categories
    const categories = await getThemeCategories();
    return NextResponse.json({ categories });
    
  } catch (error) {
    console.error('Error fetching themes:', error);
    
    // Return fallback data if Neo4j is not available
    return NextResponse.json({
      categories: [
        'Adventure & Exploration',
        'Culinary Excellence',
        'Wellness & Relaxation',
        'Cultural Immersion',
        'Romance & Intimacy',
        'Family Luxury',
        'Water Sports & Marine',
        'Art & Architecture',
        'Nightlife & Entertainment',
        'Nature & Wildlife'
      ],
      error: 'Using fallback data'
    }, { status: 200 });
  }
}

