# Extraction Quality Gap Analysis

**Date:** January 6, 2026  
**Issue:** LEXA extraction produces basic data; direct Claude chat produces rich insights

---

## THE PROBLEM

### What LEXA Currently Extracts (Bloomberg Article):
```
POI: "Pursuits" - Confidence: 50%
POI: "Here Are the 11 Most Exciting Luxury Hotels" - Confidence: 50%
POI: "Opening in 2026" - Confidence: 50%
POI: "A look at the properties we're most keen to check into..." - Confidence: 50%
POI: "December 26, 2025 at 6" - Type: Date - Confidence: 50%
```

**Result:** 40 low-quality POIs, mostly article metadata, no insights

### What Direct Claude Chat Extracts (Same Article):
```
11 hotels with complete details:
- Hotel names, locations, room counts, pricing
- Historical context (90-year theater, King's palace)
- Emotional mapping with intensities (Prestige: 10/10, Discovery: 9/10)
- Client archetypes (Ultra-HNW Exclusivity Seeker, Cultural Connoisseur)
- Trend analysis (shift away from cookie-cutter luxury)
- Neo4j relationship examples
- Conversation triggers
- Investor pitch implications
- Competitive insights
```

**Result:** Rich, actionable intelligence ready for MVP demonstration

---

## ROOT CAUSE ANALYSIS

### Why Direct Claude Chat Wins:

1. **Rich System Context**
   - The chat "knows" LEXA's emotional framework (9 core emotions)
   - The chat "knows" LEXA's business model (tiers, upsells, marketplace)
   - The chat "knows" LEXA's client archetypes
   - The chat "knows" what data is "valuable" for investors

2. **Multi-Step Reasoning**
   - Discovery: "Let me find this article"
   - Extraction: "Let me extract the hotels"
   - Analysis: "Let me map emotions and archetypes"
   - Insights: "Let me explain why this matters for your MVP"

3. **Business Intelligence Lens**
   - Every extraction includes "Why this matters for LEXA"
   - Competitive positioning ("these hotels validate your emotional AI approach")
   - Monetization implications ("ultra-exclusive properties command ultra-premium")
   - Demo opportunities ("show how AI recommends Diriyah Palace to Legacy Builder")

4. **Conversational Memory**
   - The chat remembers previous discussions about LEXA Brain, tiers, emotional framework
   - Can reference "your Wellness Cruise" and compare
   - Understands the MVP completion roadmap context

### Why LEXA's Extraction Fails:

1. **No LEXA-Specific Context**
   - Generic prompt: "Extract POIs from text"
   - No emotional framework injected
   - No client archetype examples
   - No luxury travel context

2. **Missing Business Intelligence Layer**
   - Prompts don't ask for "trend analysis"
   - Prompts don't ask for "why this matters for luxury travel AI"
   - Prompts don't ask for "client archetype mapping"
   - Prompts don't ask for "competitive insights"

3. **No Multi-Pass Analysis**
   - Single pass extraction, no reflection
   - No "analyze what I extracted and explain significance" step
   - No "map to LEXA's emotional framework" step

4. **Generic Parsing**
   - Extracts surface-level text fragments
   - Doesn't understand luxury travel domain
   - Doesn't apply emotional intelligence lens

---

## THE SOLUTION

### Required Changes to LEXA Extraction:

#### 1. **Inject LEXA Context into System Prompt**

Add this context to every extraction:

```python
LEXA_EXTRACTION_CONTEXT = """
# WHO YOU ARE EXTRACTING FOR

You are extracting intelligence for LEXA, an AI-powered luxury travel assistant 
that uses emotional intelligence to design personalized experiences.

## LEXA's Emotional Framework (9 Core Emotions)

Every extracted hotel, experience, or destination should be mapped to these emotions with intensity scores (1-10):

1. **Exclusivity** - Private access, limited availability, VIP treatment
2. **Prestige** - Status, recognition, luxury brands, celebrity heritage
3. **Discovery** - Cultural immersion, new places, authentic experiences
4. **Indulgence** - Pampering, luxury amenities, exceptional service
5. **Romance** - Intimate settings, couple experiences, emotional connection
6. **Adventure** - Active experiences, wilderness, exploration
7. **Legacy** - Historical significance, family traditions, meaningful moments
8. **Freedom** - Flexibility, space, unrestricted access
9. **Transformation** - Personal growth, wellness, life-changing experiences

## LEXA's Client Archetypes

Map extracted experiences to these client types:

1. **Ultra-HNW Exclusivity Seeker**
   - Seeks: Prestige (10) + Exclusivity (10) + Discovery (8)
   - Budget: Unlimited
   - Pain points: Cookie-cutter luxury, predictable experiences
   - Examples: Private island resorts, royal palaces, 6-room boutique hotels

2. **Cultural Connoisseur**
   - Seeks: Discovery (10) + Connection (9) + Prestige (8)
   - Budget: High
   - Pain points: Touristy experiences, superficial culture
   - Examples: Historic conversions, local artisan collaborations

3. **Adventure-Luxury Traveler**
   - Seeks: Adventure (10) + Discovery (9) + Exclusivity (8)
   - Budget: High
   - Pain points: Boring resort vacations, lack of activities
   - Examples: Safari lodges, multi-location journeys, diving resorts

4. **Romantic Escape Seeker**
   - Seeks: Romance (9) + Indulgence (9) + Exclusivity (8)
   - Budget: Moderate-High
   - Pain points: Crowded resorts, lack of intimacy
   - Examples: Intimate boutiques, private villas, couples-only experiences

5. **Legacy Builder / Milestone Celebrator**
   - Seeks: Legacy (9) + Prestige (9) + Indulgence (8)
   - Budget: Very High
   - Pain points: Forgettable experiences, no emotional significance
   - Examples: Historic landmarks, once-in-a-lifetime experiences

## LEXA's Business Model Context

**Tiers:**
- Free (The Spark): €0/year, 1 script/year
- The Inspired: €3,564/year, 3 fully curated scripts/year
- The Connoisseur: €11,964/year, 5 fully curated scripts/year

**Upsells (Per Experience):**
- Discovery: €497 (Day by day flow, venues, logistics)
- Blueprint: €1,497 (Booking links, coordinates, optimization)
- Concierge: €2,997 (Full planning, booking, VIP access)
- White Glove: €5k-8k/day (Yacht/jet coordination, onsite concierge)

## What Makes Data "Valuable" for LEXA

When extracting, prioritize data that:
- Has clear emotional dimensions (not just factual)
- Targets luxury/UHNW travelers (not budget tourism)
- Offers unique/exclusive access (not mass tourism)
- Includes pricing intelligence (helps tier/upsell positioning)
- Shows market trends (helps competitive positioning)
- Demonstrates ROI for clients (helps conversion)
"""
```

#### 2. **Upgrade Extraction Prompts**

Current prompt says:
> "Extract POIs, experiences, trends..."

Should say:
> "Extract intelligence like a luxury travel advisor preparing an investor pitch. 
> For each hotel: What emotions does it evoke (with intensities)? 
> Which client archetype would love this? 
> What trend does it exemplify? 
> How would LEXA recommend this in a conversation?"

#### 3. **Add Business Intelligence Pass**

After extracting data, add a pass that asks:
- "What luxury travel trends does this exemplify?"
- "Why would investors care about this data?"
- "How does this validate LEXA's emotional AI approach?"
- "What client segments would pay premium for this?"

#### 4. **Add Investor-Lens Extraction**

Every extraction should include:
```json
{
  "investor_insights": {
    "trend_validation": "How this data validates LEXA's approach",
    "market_opportunity": "What this reveals about luxury market",
    "competitive_positioning": "How LEXA is differentiated",
    "monetization_angle": "Which tier/upsell this supports"
  }
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Upgrade System Context (1 hour)
- Create `LEXA_EXTRACTION_CONTEXT` constant
- Inject into all extraction prompts
- Include emotional framework, client archetypes, business model

### Phase 2: Enhance Extraction Rules (1 hour)
- Update `_build_comprehensive_prompt` in `intelligence_extractor.py`
- Add emotional intensity scoring (mandatory for all experiences)
- Add client archetype mapping (mandatory for all experiences)
- Add trend analysis (what shift does this exemplify?)

### Phase 3: Add Business Intelligence Pass (2 hours)
- New pass: "analyze" (after expand, before validate)
- Asks Claude to think like an investor/strategist
- Maps extracted data to LEXA's value proposition
- Generates conversation triggers and demo scenarios

### Phase 4: Create Rich Output Format (1 hour)
- Add markdown report generation (like your direct Claude chat)
- Include sections: Overview, Emotional Mapping, Client Archetypes, Trend Analysis, Neo4j Examples, Investor Pitch Value
- Make Captain Portal show this rich report, not just raw POI lists

---

## EXAMPLE: Upgraded Extraction Prompt

```python
async def extract_with_lexa_intelligence(text: str, source_file: str) -> Dict:
    prompt = f"""You are LEXA's senior intelligence analyst, extracting data for an AI-powered 
luxury travel assistant that uses emotional intelligence to design personalized experiences.

{LEXA_EXTRACTION_CONTEXT}

## YOUR TASK

Extract intelligence from this document with the lens of a luxury travel advisor preparing 
an investor pitch. For each hotel/experience/destination:

1. **Emotional Mapping** (mandatory)
   - Which of LEXA's 9 core emotions does this evoke?
   - What intensity (1-10) for each emotion?
   - What evidence supports each emotion score?

2. **Client Archetype Matching** (mandatory)
   - Which of LEXA's 5 client archetypes would love this?
   - What specific needs does it address for that archetype?
   - What pain points does it solve?

3. **Trend Analysis** (if applicable)
   - What luxury travel trend does this exemplify?
   - How does it shift from old luxury paradigms?
   - Why does this matter for LEXA's competitive positioning?

4. **Business Intelligence** (always)
   - Which tier/upsell level would feature this?
   - What conversation triggers should prompt LEXA to recommend this?
   - How would LEXA pitch this in a conversation (example dialogue)?

5. **Investor Pitch Value** (always)
   - Why would investors care about this data?
   - How does this validate LEXA's emotional AI approach?
   - What market opportunity does this reveal?

## OUTPUT FORMAT

Return JSON with:
{{
  "hotels": [{{
    "name": "...",
    "emotional_map": [
      {{"emotion": "Prestige", "intensity": 10, "evidence": "Former royal palace..."}},
      {{"emotion": "Discovery", "intensity": 9, "evidence": "First public access..."}}
    ],
    "client_archetypes": [
      {{
        "archetype": "Ultra-HNW Exclusivity Seeker",
        "match_score": 98,
        "why": "Royal residence = ultimate prestige + exclusivity"
      }}
    ],
    "trend_significance": {{
      "trend": "Historic conversions over new builds",
      "why_matters": "Validates shift toward authentic luxury with stories"
    }},
    "conversation_trigger": "Client says: 'Once-in-a-lifetime anniversary' OR 'Want to feel like royalty'",
    "lexa_pitch_example": "Have you considered Diriyah Palace? It's King Abdulaziz's actual residence...",
    "tier_positioning": "Connoisseur tier (€997/mo) + White Glove upsell",
    "investor_insight": "Proves ultra-exclusive (70 rooms) commands ultra-premium pricing"
  }}],
  "market_trends": [...],
  "competitive_insights": [...],
  "investor_pitch_summary": "..."
}}

Document:
{text}
"""
    return await call_claude(prompt)
```

---

## BENEFITS OF UPGRADE

### For Captains:
- See rich insights, not just raw POI lists
- Understand why data matters
- Make better keep/dump decisions

### For Investors:
- Extraction reports look professional
- Shows market understanding
- Demonstrates competitive intelligence

### For LEXA Brain:
- Higher quality knowledge graph
- Better conversation triggers
- More accurate client matching

### For MVP Demo:
- Can show "LEXA thinks like a luxury advisor"
- Can demonstrate emotional intelligence in action
- Can explain market positioning clearly

---

## NEXT STEPS

1. **Immediate:** Update extraction prompts with LEXA context
2. **Test:** Re-extract Bloomberg article with upgraded prompts
3. **Compare:** Side-by-side comparison of old vs. new extraction
4. **Deploy:** Push upgraded extraction to production
5. **Iterate:** Refine based on Captain feedback

---

**Should I implement these upgrades now?**
