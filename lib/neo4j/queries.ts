/**
 * Neo4j Query Functions for LEXA RAG System
 * Provides intelligent recommendations based on graph data
 */

import { getSession } from './client';
import { Record as Neo4jRecord } from 'neo4j-driver';

// ============================================================================
// TYPES
// ============================================================================

export interface Theme {
  id: string;
  name: string;
  description: string;
  category: string;
  luxuryScore?: number;
}

export interface Destination {
  id: string;
  name: string;
  region: string;
  country: string;
  bestMonths: string[];
  luxuryScore?: number;
  description?: string;
}

export interface POI {
  id: string;
  name: string;
  type: string;
  description?: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  tags: string[];
  luxuryScore?: number;
}

export interface Recommendation {
  destination: Destination;
  themes: Theme[];
  topPOIs: POI[];
  reasoning: string;
}

// ============================================================================
// THEME QUERIES
// ============================================================================

/**
 * Get all available theme categories for initial question
 */
export async function getThemeCategories(): Promise<string[]> {
  const session = getSession();
  
  try {
    // Query for distinct theme categories
    const result = await session.run(`
      MATCH (t:theme_category)
      RETURN DISTINCT t.name as category
      ORDER BY category
    `);
    
    return result.records.map(record => record.get('category') as string);
  } catch (error) {
    console.error('Error fetching theme categories:', error);
    // Fallback to hardcoded themes if database query fails
    return [
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
    ];
  } finally {
    await session.close();
  }
}

/**
 * Get themes by category
 */
export async function getThemesByCategory(category: string): Promise<Theme[]> {
  const session = getSession();
  
  try {
    const result = await session.run(
      `
      MATCH (t:theme_category)
      WHERE t.name = $category
      RETURN t.id as id, 
             t.name as name, 
             t.description as description,
             t.name as category,
             t.luxuryScore as luxuryScore
      ORDER BY t.luxuryScore DESC, t.name
      `,
      { category }
    );
    
    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description'),
      category: record.get('category'),
      luxuryScore: record.get('luxuryScore')
    }));
  } catch (error) {
    console.error('Error fetching themes by category:', error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Search themes by keyword
 */
export async function searchThemes(keyword: string): Promise<Theme[]> {
  const session = getSession();
  
  try {
    const result = await session.run(
      `
      MATCH (t:theme_category)
      WHERE toLower(t.name) CONTAINS toLower($keyword)
         OR toLower(t.description) CONTAINS toLower($keyword)
      RETURN t.id as id, 
             t.name as name, 
             t.description as description,
             t.name as category,
             t.luxuryScore as luxuryScore
      ORDER BY t.luxuryScore DESC
      LIMIT 10
      `,
      { keyword }
    );
    
    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description'),
      category: record.get('category'),
      luxuryScore: record.get('luxuryScore')
    }));
  } catch (error) {
    console.error('Error searching themes:', error);
    return [];
  } finally {
    await session.close();
  }
}

// ============================================================================
// DESTINATION QUERIES
// ============================================================================

/**
 * Get destinations best suited for a specific month
 */
export async function getDestinationsByMonth(month: string): Promise<Destination[]> {
  const session = getSession();
  
  try {
    const result = await session.run(
      `
      MATCH (d:destination)
      WHERE $month IN d.bestMonths
      RETURN d.id as id,
             d.name as name,
             d.region as region,
             d.country as country,
             d.bestMonths as bestMonths,
             d.luxuryScore as luxuryScore,
             d.description as description
      ORDER BY d.luxuryScore DESC
      LIMIT 10
      `,
      { month }
    );
    
    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      region: record.get('region'),
      country: record.get('country'),
      bestMonths: record.get('bestMonths'),
      luxuryScore: record.get('luxuryScore'),
      description: record.get('description')
    }));
  } catch (error) {
    console.error('Error fetching destinations by month:', error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get destinations by name or region
 */
export async function searchDestinations(query: string): Promise<Destination[]> {
  const session = getSession();
  
  try {
    const result = await session.run(
      `
      MATCH (d:destination)
      WHERE toLower(d.name) CONTAINS toLower($query)
         OR toLower(d.region) CONTAINS toLower($query)
         OR toLower(d.country) CONTAINS toLower($query)
      RETURN d.id as id,
             d.name as name,
             d.region as region,
             d.country as country,
             d.bestMonths as bestMonths,
             d.luxuryScore as luxuryScore,
             d.description as description
      ORDER BY d.luxuryScore DESC
      LIMIT 10
      `,
      { query }
    );
    
    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      region: record.get('region'),
      country: record.get('country'),
      bestMonths: record.get('bestMonths'),
      luxuryScore: record.get('luxuryScore'),
      description: record.get('description')
    }));
  } catch (error) {
    console.error('Error searching destinations:', error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get all destination names (for UI dropdowns/buttons)
 */
export async function getAllDestinationNames(): Promise<string[]> {
  const session = getSession();
  
  try {
    const result = await session.run(`
      MATCH (d:destination)
      RETURN d.name as name
      ORDER BY d.luxuryScore DESC, d.name
    `);
    
    return result.records.map(record => record.get('name') as string);
  } catch (error) {
    console.error('Error fetching destination names:', error);
    // Fallback to known destinations
    return [
      'French Riviera',
      'Amalfi Coast',
      'Cyclades',
      'Adriatic',
      'Ionian Sea',
      'Balearics',
      'Bahamas',
      'BVI',
      'USVI',
      'French Antilles',
      'Dutch Antilles',
      'Arabian Gulf (UAE)'
    ];
  } finally {
    await session.close();
  }
}

// ============================================================================
// SMART RECOMMENDATIONS
// ============================================================================

/**
 * Get intelligent recommendations based on month AND theme
 */
export async function getRecommendations(params: {
  month?: string;
  theme?: string;
  destination?: string;
}): Promise<Recommendation[]> {
  const session = getSession();
  
  try {
    // Build dynamic query based on provided parameters
    let query = `
      MATCH (d:destination)
    `;
    
    const whereClauses: string[] = [];
    const parameters: Record<string, any> = {};
    
    if (params.month) {
      whereClauses.push('$month IN d.bestMonths');
      parameters.month = params.month;
    }
    
    if (params.destination) {
      whereClauses.push('toLower(d.name) CONTAINS toLower($destination)');
      parameters.destination = params.destination;
    }
    
    if (whereClauses.length > 0) {
      query += `WHERE ${whereClauses.join(' AND ')} `;
    }
    
    query += `
      OPTIONAL MATCH (d)-[:HAS_THEME]->(t:theme_category)
    `;
    
    if (params.theme) {
      query += `WHERE toLower(t.name) CONTAINS toLower($theme) `;
      parameters.theme = params.theme;
    }
    
    query += `
      OPTIONAL MATCH (d)-[:CONTAINS]->(p:poi)
      WITH d, collect(DISTINCT t) as themes, collect(p) as pois
      RETURN d.id as destinationId,
             d.name as destinationName,
             d.region as region,
             d.country as country,
             d.bestMonths as bestMonths,
             d.luxuryScore as luxuryScore,
             d.description as description,
             themes,
             pois[0..10] as topPOIs
      ORDER BY d.luxuryScore DESC
      LIMIT 5
    `;
    
    const result = await session.run(query, parameters);
    
    return result.records.map(record => {
      const themesData = record.get('themes') || [];
      const poisData = record.get('topPOIs') || [];
      
      return {
        destination: {
          id: record.get('destinationId'),
          name: record.get('destinationName'),
          region: record.get('region'),
          country: record.get('country'),
          bestMonths: record.get('bestMonths'),
          luxuryScore: record.get('luxuryScore'),
          description: record.get('description')
        },
        themes: themesData.map((t: any) => ({
          id: t.properties?.id || '',
          name: t.properties?.name || '',
          description: t.properties?.description || '',
          category: t.properties?.category || '',
          luxuryScore: t.properties?.luxuryScore
        })),
        topPOIs: poisData.map((p: any) => ({
          id: p.properties?.id || '',
          name: p.properties?.name || '',
          type: p.properties?.type || '',
          description: p.properties?.description,
          coordinates: {
            lat: p.properties?.lat || 0,
            lon: p.properties?.lon || 0
          },
          tags: p.properties?.tags || [],
          luxuryScore: p.properties?.luxuryScore
        })),
        reasoning: generateReasoning(params, record)
      };
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Generate reasoning text for why a destination was recommended
 */
function generateReasoning(
  params: { month?: string; theme?: string; destination?: string },
  record: Neo4jRecord
): string {
  const reasons: string[] = [];
  const destName = record.get('destinationName');
  const bestMonths = record.get('bestMonths') || [];
  
  if (params.month && bestMonths.includes(params.month)) {
    reasons.push(`${destName} is at its finest in ${params.month}`);
  }
  
  if (params.theme) {
    reasons.push(`perfectly suited for ${params.theme} experiences`);
  }
  
  const luxuryScore = record.get('luxuryScore');
  if (luxuryScore && luxuryScore > 8) {
    reasons.push('exceptional luxury offerings');
  }
  
  return reasons.length > 0 
    ? reasons.join(', ') 
    : `${destName} offers an extraordinary experience`;
}

// ============================================================================
// POI QUERIES
// ============================================================================

/**
 * Get POIs for a specific destination with luxury filtering
 */
export async function getPOIsByDestination(
  destinationName: string,
  minLuxuryScore: number = 7
): Promise<POI[]> {
  const session = getSession();
  
  try {
    const result = await session.run(
      `
      MATCH (d:destination {name: $destinationName})-[:CONTAINS]->(p:poi)
      WHERE p.luxuryScore >= $minLuxuryScore
      RETURN p.id as id,
             p.name as name,
             p.type as type,
             p.description as description,
             p.lat as lat,
             p.lon as lon,
             p.tags as tags,
             p.luxuryScore as luxuryScore
      ORDER BY p.luxuryScore DESC
      LIMIT 50
      `,
      { destinationName, minLuxuryScore }
    );
    
    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      type: record.get('type'),
      description: record.get('description'),
      coordinates: {
        lat: record.get('lat'),
        lon: record.get('lon')
      },
      tags: record.get('tags') || [],
      luxuryScore: record.get('luxuryScore')
    }));
  } catch (error) {
    console.error('Error fetching POIs:', error);
    return [];
  } finally {
    await session.close();
  }
}

