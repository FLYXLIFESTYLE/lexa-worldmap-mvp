"""
Enhanced Intelligence Extraction Service
Extracts POIs, Experience Ideas, Market Trends, Client Insights, and Business Intelligence
"""

import os
import json
from typing import List, Dict, Optional
import anthropic
import re
from datetime import datetime


class IntelligenceExtractor:
    """
    Extract comprehensive travel intelligence from unstructured text
    - POIs (Points of Interest)
    - Experience Ideas (inspiration for LEXA scripts)
    - Market Trends (luxury travel patterns)
    - Client Insights (desires, behaviors, buying patterns)
    - Competitor Analysis
    - Price Points and Budgets
    """
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        self.model = "claude-3-5-sonnet-20241022"
    
    async def extract_all_intelligence(
        self,
        text: str,
        source_file: Optional[str] = None
    ) -> Dict:
        """
        Extract ALL types of intelligence from text
        
        Returns:
        {
            'pois': [...],
            'experiences': [...],
            'trends': [...],
            'client_insights': [...],
            'price_intelligence': {...},
            'competitor_analysis': [...]
        }
        """
        
        if len(text) < 50:
            return self._empty_result()
        
        # Build comprehensive extraction prompt
        prompt = self._build_comprehensive_prompt(text, source_file)
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=8000,  # More tokens for comprehensive extraction
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Extract text from response (handle different response formats)
            if hasattr(response, 'content') and len(response.content) > 0:
                if hasattr(response.content[0], 'text'):
                    response_text = response.content[0].text
                elif isinstance(response.content[0], dict) and 'text' in response.content[0]:
                    response_text = response.content[0]['text']
                else:
                    print(f"Unexpected response format: {type(response.content[0])}")
                    return self._empty_result()
            else:
                print(f"Empty or invalid response content: {response}")
                return self._empty_result()
            
            # Log first 500 chars of response for debugging
            print(f"Claude response preview (first 500 chars): {response_text[:500]}")
            
            parsed_result = self._parse_intelligence_response(response_text, source_file)
            
            # Log extraction results
            pois_count = len(parsed_result.get('pois', []))
            experiences_count = len(parsed_result.get('experiences', []))
            trends_count = len(parsed_result.get('trends', []))
            print(f"Extracted: {pois_count} POIs, {experiences_count} Experiences, {trends_count} Trends")
            
            return parsed_result
            
        except AttributeError as e:
            print(f"Anthropic API error (attribute): {str(e)}")
            print(f"Response object: {response if 'response' in locals() else 'N/A'}")
            return self._empty_result()
        except Exception as e:
            print(f"Intelligence extraction error: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._empty_result()
    
    def _build_comprehensive_prompt(self, text: str, source_file: Optional[str]) -> str:
        """Build prompt for comprehensive intelligence extraction"""
        
        prompt = f"""You are LEXA's business intelligence analyst extracting valuable insights from luxury travel content.

SOURCE: {source_file or "Unknown"}

Extract and categorize ALL valuable information into these sections:

## 1. POIS (Places/Venues) - REQUIRED
Extract EVERY specific place, venue, restaurant, hotel, spa, beach, port, village, or location mentioned:
- name: Full name of the place
- type: (restaurant, hotel, spa, beach, port, village, landmark, etc.)
- location: City/region (e.g., "Monaco", "Saint-Tropez", "Èze")
- description: What makes it special or what happens there
- coordinates: If you can infer approximate location, include lat/lng
- category: (wellness, dining, accommodation, activity, etc.)

EXAMPLES from itineraries:
- "Èze" → POI: name="Èze", type="village", location="French Riviera"
- "Hotel du Cap-Eden-Roc Spa" → POI: name="Hotel du Cap-Eden-Roc", type="hotel_spa", location="Cap d'Antibes"
- "Cheval Blanc St-Tropez Spa" → POI: name="Cheval Blanc St-Tropez", type="hotel_spa", location="Saint-Tropez"
- "Elsa (Monaco)" → POI: name="Elsa", type="restaurant", location="Monaco", description="1 Michelin star"

## 2. EXPERIENCE IDEAS - REQUIRED
Extract EVERY experience, activity, or moment described:
- experience_title: Name of the experience
- experience_type: (wellness, dining, activity, spa_treatment, excursion, etc.)
- description: What happens during this experience
- location: Where it takes place
- duration: If mentioned (e.g., "morning", "afternoon", "full day")
- unique_elements: What makes it special
- emotional_goal: What feeling it creates (relaxation, adventure, luxury, etc.)

EXAMPLES:
- "Sunrise yoga on deck" → Experience: title="Sunrise Yoga", type="wellness", location="onboard"
- "Private thermal circuit at Thermes Marins Monte-Carlo" → Experience: title="Thermal Circuit", type="wellness", location="Monaco"
- "Mindful walk through Èze village" → Experience: title="Mindful Village Walk", type="activity", location="Èze"

## 3. MARKET TRENDS
Current patterns in luxury travel (only if explicitly mentioned or clearly implied):
- trend_name, trend_category, description
- target_demographic, growth_indicator
- business_opportunity for LEXA

## 4. CLIENT INSIGHTS
Understanding what luxury travelers want:
- insight_category (desires, pain_points, buying_behavior, decision_factors)
- client_segment, insight_description
- emotional_drivers, decision_criteria
- pain_points, unmet_needs

## 5. PRICE INTELLIGENCE
Pricing patterns (if mentioned):
- experience_type, price_range
- value_drivers, price_sensitivity_factors

## 6. COMPETITOR ANALYSIS
Other players mentioned (companies, services, brands):
- competitor_name, strengths, weaknesses
- lessons_for_lexa

## 7. OPERATIONAL LEARNINGS
Practical knowledge about logistics, seasons, regulations, bookings, requirements

Text to analyze:
---
{text[:12000]}
---

CRITICAL: Even if the text is an itinerary or travel plan, extract:
- ALL locations as POIs
- ALL activities/experiences as Experiences
- Any companies/services as Competitors
- Any operational details as Learnings

Return ONLY valid JSON (no markdown, no explanations, just JSON):
{{
  "pois": [
    {{"name": "...", "type": "...", "location": "...", "description": "...", "category": "..."}},
    ...
  ],
  "experiences": [
    {{"experience_title": "...", "experience_type": "...", "description": "...", "location": "...", "emotional_goal": "..."}},
    ...
  ],
  "trends": [...],
  "client_insights": [...],
  "price_intelligence": {{}},
  "competitor_analysis": [...],
  "operational_learnings": [...]
}}"""
        
        return prompt
    
    def _parse_intelligence_response(self, response_text: str, source_file: Optional[str]) -> Dict:
        """Parse Claude's comprehensive intelligence response"""
        
        try:
            # Extract JSON
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    return self._empty_result()
            
            intelligence = json.loads(json_str)
            
            # Add metadata
            intelligence['metadata'] = {
                'source_file': source_file,
                'extracted_at': datetime.utcnow().isoformat(),
                'text_length': len(response_text)
            }
            
            return intelligence
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {str(e)}")
            return self._empty_result()
    
    def _empty_result(self) -> Dict:
        """Return empty intelligence structure"""
        return {
            'pois': [],
            'experiences': [],
            'trends': [],
            'client_insights': [],
            'price_intelligence': {},
            'competitor_analysis': [],
            'operational_learnings': [],
            'metadata': {'extracted_at': datetime.utcnow().isoformat()}
        }


# Singleton
_extractor = None

def get_intelligence_extractor() -> IntelligenceExtractor:
    global _extractor
    if _extractor is None:
        _extractor = IntelligenceExtractor()
    return _extractor


# Backward compatible
async def extract_pois_from_text(
    text: str,
    confidence_score: int = 80,
    source_file: Optional[str] = None
) -> List[Dict]:
    """Extract POIs only (backward compatible)"""
    extractor = get_intelligence_extractor()
    intelligence = await extractor.extract_all_intelligence(text, source_file)
    return intelligence['pois']


# New comprehensive function
async def extract_all_intelligence(
    text: str,
    source_file: Optional[str] = None
) -> Dict:
    """Extract ALL intelligence: POIs, experiences, trends, insights, etc."""
    extractor = get_intelligence_extractor()
    return await extractor.extract_all_intelligence(text, source_file)
