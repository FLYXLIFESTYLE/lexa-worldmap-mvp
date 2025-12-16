/**
 * URL Tracking System
 * Track scraped URLs to prevent duplicates and enable re-scraping
 */

import { getNeo4jDriver } from '../neo4j';

export interface ScrapedURL {
  url: string;
  scrapedAt: Date;
  status: 'success' | 'failed' | 'processing';
  knowledgeCount: number;
  poisExtracted: number;
  relationshipsCreated: number;
  error?: string;
  subpagesFound?: string[];
  contributedBy?: string;
  contributorName?: string;
}

export interface URLTrackingResult {
  url: string;
  alreadyScraped: boolean;
  lastScrapedAt?: Date;
  canRescrape: boolean;
}

/**
 * Check if URL has been scraped before
 */
export async function checkURLStatus(url: string): Promise<URLTrackingResult> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:ScrapedURL {url: $url})
      RETURN u.url as url, 
             u.scraped_at as scrapedAt,
             u.status as status
      ORDER BY u.scraped_at DESC
      LIMIT 1
      `,
      { url }
    );

    if (result.records.length === 0) {
      return {
        url,
        alreadyScraped: false,
        canRescrape: true,
      };
    }

    const record = result.records[0];
    const scrapedAt = new Date(record.get('scrapedAt'));
    
    // Allow re-scraping if last scrape was more than 30 days ago
    const daysSinceLastScrape = (Date.now() - scrapedAt.getTime()) / (1000 * 60 * 60 * 24);
    const canRescrape = daysSinceLastScrape > 30;

    return {
      url,
      alreadyScraped: true,
      lastScrapedAt: scrapedAt,
      canRescrape,
    };
  } finally {
    await session.close();
  }
}

/**
 * Record a scraped URL
 */
export async function recordScrapedURL(data: ScrapedURL): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run(
      `
      MERGE (u:ScrapedURL {url: $url})
      SET u.scraped_at = datetime(),
          u.status = $status,
          u.knowledge_count = $knowledgeCount,
          u.pois_extracted = $poisExtracted,
          u.relationships_created = $relationshipsCreated,
          u.error = $error,
          u.subpages_found = $subpagesFound,
          u.contributed_by = $contributedBy,
          u.contributor_name = $contributorName,
          u.updated_at = datetime()
      `,
      {
        url: data.url,
        status: data.status,
        knowledgeCount: data.knowledgeCount,
        poisExtracted: data.poisExtracted,
        relationshipsCreated: data.relationshipsCreated,
        error: data.error || null,
        subpagesFound: data.subpagesFound || [],
        contributedBy: data.contributedBy || null,
        contributorName: data.contributorName || null,
      }
    );
  } finally {
    await session.close();
  }
}

/**
 * Get all scraped URLs with pagination
 */
export async function getScrapedURLs(
  page: number = 1,
  limit: number = 50
): Promise<{ urls: ScrapedURL[]; total: number }> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const skip = (page - 1) * limit;

    // Get total count
    const countResult = await session.run(`
      MATCH (u:ScrapedURL)
      RETURN count(u) as total
    `);
    const total = countResult.records[0]?.get('total').toNumber() || 0;

    // Get paginated results
    const result = await session.run(
      `
      MATCH (u:ScrapedURL)
      RETURN u.url as url,
             u.scraped_at as scrapedAt,
             u.status as status,
             u.knowledge_count as knowledgeCount,
             u.pois_extracted as poisExtracted,
             u.relationships_created as relationshipsCreated,
             u.error as error,
             u.subpages_found as subpagesFound,
             u.contributed_by as contributedBy,
             u.contributor_name as contributorName
      ORDER BY u.scraped_at DESC
      SKIP $skip
      LIMIT $limit
      `,
      { skip, limit }
    );

    const urls: ScrapedURL[] = result.records.map((record) => ({
      url: record.get('url'),
      scrapedAt: new Date(record.get('scrapedAt')),
      status: record.get('status'),
      knowledgeCount: record.get('knowledgeCount'),
      poisExtracted: record.get('poisExtracted'),
      relationshipsCreated: record.get('relationshipsCreated'),
      error: record.get('error'),
      subpagesFound: record.get('subpagesFound'),
      contributedBy: record.get('contributedBy'),
      contributorName: record.get('contributorName'),
    }));

    return { urls, total };
  } finally {
    await session.close();
  }
}

/**
 * Extract links from HTML content
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    
    // Skip anchors, mailto, tel, javascript
    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      continue;
    }

    // Convert relative URLs to absolute
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }

    // Only include links from the same domain
    const baseDomain = new URL(baseUrl).hostname;
    const linkDomain = new URL(absoluteUrl).hostname;
    
    if (linkDomain === baseDomain && !links.includes(absoluteUrl)) {
      links.push(absoluteUrl);
    }
  }

  return links;
}

/**
 * Delete a scraped URL record
 */
export async function deleteScrapedURL(url: string): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run(
      `
      MATCH (u:ScrapedURL {url: $url})
      DELETE u
      `,
      { url }
    );
  } finally {
    await session.close();
  }
}

