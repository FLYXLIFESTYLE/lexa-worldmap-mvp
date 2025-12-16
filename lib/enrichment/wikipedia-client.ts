/**
 * Wikipedia API Client
 * Enriches POI data from Wikipedia
 */

export interface WikipediaEnrichment {
  description?: string;
  full_text?: string;
  images?: string[];
  categories?: string[];
  url?: string;
  source: 'wikipedia';
  enriched_at: Date;
}

/**
 * Search for a Wikipedia article by name and coordinates
 */
export async function searchArticle(
  name: string,
  lat?: number,
  lon?: number
): Promise<string | null> {
  try {
    let searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`;

    // If coordinates provided, use geosearch
    if (lat !== undefined && lon !== undefined) {
      searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=1000&gslimit=5&format=json&origin=*`;
    }

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.query) {
      // Geosearch results
      if (data.query.geosearch && data.query.geosearch.length > 0) {
        return data.query.geosearch[0].title;
      }
      // Text search results
      if (data.query.search && data.query.search.length > 0) {
        return data.query.search[0].title;
      }
    }

    return null;
  } catch (error) {
    console.error('[Wikipedia] Search error:', error);
    return null;
  }
}

/**
 * Get article extract and details
 */
export async function getArticleDetails(title: string): Promise<WikipediaEnrichment | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|images|categories|info&titles=${encodeURIComponent(title)}&exintro=1&explaintext=1&inprop=url&format=json&origin=*`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.query || !data.query.pages) {
      return null;
    }

    const pages = Object.values(data.query.pages) as any[];
    if (pages.length === 0) return null;

    const page = pages[0];

    // Get images
    const images: string[] = [];
    if (page.images) {
      for (const img of page.images.slice(0, 3)) {
        const imageUrl = await getImageUrl(img.title);
        if (imageUrl) images.push(imageUrl);
      }
    }

    return {
      description: page.extract,
      full_text: page.extract, // Could fetch full text if needed
      images,
      categories: page.categories?.map((c: any) => c.title.replace('Category:', '')),
      url: page.fullurl,
      source: 'wikipedia',
      enriched_at: new Date(),
    };
  } catch (error) {
    console.error('[Wikipedia] Details error:', error);
    return null;
  }
}

/**
 * Get image URL from image title
 */
async function getImageUrl(imageTitle: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.query || !data.query.pages) return null;

    const pages = Object.values(data.query.pages) as any[];
    if (pages.length === 0) return null;

    const page = pages[0];
    return page.imageinfo?.[0]?.url || null;
  } catch {
    return null;
  }
}

/**
 * Enrich a POI with Wikipedia data
 */
export async function enrichPOI(
  name: string,
  lat?: number,
  lon?: number
): Promise<WikipediaEnrichment | null> {
  try {
    // Search for the article
    const title = await searchArticle(name, lat, lon);
    if (!title) {
      return null;
    }

    // Get article details
    const details = await getArticleDetails(title);
    return details;
  } catch (error) {
    console.error('[Wikipedia] Enrichment error:', error);
    return null;
  }
}

