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
from app.services.lexa_extraction_context import get_lexa_extraction_context


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
            # Use a currently supported Anthropic model
            self.model = "claude-sonnet-4-20250514"
        else:
            print(f"Initializing Anthropic client with API key (length: {len(api_key)})")
            self.client = anthropic.Anthropic(api_key=api_key)
            # Use a currently supported Anthropic model
            self.model = "claude-sonnet-4-20250514"
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
            error_msg = f"Anthropic API error (attribute): {str(e)}"
            print(error_msg)
            print(f"Response object: {response if 'response' in locals() else 'N/A'}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = str(e)
            print(f"Intelligence extraction error: {error_msg}")
            import traceback
            traceback.print_exc()
            
            # Check if it's a model not found error
            if '404' in error_msg or 'not_found' in error_msg.lower() or 'model' in error_msg.lower():
                enhanced_error = (
                    f"Claude model '{self.model}' not found (404). "
                    f"Try updating to a supported model (e.g. claude-sonnet-4-20250514). "
                    f"Original error: {error_msg}"
                )
                print(f"⚠️ CRITICAL: {enhanced_error}")
                raise Exception(enhanced_error)
            
            # Re-raise the exception so upload endpoint can handle it
            raise Exception(f"Intelligence extraction failed: {error_msg}")
    
    def _build_comprehensive_prompt(self, text: str, source_file: Optional[str]) -> str:
        """Build prompt for comprehensive intelligence extraction"""
        
        # Inject LEXA's rich domain context
        lexa_context = get_lexa_extraction_context()
        
        prompt = f"""
{lexa_context}

---

## YOUR EXTRACTION TASK

Extract intelligence from this document with the lens of a luxury travel advisor preparing 
an investor pitch. Think like the Claude chat that analyzed Bloomberg's "11 Most Exciting 
Luxury Hotels 2026" - provide rich insights, not just raw data.

**Document:** {source_file or "Unknown"}

### WHAT TO EXTRACT (In Priority Order):

1. **Hotels/Experiences with Emotional Mapping** (MANDATORY)
   - For EACH hotel/venue/experience: Map to LEXA's 9 emotions with intensity scores (1-10)
   - Provide evidence for each emotion score from the source text
   - Be specific: "Prestige (10/10) - Former royal palace, King's residence" not just "Prestige: high"

2. **Client Archetype Matching** (MANDATORY)
   - For EACH experience: Which of LEXA's 5 archetypes would love this? (match score 0-100)
   - Why would they love it? (address specific pain points)
   - What conversation triggers should prompt LEXA to recommend this?

3. **Luxury Travel Trends** (If Applicable)
   - What market shift does this exemplify? (e.g., "Historic conversions over new builds")
   - How does this validate LEXA's emotional AI approach?
   - What competitive insights does this reveal?

4. **All POIs/Venues** (restaurants, hotels, spas, villages, landmarks, ports)
5. **All Sub-Experiences** (activities, treatments, moments, rituals)
6. **Service Providers** (companies, brands, operators mentioned)
7. **Pricing Intelligence** (when mentioned - critical for tier/upsell positioning)
8. **Investor Insights** (why this data matters for LEXA's business case)

### EXTRACTION STANDARDS:

**MINIMUM Quality:**
- At least 3 EmotionalTags per experience (with intensities 1-10)
- At least 1 client archetype match (with match score and reasoning)
- Clear evidence citations from source

**GOLD Standard (aim for this):**
- 5-7 EmotionalTags per experience with intensities + evidence
- 2-3 client archetype matches with match scores
- Trend analysis (what shift it exemplifies)
- Conversation trigger examples
- Sample LEXA recommendation dialogue
- Investor insight paragraph
- Neo4j relationship suggestions

Be EXTREMELY thorough - extract EVERYTHING mentioned, even if it seems minor.

Return ONLY valid JSON with this structure (contract-aligned):
{{
  "extraction_summary": "Perfect! I've extracted [X hotels/experiences] with [Y emotional mappings], [Z client archetypes]...",
  "pois": [
    {{
      "name": "Full name (e.g., 'Diriyah Palace', 'Zannier Bendor')",
      "type": "hotel|restaurant|spa|resort|villa|palace|historic_property",
      "location": "City/region (e.g., 'Riyadh, Saudi Arabia', 'Provence, France')",
      "description": "What makes it special, historical context, unique features",
      "emotional_map": [
        {{"kind": "EmotionalTag", "name": "Prestige", "intensity_1_10": 10, "evidence": "Former royal residence, King's home", "confidence_0_1": 0.85}},
        {{"kind": "EmotionalTag", "name": "Exclusivity", "intensity_1_10": 10, "evidence": "70 rooms, palace hosts, private spa suites", "confidence_0_1": 0.85}},
        {{"kind": "EmotionalTag", "name": "Discovery", "intensity_1_10": 9, "evidence": "First public access to royal palace", "confidence_0_1": 0.75}}
      ],
      "client_archetypes": [
        {{
          "archetype": "Ultra-HNW Exclusivity Seeker",
          "match_score": 98,
          "why": "Royal residence offers ultimate prestige + exclusivity for milestone celebrations",
          "pain_points_solved": ["Cookie-cutter luxury", "Lack of true exclusivity", "Forgettable venues"]
        }}
      ],
      "room_count": 70,
      "opening_date": "2026" or null,
      "pricing": {{"amount": 5199, "currency": "EUR", "unit": "per_night"}} or null,
      "unique_selling_points": ["Only royal palace-to-hotel", "Art Deco architecture", "Taif rose scented"],
      "conversation_triggers": ["Once-in-a-lifetime", "Feel like royalty", "Ultimate exclusivity"],
      "category": "accommodation",
      "luxury_tier": "ultra_luxury|high_luxury|entry_luxury",
      "coordinates": {{"lat": null, "lng": null}}
    }}
  ],
  "experiences": [...],
  "competitor_analysis": [...],
  "trends": [
    {{
      "trend_name": "Historic Conversions Over New Builds",
      "shift_from": "Cookie-cutter designer hotels",
      "shift_to": "Authentic properties with stories and independent spirit",
      "evidence": "7 of 11 hotels are historic conversions (palaces, theaters, Georgian homes)",
      "why_matters_for_lexa": "Validates LEXA's emotional AI approach - clients seek meaning, not just luxury amenities",
      "market_timing": "2024-2026 shift",
      "business_opportunity": "Traditional booking sites can't convey emotional significance; LEXA can"
    }}
  ],
  "client_insights": [...],
  "price_intelligence": {{}},
  "operational_learnings": [],
  "investor_insights": {{
    "market_validation": "What this data proves about luxury travel market",
    "competitive_positioning": "How LEXA is differentiated",
    "monetization_angle": "Which tier/upsell features this data supports",
    "demo_opportunities": "How to showcase this data in investor demo"
  }}
}}

Document content:

## EXTRACTION RULES:

### 1. HOTELS/POIS - Extract with EmotionalTag Intelligence
For EACH hotel, resort, venue, or significant location:
{{
  "name": "Full name",
  "type": "hotel|restaurant|spa|resort|villa|palace|historic_property|private_island",
  "location": "City, Country or Region",
  "description": "What makes it special - include historical context, unique features, cultural significance",
  "emotional_map": [
    {{"kind": "EmotionalTag", "name": "Prestige|Exclusivity|Discovery|etc.", "intensity_1_10": 1-10, "evidence": "Quote from source", "confidence_0_1": 0.6}}
  ],
  "client_archetypes": [
    {{
      "archetype": "Name from LEXA's 5 archetypes",
      "match_score": 0-100,
      "why": "Specific reasons with pain points solved"
    }}
  ],
  "pricing": {{"amount": number, "currency": "EUR|USD", "unit": "per_night|per_experience|per_day"}} or null,
  "opening_date": "YYYY" or "YYYY-MM" or null,
  "room_count": number or null,
  "unique_selling_points": ["What makes it one-of-a-kind"],
  "conversation_triggers": ["Phrases that should prompt LEXA to recommend this"],
  "luxury_tier": "ultra_luxury|high_luxury|entry_luxury",
  "category": "accommodation|dining|wellness|activity"
}}

EXAMPLES OF GOLD STANDARD EXTRACTION:

Input: "Diriyah Palace - 70-room hotel in former royal residence of King Abdulaziz, opening 2026"

Output:
{{
  "name": "Diriyah Palace",
  "type": "palace",
  "location": "Riyadh, Saudi Arabia",
  "description": "Former royal residence of King Abdulaziz Al Saud (founding father of Saudi Arabia), converted to 70-room luxury hotel. Art Deco architecture, scented with Taif rose, private spa suites.",
  "emotional_map": [
    {{"kind": "EmotionalTag", "name": "Prestige", "intensity_1_10": 10, "evidence": "Literal royal palace, founding father's home", "confidence_0_1": 0.9}},
    {{"kind": "EmotionalTag", "name": "Exclusivity", "intensity_1_10": 10, "evidence": "Only 70 rooms, palace hosts, private spa suites", "confidence_0_1": 0.85}},
    {{"kind": "EmotionalTag", "name": "Legacy", "intensity_1_10": 9, "evidence": "National historic significance, royal celebrations", "confidence_0_1": 0.8}},
    {{"kind": "EmotionalTag", "name": "Discovery", "intensity_1_10": 9, "evidence": "First public access to royal residence", "confidence_0_1": 0.75}},
    {{"kind": "EmotionalTag", "name": "Indulgence", "intensity_1_10": 9, "evidence": "Palace hosts cater to every request, Taif rose scenting", "confidence_0_1": 0.7}}
  ],
  "client_archetypes": [
    {{
      "archetype": "Ultra-HNW Exclusivity Seeker",
      "match_score": 98,
      "why": "Royal palace offers ultimate prestige and exclusivity for milestone celebrations",
      "pain_points_solved": ["Cookie-cutter luxury", "Lack of significance", "Forgettable venues"]
    }},
    {{
      "archetype": "Legacy Builder / Milestone Celebrator",
      "match_score": 95,
      "why": "Historic royal residence perfect for significant anniversaries/birthdays",
      "pain_points_solved": ["Forgettable milestone venues", "Lack of emotional significance"]
    }}
  ],
  "room_count": 70,
  "opening_date": "2026",
  "unique_selling_points": ["Only royal palace-to-hotel opening in 2026", "King Abdulaziz's actual residence", "Art Deco architecture", "Taif rose signature scent"],
  "conversation_triggers": ["Once-in-a-lifetime anniversary", "Want to feel like royalty", "Ultimate exclusivity", "Milestone celebration"],
  "luxury_tier": "ultra_luxury",
  "category": "accommodation"
}}

### 2. EXPERIENCES - Extract with EmotionalTag Mapping
For EACH experience, activity, treatment, or moment:
{{
  "experience_title": "Descriptive name",
  "experience_type": "wellness|spa_treatment|dining|activity|excursion|meditation|fitness|cultural|luxury_service",
  "description": "Detailed description including sensory details, emotions evoked, transformational aspects",
  "location": "Where it takes place",
  "duration": "If mentioned",
  "emotional_map": [
    {{"kind": "EmotionalTag", "name": "Indulgence|Romance|Discovery|etc.", "intensity_1_10": 1-10, "evidence": "Why this is evoked", "confidence_0_1": 0.6}}
  ],
  "client_archetypes": [
    {{"archetype": "Who would love this", "match_score": 0-100, "why": "Specific appeal"}}
  ],
  "unique_elements": "What makes it special or one-of-a-kind",
  "pricing": {{"amount": number, "currency": "EUR|USD"}} or null,
  "conversation_triggers": ["Phrases that should prompt this"],
  "luxury_tier": "ultra_luxury|high_luxury|entry_luxury"
}}

### 3. MARKET TRENDS - Identify luxury travel shifts
{{
  "trend_name": "Name of trend (e.g., 'Historic Conversions Over New Builds')",
  "shift_from": "Old paradigm being replaced",
  "shift_to": "New paradigm emerging",
  "evidence": "Specific examples from source",
  "why_matters_for_lexa": "How this validates LEXA's approach or creates opportunity",
  "market_timing": "When this shift is happening",
  "business_opportunity": "How LEXA can capitalize"
}}

EXAMPLE:
{{
  "trend_name": "Intimate Scale Over Mega-Resorts",
  "shift_from": "200+ room luxury hotels with cookie-cutter amenities",
  "shift_to": "6-90 room properties with unique stories and independent spirit",
  "evidence": "7 of 11 Bloomberg hotels have under 100 rooms (La Réserve Florence: only 6 apartments)",
  "why_matters_for_lexa": "Validates LEXA's focus on exclusive, emotionally significant properties that can't be found on generic booking sites",
  "market_timing": "2024-2026 accelerating",
  "business_opportunity": "LEXA can curate access to properties too small/exclusive for OTAs; justifies Connoisseur tier pricing"
}}

### 4. SERVICE PROVIDERS / COMPETITORS
{{
  "competitor_name": "Company/brand name",
  "service_type": "What they offer",
  "luxury_positioning": "ultra_luxury|high_luxury|mass_luxury",
  "emotional_approach": "How they appeal emotionally (if discernible)",
  "strengths": "What they do well",
  "gaps_for_lexa": "What LEXA can do better",
  "lessons_for_lexa": "What LEXA can learn or adopt"
}}

### 5. INVESTOR INSIGHTS (Always Include)
{{
  "market_validation": "What this source proves about the luxury travel market (e.g., 'Demand for ultra-exclusive properties higher than ever')",
  "competitive_positioning": "How LEXA is differentiated from competitors (e.g., 'Traditional booking sites show star ratings; LEXA maps emotional intensities')",
  "monetization_angle": "Which LEXA tier/upsell this data supports (e.g., 'Royal palace data justifies Connoisseur tier + White Glove upsell positioning')",
  "demo_opportunities": "How to showcase this in investor pitch (e.g., 'Show how LEXA recommends Diriyah Palace to Legacy Builder celebrating 60th birthday')"
}}

---

## DOCUMENT TO ANALYZE:

{text[:60000]}

---

## CRITICAL INSTRUCTIONS:

1. **Extract like you're preparing an investor pitch** - Show market intelligence, not just data
2. **Map EVERY hotel/experience to emotions with intensities** - This is LEXA's core differentiation
3. **Match to client archetypes with scores** - Show who would pay premium for this
4. **Identify trends and market shifts** - Prove LEXA understands the luxury market
5. **Include investor insights** - Explain why this data is valuable for LEXA's business case
6. **Provide conversation examples** - Show how LEXA would recommend this to clients
7. **Think about Neo4j relationships** - How does this data connect in the knowledge graph?

**Output Format:** Start with a Claude-style summary ("Perfect! I've extracted..."), then provide 
the complete JSON with all required fields. Be thorough - this extraction quality determines 
whether LEXA is investor-ready or amateur.

Return ONLY valid JSON. No markdown code blocks, no explanations outside the JSON. Start with {{ and end with }}."""
        
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
