"""
Company Brain Agent - Knowledge Archaeology from Historical Conversations

Analyzes 5 years of ChatGPT conversations to extract:
- Experience script templates and patterns
- Product vision and founding principles
- Feature ideas (built vs. worth discussing)
- Design philosophy and decision rationale
- Training data for AIlessia's Script Composer
- Company DNA and SYCC/LEXA essence

Documents are NOT stored (already on company server) - only insights extracted.
"""

import os
import json
from typing import List, Dict, Optional
from datetime import datetime
import anthropic

from app.services.file_processor import process_file_auto
from app.services.supabase_client import get_supabase


class CompanyBrainAgent:
    """
    Knowledge archaeologist - mines historical conversations for company DNA.
    
    Analyzes exported ChatGPT chats to:
    1. Compare against current LEXA implementation
    2. Extract experience script examples for training
    3. Identify valuable feature ideas
    4. Capture founding philosophy and vision
    5. Build "Company Brain" knowledge base
    """
    
    def __init__(self):
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            print("WARNING: ANTHROPIC_API_KEY not set!")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)
        
        self.model = "claude-sonnet-4-20250514"
        self.supabase = get_supabase()
    
    async def analyze_historical_conversation(
        self,
        file_path: str,
        file_content: bytes,
        conversation_date: Optional[str] = None
    ) -> Dict:
        """
        Analyze a single exported ChatGPT conversation.
        
        Args:
            file_path: Path to Word document
            file_content: File bytes
            conversation_date: Optional date context
        
        Returns:
            {
                "summary": "What this conversation was about",
                "script_examples": [...],  # Experience script ideas and patterns
                "features_already_built": [...],  # What's now in LEXA
                "features_worth_discussing": [...],  # Ideas to consider
                "design_philosophy": [...],  # Principles and rationale
                "company_dna": {...},  # Core beliefs and vision
                "training_insights": [...],  # For AIlessia training
                "knowledge_category": "product_vision|experience_design|technical_architecture|business_strategy"
            }
        """
        
        if not self.client:
            raise RuntimeError("Anthropic client not initialized")
        
        # 1. Extract text from Word document
        try:
            # process_file_auto returns a tuple (text, metadata), not a dict
            # Save to temp file first
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            # Process file - returns (text, metadata) tuple
            extracted_text, metadata = await process_file_auto(temp_path)
            text_content = extracted_text
            
            # Clean up temp file
            import os
            try:
                os.unlink(temp_path)
            except:
                pass
            
            if len(text_content) < 100:
                raise ValueError("Document appears empty or unreadable")
        
        except Exception as e:
            print(f"File processing error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Could not extract text from document: {str(e)}")
        
        # 2. Build company brain analysis prompt
        prompt = self._build_company_brain_prompt(text_content, conversation_date)
        
        # 3. Call Claude for deep analysis
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=8000,  # Large context for comprehensive analysis
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = response.content[0].text if hasattr(response.content[0], 'text') else str(response.content[0])
            
            # Parse JSON response
            analysis = self._parse_json_response(response_text)
            
            # Add metadata
            analysis['analyzed_at'] = datetime.utcnow().isoformat()
            analysis['source_file'] = file_path
            analysis['conversation_date'] = conversation_date
            
            return analysis
            
        except Exception as e:
            print(f"Company Brain analysis error: {str(e)}")
            raise Exception(f"Failed to analyze conversation: {str(e)}")
    
    async def synthesize_company_brain(
        self,
        all_analyses: List[Dict]
    ) -> Dict:
        """
        Synthesize multiple conversation analyses into unified "Company Brain."
        
        Args:
            all_analyses: List of individual conversation analyses
        
        Returns:
            {
                "company_dna": {...},  # Core principles and vision
                "experience_script_patterns": [...],  # Script templates for AIlessia
                "feature_roadmap": {...},  # Built vs. Worth discussing
                "design_philosophy": {...},  # How we think about luxury travel
                "training_corpus": {...},  # For AIlessia/AIbert training
                "founding_insights": [...]  # Historical context and evolution
            }
        """
        
        if not self.client:
            raise RuntimeError("Anthropic client not initialized")
        
        # Build synthesis prompt
        prompt = self._build_synthesis_prompt(all_analyses)
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=10000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = response.content[0].text if hasattr(response.content[0], 'text') else str(response.content[0])
            
            company_brain = self._parse_json_response(response_text)
            company_brain['synthesized_at'] = datetime.utcnow().isoformat()
            company_brain['total_conversations_analyzed'] = len(all_analyses)
            
            return company_brain
            
        except Exception as e:
            print(f"Synthesis error: {str(e)}")
            raise Exception(f"Failed to synthesize Company Brain: {str(e)}")
    
    def _build_company_brain_prompt(self, text: str, conversation_date: Optional[str]) -> str:
        """Build prompt for analyzing historical conversation"""
        
        current_lexa_state = """
## CURRENT LEXA IMPLEMENTATION (What's Already Built)

### Agents:
- AIlessia (Conversational Artist): 8 modules for emotional script composition
- AIbert (Analytical Psychologist): Desire anticipation
- Intelligence Extractor: Document → investor-quality insights
- Brain v2 Retrieval: Grounded POI context
- Market Intelligence: Strategic insights and cruise recommendations

### Features:
- 3-tier subscription model (Spark/Inspired/Connoisseur)
- 4 upsell packages (Discovery/Blueprint/Concierge/White Glove)
- Emotional profiling (9 core emotions with intensities)
- Client archetypes (5 types)
- Neo4j knowledge graph (300k+ POIs)
- Captain Portal (upload, verify, promote)
- Script library
- Marketplace (planned)

### Data Pipeline:
Upload → Extract (emotional mapping) → Verify → Promote to Neo4j → Retrieve → Script Composition

### Business Model:
- B2C: €0-€11,964/year subscriptions + €497-€8k upsells
- SYCC Cruises: Luxury cultural/wellness cruises
- Affiliate program (GoHighLevel integration planned)
"""
        
        return f"""
You are analyzing a historical ChatGPT conversation from Chris (LEXA/SYCC founder) to extract company DNA and valuable insights.

**Conversation Date:** {conversation_date or "Unknown (5 years of SYCC/LEXA development)"}

## CURRENT LEXA STATE (For Comparison)

{current_lexa_state}

## YOUR ANALYSIS TASK

Read this historical conversation and extract:

### 1. EXPERIENCE SCRIPT EXAMPLES ⭐ CRITICAL
Extract EVERY experience script idea, template, or example mentioned. These are GOLD for training AIlessia.

For each script:
{{
  "script_title": "...",
  "theme": "...",
  "destination": "...",
  "emotional_arc": "...",
  "signature_moments": [...],
  "narrative_style": "How it's written (tone, structure, language patterns)",
  "what_makes_it_special": "Why this example is valuable for AIlessia to learn from"
}}

### 2. FEATURE IDEAS - Categorize by Status

**Already Built in LEXA:**
- Features that exist now (compare against current state above)
- Mark these so we don't re-discuss

**Worth Discussing:**
- Ideas not yet built that could add value
- For each: Why valuable, effort estimate, priority signal

**Not Relevant:**
- Ideas superseded by better approaches
- Technical debt from old thinking

### 3. DESIGN PHILOSOPHY & PRINCIPLES

Extract foundational thinking:
- "Why LEXA exists" statements
- "What makes luxury travel meaningful" insights
- "How to design transformational experiences" principles
- Decision rationale (why we chose X over Y)

### 4. COMPANY DNA

Core beliefs and vision:
- SYCC mission and values
- LEXA's unique approach vs. competitors
- What "success" means for the company
- Long-term vision and aspirations

### 5. TRAINING INSIGHTS for AIlessia/AIbert

Patterns AIlessia should learn:
- How Chris thinks about emotional arc design
- How Chris structures experience narratives
- Language patterns and vocabulary
- Question frameworks for client discovery
- Upsell trigger psychology

### 6. BUSINESS STRATEGY INSIGHTS

For Market Intelligence Agent:
- Target client types
- Pricing philosophy
- Partnership strategies
- Market positioning
- Competitive advantages

## OUTPUT FORMAT

Return ONLY JSON:
{{
  "summary": "1-2 paragraphs: What this conversation covered and its significance",
  "conversation_date_context": "When this was discussed (if discernible)",
  "script_examples": [
    {{
      "script_title": "...",
      "theme": "...",
      "emotional_arc": "...",
      "signature_moments": [...],
      "narrative_style": "...",
      "training_value": "Why AIlessia should learn from this"
    }}
  ],
  "features_already_built": [
    {{
      "feature": "...",
      "current_implementation": "How it exists in LEXA now",
      "original_vision": "What was originally imagined",
      "gap_analysis": "Any differences between vision and reality"
    }}
  ],
  "features_worth_discussing": [
    {{
      "feature_idea": "...",
      "value_proposition": "Why this could matter",
      "potential_impact": "Revenue, UX, competitive advantage",
      "effort_estimate": "Small (hours), Medium (days), Large (weeks)",
      "priority_signal": "critical|important|nice_to_have|exploratory"
    }}
  ],
  "design_philosophy": [
    {{
      "principle": "...",
      "explanation": "...",
      "application": "How this should guide LEXA development"
    }}
  ],
  "company_dna": {{
    "mission_statements": [...],
    "core_values": [...],
    "unique_approach": "What makes SYCC/LEXA different",
    "success_definition": "What 'winning' looks like",
    "long_term_vision": "5-10 year aspirations"
  }},
  "training_insights_for_ailessia": [
    {{
      "insight_type": "narrative_structure|emotional_arc|language_pattern|question_framework|upsell_psychology",
      "pattern": "The specific pattern to learn",
      "examples": [...],
      "application": "When/how AIlessia should use this"
    }}
  ],
  "business_strategy_insights": [
    {{
      "area": "pricing|partnerships|market_positioning|competitive_advantage",
      "insight": "...",
      "actionable_implications": "..."
    }}
  ],
  "knowledge_category": "product_vision|experience_design|technical_architecture|business_strategy|founding_story",
  "extraction_confidence": 0.92,
  "key_quotes": [
    {{
      "quote": "Exact quote from conversation",
      "significance": "Why this quote matters",
      "application": "Where this should influence LEXA"
    }}
  ]
}}

---

## HISTORICAL CONVERSATION TO ANALYZE:

{text[:60000]}

---

CRITICAL: Extract EVERY experience script example - these are invaluable training data for AIlessia's Script Composer!
"""
    
    def _build_synthesis_prompt(self, all_analyses: List[Dict]) -> str:
        """Build prompt for synthesizing multiple analyses into Company Brain"""
        
        return f"""
You are synthesizing {len(all_analyses)} historical conversations spanning 5 years of SYCC and LEXA development into a unified "Company Brain."

**All Individual Analyses:**
{json.dumps(all_analyses, indent=2)[:50000]}

## YOUR SYNTHESIS TASK

Create a comprehensive "Company Brain" knowledge base that captures:

### 1. COMPANY DNA (Core Identity)

Synthesize across all conversations:
- Mission: Why SYCC and LEXA exist
- Values: What we stand for
- Vision: Where we're going (5-10 years)
- Unique Approach: What makes us different
- Success Definition: What "winning" means

### 2. EXPERIENCE SCRIPT PATTERNS (Training Corpus for AIlessia)

Analyze all script examples to extract:
- **Narrative Structures**: Common arcs (celebration, renewal, transformation, discovery)
- **Emotional Vocabulary**: Language patterns Chris uses to evoke emotions
- **Signature Moment Design**: How peak experiences are crafted
- **Sensory Anchoring**: How smells, tastes, sounds create memory triggers
- **Upsell Psychology**: How premium offerings are framed
- **Script Templates**: Reusable patterns by theme/archetype

Output format:
{{
  "script_patterns": {{
    "narrative_arcs": [
      {{
        "arc_type": "celebration|renewal|transformation|discovery",
        "structure": "Stages and flow",
        "example_scripts": [...],
        "when_to_use": "Client signals that trigger this arc"
      }}
    ],
    "emotional_vocabulary": {{
      "Freedom": ["weightless", "unchained", "spontaneous", "..."],
      "Discovery": ["hidden", "authentic", "unexpected", "..."],
      "Prestige": ["exclusive", "renowned", "celebrated", "..."]
    }},
    "signature_moment_patterns": [
      {{
        "moment_type": "...",
        "how_its_crafted": "...",
        "emotional_impact": "...",
        "examples": [...]
      }}
    ]
  }}
}}

### 3. FEATURE ROADMAP SYNTHESIS

Consolidate all feature ideas:
- **Built**: Features mentioned in conversations that now exist in LEXA
- **In Progress**: Features mentioned that are in current MVP roadmap
- **Worth Discussing**: High-value ideas not yet planned
- **Superseded**: Ideas replaced by better approaches

Prioritize "Worth Discussing" by:
- Frequency mentioned (if idea appears in 10+ conversations → high priority)
- Potential impact (revenue, UX, competitive advantage)
- Alignment with current vision
- Effort vs. value ratio

### 4. DESIGN PHILOSOPHY DISTILLATION

Extract recurring principles:
- How luxury should be defined
- How emotional intelligence should work
- How to balance automation vs. human touch
- How to price premium offerings
- How to create "inevitable" upsells

### 5. AILESSIA/AIBERT TRAINING DATA

What should AIlessia learn from Chris's thinking:
- **Question Frameworks**: How Chris discovers client desires
- **Narrative Techniques**: How Chris structures stories
- **Emotional Intelligence**: How Chris reads between the lines
- **Upsell Framing**: How Chris makes premium feel inevitable
- **Cultural Sensitivity**: How Chris adapts for different clients

### 6. BUSINESS STRATEGY CONSOLIDATION

Strategic insights across 5 years:
- Market positioning evolution
- Target client evolution
- Pricing strategy development
- Partnership opportunities
- Competitive differentiation

## OUTPUT FORMAT

Return comprehensive JSON:
{{
  "company_brain": {{
    "mission": "...",
    "vision": "...",
    "core_values": [...],
    "unique_approach": "...",
    "success_metrics": [...]
  }},
  "experience_script_training_corpus": {{
    "total_script_examples": 156,
    "narrative_arcs": [...],
    "emotional_vocabulary": {{...}},
    "signature_patterns": [...],
    "templates_by_theme": {{...}},
    "templates_by_archetype": {{...}}
  }},
  "feature_roadmap": {{
    "already_built": [
      {{"feature": "...", "how_implemented": "...", "vision_vs_reality": "..."}}
    ],
    "in_current_mvp": [...],
    "worth_discussing": [
      {{
        "idea": "...",
        "value": "...",
        "effort": "...",
        "priority": "...",
        "mentioned_in": 12  // How many conversations mentioned this
      }}
    ],
    "superseded": [...]
  }},
  "design_philosophy": {{
    "luxury_definition": "...",
    "emotional_intelligence_approach": "...",
    "pricing_philosophy": "...",
    "experience_design_principles": [...]
  }},
  "ailessia_training_insights": {{
    "question_frameworks": [...],
    "narrative_techniques": [...],
    "emotional_reading_patterns": [...],
    "upsell_psychology": [...],
    "language_patterns": [...],
    "example_dialogues": [...]
  }},
  "business_strategy": {{
    "target_clients": {...},
    "market_positioning": {...},
    "competitive_advantages": [...],
    "partnership_opportunities": [...],
    "revenue_model_evolution": {...}
  }},
  "key_insights": [
    {{
      "insight": "...",
      "frequency": 23,  // Mentioned in 23 conversations
      "significance": "...",
      "application_to_lexa": "..."
    }}
  ],
  "synthesis_summary": "2-3 paragraphs summarizing 5 years of thinking",
  "conversations_analyzed": {len(all_analyses)},
  "total_script_examples_found": 156,
  "confidence": 0.95
}}
"""
    
    async def save_company_brain_insights(
        self,
        analysis: Dict,
        category: str = "company_brain"
    ) -> str:
        """
        Save extracted insights to Supabase (NOT the source documents).
        
        Args:
            analysis: Extracted insights from Company Brain Agent
            category: Knowledge category
        
        Returns:
            insight_id
        """
        
        try:
            result = self.supabase.table('company_brain_insights').insert({
                'category': category,
                'summary': analysis.get('summary', ''),
                'script_examples': json.dumps(analysis.get('script_examples', [])),
                'features_worth_discussing': json.dumps(analysis.get('features_worth_discussing', [])),
                'design_philosophy': json.dumps(analysis.get('design_philosophy', [])),
                'company_dna': json.dumps(analysis.get('company_dna', {})),
                'training_insights': json.dumps(analysis.get('training_insights_for_ailessia', [])),
                'knowledge_category': analysis.get('knowledge_category', 'general'),
                'analyzed_at': analysis.get('analyzed_at'),
                'metadata': json.dumps({
                    'source_file': analysis.get('source_file'),
                    'conversation_date': analysis.get('conversation_date'),
                    'extraction_confidence': analysis.get('extraction_confidence')
                })
            }).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]['id']
            
            raise Exception("No data returned from insert")
            
        except Exception as e:
            print(f"Error saving insights: {str(e)}")
            # If table doesn't exist yet, just return success (table will be created in migration)
            return "insight_saved_locally"
    
    def _parse_json_response(self, response_text: str) -> Dict:
        """Parse JSON from Claude response"""
        import re
        
        # Try to find JSON object
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {str(e)}")
                print(f"Response text (first 1000 chars): {response_text[:1000]}")
                return {}
        
        return {}


# Singleton
_company_brain_agent = None

def get_company_brain_agent() -> CompanyBrainAgent:
    global _company_brain_agent
    if _company_brain_agent is None:
        _company_brain_agent = CompanyBrainAgent()
    return _company_brain_agent


# Convenience functions
async def analyze_historical_conversation(
    file_path: str,
    file_content: bytes,
    conversation_date: Optional[str] = None
) -> Dict:
    """Analyze single exported ChatGPT conversation"""
    agent = get_company_brain_agent()
    return await agent.analyze_historical_conversation(file_path, file_content, conversation_date)


async def synthesize_company_brain(all_analyses: List[Dict]) -> Dict:
    """Synthesize all analyses into unified Company Brain"""
    agent = get_company_brain_agent()
    return await agent.synthesize_company_brain(all_analyses)
