/**
 * URL Scraping API
 * Extract content from URLs for knowledge ingestion
 */

import { NextResponse } from 'next/server';
import { processConversation, type ParsedConversation } from '@/lib/knowledge';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

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

    // Return extracted data for the frontend to use
    return NextResponse.json({
      success: true,
      title: title || extracted.metadata.conversationTitle,
      content: text.substring(0, 1000), // First 1000 chars
      tags: uniqueTags,
      pois: extracted.pois.map(p => p.name),
    });
  } catch (error) {
    console.error('URL scraping error:', error);
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

