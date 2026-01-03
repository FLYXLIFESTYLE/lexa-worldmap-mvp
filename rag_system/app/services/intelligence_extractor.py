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
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            print("WARNING: ANTHROPIC_API_KEY not set in environment variables!")
            print("Intelligence extraction will fail. Please set ANTHROPIC_API_KEY in Render environment variables.")
            # Don't raise error on init - let it fail when actually called
            self.client = None
            self.model = "claude-3-5-sonnet-20241022"
        else:
            print(f"Initializing Anthropic client with API key (length: {len(api_key)})")
            self.client = anthropic.Anthropic(api_key=api_key)
            self.model = "claude-3-5-sonnet-20241022"
            print(f"Using model: {self.model}")
    
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
        
        # Check if client is initialized
        if not self.client:
            print("ERROR: Anthropic client not initialized. ANTHROPIC_API_KEY is missing!")
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
            
            # Log full response for debugging
            print(f"=== CLAUDE RESPONSE (full) ===")
            print(response_text)
            print(f"=== END CLAUDE RESPONSE ===")
            
            parsed_result = self._parse_intelligence_response(response_text, source_file)
            
            # Log extraction results
            pois_count = len(parsed_result.get('pois', []))
            experiences_count = len(parsed_result.get('experiences', []))
            trends_count = len(parsed_result.get('trends', []))
            competitors_count = len(parsed_result.get('competitor_analysis', []))
            print(f"=== EXTRACTION RESULTS ===")
            print(f"POIs: {pois_count}")
            print(f"Experiences: {experiences_count}")
            print(f"Trends: {trends_count}")
            print(f"Competitors: {competitors_count}")
            print(f"Full parsed result keys: {list(parsed_result.keys())}")
            print(f"=== END EXTRACTION RESULTS ===")
            
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
        
        prompt = f"""Extract all valuable information from this travel/luxury experience document and return it as JSON.

Document: {source_file or "Unknown"}

Extract:
1. All locations/places (POIs) - restaurants, hotels, spas, beaches, villages, landmarks
2. All experiences/activities - what people do, treatments, excursions, moments
3. All companies/services mentioned - competitors, partners, vendors
4. Any trends, insights, or learnings

Be thorough - extract EVERYTHING mentioned, even if it seems minor.

Return ONLY valid JSON with this structure:
{{
  "pois": [{{"name": "...", "type": "...", "location": "...", "description": "..."}}],
  "experiences": [{{"experience_title": "...", "experience_type": "...", "description": "...", "location": "..."}}],
  "competitor_analysis": [{{"competitor_name": "...", "service_type": "..."}}],
  "trends": [],
  "client_insights": [],
  "price_intelligence": {{}},
  "operational_learnings": []
}}

Document content:

## EXTRACTION RULES:

### 1. POIS (Points of Interest) - Extract EVERY location mentioned
For EACH place, venue, restaurant, hotel, spa, beach, port, village, landmark, or location:
{{
  "name": "Full name (e.g., 'Hotel du Cap-Eden-Roc', 'Èze', 'Elsa')",
  "type": "restaurant|hotel|spa|beach|port|village|landmark|activity_venue|wellness_center",
  "location": "City/region (e.g., 'Monaco', 'Saint-Tropez', 'Cap d'Antibes', 'French Riviera')",
  "description": "What makes it special, what happens there, notable features",
  "category": "wellness|dining|accommodation|activity|spa|beach|cultural",
  "address": "If mentioned",
  "coordinates": {{"lat": null, "lng": null}}  // Only if you can infer
}}

EXAMPLES:
- "Èze" → {{"name": "Èze", "type": "village", "location": "French Riviera", "description": "Medieval hilltop village", "category": "cultural"}}
- "Hotel du Cap-Eden-Roc Spa" → {{"name": "Hotel du Cap-Eden-Roc", "type": "hotel", "location": "Cap d'Antibes", "description": "Luxury hotel with spa, hydrotherapy pools, private gardens", "category": "wellness"}}
- "Elsa (Monaco) 1 * Michelin" → {{"name": "Elsa", "type": "restaurant", "location": "Monaco", "description": "1 Michelin star restaurant", "category": "dining"}}
- "Cheval Blanc St-Tropez Spa by Guerlain" → {{"name": "Cheval Blanc St-Tropez", "type": "hotel", "location": "Saint-Tropez", "description": "Ultra-luxury hotel with Guerlain spa, hammam, sea-view suites", "category": "wellness"}}

### 2. EXPERIENCES - Extract EVERY activity, moment, or experience described
For EACH experience, activity, treatment, or moment:
{{
  "experience_title": "Descriptive name (e.g., 'Sunrise Yoga on Deck', 'Private Thermal Circuit')",
  "experience_type": "wellness|spa_treatment|dining|activity|excursion|meditation|fitness|cultural",
  "description": "Detailed description of what happens, what's included",
  "location": "Where it takes place (e.g., 'onboard', 'Monaco', 'Èze village')",
  "duration": "If mentioned (e.g., 'morning', '2 hours', 'full day')",
  "unique_elements": "What makes it special or unique",
  "emotional_goal": "relaxation|energy|recovery|adventure|luxury|transformation|connection",
  "target_audience": "If mentioned",
  "estimated_budget": "If mentioned"
}}

EXAMPLES:
- "Sunrise yoga on deck" → {{"experience_title": "Sunrise Yoga on Deck", "experience_type": "wellness", "description": "Yoga session on yacht deck at sunrise with Cap-Ferrat backdrop", "location": "onboard", "duration": "morning", "emotional_goal": "relaxation"}}
- "Private thermal circuit at Thermes Marins Monte-Carlo" → {{"experience_title": "Thermal Circuit at Thermes Marins", "experience_type": "wellness", "description": "Private thermal circuit with hydrotherapy and marine detox", "location": "Monaco", "emotional_goal": "recovery"}}
- "Mindful walk through Èze village" → {{"experience_title": "Mindful Village Walk in Èze", "experience_type": "activity", "description": "Guided mindful walk through medieval village and nature paths", "location": "Èze", "emotional_goal": "connection"}}

### 3. COMPETITORS - Extract companies, services, brands mentioned
{{
  "competitor_name": "Company/service name",
  "service_type": "What they offer",
  "strengths": "What they do well",
  "weaknesses": "Limitations or gaps",
  "lessons_for_lexa": "What LEXA can learn"
}}

EXAMPLES:
- "Drip Hydration (UK based but operates internationally)" → {{"competitor_name": "Drip Hydration", "service_type": "IV Drip therapy", "strengths": "International operations", "lessons_for_lexa": "IV therapy is in demand for wellness cruises"}}
- "Epulsive (Tailored workouts using EMS suits)" → {{"competitor_name": "Epulsive", "service_type": "EMS fitness training", "strengths": "20-minute full body workouts", "lessons_for_lexa": "Efficient workout options appeal to time-conscious luxury travelers"}}

### 4. MARKET TRENDS - Only if clearly identifiable patterns
{{
  "trend_name": "Name of trend",
  "trend_category": "wellness|technology|luxury|sustainability",
  "description": "What the trend is",
  "target_demographic": "Who it appeals to",
  "business_opportunity": "How LEXA can leverage this"
}}

### 5. CLIENT INSIGHTS - Understanding luxury traveler behavior
{{
  "insight_category": "desires|pain_points|buying_behavior|decision_factors",
  "client_segment": "Who this applies to",
  "insight_description": "The insight",
  "emotional_drivers": "What motivates them",
  "pain_points": "What frustrates them"
}}

### 6. OPERATIONAL LEARNINGS - Practical logistics, requirements, tips
{{
  "learning_type": "logistics|booking|seasonality|requirements|best_practices",
  "description": "The learning",
  "applicability": "When/where this applies"
}}

### 7. PRICE INTELLIGENCE - Only if pricing mentioned
{{
  "experience_type": "Type of experience",
  "price_range": "If mentioned",
  "value_drivers": "What justifies the price"
}}

---

{text[:15000]}

IMPORTANT: Return ONLY the JSON object, no markdown, no explanations, no code blocks. Start with {{ and end with }}."""
        
        return prompt
    
    def _parse_intelligence_response(self, response_text: str, source_file: Optional[str]) -> Dict:
        """Parse Claude's comprehensive intelligence response"""
        
        try:
            # Try multiple JSON extraction strategies
            json_str = None
            
            # Strategy 1: Look for JSON code blocks
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                print("Found JSON in code block")
            
            # Strategy 2: Look for JSON object directly
            if not json_str:
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    json_str = json_match.group(0)
                    print("Found JSON object directly")
            
            # Strategy 3: Try to find JSON starting from first {
            if not json_str:
                first_brace = response_text.find('{')
                if first_brace >= 0:
                    # Try to extract balanced JSON
                    brace_count = 0
                    end_pos = first_brace
                    for i in range(first_brace, len(response_text)):
                        if response_text[i] == '{':
                            brace_count += 1
                        elif response_text[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_pos = i + 1
                                break
                    if brace_count == 0:
                        json_str = response_text[first_brace:end_pos]
                        print("Extracted JSON by balancing braces")
            
            if not json_str:
                print(f"ERROR: Could not find JSON in response. Response text: {response_text[:1000]}")
                return self._empty_result()
            
            print(f"Attempting to parse JSON (length: {len(json_str)})")
            intelligence = json.loads(json_str)
            print(f"Successfully parsed JSON. Keys: {list(intelligence.keys())}")
            
            # Add metadata
            intelligence['metadata'] = {
                'source_file': source_file,
                'extracted_at': datetime.utcnow().isoformat(),
                'text_length': len(response_text)
            }
            
            return intelligence
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {str(e)}")
            print(f"Response text that failed to parse (first 1000 chars): {response_text[:1000]}")
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
