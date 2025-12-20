"""
AIbert's Desire Anticipator - Analytical intelligence that anticipates client desires.

This module uses pattern recognition and psychological insights to understand what
ultra-luxury clients truly want, even before they articulate it themselves.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass, field
import structlog

from core.ailessia.emotion_interpreter import EmotionalReading, EmotionalState

logger = structlog.get_logger()


@dataclass
class AnticipatedDesire:
    """What the client wants but hasn't explicitly stated."""
    desire_type: str
    confidence: float  # 0-1
    reasoning: str
    how_to_address: str
    experiences_to_suggest: List[str] = field(default_factory=list)
    hidden_anxieties: List[str] = field(default_factory=list)
    emotional_fulfillment: str = ""


class DesireAnticipator:
    """
    AIbert's analytical anticipation system.
    
    Uses psychological patterns and ultra-luxury client insights to predict
    desires, anxieties, and needs that clients haven't verbalized.
    """
    
    ANTICIPATION_RULES = {
        "romantic_partner_anniversary": {
            "triggers": ["anniversary", "special occasion", "celebrate us", "romantic",
                        "years together", "milestone", "relationship"],
            "anticipated_desires": [
                "Prove thoughtfulness and planning",
                "Create Instagram-worthy moment for partner",
                "Show growth in relationship",
                "Impress partner with exclusivity",
                "Create private, intimate moments",
                "Demonstrate wealth/success tastefully"
            ],
            "hidden_anxieties": [
                "Not special enough",
                "Partner disappointed",
                "Too predictable",
                "Not romantic enough"
            ],
            "how_to_address": "Emphasize uniqueness, personalization, and 'once-in-lifetime' framing. Highlight intimate, exclusive elements that show deep understanding of partner.",
            "emotional_fulfillment": "Validates relationship significance and creates shared memory"
        },
        
        "achievement_celebration": {
            "triggers": ["achieved", "made it", "finally", "big deal closed", "success",
                        "promotion", "milestone reached", "accomplished", "victory"],
            "anticipated_desires": [
                "Recognition of achievement",
                "Permission to indulge without guilt",
                "Share success with loved ones",
                "Create trophy experience",
                "Feel the power of wealth",
                "Mark transition to new status"
            ],
            "hidden_anxieties": [
                "Imposter syndrome",
                "Not appreciating success enough",
                "Others not recognizing achievement",
                "Success being temporary"
            ],
            "how_to_address": "Mirror celebration energy, validate achievement significance, suggest 'victory lap' experiences. Use prestige language and status markers.",
            "emotional_fulfillment": "Affirms achievement and enables guilt-free indulgence"
        },
        
        "escape_from_pressure": {
            "triggers": ["escape", "away", "peace", "quiet", "disconnect", "overwhelmed",
                        "stressed", "need a break", "exhausted", "burnout"],
            "anticipated_desires": [
                "Permission to completely disconnect",
                "Sanctuary from expectations",
                "Renewal and restoration",
                "No decisions or planning required",
                "Feel cared for and pampered",
                "Space to just be"
            ],
            "hidden_anxieties": [
                "Guilt about taking time",
                "Fear of being unreachable",
                "Falling behind",
                "Not being productive"
            ],
            "how_to_address": "Reassure that restoration is productive. Emphasize complete curation, no-effort luxury, and permission to surrender control.",
            "emotional_fulfillment": "Provides sanctuary and guilt-free renewal"
        },
        
        "identity_transformation": {
            "triggers": ["who I'm becoming", "new chapter", "different person", "transform",
                        "rebirth", "new me", "evolving", "growth journey"],
            "anticipated_desires": [
                "Mark transition with significant experience",
                "Test new identity in safe space",
                "Create defining moment",
                "Symbolic ritual or ceremony",
                "Witness to transformation",
                "Permission to change"
            ],
            "hidden_anxieties": [
                "Not ready for change",
                "Losing old self",
                "Others won't recognize change",
                "Change won't stick"
            ],
            "how_to_address": "Frame experiences as bridges between selves. Include reflection rituals, meaningful symbolism, and transformation markers.",
            "emotional_fulfillment": "Provides ritual container for personal evolution"
        },
        
        "reconnection_with_partner": {
            "triggers": ["reconnect", "us time", "remember why", "reignite", "rediscover",
                        "busy lately", "lost touch", "need to focus on us"],
            "anticipated_desires": [
                "Recreate early relationship magic",
                "Uninterrupted quality time",
                "Break routine patterns",
                "Create new shared memories",
                "Remember who we are together",
                "Deepen intimacy"
            ],
            "hidden_anxieties": [
                "Too late to reconnect",
                "Lost the spark",
                "Too much distance grown",
                "Won't feel the same"
            ],
            "how_to_address": "Emphasize renewal, rediscovery, and deepening. Suggest experiences that create shared vulnerability and conversation catalysts.",
            "emotional_fulfillment": "Enables relationship renewal and emotional reconnection"
        },
        
        "life_celebration_milestone": {
            "triggers": ["birthday", "retirement", "50th", "60th", "turning", "life milestone",
                        "big birthday", "decade"],
            "anticipated_desires": [
                "Mark significance of age/milestone",
                "Celebrate life lived",
                "Create bucket list moment",
                "Gather loved ones",
                "Feel alive and vibrant",
                "Defy age stereotypes"
            ],
            "hidden_anxieties": [
                "Feeling old",
                "Time running out",
                "Not achieved enough",
                "Being forgotten"
            ],
            "how_to_address": "Frame as celebration of vitality, wisdom, and freedom. Emphasize life-affirming, age-defying experiences. Focus on joy and liberation.",
            "emotional_fulfillment": "Reframes aging as liberation and celebrates life force"
        },
        
        "first_luxury_experience": {
            "triggers": ["first time", "never done this", "always wanted", "bucket list",
                        "dream of", "finally can afford"],
            "anticipated_desires": [
                "Validation of success arrival",
                "Feel like they belong",
                "Exceed expectations",
                "Create milestone moment",
                "Prove to self worth the investment",
                "Share achievement"
            ],
            "hidden_anxieties": [
                "Not knowing etiquette",
                "Being judged as new money",
                "Not appreciating properly",
                "Wasting money",
                "Not belonging"
            ],
            "how_to_address": "Provide confidence through expertise, normalize luxury,  emphasize welcomeness. Make them feel like insiders immediately.",
            "emotional_fulfillment": "Validates success and creates belonging in luxury world"
        },
        
        "family_bonding_with_children": {
            "triggers": ["kids", "children", "family time", "before they grow up", "while they're young",
                        "create memories", "family bonding"],
            "anticipated_desires": [
                "Create lasting family memories",
                "Be present with children",
                "Show children the world",
                "Balance fun with luxury",
                "Quality time without devices",
                "Mark childhood milestones"
            ],
            "hidden_anxieties": [
                "Missing childhood",
                "Not spending enough time",
                "Work-life balance",
                "Kids won't remember",
                "Not being present enough"
            ],
            "how_to_address": "Emphasize memory creation, presence, and magical moments. Balance luxury with authentic family connection and age-appropriate wonder.",
            "emotional_fulfillment": "Creates precious family memories and validates parenting priorities"
        },
        
        "seeking_meaning_purpose": {
            "triggers": ["meaning", "purpose", "why", "deeper", "soul", "authentic",
                        "real", "substance", "beyond material"],
            "anticipated_desires": [
                "Experiences with depth",
                "Connection to something greater",
                "Authentic cultural immersion",
                "Transformational moments",
                "Wisdom and insight",
                "Leave impact/legacy"
            ],
            "hidden_anxieties": [
                "Life feels empty despite wealth",
                "Superficiality of luxury",
                "Lost sense of purpose",
                "Material success not fulfilling"
            ],
            "how_to_address": "Emphasize transformational potential, cultural depth, authentic connection. Focus on experiences that create meaning and legacy.",
            "emotional_fulfillment": "Provides depth and meaning beyond material luxury"
        },
        
        "social_status_signaling": {
            "triggers": ["exclusive", "rare", "nobody else", "most prestigious", "elite access",
                        "VIP", "private", "invitation only"],
            "anticipated_desires": [
                "Demonstrate elevated status",
                "Access to rarefied experiences",
                "Social proof and bragging rights",
                "Network with other elites",
                "Instagram/social validation",
                "Separate from masses"
            ],
            "hidden_anxieties": [
                "Not exclusive enough",
                "Others can do it too",
                "Status not recognized",
                "Falling behind peers"
            ],
            "how_to_address": "Emphasize exclusivity, scarcity, prestige markers. Provide social proof from other UHNWIs. Highlight what others can't access.",
            "emotional_fulfillment": "Validates status and provides social currency"
        }
    }
    
    def __init__(self, neo4j_client):
        """
        Initialize the Desire Anticipator.
        
        Args:
            neo4j_client: Neo4j database client for experience queries
        """
        self.neo4j_client = neo4j_client
    
    async def anticipate_desires(
        self,
        emotional_reading: EmotionalReading,
        conversation_history: List[Dict],
        client_profile: Optional[Dict] = None
    ) -> List[AnticipatedDesire]:
        """
        Use pattern recognition to anticipate what client truly wants.
        
        This is AIbert's analytical intelligence - detecting unstated desires
        through psychological patterns and conversational signals.
        
        Args:
            emotional_reading: Current emotional state from AIlessia
            conversation_history: Full conversation context
            client_profile: Optional stored client profile
        
        Returns:
            List of anticipated desires with confidence scores
        """
        anticipated = []
        
        # Combine all user messages for analysis
        conversation_text = " ".join([
            msg["content"] 
            for msg in conversation_history 
            if msg.get("role") == "user"
        ])
        conversation_lower = conversation_text.lower()
        
        # Check each anticipation rule
        for scenario, config in self.ANTICIPATION_RULES.items():
            # Count trigger matches
            trigger_matches = sum(
                1 for trigger in config["triggers"]
                if trigger in conversation_lower
            )
            
            # Need at least 2 triggers for confidence
            if trigger_matches >= 2:
                confidence = min(0.95, 0.6 + (trigger_matches * 0.12))
                
                # Boost confidence based on emotional reading alignment
                if self._emotional_alignment(emotional_reading, scenario):
                    confidence += 0.1
                
                # Get relevant experiences from Neo4j
                experiences = await self._find_experiences_for_desires(
                    config["anticipated_desires"],
                    emotional_reading,
                    client_profile
                )
                
                anticipated.append(AnticipatedDesire(
                    desire_type=scenario,
                    confidence=min(0.98, confidence),
                    reasoning=f"Detected {trigger_matches} strong indicators of {scenario.replace('_', ' ')}",
                    how_to_address=config["how_to_address"],
                    experiences_to_suggest=experiences,
                    hidden_anxieties=config["hidden_anxieties"],
                    emotional_fulfillment=config["emotional_fulfillment"]
                ))
        
        # Sort by confidence
        anticipated.sort(key=lambda x: x.confidence, reverse=True)
        
        logger.info("Desires anticipated",
                   count=len(anticipated),
                   top_desire=anticipated[0].desire_type if anticipated else None)
        
        return anticipated[:3]  # Return top 3 most confident
    
    def _emotional_alignment(
        self,
        emotional_reading: EmotionalReading,
        scenario: str
    ) -> bool:
        """Check if emotional state aligns with scenario."""
        alignments = {
            "romantic_partner_anniversary": [EmotionalState.CELEBRATING, EmotionalState.SEEKING_CONNECTION],
            "achievement_celebration": [EmotionalState.CELEBRATING, EmotionalState.CONFIDENT],
            "escape_from_pressure": [EmotionalState.STRESSED, EmotionalState.SEEKING_ESCAPE],
            "identity_transformation": [EmotionalState.CONTEMPLATIVE, EmotionalState.DREAMY],
            "reconnection_with_partner": [EmotionalState.SEEKING_CONNECTION, EmotionalState.NOSTALGIC],
            "seeking_meaning_purpose": [EmotionalState.CONTEMPLATIVE, EmotionalState.SEEKING_VALIDATION],
            "social_status_signaling": [EmotionalState.CONFIDENT, EmotionalState.EXCITED]
        }
        
        expected_states = alignments.get(scenario, [])
        return emotional_reading.primary_state in expected_states
    
    async def _find_experiences_for_desires(
        self,
        anticipated_desires: List[str],
        emotional_reading: EmotionalReading,
        client_profile: Optional[Dict]
    ) -> List[str]:
        """
        Query Neo4j for experiences matching anticipated desires.
        
        Args:
            anticipated_desires: List of desire descriptions
            emotional_reading: Current emotional state
            client_profile: Optional client profile
        
        Returns:
            List of experience IDs
        """
        # Map desires to emotional tags
        desire_to_emotion_map = {
            "Recognition": ["Prestige", "Achievement"],
            "Romance": ["Romance", "Intimacy"],
            "Intimacy": ["Intimacy", "Connection"],
            "Sanctuary": ["Serenity", "Renewal"],
            "Transformation": ["Discovery", "Growth"],
            "Connection": ["Intimacy", "Connection"],
            "Indulgence": ["Indulgence", "Luxury"],
            "Status": ["Prestige", "Sophistication"],
            "Meaning": ["Discovery", "Contemplation"]
        }
        
        # Extract key emotion words from desires
        relevant_emotions = set()
        for desire in anticipated_desires:
            for keyword, emotions in desire_to_emotion_map.items():
                if keyword.lower() in desire.lower():
                    relevant_emotions.update(emotions)
        
        # Add primary emotions from emotional reading
        if hasattr(emotional_reading, 'primary_state'):
            state_to_emotions = {
                EmotionalState.CELEBRATING: ["Prestige", "Indulgence"],
                EmotionalState.SEEKING_ESCAPE: ["Serenity", "Renewal"],
                EmotionalState.SEEKING_CONNECTION: ["Romance", "Intimacy"],
                EmotionalState.CONTEMPLATIVE: ["Discovery", "Sophistication"]
            }
            relevant_emotions.update(
                state_to_emotions.get(emotional_reading.primary_state, [])
            )
        
        if not relevant_emotions:
            relevant_emotions = ["Luxury", "Prestige"]
        
        try:
            # Query Neo4j for matching experiences
            experiences = await self.neo4j_client.find_experiences_by_emotions(
                desired_emotions=list(relevant_emotions),
                min_exclusivity=0.75
            )
            
            # Return experience IDs
            return [exp["id"] for exp in experiences[:5]]
        except Exception as e:
            logger.error("Failed to find experiences", error=str(e))
            return []
    
    def generate_addressing_strategy(
        self,
        anticipated_desire: AnticipatedDesire
    ) -> Dict[str, str]:
        """
        Generate strategy for how AIlessia should address this desire.
        
        Args:
            anticipated_desire: The desire to address
        
        Returns:
            Strategy with messaging guidance
        """
        return {
            "opening": f"I sense that {anticipated_desire.desire_type.replace('_', ' ')} is important to you...",
            "validation": f"This is about {anticipated_desire.emotional_fulfillment}",
            "addressing_approach": anticipated_desire.how_to_address,
            "anxiety_handling": f"Address these concerns: {', '.join(anticipated_desire.hidden_anxieties[:2])}",
            "experience_framing": "Frame suggested experiences through this lens"
        }


# Global desire anticipator instance placeholder
# Will be initialized with neo4j_client when system starts
desire_anticipator = None


def initialize_desire_anticipator(neo4j_client):
    """Initialize global desire anticipator with database client."""
    global desire_anticipator
    desire_anticipator = DesireAnticipator(neo4j_client)
    return desire_anticipator

