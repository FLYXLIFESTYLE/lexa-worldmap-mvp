"""
POI Extraction Service
Uses Claude 3.5 Sonnet to extract structured POI data from unstructured text
"""

import os
import json
from typing import List, Dict, Optional
import anthropic
import re


class POIExtractor:
    """Extract Points of Interest from unstructured text using Claude AI"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.getenv('ANTHROPIC_API_KEY')
        )
        self.model = "claude-3-5-sonnet-20240620"  # Correct model name
    
    async def extract_pois_from_text(
        self,
        text: str,
        confidence_score: int = 80,
        source_file: Optional[str] = None
    ) -> List[Dict]:
        """
        Extract POI data from unstructured text
        
        Returns list of POI dictionaries with:
        - name: POI name
        - destination: City/region
        - category: Type (restaurant, hotel, activity, etc.)
        - description: Detailed description
        - latitude: Coordinates (if mentioned)
        - longitude: Coordinates (if mentioned)
        - luxury_score: 0-10 luxury rating
        - price_level: 0-4 price indicator
        - themes: List of applicable themes
        - keywords: Relevant search keywords
        - luxury_indicators: Specific luxury features
        - confidence_score: Data quality score
        """
        
        if len(text) < 50:
            return []
        
        # Prepare extraction prompt
        prompt = self._build_extraction_prompt(text, source_file)
        
        try:
            # Call Claude API
            message = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                temperature=0.3,  # Lower temperature for more consistent extraction
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Parse response
            response_text = message.content[0].text
            pois = self._parse_poi_response(response_text, confidence_score, source_file)
            
            return pois
            
        except Exception as e:
            print(f"POI extraction error: {str(e)}")
            return []
    
    def _build_extraction_prompt(self, text: str, source_file: Optional[str]) -> str:
        """Build the Claude prompt for POI extraction"""
        
        prompt = f"""You are a luxury travel data extraction expert. Extract all Points of Interest (POIs) from the following text and return them as JSON.

For each POI, extract:
- name: Official name of the place
- destination: City or region (e.g., "Monaco", "French Riviera", "Greek Islands")
- category: Type of POI (restaurant, hotel, activity, landmark, beach, marina, museum, etc.)
- description: Detailed description (2-4 sentences capturing the essence and unique features)
- address: Full address if mentioned
- coordinates: If GPS coordinates or specific location mentioned (latitude, longitude)
- luxury_score: Rate 0-10 based on luxury indicators (Michelin stars, 5-star, exclusive, high-end mentioned)
- price_level: 0-4 (0=free, 1=budget, 2=moderate, 3=upscale, 4=luxury/exclusive)
- themes: Array of applicable themes from: Romance, Adventure, Wellness, Culture, Gastronomy, Nature, Urban, Celebration, Spiritual, Family, Solo, Discovery
- keywords: Array of relevant search terms and tags
- luxury_indicators: Array of specific luxury features (e.g., "Michelin 3-star", "Private beach", "Helicopter access", "Butler service")
- insider_tips: Any non-obvious information or local secrets mentioned
- best_time: When to visit (season, time of day, etc.) if mentioned
- booking_info: How to book or access (reservations required, members only, etc.)
- yacht_accessible: true/false if accessible by yacht or near marina
- marina_distance: Distance to nearest marina if mentioned

Luxury Indicators to look for:
- Michelin stars (1, 2, 3-star)
- 5-star rating or "luxury" designation
- "Exclusive", "private", "members-only", "invitation-only"
- Celebrity ownership or frequent guest mentions
- High price points mentioned
- Concierge services, butler service, personal service
- Helicopter access, private jet, yacht access
- Historic significance, royal connections
- Award-winning (World's 50 Best, Forbes, etc.)
- Designer brands or famous architects/chefs

Categories to use:
- Restaurant, Bar, Nightclub, Cafe
- Hotel, Resort, Villa, Yacht
- Beach, Cove, Island
- Marina, Harbor, Port
- Museum, Gallery, Historic Site
- Park, Garden, Nature Reserve
- Activity, Experience, Tour
- Spa, Wellness Center
- Shopping, Boutique
- Landmark, Viewpoint

Important:
- Only extract POIs that are actual places, not general descriptions
- Be specific with names (e.g., "Le Louis XV - Alain Ducasse" not just "a restaurant")
- Include both well-known and hidden gems
- Extract even brief mentions if they include useful detail
- If no luxury indicators, estimate based on context
- Return ONLY valid JSON array, no additional text

Source: {source_file or "Unknown"}

Text to analyze:
---
{text[:8000]}  # Limit to first 8000 chars to stay within token limits
---

Return JSON array of POIs:"""
        
        return prompt
    
    def _parse_poi_response(
        self,
        response_text: str,
        confidence_score: int,
        source_file: Optional[str]
    ) -> List[Dict]:
        """Parse Claude's response and extract POI data"""
        
        pois = []
        
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find raw JSON array
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    print("No JSON found in Claude response")
                    return []
            
            # Parse JSON
            parsed_pois = json.loads(json_str)
            
            # Validate and clean each POI
            for poi in parsed_pois:
                if not poi.get('name'):
                    continue  # Skip POIs without names
                
                cleaned_poi = {
                    'name': poi.get('name', '').strip(),
                    'destination': poi.get('destination', '').strip(),
                    'category': poi.get('category', 'Other').strip(),
                    'description': poi.get('description', '').strip(),
                    'address': poi.get('address', '').strip() or None,
                    'latitude': self._parse_coordinate(poi.get('coordinates', {}).get('latitude')),
                    'longitude': self._parse_coordinate(poi.get('coordinates', {}).get('longitude')),
                    'luxury_score': self._validate_score(poi.get('luxury_score', 5), 0, 10),
                    'price_level': self._validate_score(poi.get('price_level', 2), 0, 4),
                    'themes': poi.get('themes', [])[:5],  # Limit to 5 themes
                    'keywords': poi.get('keywords', [])[:10],  # Limit to 10 keywords
                    'luxury_indicators': poi.get('luxury_indicators', [])[:5],
                    'insider_tips': poi.get('insider_tips', '').strip() or None,
                    'best_time': poi.get('best_time', '').strip() or None,
                    'booking_info': poi.get('booking_info', '').strip() or None,
                    'yacht_accessible': poi.get('yacht_accessible', False),
                    'marina_distance': poi.get('marina_distance', '').strip() or None,
                    'confidence_score': confidence_score,
                    'source_file': source_file,
                    'extracted_at': self._get_timestamp(),
                    'verified': False,
                    'enhanced': False
                }
                
                pois.append(cleaned_poi)
            
            return pois
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {str(e)}")
            print(f"Response text: {response_text[:500]}...")
            return []
        except Exception as e:
            print(f"POI parsing error: {str(e)}")
            return []
    
    def _parse_coordinate(self, coord) -> Optional[float]:
        """Parse coordinate value (handle strings and numbers)"""
        if coord is None:
            return None
        try:
            return float(coord)
        except (ValueError, TypeError):
            return None
    
    def _validate_score(self, score, min_val: int, max_val: int) -> int:
        """Validate and clamp score within range"""
        try:
            score = int(score)
            return max(min_val, min(max_val, score))
        except (ValueError, TypeError):
            return (min_val + max_val) // 2  # Return midpoint as default
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat()


# Singleton instance
_extractor = None

def get_poi_extractor() -> POIExtractor:
    """Get or create POI extractor instance"""
    global _extractor
    if _extractor is None:
        _extractor = POIExtractor()
    return _extractor


# Convenience function
async def extract_pois_from_text(
    text: str,
    confidence_score: int = 80,
    source_file: Optional[str] = None
) -> List[Dict]:
    """
    Extract POIs from text using Claude AI
    
    Args:
        text: Unstructured text containing POI information
        confidence_score: Initial confidence score (default 80%)
        source_file: Source filename for tracking
    
    Returns:
        List of POI dictionaries
    """
    extractor = get_poi_extractor()
    return await extractor.extract_pois_from_text(text, confidence_score, source_file)


# Enrich with Google Places (optional enhancement)
async def enrich_poi_with_google_places(poi: Dict) -> Dict:
    """
    Enrich POI data with Google Places API
    
    Args:
        poi: POI dictionary with at least name and destination
    
    Returns:
        Enhanced POI with additional data from Google Places
    """
    try:
        import googlemaps
        
        gmaps = googlemaps.Client(key=os.getenv('GOOGLE_PLACES_API_KEY'))
        
        # Search for place
        query = f"{poi['name']}, {poi.get('destination', '')}"
        places_result = gmaps.places(query)
        
        if places_result['results']:
            place = places_result['results'][0]
            place_id = place['place_id']
            
            # Get detailed information
            details = gmaps.place(place_id, fields=[
                'name', 'formatted_address', 'geometry', 'rating', 
                'user_ratings_total', 'price_level', 'opening_hours',
                'website', 'formatted_phone_number', 'photos', 'types'
            ])
            
            if details['result']:
                result = details['result']
                
                # Update coordinates if not present
                if not poi.get('latitude') and 'geometry' in result:
                    poi['latitude'] = result['geometry']['location']['lat']
                    poi['longitude'] = result['geometry']['location']['lng']
                
                # Add Google data
                poi['google_enriched'] = True
                poi['google_rating'] = result.get('rating')
                poi['google_reviews_count'] = result.get('user_ratings_total')
                poi['google_price_level'] = result.get('price_level')
                poi['google_place_id'] = place_id
                poi['website'] = result.get('website')
                poi['phone'] = result.get('formatted_phone_number')
                poi['address'] = poi['address'] or result.get('formatted_address')
                poi['google_types'] = result.get('types', [])
                
                # Opening hours
                if 'opening_hours' in result:
                    poi['opening_hours'] = result['opening_hours'].get('weekday_text', [])
                
                # Photo references (first 3)
                if 'photos' in result:
                    poi['photo_references'] = [
                        p['photo_reference'] for p in result['photos'][:3]
                    ]
        
        return poi
        
    except Exception as e:
        print(f"Google Places enrichment error: {str(e)}")
        poi['google_enriched'] = False
        poi['enrichment_error'] = str(e)
        return poi
