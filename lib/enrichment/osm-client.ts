/**
 * OpenStreetMap Overpass API Client
 * Enriches POI data from OSM
 */

export interface OSMEnrichment {
  cuisine?: string[];
  amenity?: string;
  diet_options?: string[];
  outdoor_seating?: boolean;
  wheelchair?: string;
  internet_access?: boolean;
  payment_methods?: string[];
  capacity?: number;
  opening_hours?: string;
  contact?: {
    phone?: string;
    website?: string;
    email?: string;
  };
  source: 'osm';
  enriched_at: Date;
}

/**
 * Get enhanced tags from OSM using Overpass API
 */
export async function getEnhancedTags(
  osmId: string
): Promise<OSMEnrichment | null> {
  try {
    // Parse OSM ID (format: "node_12345" or "way_67890" or "relation_11111")
    const match = osmId.match(/^(node|way|relation)_(\d+)$/);
    if (!match) {
      console.error('[OSM] Invalid OSM ID format:', osmId);
      return null;
    }

    const [, type, id] = match;

    // Query Overpass API
    const query = `
      [out:json];
      ${type}(${id});
      out tags;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      return null;
    }

    const tags = data.elements[0].tags;
    if (!tags) return null;

    // Parse and structure the tags
    const enrichment: OSMEnrichment = {
      source: 'osm',
      enriched_at: new Date(),
    };

    // Cuisine
    if (tags.cuisine) {
      enrichment.cuisine = tags.cuisine.split(';').map((c: string) => c.trim());
    }

    // Amenity
    if (tags.amenity) {
      enrichment.amenity = tags.amenity;
    }

    // Diet options
    const dietOptions: string[] = [];
    if (tags['diet:vegan'] === 'yes') dietOptions.push('vegan');
    if (tags['diet:vegetarian'] === 'yes') dietOptions.push('vegetarian');
    if (tags['diet:gluten_free'] === 'yes') dietOptions.push('gluten-free');
    if (dietOptions.length > 0) {
      enrichment.diet_options = dietOptions;
    }

    // Outdoor seating
    if (tags.outdoor_seating) {
      enrichment.outdoor_seating = tags.outdoor_seating === 'yes';
    }

    // Wheelchair accessibility
    if (tags.wheelchair) {
      enrichment.wheelchair = tags.wheelchair;
    }

    // Internet access
    if (tags.internet_access) {
      enrichment.internet_access = tags.internet_access === 'yes' || tags.internet_access === 'wlan';
    }

    // Payment methods
    const paymentMethods: string[] = [];
    if (tags['payment:cash'] === 'yes') paymentMethods.push('cash');
    if (tags['payment:credit_cards'] === 'yes') paymentMethods.push('credit_cards');
    if (tags['payment:debit_cards'] === 'yes') paymentMethods.push('debit_cards');
    if (paymentMethods.length > 0) {
      enrichment.payment_methods = paymentMethods;
    }

    // Capacity
    if (tags.capacity) {
      const capacity = parseInt(tags.capacity);
      if (!isNaN(capacity)) {
        enrichment.capacity = capacity;
      }
    }

    // Opening hours
    if (tags.opening_hours) {
      enrichment.opening_hours = tags.opening_hours;
    }

    // Contact information
    const contact: any = {};
    if (tags.phone || tags['contact:phone']) {
      contact.phone = tags.phone || tags['contact:phone'];
    }
    if (tags.website || tags['contact:website']) {
      contact.website = tags.website || tags['contact:website'];
    }
    if (tags.email || tags['contact:email']) {
      contact.email = tags.email || tags['contact:email'];
    }
    if (Object.keys(contact).length > 0) {
      enrichment.contact = contact;
    }

    return enrichment;
  } catch (error) {
    console.error('[OSM] Enrichment error:', error);
    return null;
  }
}

/**
 * Enrich a POI with OSM data
 * @param sourceId - The OSM source ID (e.g., "osm_node_12345")
 */
export async function enrichPOI(sourceId: string): Promise<OSMEnrichment | null> {
  try {
    // Convert source_id format to OSM format
    // "osm_node_12345" -> "node_12345"
    const osmId = sourceId.replace('osm_', '');
    return await getEnhancedTags(osmId);
  } catch (error) {
    console.error('[OSM] Enrichment error:', error);
    return null;
  }
}

/**
 * Add respectful delay between requests
 */
export async function delay(ms: number = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

