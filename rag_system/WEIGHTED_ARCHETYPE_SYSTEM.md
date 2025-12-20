# Weighted Archetype System - Implementation Guide

## Overview

This system creates **multi-dimensional personality matching** between clients and POIs for ultra-personalized recommendations.

---

## Architecture

```
Client Emotional Profile → Weighted Archetype Calculator → Match Score
                ↓                                              ↓
Client Activity History  →  6D Personality Vector  →  POI Personality Scores
                ↓                                              ↓
Conversation Patterns   →   [0.0 - 1.0] x 6       →  Recommendation Engine
```

---

## Step 1: Calculate POI Personality Scores (Do This Now!)

### Run in Neo4j:
```bash
File: rag_system/database/schemas/calculate_poi_personality_scores.cypher
```

### What It Does:
Analyzes your 203k POIs and assigns 6 scores to each:
- `personality_romantic`: How appealing to romantics
- `personality_connoisseur`: How appealing to connoisseurs
- `personality_hedonist`: How appealing to hedonists
- `personality_contemplative`: How appealing to contemplatives
- `personality_achiever`: How appealing to achievers
- `personality_adventurer`: How appealing to adventurers

### Based On:
- POI name keywords (e.g., "romantic sunset", "michelin", "adventure")
- `luxury_score` (existing attribute)
- Category indicators

### Example Result:
```cypher
POI: "Private Yacht Sunset Monaco"
  personality_romantic: 0.95      // Perfect for romantics!
  personality_achiever: 0.85      // Great for status seekers
  personality_hedonist: 0.90      // Excellent for pleasure seekers
  personality_connoisseur: 0.70   // Good for quality appreciators
  personality_contemplative: 0.60 // Okay for reflective types
  personality_adventurer: 0.40    // Not adventurous
```

---

## Step 2: Calculate Client Archetype Weights (Automatic via AIlessia)

### When Client Talks to AIlessia:

```python
from core.ailessia.weighted_archetype_calculator import weighted_archetype_calculator

# AIlessia detects emotional resonances
emotional_resonances = {
    'Romance': 0.95,      # She strongly resonates with romance
    'Prestige': 0.85,     // She values prestige
    'Intimacy': 0.92      # She seeks intimacy
}

# AIlessia tracks activity history
activity_history = [
    {'name': 'Fine Dining', 'count': 5, 'rating': 5},
    {'name': 'Sunset Cruise', 'count': 2, 'rating': 5},
    {'name': 'Spa', 'count': 3, 'rating': 4}
]

# Calculate weighted archetype scores
client_weights = weighted_archetype_calculator.calculate_combined(
    emotional_resonances=emotional_resonances,
    activity_history=activity_history
)

# Result:
# ArchetypeWeights(
#     romantic=0.94,       # Strong romantic
#     connoisseur=0.78,    # Moderate connoisseur
#     hedonist=0.72,       # Moderate hedonist
#     contemplative=0.65,  # Some contemplative
#     achiever=0.55,       # Some achiever
#     adventurer=0.25      # Low adventurer
# )
```

---

## Step 3: Match Client to POIs (Ultra-Personalized!)

### In Neo4j:

```cypher
// Find POIs that match Victoria's weighted profile
MATCH (victoria:ClientProfile {id: 'victoria_uuid'})
MATCH (poi:poi)
WHERE poi.personality_romantic IS NOT NULL

WITH poi, victoria,
     // Multi-dimensional fit calculation
     (victoria.archetype_romantic * poi.personality_romantic +
      victoria.archetype_connoisseur * poi.personality_connoisseur +
      victoria.archetype_hedonist * poi.personality_hedonist +
      victoria.archetype_contemplative * poi.personality_contemplative +
      victoria.archetype_achiever * poi.personality_achiever +
      victoria.archetype_adventurer * poi.personality_adventurer) / 6.0 AS fit_score

WHERE fit_score > 0.80  // Only high matches!

RETURN poi.name, poi.location, fit_score,
       poi.personality_romantic AS romantic_appeal,
       poi.luxury_score AS luxury_level
ORDER BY fit_score DESC
LIMIT 20
```

### Result:
```
POI: "Private Yacht Sunset Monaco"
fit_score: 0.92  ✅ PERFECT MATCH!

POI: "Le Louis XV Michelin"
fit_score: 0.87  ✅ EXCELLENT MATCH!

POI: "Beach Hostel"
fit_score: 0.35  ❌ NO MATCH
```

---

## Step 4: Store Client Weights in Neo4j

### Sync to Neo4j:

```python
# After calculating weights, store on ClientProfile
await neo4j_client.execute_query("""
    MATCH (cp:ClientProfile {id: $account_id})
    SET cp.archetype_romantic = $romantic,
        cp.archetype_connoisseur = $connoisseur,
        cp.archetype_hedonist = $hedonist,
        cp.archetype_contemplative = $contemplative,
        cp.archetype_achiever = $achiever,
        cp.archetype_adventurer = $adventurer,
        cp.archetype_updated_at = datetime()
    RETURN cp.id
""", {
    'account_id': victoria_id,
    'romantic': client_weights.romantic,
    'connoisseur': client_weights.connoisseur,
    'hedonist': client_weights.hedonist,
    'contemplative': client_weights.contemplative,
    'achiever': client_weights.achiever,
    'adventurer': client_weights.adventurer
})
```

---

## Future: Codebreaker AI Integration

### Enhancement Point:

The `conversation_signals` parameter in `calculate_combined()` is reserved for **Codebreaker AI** integration:

```python
# Future: Add Codebreaker AI buying behavior analysis
from codebreaker_ai import analyze_buying_personality

# Analyze client's text with Codebreaker AI
buying_profile = analyze_buying_personality(client_conversation_text)
# Returns: B.A.N.K. code (Blueprint, Action, Nurturing, Knowledge)

# Map to conversation signals
conversation_signals = {
    'achiever': buying_profile.action_score,      # Action → Achiever
    'contemplative': buying_profile.knowledge_score,  # Knowledge → Contemplative
    'romantic': buying_profile.nurturing_score,   # Nurturing → Romantic
    'connoisseur': buying_profile.blueprint_score  # Blueprint → Connoisseur
}

# Enhanced calculation
client_weights = weighted_archetype_calculator.calculate_combined(
    emotional_resonances=emotional_resonances,
    activity_history=activity_history,
    conversation_signals=conversation_signals,  # ← Codebreaker AI input!
    emotion_weight=0.40,
    activity_weight=0.35,
    conversation_weight=0.25  # Give Codebreaker AI significant weight
)
```

---

## Quick Start Checklist

- [ ] **Step 1:** Run `calculate_poi_personality_scores.cypher` in Neo4j
- [ ] **Step 2:** Verify POI scores: `MATCH (p:poi) RETURN p.personality_romantic LIMIT 10`
- [ ] **Step 3:** Test calculator: See example in `weighted_archetype_calculator.py`
- [ ] **Step 4:** Integrate into AIlessia conversation flow
- [ ] **Step 5:** (Future) Add Codebreaker AI buying behavior signals

---

## Why This Works Better Than Single Dimensions

### Old Way (One Dimension):
```
Client likes luxury → Show luxury POIs
Problem: Too broad, not personalized
```

### New Way (Six Dimensions):
```
Client Profile:
- romantic: 0.94 (very high)
- luxury_seeking: 0.85 (high)
- adventurous: 0.25 (low)

POI Match:
✅ Luxury romantic sunset yacht (0.92 fit)
❌ Luxury adventure safari (0.45 fit - wrong emotional profile!)
```

**Result:** Recommendations that resonate emotionally, not just financially!

---

## Summary

1. **POIs get 6D personality scores** (based on attributes)
2. **Clients get 6D archetype weights** (based on emotions + activities)
3. **Match = Dot product** (multi-dimensional similarity)
4. **Future: Enhanced by Codebreaker AI** buying behavior analysis

**This is the foundation for truly personalized luxury travel recommendations!** 🎯


