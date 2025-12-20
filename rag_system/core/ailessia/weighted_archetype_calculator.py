"""
Weighted Archetype Calculator for AIlessia
==========================================
Calculates multi-dimensional personality fit scores for clients
Based on emotional resonance + activity preferences + conversation patterns
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
import structlog

logger = structlog.get_logger()


@dataclass
class ArchetypeWeights:
    """Client's weighted archetype scores (0.0 - 1.0)"""
    romantic: float = 0.5
    connoisseur: float = 0.5
    hedonist: float = 0.5
    contemplative: float = 0.5
    achiever: float = 0.5
    adventurer: float = 0.5
    
    def as_dict(self) -> Dict[str, float]:
        return {
            'romantic': self.romantic,
            'connoisseur': self.connoisseur,
            'hedonist': self.hedonist,
            'contemplative': self.contemplative,
            'achiever': self.achiever,
            'adventurer': self.adventurer
        }


class WeightedArchetypeCalculator:
    """
    Calculates weighted archetype scores for clients.
    
    This creates a multi-dimensional personality profile that can be
    matched against POI personality scores for ultra-personalization.
    
    Later integration point for Codebreaker AI buying behavior analysis.
    """
    
    # Emotion → Archetype mapping weights
    EMOTION_WEIGHTS = {
        # Romance emotion boosts romantic + contemplative
        'Romance': {
            'romantic': 0.95,
            'contemplative': 0.40,
            'hedonist': 0.30
        },
        # Prestige boosts achiever + connoisseur
        'Prestige': {
            'achiever': 0.90,
            'connoisseur': 0.70,
            'romantic': 0.30
        },
        # Serenity boosts contemplative + romantic
        'Serenity': {
            'contemplative': 0.95,
            'romantic': 0.60,
            'hedonist': 0.40
        },
        # Indulgence boosts hedonist + achiever
        'Indulgence': {
            'hedonist': 0.95,
            'achiever': 0.50,
            'connoisseur': 0.60
        },
        # Sophistication boosts connoisseur + achiever
        'Sophistication': {
            'connoisseur': 0.90,
            'achiever': 0.70,
            'romantic': 0.40
        },
        # Discovery boosts adventurer + connoisseur
        'Discovery': {
            'adventurer': 0.80,
            'connoisseur': 0.70,
            'contemplative': 0.50
        },
        # Renewal boosts contemplative + hedonist
        'Renewal': {
            'contemplative': 0.85,
            'hedonist': 0.60,
            'romantic': 0.40
        },
        # Freedom boosts adventurer + romantic
        'Freedom': {
            'adventurer': 0.90,
            'romantic': 0.60,
            'contemplative': 0.40
        },
        # Achievement boosts achiever
        'Achievement': {
            'achiever': 0.95,
            'connoisseur': 0.50,
            'adventurer': 0.40
        },
        # Intimacy boosts romantic
        'Intimacy': {
            'romantic': 0.98,
            'contemplative': 0.50
        }
    }
    
    # Activity → Archetype mapping weights
    ACTIVITY_WEIGHTS = {
        'Fine Dining': {
            'connoisseur': 0.90,
            'hedonist': 0.80,
            'achiever': 0.60
        },
        'Yacht Charter': {
            'achiever': 0.85,
            'romantic': 0.75,
            'hedonist': 0.70
        },
        'Spa': {
            'hedonist': 0.85,
            'contemplative': 0.80,
            'romantic': 0.60
        },
        'Wine Tasting': {
            'connoisseur': 0.95,
            'hedonist': 0.70,
            'romantic': 0.50
        },
        'Museum': {
            'connoisseur': 0.85,
            'contemplative': 0.80
        },
        'Adventure': {
            'adventurer': 0.95,
            'achiever': 0.50
        },
        'Meditation': {
            'contemplative': 0.95,
            'romantic': 0.40
        },
        'Shopping': {
            'achiever': 0.70,
            'hedonist': 0.60
        },
        'Sunset Cruise': {
            'romantic': 0.95,
            'contemplative': 0.60,
            'hedonist': 0.50
        }
    }
    
    def __init__(self):
        """Initialize calculator."""
        pass
    
    def calculate_from_emotions(
        self,
        emotional_resonances: Dict[str, float]
    ) -> ArchetypeWeights:
        """
        Calculate archetype weights from emotional resonances.
        
        Args:
            emotional_resonances: {emotion_name: strength_score}
                Example: {'Romance': 0.95, 'Prestige': 0.85}
        
        Returns:
            ArchetypeWeights with calculated scores
        """
        weights = {
            'romantic': 0.0,
            'connoisseur': 0.0,
            'hedonist': 0.0,
            'contemplative': 0.0,
            'achiever': 0.0,
            'adventurer': 0.0
        }
        
        total_weight = 0.0
        
        # Accumulate weighted scores
        for emotion, strength in emotional_resonances.items():
            if emotion in self.EMOTION_WEIGHTS:
                emotion_mapping = self.EMOTION_WEIGHTS[emotion]
                for archetype, multiplier in emotion_mapping.items():
                    weights[archetype] += strength * multiplier
                    total_weight += strength
        
        # Normalize to 0.0-1.0 range
        if total_weight > 0:
            for archetype in weights:
                weights[archetype] = min(1.0, weights[archetype] / total_weight * 2.0)
        
        return ArchetypeWeights(**weights)
    
    def calculate_from_activities(
        self,
        activity_history: List[Dict[str, any]]
    ) -> ArchetypeWeights:
        """
        Calculate archetype weights from activity history.
        
        Args:
            activity_history: List of activities
                Example: [
                    {'name': 'Fine Dining', 'count': 5, 'rating': 5},
                    {'name': 'Spa', 'count': 3, 'rating': 4}
                ]
        
        Returns:
            ArchetypeWeights with calculated scores
        """
        weights = {
            'romantic': 0.0,
            'connoisseur': 0.0,
            'hedonist': 0.0,
            'contemplative': 0.0,
            'achiever': 0.0,
            'adventurer': 0.0
        }
        
        total_weight = 0.0
        
        # Accumulate weighted scores
        for activity in activity_history:
            activity_name = activity.get('name')
            count = activity.get('count', 1)
            rating = activity.get('rating', 3)
            
            if activity_name in self.ACTIVITY_WEIGHTS:
                # Weight by frequency and satisfaction
                activity_weight = count * (rating / 5.0)
                
                activity_mapping = self.ACTIVITY_WEIGHTS[activity_name]
                for archetype, multiplier in activity_mapping.items():
                    weights[archetype] += activity_weight * multiplier
                    total_weight += activity_weight
        
        # Normalize
        if total_weight > 0:
            for archetype in weights:
                weights[archetype] = min(1.0, weights[archetype] / total_weight * 2.0)
        
        return ArchetypeWeights(**weights)
    
    def calculate_combined(
        self,
        emotional_resonances: Dict[str, float],
        activity_history: List[Dict[str, any]],
        conversation_signals: Optional[Dict[str, float]] = None,
        emotion_weight: float = 0.50,
        activity_weight: float = 0.40,
        conversation_weight: float = 0.10
    ) -> ArchetypeWeights:
        """
        Calculate combined archetype weights from all signals.
        
        Args:
            emotional_resonances: Emotion → strength scores
            activity_history: Activity participation history
            conversation_signals: Optional conversation pattern scores
            emotion_weight: Weight for emotional signals (default 0.50)
            activity_weight: Weight for activity signals (default 0.40)
            conversation_weight: Weight for conversation signals (default 0.10)
        
        Returns:
            Combined ArchetypeWeights
        """
        # Calculate from each source
        emotion_scores = self.calculate_from_emotions(emotional_resonances)
        activity_scores = self.calculate_from_activities(activity_history)
        
        # Weighted combination
        combined = {
            'romantic': (
                emotion_scores.romantic * emotion_weight +
                activity_scores.romantic * activity_weight
            ),
            'connoisseur': (
                emotion_scores.connoisseur * emotion_weight +
                activity_scores.connoisseur * activity_weight
            ),
            'hedonist': (
                emotion_scores.hedonist * emotion_weight +
                activity_scores.hedonist * activity_weight
            ),
            'contemplative': (
                emotion_scores.contemplative * emotion_weight +
                activity_scores.contemplative * activity_weight
            ),
            'achiever': (
                emotion_scores.achiever * emotion_weight +
                activity_scores.achiever * activity_weight
            ),
            'adventurer': (
                emotion_scores.adventurer * emotion_weight +
                activity_scores.adventurer * activity_weight
            )
        }
        
        # Add conversation signals if provided
        # (Future integration point for Codebreaker AI)
        if conversation_signals:
            for archetype, signal in conversation_signals.items():
                if archetype in combined:
                    combined[archetype] += signal * conversation_weight
        
        # Normalize to 0.0-1.0
        for archetype in combined:
            combined[archetype] = min(1.0, max(0.0, combined[archetype]))
        
        logger.info("Calculated weighted archetypes",
                   combined_scores=combined)
        
        return ArchetypeWeights(**combined)
    
    def match_poi_score(
        self,
        client_weights: ArchetypeWeights,
        poi_scores: Dict[str, float]
    ) -> float:
        """
        Calculate multi-dimensional fit score between client and POI.
        
        Args:
            client_weights: Client's archetype weights
            poi_scores: POI's personality scores
                Example: {
                    'personality_romantic': 0.95,
                    'personality_connoisseur': 0.82,
                    ...
                }
        
        Returns:
            Fit score (0.0 - 1.0)
        """
        # Extract POI scores
        poi_romantic = poi_scores.get('personality_romantic', 0.5)
        poi_connoisseur = poi_scores.get('personality_connoisseur', 0.5)
        poi_hedonist = poi_scores.get('personality_hedonist', 0.5)
        poi_contemplative = poi_scores.get('personality_contemplative', 0.5)
        poi_achiever = poi_scores.get('personality_achiever', 0.5)
        poi_adventurer = poi_scores.get('personality_adventurer', 0.5)
        
        # Calculate weighted dot product
        fit_score = (
            client_weights.romantic * poi_romantic +
            client_weights.connoisseur * poi_connoisseur +
            client_weights.hedonist * poi_hedonist +
            client_weights.contemplative * poi_contemplative +
            client_weights.achiever * poi_achiever +
            client_weights.adventurer * poi_adventurer
        ) / 6.0
        
        return min(1.0, max(0.0, fit_score))


# Global calculator instance
weighted_archetype_calculator = WeightedArchetypeCalculator()


