/**
 * Tavily Search API Endpoint
 * Real-time web search for travel information
 */

import { NextResponse } from 'next/server';
import {
  tavilySearch,
  searchDestinationInfo,
  searchDestinationEvents,
  searchWeather,
  searchPOIInfo,
  searchTravelRequirements,
} from '@/lib/integrations/tavily-client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, query, destination, context, month, poiName } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Search type required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'destination_info':
        if (!destination) {
          return NextResponse.json(
            { error: 'Destination required' },
            { status: 400 }
          );
        }
        result = await searchDestinationInfo(destination, context);
        break;

      case 'events':
        if (!destination) {
          return NextResponse.json(
            { error: 'Destination required' },
            { status: 400 }
          );
        }
        result = await searchDestinationEvents(destination, month);
        break;

      case 'weather':
        if (!destination) {
          return NextResponse.json(
            { error: 'Destination required' },
            { status: 400 }
          );
        }
        result = await searchWeather(destination, month);
        break;

      case 'poi':
        if (!poiName || !destination) {
          return NextResponse.json(
            { error: 'POI name and destination required' },
            { status: 400 }
          );
        }
        result = await searchPOIInfo(poiName, destination);
        break;

      case 'travel_requirements':
        if (!destination) {
          return NextResponse.json(
            { error: 'Destination required' },
            { status: 400 }
          );
        }
        result = await searchTravelRequirements(destination);
        break;

      case 'general':
        if (!query) {
          return NextResponse.json(
            { error: 'Query required' },
            { status: 400 }
          );
        }
        result = await tavilySearch({ query });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid search type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Tavily search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

