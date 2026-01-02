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
            message = self.client.messages.create(
                model=self.model,
                max_tokens=8000,  # More tokens for comprehensive extraction
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            return self._parse_intelligence_response(response_text, source_file)
            
        except Exception as e:
            print(f"Intelligence extraction error: {str(e)}")
            return self._empty_result()
    
    def _build_comprehensive_prompt(self, text: str, source_file: Optional[str]) -> str:
        """Build prompt for comprehensive intelligence extraction"""
        
        prompt = f"""You are LEXA's business intelligence analyst extracting valuable insights from luxury travel content.

SOURCE: {source_file or "Unknown"}

Extract and categorize ALL valuable information into these sections:

## 1. POIS (Places/Venues)
Extract specific places with details for our POI database.

## 2. EXPERIENCE IDEAS
Creative experience concepts that could inspire LEXA scripts:
- experience_title, experience_type, target_audience
- emotional_goal, narrative_arc, key_moments
- duration, estimated_budget, unique_elements
- inspiration_source

## 3. MARKET TRENDS
Current patterns in luxury travel:
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
Pricing patterns:
- experience_type, price_range
- value_drivers, price_sensitivity_factors

## 6. COMPETITOR ANALYSIS
Other players:
- competitor_name, strengths, weaknesses
- lessons_for_lexa

## 7. OPERATIONAL LEARNINGS
Practical knowledge about logistics, seasons, regulations, bookings

Text to analyze:
---
{text[:12000]}
---

Return ONLY valid JSON with this structure:
{{
  "pois": [...],
  "experiences": [...],
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
