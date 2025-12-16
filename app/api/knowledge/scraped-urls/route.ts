/**
 * Scraped URLs API
 * View and manage scraped URL records
 */

import { NextResponse } from 'next/server';
import { getScrapedURLs, deleteScrapedURL } from '@/lib/knowledge/url-tracker';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const { urls, total } = await getScrapedURLs(page, limit);

    return NextResponse.json({
      success: true,
      urls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching scraped URLs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch scraped URLs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    await deleteScrapedURL(url);

    return NextResponse.json({
      success: true,
      message: 'URL record deleted',
    });
  } catch (error) {
    console.error('Error deleting scraped URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete scraped URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

