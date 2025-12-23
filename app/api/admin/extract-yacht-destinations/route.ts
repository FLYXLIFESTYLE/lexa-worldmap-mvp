/**
 * API Route: OCR Screenshot Extraction
 * POST /api/admin/extract-yacht-destinations
 * Extracts cities, countries, and routes from uploaded screenshots using Google Vision API
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export const runtime = 'nodejs';

interface ExtractionResult {
  cities: string[];
  countries: string[];
  routes: Array<{ name: string; ports: string[] }>;
  raw_text: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    const results: ExtractionResult[] = [];

    for (const file of files) {
      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');

      // Call Google Vision API for text detection
      const visionResponse = await callVisionAPI(base64);

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('Vision API error:', errorText);
        throw new Error('Google Vision API error: ' + errorText);
      }

      const visionData = await visionResponse.json();
      const text = visionData.responses?.[0]?.fullTextAnnotation?.text || '';

      if (!text) {
        continue;
      }

      // Parse extracted text
      const parsed = parseYachtDestinations(text);
      results.push({
        ...parsed,
        raw_text: text
      });
    }

    // Merge all results
    const merged = mergeExtractionResults(results);

    return NextResponse.json({
      success: true,
      extracted: merged,
      files_processed: files.length
    });

  } catch (error: any) {
    console.error('Error extracting yacht destinations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract destinations from images',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Call Google Vision API with authentication
 * Supports both service account (recommended) and API key (fallback)
 */
async function callVisionAPI(base64Image: string): Promise<Response> {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  // Try service account first (recommended for production)
  if (credentialsPath) {
    try {
      const auth = new GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/cloud-vision'],
      });
      
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken.token) {
        throw new Error('Failed to get access token from service account');
      }
      
      const response = await fetch(
        'https://vision.googleapis.com/v1/images:annotate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Image },
                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
              }
            ]
          })
        }
      );
      
      return response;
    } catch (error) {
      console.error('Service account auth failed, falling back to API key:', error);
    }
  }
  
  // Fallback to API key
  const apiKey = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    throw new Error('No Google Vision API credentials found. Set either GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_VISION_API_KEY/GOOGLE_PLACES_API_KEY');
  }
  
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }
        ]
      })
    }
  );
  
  return response;
}

function parseYachtDestinations(text: string): Omit<ExtractionResult, 'raw_text'> {
  const cities: string[] = [];
  const countries: string[] = [];
  const routes: Array<{ name: string; ports: string[] }> = [];

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Common country names to detect
  const countryKeywords = [
    'France', 'Italy', 'Spain', 'Greece', 'Croatia', 'Turkey', 'Monaco',
    'Portugal', 'Malta', 'Cyprus', 'Thailand', 'Maldives', 'Seychelles',
    'Australia', 'New Zealand', 'USA', 'Bahamas', 'Caribbean', 'Indonesia',
    'Netherlands Antilles', 'British Virgin Islands', 'US Virgin Islands'
  ];

  // Route patterns: "Route Name - City1, City2" or "Route: City1 • City2"
  const routePattern = /^([^:-]+)[\s:-]+(.+)$/;

  for (const line of lines) {
    // Check if it's a route
    const routeMatch = line.match(routePattern);
    if (routeMatch && (line.includes(',') || line.includes('•') || line.includes('·'))) {
      const routeName = routeMatch[1].trim();
      const portsStr = routeMatch[2];
      
      const ports = portsStr
        .split(/[,•·|]/)
        .map(p => p.trim())
        .filter(p => p.length > 2 && p.length < 50);

      if (ports.length >= 2) {
        routes.push({ name: routeName, ports });
        cities.push(...ports);
        continue;
      }
    }

    // Check if it's a country
    if (countryKeywords.some(country => line.toLowerCase().includes(country.toLowerCase()))) {
      countries.push(line);
      continue;
    }

    // Otherwise, treat as a city (if reasonable length)
    if (line.length >= 3 && line.length <= 40 && /^[A-Za-z\s'-]+$/.test(line)) {
      cities.push(line);
    }
  }

  return {
    cities: [...new Set(cities)], // Remove duplicates
    countries: [...new Set(countries)],
    routes
  };
}

function mergeExtractionResults(results: ExtractionResult[]): Omit<ExtractionResult, 'raw_text'> {
  const allCities = new Set<string>();
  const allCountries = new Set<string>();
  const allRoutes: Array<{ name: string; ports: string[] }> = [];

  for (const result of results) {
    result.cities.forEach(city => allCities.add(city));
    result.countries.forEach(country => allCountries.add(country));
    allRoutes.push(...result.routes);
  }

  return {
    cities: Array.from(allCities).sort(),
    countries: Array.from(allCountries).sort(),
    routes: allRoutes
  };
}

export async function GET() {
  return NextResponse.json({
    message: 'Upload images via POST',
    auth_methods: {
      service_account: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Configured ✅' : 'Not configured',
      api_key: (process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_PLACES_API_KEY) ? 'Configured ✅' : 'Not configured'
    },
    required_env: 'GOOGLE_APPLICATION_CREDENTIALS (recommended) or GOOGLE_VISION_API_KEY/GOOGLE_PLACES_API_KEY'
  });
}

