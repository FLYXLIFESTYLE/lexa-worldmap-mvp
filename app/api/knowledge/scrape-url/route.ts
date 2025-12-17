/**
 * URL Scraping API
 * Extract content from URLs for knowledge ingestion
 */

import { NextResponse } from 'next/server';
import { 
  processConversation, 
  ingestKnowledge,
  type ParsedConversation 
} from '@/lib/knowledge';
import { 
  checkURLStatus, 
  recordScrapedURL, 
  extractLinks 
} from '@/lib/knowledge/url-tracker';
import { getCurrentUserAttribution } from '@/lib/knowledge/track-contribution';

export async function POST(req: Request) {
  try {
    const { url, force = false } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if URL has been scraped before
    const urlStatus = await checkURLStatus(url);
    if (urlStatus.alreadyScraped && !urlStatus.canRescrape && !force) {
      return NextResponse.json(
        { 
          error: 'URL already scraped recently',
          lastScrapedAt: urlStatus.lastScrapedAt,
          canRescrape: urlStatus.canRescrape,
          message: 'Use force=true to re-scrape'
        },
        { status: 409 }
      );
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LEXA/1.0; +https://lexa.com/bot)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch URL' },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Extract main content (simple version - could use cheerio for better extraction)
    const text = extractMainContent(html);
    const title = extractTitle(html);

    // Use AI to extract structured knowledge
    const conversation: ParsedConversation = {
      id: url,
      title: title || url,
      created: new Date(),
      updated: new Date(),
      messages: [{
        role: 'user',
        content: text,
        timestamp: new Date(),
      }],
      fullText: text,
      messageCount: 1,
    };

    const extracted = await processConversation(conversation);

    // Extract tags from wisdom entries
    const allTags = extracted.wisdom.flatMap(w => w.tags);
    const uniqueTags = [...new Set(allTags)];

    // Extract subpage links
    const subpageLinks = extractLinks(html, url);

    // Get user attribution for tracking
    const attribution = await getCurrentUserAttribution('scraped', url, 'url');
    
    // **FIX: Actually save to Neo4j!**
    const ingestionStats = await ingestKnowledge(extracted, {
      source: 'url_scrape',
      sourceId: url,
      sourceTitle: title || 'Scraped URL',
      sourceDate: new Date(),
      author: attribution?.contributorName || 'Unknown',
      contributedBy: attribution?.contributedBy,
      contributorName: attribution?.contributorName,
      contributionType: 'scraped',
    });
    
    // Record the scraped URL with actual stats
    await recordScrapedURL({
      url,
      scrapedAt: new Date(),
      status: 'success',
      knowledgeCount: ingestionStats.wisdomCreated,
      poisExtracted: ingestionStats.poisCreated + ingestionStats.poisUpdated,
      relationshipsCreated: ingestionStats.relationshipsCreated,
      subpagesFound: subpageLinks.slice(0, 20), // Store up to 20 subpages
      contributedBy: attribution?.contributedBy,
      contributorName: attribution?.contributorName,
    });

    // Return extracted data for the frontend to use
    return NextResponse.json({
      success: true,
      title: title || extracted.metadata.conversationTitle,
      content: text.substring(0, 1000), // First 1000 chars
      tags: uniqueTags,
      pois: extracted.pois.map(p => p.name),
      wisdom: extracted.wisdom.map(w => w.content),
      relationships: extracted.relationships.map(r => `${r.from} → ${r.to}`),
      subpagesFound: subpageLinks.length,
      subpages: subpageLinks.slice(0, 10), // Return first 10 for UI
      saved: {
        wisdom: ingestionStats.wisdomCreated,
        pois: ingestionStats.poisCreated + ingestionStats.poisUpdated,
        relationships: ingestionStats.relationshipsCreated,
      },
    });
  } catch (error) {
    console.error('URL scraping error:', error);
    
    // Record failed attempt
    try {
      await recordScrapedURL({
        url: (await req.json()).url,
        scrapedAt: new Date(),
        status: 'failed',
        knowledgeCount: 0,
        poisExtracted: 0,
        relationshipsCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (recordError) {
      console.error('Failed to record scraping error:', recordError);
    }
    
    return NextResponse.json(
      {
        error: 'Failed to scrape URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract main content from HTML
 * Simple version - strips HTML tags and extracts text
 */
function extractMainContent(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return h1Match[1].replace(/<[^>]+>/g, '').trim();
  }

  return '';
}

