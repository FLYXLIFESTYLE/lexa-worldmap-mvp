# Luxury Scoring System for Neo4j

> **📝 Note:** This document describes the original Python-based luxury scoring implementation. For the **complete, current scoring system** (including luxury scores, confidence scores, and integration), see [`SCORING_SYSTEM.md`](./SCORING_SYSTEM.md).
> 
> **Current Implementation:** `lib/neo4j/scoring-engine.ts` (TypeScript)

## Overview
This guide explains how to add luxury scoring to your POIs, destinations, and themes in Neo4j.

## Scoring Criteria

### Luxury Score Scale: 1-10
- **10**: Ultra-luxury, exclusive, world-class (Michelin 3-star, private islands, rare experiences)
- **9**: High-end luxury, premium service, exceptional quality
- **8**: Upscale, refined, excellent reputation
- **7**: Quality luxury, above average, good reputation
- **6**: Good standard, comfortable, pleasant
- **5**: Average/Standard
- **1-4**: Below average (generally not included in LEXA recommendations)

## Criteria for Scoring

### POIs (Points of Interest)
Consider:
- **Exclusivity**: How rare/unique is the experience?
- **Service level**: Staff-to-guest ratio, personalization
- **Quality**: Materials, craftsmanship, reputation
- **Privacy**: Can it be enjoyed without crowds?
- **Price point**: Reflects true luxury positioning
- **Recognition**: Awards, certifications, reviews

### Destinations
Consider:
- **Infrastructure quality**: Luxury hotels, fine dining density
- **Natural beauty**: Pristine, protected, scenic
- **Cultural significance**: Unique experiences, authenticity
- **Accessibility**: Ease of luxury travel
- **Seasonality**: Climate, events, crowd levels
- **Safety & security**: Peace of mind

### Themes
Consider:
- **Emotional resonance**: Depth of experience
- **Customization potential**: Tailorability
- **Exclusivity**: Not widely available
- **Transformation**: Life-changing potential
- **Craftsmanship**: Attention to detail

## Implementation

### Option 1: Cypher Query Update
Run this query to add luxury scores to existing POIs:

\`\`\`cypher
// Update POIs with luxury scores
MATCH (p:POI)
WHERE p.type IN ['restaurant', 'hotel', 'resort']
  AND p.tags CONTAINS 'michelin'
SET p.luxuryScore = 10;

MATCH (p:POI)
WHERE p.type = 'beach'
  AND p.tags CONTAINS 'private'
SET p.luxuryScore = 9;

// Add more rules based on your data
\`\`\`

### Option 2: Python Script
Create a luxury scoring script:

\`\`\`python
from neo4j import GraphDatabase
import os

class LuxuryScorer:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            os.getenv("NEO4J_URI"),
            auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
        )
    
    def score_poi(self, poi):
        score = 5  # Base score
        
        # Increase for luxury indicators
        if 'michelin' in poi.get('tags', []):
            score += 4
        if 'private' in poi.get('tags', []):
            score += 2
        if 'exclusive' in poi.get('tags', []):
            score += 2
        if poi.get('type') == 'fine_dining':
            score += 1
            
        return min(score, 10)
    
    def update_scores(self):
        with self.driver.session() as session:
            # Get all POIs
            result = session.run("MATCH (p:POI) RETURN p")
            
            for record in result:
                poi = record['p']
                score = self.score_poi(dict(poi))
                
                # Update the POI
                session.run(
                    "MATCH (p:POI {id: $id}) SET p.luxuryScore = $score",
                    id=poi['id'],
                    score=score
                )
        
        print("Luxury scores updated!")

# Run the scorer
scorer = LuxuryScorer()
scorer.update_scores()
\`\`\`

### Option 3: Manual AI-Assisted Scoring
Use Claude to score each POI based on description:

\`\`\`python
import anthropic

def score_with_claude(poi_description, poi_type, tags):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    prompt = f"""Score this location for luxury travel (1-10):
    
Type: {poi_type}
Description: {poi_description}
Tags: {', '.join(tags)}

Criteria: exclusivity, quality, service, privacy, uniqueness.
Return only a number 1-10."""
    
    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return int(message.content[0].text.strip())
\`\`\`

## Next Steps

1. Choose your scoring method
2. Run the script or queries
3. Verify scores in Neo4j Browser
4. Test LEXA recommendations to ensure high-scoring POIs appear first

## Validation Query

Check your scoring distribution:

\`\`\`cypher
MATCH (p:POI)
WHERE p.luxuryScore IS NOT NULL
RETURN p.luxuryScore as score, count(*) as count
ORDER BY score DESC
\`\`\`

Target distribution:
- Score 9-10: ~10% (truly exceptional)
- Score 7-8: ~30% (excellent)
- Score 5-6: ~40% (good)
- Score 1-4: ~20% (exclude from recommendations)

