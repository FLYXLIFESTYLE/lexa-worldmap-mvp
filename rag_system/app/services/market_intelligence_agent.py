"""
Market Intelligence Agent - Strategic insights for business decisions

Analyzes aggregated user data to advise Chris, Paul, and Bakary on:
- SYCC cruise creation (destinations, themes, pricing)
- Demand patterns (which destinations/emotions are trending)
- Archetype analysis (which client types to target)
- Pricing optimization (conversion opportunities)
- Content gaps (which POIs to collect)

Interactive Q&A for strategic questions.
"""

import os
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import anthropic

from app.services.supabase_client import get_supabase
from app.services.lexa_extraction_context import get_lexa_extraction_context


class MarketIntelligenceAgent:
    """
    Strategic advisor for LEXA business decisions.
    Analyzes aggregated user data and provides ROI-projected recommendations.
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
    
    async def answer_strategic_question(
        self,
        question: str,
        time_period: str = "last_90_days"
    ) -> Dict:
        """
        Answer strategic questions from Chris, Paul, or Bakary.
        
        Examples:
        - "How many of our users are Cultural Connoisseur archetype?"
        - "What would be a great destination for Art & Culinary cruise besides French Riviera?"
        - "What theme should we create a SYCC cruise for that matches most users?"
        
        Args:
            question: Natural language question
            time_period: "last_30_days", "last_90_days", "all_time"
        
        Returns:
            {
                "question": "...",
                "answer": "...",
                "data_summary": {...},
                "recommendations": [...],
                "confidence": 0.85
            }
        """
        
        if not self.client:
            raise RuntimeError("Anthropic client not initialized. Set ANTHROPIC_API_KEY.")
        
        # 1. Gather relevant data
        aggregated_data = await self._gather_aggregated_data(time_period)
        
        # 2. Build strategic analysis prompt
        lexa_context = get_lexa_extraction_context()
        prompt = self._build_strategic_qa_prompt(question, aggregated_data, lexa_context)
        
        # 3. Call Claude for analysis
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = response.content[0].text if hasattr(response.content[0], 'text') else str(response.content[0])
            
            # Parse JSON response
            parsed = self._parse_strategic_response(response_text)
            
            return {
                "question": question,
                "answer": parsed.get("answer", ""),
                "data_summary": parsed.get("data_summary", {}),
                "recommendations": parsed.get("recommendations", []),
                "confidence": parsed.get("confidence", 0.7),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Market Intelligence error: {str(e)}")
            raise Exception(f"Failed to answer strategic question: {str(e)}")
    
    async def get_cruise_recommendations(
        self,
        focus: Optional[str] = None,
        min_users: int = 50
    ) -> List[Dict]:
        """
        Get SYCC cruise recommendations based on demand analysis.
        
        Args:
            focus: Optional focus area ("archetype_gaps", "high_demand", "emerging_trends")
            min_users: Minimum user count to consider
        
        Returns:
            List of cruise recommendations with ROI projections
        """
        
        aggregated_data = await self._gather_aggregated_data("all_time")
        lexa_context = get_lexa_extraction_context()
        
        prompt = f"""
{lexa_context}

---

## MARKET INTELLIGENCE TASK: SYCC Cruise Recommendations

You are advising Chris, Paul, and Bakary on which SYCC cruises to create.

**Aggregated User Data:**
{json.dumps(aggregated_data, indent=2)}

**Your Task:**

Analyze the data and recommend 3-5 SYCC cruises to create, prioritized by ROI potential.

For each recommendation, provide:

1. **Cruise Name** (emotional + destination)
2. **Target Archetype** (which of LEXA's 5 archetypes)
3. **Emotional Theme** (which emotions to emphasize, with intensities)
4. **Destination** (specific region/route)
5. **Duration** (days typical for this theme)
6. **Pricing Tier** (Discovery €497, Blueprint €1,497, Concierge €2,997, White Glove €5k-8k/day)
7. **Demand Evidence** (user mentions, emotional profile matches)
8. **POI Coverage** (do we have enough verified POIs?)
9. **Competitive Differentiation** (what makes this unique vs. other cruises?)
10. **Revenue Projection** (capacity × frequency × price)
11. **Required Actions** (POI collection needed, partnerships, etc.)

Return JSON:
{{
  "recommendations": [
    {{
      "cruise_name": "...",
      "priority": 1-5,
      "target_archetype": "...",
      "emotional_theme": [...],
      "destination": "...",
      "duration_days": 7,
      "pricing_tier": "Concierge",
      "avg_price": 2997,
      "demand_evidence": {{
        "user_mentions": 312,
        "emotional_match_count": 487,
        "archetype_match_percentage": 62
      }},
      "poi_coverage": {{
        "current_verified_pois": 45,
        "needed_pois": 60,
        "gap": 15
      }},
      "competitive_differentiation": "...",
      "revenue_projection": {{
        "capacity_per_cruise": 12,
        "cruises_per_year": 6,
        "revenue_per_cruise": 35964,
        "annual_revenue": 215784,
        "estimated_margin_pct": 47,
        "net_profit": 101418
      }},
      "required_actions": [...],
      "timeline_months": 4,
      "confidence": 0.92
    }}
  ],
  "overall_strategy": "...",
  "priorities": [...]
}}
"""
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=5000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = response.content[0].text if hasattr(response.content[0], 'text') else str(response.content[0])
            parsed = self._parse_json_response(response_text)
            
            return parsed.get("recommendations", [])
            
        except Exception as e:
            print(f"Cruise recommendation error: {str(e)}")
            raise
    
    async def analyze_archetype_distribution(self) -> Dict:
        """
        Analyze which client archetypes are in the user base.
        
        Returns archetype counts, percentages, and gap analysis.
        """
        
        # Query user profiles for archetype data
        result = self.supabase.table('lexa_user_profiles').select(
            'personality_archetype, core_emotions, travel_style'
        ).execute()
        
        profiles = result.data if result.data else []
        
        # Aggregate by archetype
        archetype_counts = {}
        emotion_frequencies = {}
        
        for profile in profiles:
            archetype = profile.get('personality_archetype') or 'Unknown'
            archetype_counts[archetype] = archetype_counts.get(archetype, 0) + 1
            
            # Count emotion frequencies
            emotions = profile.get('core_emotions') or []
            for emotion in emotions:
                emotion_frequencies[emotion] = emotion_frequencies.get(emotion, 0) + 1
        
        total_users = len(profiles)
        
        return {
            "total_users": total_users,
            "archetype_distribution": {
                archetype: {
                    "count": count,
                    "percentage": round(count / total_users * 100, 1) if total_users > 0 else 0
                }
                for archetype, count in sorted(archetype_counts.items(), key=lambda x: x[1], reverse=True)
            },
            "top_emotions": sorted(emotion_frequencies.items(), key=lambda x: x[1], reverse=True)[:10],
            "total_profiles": total_users
        }
    
    async def _gather_aggregated_data(self, time_period: str = "last_90_days") -> Dict:
        """
        Gather aggregated data from all LEXA systems.
        """
        
        # Calculate time filter
        if time_period == "last_30_days":
            since = datetime.utcnow() - timedelta(days=30)
        elif time_period == "last_90_days":
            since = datetime.utcnow() - timedelta(days=90)
        else:
            since = datetime(2020, 1, 1)  # All time
        
        since_iso = since.isoformat()
        
        # 1. User emotional profiles
        profiles_result = self.supabase.table('lexa_user_profiles').select(
            'personality_archetype, core_emotions, travel_style, sensory_preferences, created_at'
        ).gte('created_at', since_iso).execute()
        
        profiles = profiles_result.data if profiles_result.data else []
        
        # 2. Conversation messages (for destination mentions)
        messages_result = self.supabase.table('lexa_messages').select(
            'content, created_at'
        ).gte('created_at', since_iso).limit(10000).execute()
        
        messages = messages_result.data if messages_result.data else []
        
        # 3. Experience briefs (structured requirements)
        briefs_result = self.supabase.table('experience_briefs').select(
            'where_at, theme, emotional_goals, budget, duration, created_at'
        ).gte('created_at', since_iso).execute()
        
        briefs = briefs_result.data if briefs_result.data else []
        
        # 4. Script library (which themes generate scripts)
        scripts_result = self.supabase.table('lexa_script_library').select(
            'theme_category, destination, emotional_tags, created_at'
        ).gte('created_at', since_iso).execute()
        
        scripts = scripts_result.data if scripts_result.data else []
        
        # 5. Membership data
        memberships_result = self.supabase.table('user_memberships').select(
            'tier_id, status, created_at'
        ).gte('created_at', since_iso).execute()
        
        memberships = memberships_result.data if memberships_result.data else []
        
        # 6. Upsell purchases
        upsells_result = self.supabase.table('user_upsell_purchases').select(
            'package_id, purchase_price, created_at'
        ).gte('created_at', since_iso).execute()
        
        upsells = upsells_result.data if upsells_result.data else []
        
        # Aggregate insights
        return {
            "time_period": time_period,
            "summary": {
                "total_users": len(profiles),
                "total_conversations": len(messages),
                "total_briefs": len(briefs),
                "total_scripts": len(scripts),
                "total_memberships": len(memberships),
                "total_upsells": len(upsells)
            },
            "archetype_distribution": self._aggregate_archetypes(profiles),
            "emotion_distribution": self._aggregate_emotions(profiles),
            "destination_mentions": self._count_destination_mentions(messages),
            "theme_popularity": self._aggregate_themes(briefs, scripts),
            "budget_patterns": self._aggregate_budgets(briefs),
            "duration_patterns": self._aggregate_durations(briefs),
            "tier_distribution": self._aggregate_tiers(memberships),
            "upsell_conversion": self._aggregate_upsells(upsells),
            "raw_data_counts": {
                "profiles": len(profiles),
                "messages": len(messages),
                "briefs": len(briefs),
                "scripts": len(scripts),
                "memberships": len(memberships),
                "upsells": len(upsells)
            }
        }
    
    def _aggregate_archetypes(self, profiles: List[Dict]) -> Dict:
        """Aggregate personality archetypes from profiles"""
        counts = {}
        for p in profiles:
            archetype = p.get('personality_archetype') or 'Unknown'
            counts[archetype] = counts.get(archetype, 0) + 1
        
        total = len(profiles)
        return {
            archetype: {
                "count": count,
                "percentage": round(count / total * 100, 1) if total > 0 else 0
            }
            for archetype, count in sorted(counts.items(), key=lambda x: x[1], reverse=True)
        }
    
    def _aggregate_emotions(self, profiles: List[Dict]) -> Dict:
        """Aggregate core emotions from profiles"""
        emotion_counts = {}
        emotion_intensities = {}
        
        for p in profiles:
            emotions = p.get('core_emotions') or []
            for emotion in emotions:
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        total_profiles = len(profiles)
        return {
            emotion: {
                "count": count,
                "percentage": round(count / total_profiles * 100, 1) if total_profiles > 0 else 0
            }
            for emotion, count in sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True)
        }
    
    def _count_destination_mentions(self, messages: List[Dict]) -> Dict:
        """Count destination mentions in conversations"""
        # Common luxury destinations to track
        destinations = [
            "French Riviera", "Monaco", "Cannes", "Saint-Tropez", "Nice",
            "Santorini", "Mykonos", "Greek Islands", "Cyclades",
            "Amalfi Coast", "Positano", "Capri", "Portofino",
            "Maldives", "Seychelles", "Bora Bora", "Tahiti",
            "Dubai", "Abu Dhabi", "Arabian Gulf",
            "Ibiza", "Mallorca", "Balearics",
            "Caribbean", "St Barth", "Anguilla",
            "Tuscany", "Florence", "Rome", "Venice",
            "Paris", "London", "Barcelona"
        ]
        
        counts = {dest: 0 for dest in destinations}
        
        for msg in messages:
            content = msg.get('content', '').lower()
            for dest in destinations:
                if dest.lower() in content:
                    counts[dest] += 1
        
        # Sort by mention count
        return {
            dest: mentions
            for dest, mentions in sorted(counts.items(), key=lambda x: x[1], reverse=True)
            if mentions > 0
        }
    
    def _aggregate_themes(self, briefs: List[Dict], scripts: List[Dict]) -> Dict:
        """Aggregate theme popularity from briefs and scripts"""
        theme_counts = {}
        
        for brief in briefs:
            theme = brief.get('theme')
            if theme:
                theme_counts[theme] = theme_counts.get(theme, 0) + 1
        
        for script in scripts:
            theme = script.get('theme_category')
            if theme:
                theme_counts[theme] = theme_counts.get(theme, 0) + 1
        
        total = len(briefs) + len(scripts)
        return {
            theme: {
                "count": count,
                "percentage": round(count / total * 100, 1) if total > 0 else 0
            }
            for theme, count in sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)
        }
    
    def _aggregate_budgets(self, briefs: List[Dict]) -> Dict:
        """Aggregate budget patterns from briefs"""
        budgets = []
        for brief in briefs:
            budget_data = brief.get('budget')
            if budget_data and isinstance(budget_data, dict):
                amount = budget_data.get('amount')
                if amount:
                    budgets.append(float(amount))
        
        if not budgets:
            return {}
        
        return {
            "count": len(budgets),
            "average": round(sum(budgets) / len(budgets), 2),
            "median": sorted(budgets)[len(budgets) // 2],
            "min": min(budgets),
            "max": max(budgets),
            "ranges": {
                "under_5k": len([b for b in budgets if b < 5000]),
                "5k_to_10k": len([b for b in budgets if 5000 <= b < 10000]),
                "10k_to_25k": len([b for b in budgets if 10000 <= b < 25000]),
                "over_25k": len([b for b in budgets if b >= 25000])
            }
        }
    
    def _aggregate_durations(self, briefs: List[Dict]) -> Dict:
        """Aggregate duration patterns from briefs"""
        durations = []
        for brief in briefs:
            duration_data = brief.get('duration')
            if duration_data and isinstance(duration_data, dict):
                days = duration_data.get('days')
                if days:
                    durations.append(int(days))
        
        if not durations:
            return {}
        
        return {
            "count": len(durations),
            "average": round(sum(durations) / len(durations), 1),
            "most_common": max(set(durations), key=durations.count) if durations else 0,
            "ranges": {
                "weekend_2_3_days": len([d for d in durations if d in [2, 3]]),
                "week_4_7_days": len([d for d in durations if 4 <= d <= 7]),
                "extended_8_14_days": len([d for d in durations if 8 <= d <= 14]),
                "over_2_weeks": len([d for d in durations if d > 14])
            }
        }
    
    def _aggregate_tiers(self, memberships: List[Dict]) -> Dict:
        """Aggregate tier distribution"""
        tier_counts = {}
        for m in memberships:
            tier = m.get('tier_id') or 'Unknown'
            if m.get('status') == 'active':
                tier_counts[tier] = tier_counts.get(tier, 0) + 1
        
        total = sum(tier_counts.values())
        return {
            tier: {
                "count": count,
                "percentage": round(count / total * 100, 1) if total > 0 else 0
            }
            for tier, count in sorted(tier_counts.items(), key=lambda x: x[1], reverse=True)
        }
    
    def _aggregate_upsells(self, upsells: List[Dict]) -> Dict:
        """Aggregate upsell conversion patterns"""
        package_counts = {}
        total_revenue = 0.0
        
        for u in upsells:
            package = u.get('package_id') or 'Unknown'
            price = float(u.get('purchase_price') or 0)
            
            package_counts[package] = package_counts.get(package, 0) + 1
            total_revenue += price
        
        return {
            "total_purchases": len(upsells),
            "total_revenue": round(total_revenue, 2),
            "by_package": {
                package: {
                    "count": count,
                    "percentage": round(count / len(upsells) * 100, 1) if upsells else 0
                }
                for package, count in sorted(package_counts.items(), key=lambda x: x[1], reverse=True)
            }
        }
    
    def _build_strategic_qa_prompt(self, question: str, data: Dict, lexa_context: str) -> str:
        """Build prompt for strategic Q&A"""
        
        return f"""
{lexa_context}

---

## STRATEGIC QUESTION FROM LEXA FOUNDERS

Chris, Paul, or Bakary is asking you a strategic question about the business.

**Question:** {question}

**Available Data:**
{json.dumps(data, indent=2)}

**Your Task:**

Answer this question with investor-quality analysis:

1. **Direct Answer** (concise, data-driven)
2. **Data Summary** (key metrics supporting your answer)
3. **Recommendations** (2-4 actionable next steps with ROI projections)
4. **Confidence** (0-1, how certain are you?)

**Think like a strategic advisor:**
- Cite specific numbers from the data
- Project ROI where relevant
- Identify opportunities and risks
- Prioritize by impact
- Be actionable (clear next steps)

Return ONLY JSON:
{{
  "answer": "Direct answer to the question (2-3 paragraphs, data-driven)",
  "data_summary": {{
    "key_metric_1": "value",
    "key_metric_2": "value",
    "insight": "What this data reveals..."
  }},
  "recommendations": [
    {{
      "action": "Specific action to take",
      "rationale": "Why this matters",
      "projected_impact": "Revenue/users/conversion estimate",
      "effort": "Timeline or resource requirement",
      "priority": "critical|important|nice_to_have"
    }}
  ],
  "confidence": 0.85
}}
"""
    
    def _parse_strategic_response(self, response_text: str) -> Dict:
        """Parse JSON from Claude's strategic analysis"""
        return self._parse_json_response(response_text)
    
    def _parse_json_response(self, response_text: str) -> Dict:
        """Parse JSON from response text"""
        import re
        
        # Try to find JSON object
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {str(e)}")
                return {}
        
        return {}


# Singleton
_market_intelligence_agent = None

def get_market_intelligence_agent() -> MarketIntelligenceAgent:
    global _market_intelligence_agent
    if _market_intelligence_agent is None:
        _market_intelligence_agent = MarketIntelligenceAgent()
    return _market_intelligence_agent


# Convenience functions
async def answer_strategic_question(question: str, time_period: str = "last_90_days") -> Dict:
    """Answer strategic questions from founders"""
    agent = get_market_intelligence_agent()
    return await agent.answer_strategic_question(question, time_period)


async def get_cruise_recommendations(focus: Optional[str] = None, min_users: int = 50) -> List[Dict]:
    """Get SYCC cruise recommendations"""
    agent = get_market_intelligence_agent()
    return await agent.get_cruise_recommendations(focus, min_users)


async def analyze_archetype_distribution() -> Dict:
    """Analyze client archetype distribution"""
    agent = get_market_intelligence_agent()
    return await agent.analyze_archetype_distribution()
