"""
AIlessia's Emotion Interpreter - Empathetic sensing system for ultra-luxury clients.

This module enables AIlessia to read emotional subtext, detect personality archetypes,
and understand the deeper desires beneath client communications.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import structlog
import re

logger = structlog.get_logger()


class EmotionalState(Enum):
    """Detected emotional states of ultra-luxury clients."""
    EXCITED = "excited"
    STRESSED = "stressed"
    DREAMY = "dreamy"
    NOSTALGIC = "nostalgic"
    CELEBRATING = "celebrating"
    SEEKING_ESCAPE = "seeking_escape"
    SEEKING_CONNECTION = "seeking_connection"
    SEEKING_VALIDATION = "seeking_validation"
    PLAYFUL = "playful"
    CONTEMPLATIVE = "contemplative"
    CONFIDENT = "confident"
    VULNERABLE = "vulnerable"


@dataclass
class EmotionalReading:
    """AIlessia's interpretation of a client's emotional state."""
    primary_state: EmotionalState
    energy_level: float  # 0-1
    openness_to_experience: float  # 0-1
    vulnerability_shown: float  # 0-1
    hidden_desires: List[str] = field(default_factory=list)
    emotional_needs: List[str] = field(default_factory=list)
    recommended_tone: str = "sophisticated_friend"
    detected_archetype: Optional[str] = None
    confidence_score: float = 0.75  # How confident AIlessia is in this reading


class EmotionInterpreter:
    """
    AIlessia's empathetic sensing system.
    
    This system reads between the lines to understand what ultra-luxury clients
    truly desire, even when they haven't articulated it themselves.
    """
    
    EMOTIONAL_MARKERS = {
        "excited": {
            "keywords": ["can't wait", "amazing", "incredible", "dream", "finally", 
                        "thrilled", "perfect", "absolutely", "love"],
            "punctuation_patterns": [r"!+", r"\!\!\!"],
            "energy_indicators": ["caps", "exclamation", "enthusiasm"],
            "underlying_need": "Validation and amplification",
            "energy_baseline": 0.85
        },
        "stressed": {
            "keywords": ["need", "overwhelmed", "confused", "help", "don't know",
                        "uncertain", "worried", "concerned", "anxious"],
            "sentence_patterns": [r"\?$", r"how do I", r"what should"],
            "underlying_need": "Guidance and reassurance",
            "energy_baseline": 0.45
        },
        "dreamy": {
            "keywords": ["imagine", "picture", "perfect", "magical", "like a movie",
                        "fantasy", "dream of", "envision", "wouldn't it be"],
            "tense_indicators": ["would", "could", "imagine"],
            "underlying_need": "Permission to dream bigger",
            "energy_baseline": 0.70
        },
        "celebrating": {
            "keywords": ["anniversary", "special", "celebrate", "milestone", "achievement",
                        "birthday", "promotion", "success", "victory", "accomplished"],
            "context_indicators": ["life events", "accomplishments"],
            "underlying_need": "Recognition and enhancement of significance",
            "energy_baseline": 0.80
        },
        "seeking_escape": {
            "keywords": ["away", "escape", "disconnect", "peace", "quiet", "forget",
                        "refuge", "sanctuary", "retreat", "unwind", "decompress"],
            "underlying_need": "Sanctuary and renewal",
            "energy_baseline": 0.35
        },
        "seeking_validation": {
            "keywords": ["worth it", "deserve", "special enough", "good choice",
                        "right decision", "sure about", "appropriate", "suitable"],
            "question_patterns": [r"is this\s+\w+\s+enough", r"do I deserve"],
            "underlying_need": "Affirmation and confidence building",
            "energy_baseline": 0.60
        },
        "seeking_connection": {
            "keywords": ["together", "us", "partner", "spouse", "loved one",
                        "relationship", "bond", "connect", "intimacy", "share"],
            "underlying_need": "Deepening relationship bonds",
            "energy_baseline": 0.70
        },
        "contemplative": {
            "keywords": ["meaning", "purpose", "transform", "discover", "reflect",
                        "understand", "growth", "journey", "becoming", "evolve"],
            "underlying_need": "Meaning and transformation",
            "energy_baseline": 0.55
        },
        "confident": {
            "keywords": ["definitely", "absolutely", "certain", "know exactly",
                        "clear about", "decided", "commitment", "ready"],
            "underlying_need": "Acknowledgment and execution",
            "energy_baseline": 0.75
        },
        "vulnerable": {
            "keywords": ["honest", "truth is", "confession", "admit", "scared",
                        "fear", "never done", "first time", "unsure"],
            "underlying_need": "Safety and support",
            "energy_baseline": 0.50
        }
    }
    
    PERSONALITY_ARCHETYPES = {
        "The Romantic": {
            "signals": ["together", "us", "love", "connection", "intimate", 
                       "special someone", "partner", "romance", "heart", "feelings"],
            "desires": ["Connection", "Intimacy", "Meaning", "Romance"],
            "communication_style": "Emotional and narrative-driven"
        },
        "The Achiever": {
            "signals": ["best", "exclusive", "deserve", "worked hard", "success", 
                       "earned", "achieved", "accomplished", "prestigious", "elite"],
            "desires": ["Recognition", "Status", "Excellence", "Victory"],
            "communication_style": "Direct and goal-oriented"
        },
        "The Adventurer": {
            "signals": ["experience", "try", "new", "adventure", "never done",
                       "challenge", "explore", "discover", "thrill", "unique"],
            "desires": ["Novelty", "Challenge", "Stories", "Excitement"],
            "communication_style": "Energetic and story-focused"
        },
        "The Connoisseur": {
            "signals": ["authentic", "quality", "craft", "traditional", "expertise",
                       "finest", "artisan", "heritage", "masterpiece", "provenance"],
            "desires": ["Expertise", "Authenticity", "Craftsmanship", "Quality"],
            "communication_style": "Knowledgeable and detail-oriented"
        },
        "The Hedonist": {
            "signals": ["pleasure", "indulgent", "sensory", "taste", "feel",
                       "luxurious", "pamper", "savor", "exquisite", "decadent"],
            "desires": ["Pleasure", "Indulgence", "Sensory delight", "Luxury"],
            "communication_style": "Descriptive and sensory-focused"
        },
        "The Contemplative": {
            "signals": ["meaning", "transform", "discover", "reflect", "grow",
                       "understand", "purpose", "soul", "journey", "wisdom"],
            "desires": ["Transformation", "Meaning", "Growth", "Insight"],
            "communication_style": "Thoughtful and philosophical"
        }
    }
    
    def __init__(self, claude_client=None):
        """
        Initialize the Emotion Interpreter.
        
        Args:
            claude_client: Optional Claude API client for deep analysis
        """
        self.claude_client = claude_client
    
    async def read_emotional_state(
        self,
        message: str,
        conversation_history: List[Dict],
        tone_analysis: Optional[Dict] = None
    ) -> EmotionalReading:
        """
        Sense the client's emotional state beyond their words.
        
        This is AIlessia's empathetic superpower - reading between the lines
        to understand what ultra-luxury clients truly need.
        
        Args:
            message: Current client message
            conversation_history: Previous conversation context
            tone_analysis: Optional tone analysis from external system
        
        Returns:
            EmotionalReading with comprehensive emotional intelligence
        """
        # Quick pattern-based analysis
        pattern_reading = self._pattern_based_analysis(message)
        
        # Detect personality archetype from conversation
        archetype = self._detect_personality_archetype(conversation_history)
        
        # Calculate emotional metrics
        energy_level = self._calculate_energy_level(message, pattern_reading)
        openness = self._calculate_openness(message, conversation_history)
        vulnerability = self._calculate_vulnerability(message, pattern_reading)
        
        # Identify hidden desires
        hidden_desires = self._identify_hidden_desires(
            message, 
            pattern_reading,
            archetype
        )
        
        # Determine emotional needs
        emotional_needs = self._determine_emotional_needs(
            pattern_reading,
            vulnerability,
            archetype
        )
        
        # Recommend tone based on reading
        recommended_tone = self._recommend_tone(
            pattern_reading["primary_state"],
            vulnerability,
            energy_level,
            archetype
        )
        
        reading = EmotionalReading(
            primary_state=pattern_reading["primary_state"],
            energy_level=energy_level,
            openness_to_experience=openness,
            vulnerability_shown=vulnerability,
            hidden_desires=hidden_desires,
            emotional_needs=emotional_needs,
            recommended_tone=recommended_tone,
            detected_archetype=archetype,
            confidence_score=pattern_reading["confidence"]
        )
        
        # Use Claude for deep analysis if available and confidence is low
        if self.claude_client and reading.confidence_score < 0.7:
            reading = await self._deep_analysis_with_claude(
                message,
                conversation_history,
                reading
            )
        
        logger.info("Emotional state reading complete",
                   primary_state=reading.primary_state.value,
                   archetype=reading.detected_archetype,
                   confidence=reading.confidence_score)
        
        return reading
    
    def _pattern_based_analysis(self, message: str) -> Dict:
        """Quick pattern-based emotional analysis."""
        message_lower = message.lower()
        
        # Score each emotional state
        state_scores = {}
        for state_name, config in self.EMOTIONAL_MARKERS.items():
            score = 0
            
            # Keyword matching
            keyword_matches = sum(
                1 for keyword in config["keywords"]
                if keyword in message_lower
            )
            score += keyword_matches * 2
            
            # Pattern matching (if defined)
            if "punctuation_patterns" in config:
                for pattern in config["punctuation_patterns"]:
                    if re.search(pattern, message):
                        score += 1.5
            
            if "sentence_patterns" in config:
                for pattern in config["sentence_patterns"]:
                    if re.search(pattern, message_lower):
                        score += 1.5
            
            if "question_patterns" in config:
                for pattern in config["question_patterns"]:
                    if re.search(pattern, message_lower):
                        score += 2
            
            state_scores[state_name] = score
        
        # Find dominant state
        if max(state_scores.values()) == 0:
            # No strong signal - neutral/exploratory
            primary_state = EmotionalState.CONTEMPLATIVE
            confidence = 0.5
        else:
            primary_state_name = max(state_scores, key=state_scores.get)
            primary_state = EmotionalState[primary_state_name.upper()]
            
            # Confidence based on how much stronger the top score is
            total_score = sum(state_scores.values())
            top_score = state_scores[primary_state_name]
            confidence = min(0.95, (top_score / (total_score + 0.1)) + 0.3)
        
        return {
            "primary_state": primary_state,
            "confidence": confidence,
            "state_scores": state_scores
        }
    
    def _detect_personality_archetype(
        self,
        conversation_history: List[Dict]
    ) -> str:
        """
        Identify client's personality archetype from conversation patterns.
        
        Returns one of: The Romantic, The Achiever, The Adventurer,
        The Connoisseur, The Hedonist, The Contemplative
        """
        # Combine all user messages
        all_user_text = " ".join([
            msg["content"].lower() 
            for msg in conversation_history 
            if msg.get("role") == "user"
        ])
        
        if not all_user_text:
            return "The Explorer"  # Default for new conversations
        
        # Score each archetype
        archetype_scores = {}
        for archetype_name, config in self.PERSONALITY_ARCHETYPES.items():
            score = sum(
                1 for signal in config["signals"]
                if signal in all_user_text
            )
            archetype_scores[archetype_name] = score
        
        # Return dominant archetype
        if max(archetype_scores.values()) > 0:
            return max(archetype_scores, key=archetype_scores.get)
        else:
            return "The Explorer"
    
    def _calculate_energy_level(
        self,
        message: str,
        pattern_reading: Dict
    ) -> float:
        """Calculate client's energy level (0-1)."""
        # Base energy from emotional state
        state_name = pattern_reading["primary_state"].value
        config = self.EMOTIONAL_MARKERS.get(state_name, {})
        base_energy = config.get("energy_baseline", 0.65)
        
        # Adjust based on message characteristics
        adjustments = 0.0
        
        # Exclamation marks boost energy
        exclamation_count = message.count("!")
        adjustments += min(0.15, exclamation_count * 0.05)
        
        # All caps boosts energy
        if message.isupper() and len(message) > 10:
            adjustments += 0.1
        
        # Question marks slightly lower energy
        question_count = message.count("?")
        adjustments -= min(0.1, question_count * 0.03)
        
        # Message length affects energy (very short or very long = lower)
        word_count = len(message.split())
        if word_count < 5:
            adjustments -= 0.05
        elif word_count > 100:
            adjustments -= 0.1
        
        return max(0.0, min(1.0, base_energy + adjustments))
    
    def _calculate_openness(
        self,
        message: str,
        conversation_history: List[Dict]
    ) -> float:
        """Calculate openness to experience (0-1)."""
        openness = 0.65  # Base openness
        
        message_lower = message.lower()
        
        # Openness indicators
        open_keywords = ["curious", "interested", "tell me more", "what about",
                        "would love", "excited to", "open to", "surprise me"]
        openness += sum(0.05 for keyword in open_keywords if keyword in message_lower)
        
        # Closed indicators
        closed_keywords = ["just", "only", "specifically", "exactly", "must have",
                          "requirement", "non-negotiable", "need to be"]
        openness -= sum(0.04 for keyword in closed_keywords if keyword in message_lower)
        
        # Questions indicate openness
        if "?" in message:
            openness += 0.1
        
        # Engagement in conversation indicates openness
        if len(conversation_history) > 5:
            openness += 0.1
        
        return max(0.0, min(1.0, openness))
    
    def _calculate_vulnerability(
        self,
        message: str,
        pattern_reading: Dict
    ) -> float:
        """Calculate vulnerability level shown (0-1)."""
        vulnerability = 0.3  # Base vulnerability
        
        message_lower = message.lower()
        
        # Vulnerability indicators
        vulnerable_words = ["honest", "truth is", "confession", "admit", "scared",
                          "fear", "worried", "nervous", "unsure", "never done",
                          "first time", "help me", "don't know"]
        vulnerability += sum(0.08 for word in vulnerable_words if word in message_lower)
        
        # Personal pronouns indicate vulnerability
        personal_pronouns = ["i feel", "i'm", "i am", "my", "me"]
        vulnerability += sum(0.03 for pronoun in personal_pronouns if pronoun in message_lower)
        
        # State-specific vulnerability
        if pattern_reading["primary_state"] in [EmotionalState.VULNERABLE, 
                                                EmotionalState.STRESSED,
                                                EmotionalState.SEEKING_VALIDATION]:
            vulnerability += 0.15
        
        return max(0.0, min(1.0, vulnerability))
    
    def _identify_hidden_desires(
        self,
        message: str,
        pattern_reading: Dict,
        archetype: str
    ) -> List[str]:
        """Identify desires client hasn't explicitly stated."""
        hidden_desires = []
        
        # Add desires from emotional state
        state_name = pattern_reading["primary_state"].value
        config = self.EMOTIONAL_MARKERS.get(state_name, {})
        if "underlying_need" in config:
            hidden_desires.append(config["underlying_need"])
        
        # Add desires from archetype
        archetype_config = self.PERSONALITY_ARCHETYPES.get(archetype, {})
        if "desires" in archetype_config:
            hidden_desires.extend(archetype_config["desires"])
        
        # Context-specific desires
        message_lower = message.lower()
        
        if "anniversary" in message_lower or "special occasion" in message_lower:
            hidden_desires.extend([
                "Create Instagram-worthy moment",
                "Prove thoughtfulness and planning",
                "Show growth in relationship"
            ])
        
        if "success" in message_lower or "achievement" in message_lower:
            hidden_desires.extend([
                "Recognition of achievement",
                "Permission to indulge without guilt",
                "Feel the power of wealth"
            ])
        
        if "escape" in message_lower or "away" in message_lower:
            hidden_desires.extend([
                "Permission to completely disconnect",
                "Sanctuary from expectations",
                "Feel cared for and pampered"
            ])
        
        # Remove duplicates while preserving order
        seen = set()
        return [d for d in hidden_desires if not (d in seen or seen.add(d))]
    
    def _determine_emotional_needs(
        self,
        pattern_reading: Dict,
        vulnerability: float,
        archetype: str
    ) -> List[str]:
        """Determine what the client emotionally needs from AIlessia."""
        needs = []
        
        # Based on emotional state
        state_name = pattern_reading["primary_state"].value
        config = self.EMOTIONAL_MARKERS.get(state_name, {})
        if "underlying_need" in config:
            needs.append(config["underlying_need"])
        
        # Based on vulnerability
        if vulnerability > 0.7:
            needs.extend(["Reassurance", "Gentle guidance", "Safety"])
        elif vulnerability < 0.3:
            needs.extend(["Direct recommendations", "Confidence in expertise"])
        
        # Based on archetype
        if archetype == "The Romantic":
            needs.append("Emotional resonance and storytelling")
        elif archetype == "The Achiever":
            needs.append("Recognition and prestige validation")
        elif archetype == "The Hedonist":
            needs.append("Sensory rich descriptions")
        elif archetype == "The Contemplative":
            needs.append("Meaning and depth")
        elif archetype == "The Connoisseur":
            needs.append("Expertise and provenance details")
        elif archetype == "The Adventurer":
            needs.append("Excitement and unique experiences")
        
        return list(set(needs))  # Remove duplicates
    
    def _recommend_tone(
        self,
        primary_state: EmotionalState,
        vulnerability: float,
        energy_level: float,
        archetype: str
    ) -> str:
        """
        Recommend which personality tone AIlessia should use.
        
        Returns one of: therapeutic, sophisticated_friend, mystical_guide, luxury_concierge
        """
        # High vulnerability → therapeutic
        if vulnerability > 0.7:
            return "therapeutic"
        
        # Contemplative archetype → mystical_guide
        if archetype == "The Contemplative":
            return "mystical_guide"
        
        # High energy + celebrating → sophisticated_friend
        if energy_level > 0.8 and primary_state == EmotionalState.CELEBRATING:
            return "sophisticated_friend"
        
        # Achiever + confident → luxury_concierge
        if archetype == "The Achiever" and primary_state == EmotionalState.CONFIDENT:
            return "luxury_concierge"
        
        # Default: sophisticated_friend (warm, elegant, knowing)
        return "sophisticated_friend"
    
    async def _deep_analysis_with_claude(
        self,
        message: str,
        conversation_history: List[Dict],
        initial_reading: EmotionalReading
    ) -> EmotionalReading:
        """
        Use Claude for deeper emotional analysis when confidence is low.
        
        This leverages Claude's nuanced understanding of human psychology.
        """
        if not self.claude_client:
            return initial_reading
        
        # Format conversation context
        context = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in conversation_history[-5:]
        ])
        
        analysis_prompt = f"""As AIlessia, an emotional intelligence system for ultra-luxury experiences,
analyze the emotional subtext of this client message with deep empathy.

Client message: "{message}"
Recent conversation:
{context}

Current reading:
- Primary emotion: {initial_reading.primary_state.value}
- Detected archetype: {initial_reading.detected_archetype}
- Energy level: {initial_reading.energy_level}
- Vulnerability: {initial_reading.vulnerability_shown}

What is the client REALLY expressing emotionally beneath the surface?
What desires are hidden that they may not have articulated?
What do they truly need from this experience beyond what they've said?
How should I adjust my tone to meet them exactly where they are?

Respond in this JSON format:
{{
    "primary_emotion": "[excited|stressed|dreamy|celebrating|seeking_escape|seeking_connection|contemplative|confident|vulnerable]",
    "energy_level": [0-1],
    "hidden_desires": ["desire1", "desire2"],
    "emotional_needs": ["need1", "need2"],
    "recommended_tone": "[therapeutic|sophisticated_friend|mystical_guide|luxury_concierge]",
    "key_insight": "One sentence insight about what they truly want"
}}"""
        
        try:
            # This would call Claude API - placeholder for now
            # response = await self.claude_client.analyze(analysis_prompt)
            # For now, return enhanced initial reading
            logger.info("Deep Claude analysis would be performed here")
            initial_reading.confidence_score = 0.85
            return initial_reading
        except Exception as e:
            logger.error("Claude analysis failed", error=str(e))
            return initial_reading


# Global emotion interpreter instance
emotion_interpreter = EmotionInterpreter()


def initialize_emotion_interpreter(claude_client=None) -> EmotionInterpreter:
    """
    Inject an optional Claude client into the global EmotionInterpreter instance.
    """
    global emotion_interpreter
    emotion_interpreter.claude_client = claude_client
    return emotion_interpreter

