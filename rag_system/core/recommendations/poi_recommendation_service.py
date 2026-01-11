"""
POI Recommendation Service
==========================
Finds personalized POIs using weighted archetype matching + Neo4j queries
"""

from typing import List, Dict, Optional
import structlog

from database.neo4j_client import neo4j_client
from core.ailessia.weighted_archetype_calculator import (
    weighted_archetype_calculator,
    ArchetypeWeights
)

logger = structlog.get_logger()

MVP_DESTINATIONS = {
    "French Riviera",
    "Amalfi Coast",
    "Balearics",
    "Cyclades",
    "Adriatic North",
    "Adriatic Central",
    "Adriatic South",
    "Ionian Sea",
    "Bahamas",
    "BVI",
    "USVI",
    "French Antilles",
}

CITY_TO_MVP_DESTINATION = {
    "Monaco": "French Riviera",
    "St. Tropez": "French Riviera",
    "Cannes": "French Riviera",
    "Nice": "French Riviera",
}


def resolve_destination_terms(destination: str) -> List[str]:
    raw = (destination or "").strip()
    if not raw:
        return []
    if raw in MVP_DESTINATIONS:
        return [raw]
    parent = CITY_TO_MVP_DESTINATION.get(raw)
    if parent:
        return [raw, parent]
    return [raw]


class POIRecommendationService:
    """
    Provides ultra-personalized POI recommendations based on:
    - Client's weighted archetype profile (6D personality)
    - Emotional resonances
    - Activity preferences
    - Destination constraints
    """
    
    def __init__(self):
        """Initialize the recommendation service."""
        pass
    
    async def get_personalized_pois(
        self,
        client_weights: ArchetypeWeights,
        destination: str = "French Riviera",
        activity_types: Optional[List[str]] = None,
        min_luxury_score: float = 7.0,
        min_fit_score: float = 0.75,
        limit: int = 20
    ) -> List[Dict]:
        """
        Get personalized POI recommendations.
        
        Args:
            client_weights: Client's 6D archetype weights
            destination: Target destination
            activity_types: Optional list of activity types to filter
            min_luxury_score: Minimum luxury score (0-1)
            min_fit_score: Minimum personality fit score (0-1)
            limit: Max number of results
        
        Returns:
            List of POI dictionaries with fit scores
        """
        # Backward compatible: some callers may still pass 0-1 instead of 0-10.
        if min_luxury_score <= 1.0:
            min_luxury_score = min_luxury_score * 10.0

        # Build Cypher query for personality matching
        query = """
        MATCH (poi:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)
        MATCH (poi)-[:LOCATED_IN]->(d:destination)
        OPTIONAL MATCH (d)-[:IN_DESTINATION]->(mvp:destination {kind: 'mvp_destination'})
        WHERE any(term IN $destination_terms WHERE
          toLower(d.name) CONTAINS toLower(term)
          OR toLower(coalesce(mvp.name,'')) CONTAINS toLower(term)
        )
          AND coalesce(poi.luxury_score_verified, poi.luxury_score_base, poi.luxury_score, poi.luxuryScore) >= $min_luxury_score
          AND poi.personality_romantic IS NOT NULL
          AND NOT a.name IN ['Standard Experience', 'General Luxury Experience']
        """
        
        # Add activity type filter if specified
        if activity_types:
            query += """
          AND a.name IN $activity_types
        """
        
        # Add emotion and archetype connections
        query += """
        MATCH (a)-[:EVOKES]->(e:EmotionalTag)
        MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
        
        WITH poi, a,
             collect(DISTINCT e.name) AS emotions,
             collect(DISTINCT ca.name) AS archetypes,
             // Multi-dimensional fit calculation
             (
               $romantic * poi.personality_romantic +
               $connoisseur * poi.personality_connoisseur +
               $hedonist * poi.personality_hedonist +
               $contemplative * poi.personality_contemplative +
               $achiever * poi.personality_achiever +
               $adventurer * poi.personality_adventurer
             ) / 6.0 AS fit_score
        
        WHERE fit_score >= $min_fit_score
        
        RETURN poi.name AS name,
               poi.google_rating AS rating,
               poi.google_reviews_count AS reviews,
               poi.google_website AS website,
               coalesce(poi.luxury_score_verified, poi.luxury_score_base, poi.luxury_score, poi.luxuryScore) AS luxury,
               coalesce(poi.score_evidence, poi.luxury_evidence) AS evidence,
               a.name AS activity,
               emotions,
               archetypes,
               round(fit_score * 100) / 100 AS personality_fit,
               round(poi.personality_romantic * 100) / 100 AS romantic_appeal,
               round(poi.personality_connoisseur * 100) / 100 AS connoisseur_appeal,
               round(poi.personality_hedonist * 100) / 100 AS hedonist_appeal,
               round(poi.personality_contemplative * 100) / 100 AS contemplative_appeal,
               round(poi.personality_achiever * 100) / 100 AS achiever_appeal,
               round(poi.personality_adventurer * 100) / 100 AS adventurer_appeal
        
        ORDER BY fit_score DESC, poi.google_rating DESC
        LIMIT $limit
        """
        
        params = {
            "destination_terms": resolve_destination_terms(destination),
            "min_luxury_score": min_luxury_score,
            "min_fit_score": min_fit_score,
            "romantic": client_weights.romantic,
            "connoisseur": client_weights.connoisseur,
            "hedonist": client_weights.hedonist,
            "contemplative": client_weights.contemplative,
            "achiever": client_weights.achiever,
            "adventurer": client_weights.adventurer,
            "limit": limit
        }
        
        if activity_types:
            params["activity_types"] = activity_types
        
        result = await neo4j_client.execute_query(query, params)
        
        pois = []
        for record in result or []:
            pois.append({
                "name": record["name"],
                "rating": record.get("rating"),
                "reviews": record.get("reviews"),
                "website": record.get("website"),
                "luxury_score": record["luxury"],
                "score_evidence": record.get("evidence"),
                "activity": record["activity"],
                "emotions_evoked": record["emotions"],
                "archetypes": record["archetypes"],
                "personality_fit": record["personality_fit"],
                "personality_breakdown": {
                    "romantic": record["romantic_appeal"],
                    "connoisseur": record["connoisseur_appeal"],
                    "hedonist": record["hedonist_appeal"],
                    "contemplative": record["contemplative_appeal"],
                    "achiever": record["achiever_appeal"],
                    "adventurer": record["adventurer_appeal"]
                }
            })
        
        logger.info("POI recommendations generated",
                   destination=destination,
                   count=len(pois),
                   min_fit=min_fit_score)
        
        return pois
    
    async def get_pois_by_emotion(
        self,
        desired_emotions: List[str],
        destination: str = "French Riviera",
        min_luxury_score: float = 7.0,
        limit: int = 20
    ) -> List[Dict]:
        """
        Get POIs that evoke specific emotions.
        
        Args:
            desired_emotions: List of emotion names (e.g., ['Romance', 'Prestige'])
            destination: Target destination
            min_luxury_score: Minimum luxury score
            limit: Max results
        
        Returns:
            List of POI dictionaries
        """
        if min_luxury_score <= 1.0:
            min_luxury_score = min_luxury_score * 10.0

        query = """
        MATCH (poi:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[:EVOKES]->(e:EmotionalTag)
        MATCH (poi)-[:LOCATED_IN]->(d:destination)
        OPTIONAL MATCH (d)-[:IN_DESTINATION]->(mvp:destination {kind: 'mvp_destination'})
        MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
        WHERE any(term IN $destination_terms WHERE
          toLower(d.name) CONTAINS toLower(term)
          OR toLower(coalesce(mvp.name,'')) CONTAINS toLower(term)
        )
          AND coalesce(poi.luxury_score_verified, poi.luxury_score_base, poi.luxury_score, poi.luxuryScore) >= $min_luxury_score
          AND e.name IN $desired_emotions
          AND NOT a.name IN ['Standard Experience', 'General Luxury Experience']
        
        WITH poi, a,
             collect(DISTINCT e.name) AS emotions_evoked,
             collect(DISTINCT ca.name) AS archetypes,
             count(DISTINCT e) AS emotion_match_count
        
        WHERE emotion_match_count >= 1
        
        RETURN poi.name AS name,
               poi.google_rating AS rating,
               poi.google_reviews_count AS reviews,
               coalesce(poi.luxury_score_verified, poi.luxury_score_base, poi.luxury_score, poi.luxuryScore) AS luxury,
               a.name AS activity,
               emotions_evoked,
               archetypes,
               emotion_match_count
        
        ORDER BY emotion_match_count DESC, poi.google_rating DESC
        LIMIT $limit
        """
        
        params = {
            "destination_terms": resolve_destination_terms(destination),
            "desired_emotions": desired_emotions,
            "min_luxury_score": min_luxury_score,
            "limit": limit
        }
        
        result = await neo4j_client.execute_query(query, params)
        
        pois = []
        for record in result or []:
            pois.append({
                "name": record["name"],
                "rating": record.get("rating"),
                "reviews": record.get("reviews"),
                "luxury_score": record["luxury"],
                "activity": record["activity"],
                "emotions_evoked": record["emotions_evoked"],
                "archetypes": record["archetypes"],
                "emotion_match_count": record["emotion_match_count"]
            })
        
        logger.info("Emotion-based POI recommendations generated",
                   emotions=desired_emotions,
                   count=len(pois))
        
        return pois
    
    async def calculate_client_weights_from_conversation(
        self,
        emotional_resonances: Dict[str, float],
        conversation_history: List[Dict],
        activity_preferences: Optional[List[Dict]] = None
    ) -> ArchetypeWeights:
        """
        Calculate client's weighted archetype profile from conversation.
        
        Args:
            emotional_resonances: {emotion_name: strength} from AIlessia
            conversation_history: Message history for pattern detection
            activity_preferences: Optional activity history
        
        Returns:
            ArchetypeWeights with 6D personality scores
        """
        # Use weighted archetype calculator
        if activity_preferences:
            weights = weighted_archetype_calculator.calculate_combined(
                emotional_resonances=emotional_resonances,
                activity_history=activity_preferences,
                emotion_weight=0.60,  # Prioritize emotions from conversation
                activity_weight=0.40
            )
        else:
            weights = weighted_archetype_calculator.calculate_from_emotions(
                emotional_resonances=emotional_resonances
            )
        
        logger.info("Client archetype weights calculated",
                   weights=weights.as_dict())
        
        return weights


# Global instance
poi_recommendation_service = POIRecommendationService()


