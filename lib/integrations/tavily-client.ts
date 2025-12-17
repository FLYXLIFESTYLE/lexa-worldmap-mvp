/**
 * Tavily AI Search Integration
 * Real-time web search for travel information
 * https://tavily.com/
 */

export interface TavilySearchOptions {
  query: string;
  searchDepth?: 'basic' | 'advanced';
  topic?: 'general' | 'news';
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  responseTime: number;
}

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Search using Tavily AI
 */
export async function tavilySearch(
  options: TavilySearchOptions
): Promise<TavilyResponse> {
  if (!TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY not configured');
  }

  const requestBody = {
    api_key: TAVILY_API_KEY,
    query: options.query,
    search_depth: options.searchDepth || 'basic',
    topic: options.topic || 'general',
    max_results: options.maxResults || 5,
    include_domains: options.includeDomains || [],
    exclude_domains: options.excludeDomains || [],
    include_answer: true,
    include_raw_content: false,
  };

  try {
    const startTime = Date.now();
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    return {
      query: options.query,
      results: data.results || [],
      responseTime,
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}

/**
 * Search for destination information
 */
export async function searchDestinationInfo(
  destination: string,
  context?: string
): Promise<TavilyResponse> {
  const query = context
    ? `${destination} ${context} travel information`
    : `${destination} luxury travel guide`;

  return tavilySearch({
    query,
    searchDepth: 'advanced',
    maxResults: 5,
  });
}

/**
 * Search for current events at a destination
 */
export async function searchDestinationEvents(
  destination: string,
  month?: string
): Promise<TavilyResponse> {
  const query = month
    ? `${destination} events ${month} ${new Date().getFullYear()}`
    : `${destination} current events festivals`;

  return tavilySearch({
    query,
    searchDepth: 'advanced',
    topic: 'news',
    maxResults: 10,
  });
}

/**
 * Search for weather information
 */
export async function searchWeather(
  destination: string,
  month?: string
): Promise<TavilyResponse> {
  const query = month
    ? `${destination} weather ${month} typical conditions`
    : `${destination} current weather forecast`;

  return tavilySearch({
    query,
    searchDepth: 'basic',
    maxResults: 3,
  });
}

/**
 * Search for POI information
 */
export async function searchPOIInfo(
  poiName: string,
  destination: string
): Promise<TavilyResponse> {
  return tavilySearch({
    query: `${poiName} ${destination} reviews ratings information`,
    searchDepth: 'advanced',
    maxResults: 5,
  });
}

/**
 * Search for travel restrictions and requirements
 */
export async function searchTravelRequirements(
  destination: string
): Promise<TavilyResponse> {
  return tavilySearch({
    query: `${destination} travel requirements visa entry regulations ${new Date().getFullYear()}`,
    searchDepth: 'advanced',
    topic: 'news',
    maxResults: 5,
  });
}

