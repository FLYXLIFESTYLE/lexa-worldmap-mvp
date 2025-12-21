"""
LEXA Personality Mirror - Adaptive communication system.

This module enables LEXA to adapt her personality, tone, and communication style
to match ultra-luxury clients exactly where they are emotionally.
"""

from typing import Dict, Optional
from dataclasses import dataclass
import asyncio
import structlog

from core.ailessia.emotion_interpreter import EmotionalReading, EmotionalState
from config.settings import settings

logger = structlog.get_logger()

LEXA_LUXURY_SYSTEM_PROMPT = """You are LEXA (Luxury Experience Assistant) — emotional intelligence for luxury travel experiences.

Your job: create emotion-driven, themed experiences that feel rare, intimate, and inevitable — not generic itineraries.

KNOWLEDGE YOU ALREADY HAVE (use it freely — do not ask basic questions you can infer):
1) World knowledge: geography, seasons, culture, distances, logistics
2) Human understanding: relationships, psychology, life stages, social dynamics
3) Reasoning: time, pacing, constraints, trade-offs
4) Luxury expertise: UHNWI expectations, discretion, status markers, service standards

RULES (Luxury You Can’t Buy):
- Be decisive and elegant. Ask fewer, better questions.
- Never sound like a chatbot. No hedging. No “as an AI…”.
- Never be sales-y. Luxury is implied, not pushed.
- Anticipate the unspoken: friction, privacy, energy, relationship dynamics.
- Make it feel personal: reflect the client's emotional subtext in one crisp line.
- No markdown code fences. If JSON is requested, output valid JSON only.
"""


@dataclass
class ToneProfile:
    """Configuration for a specific communication tone."""
    name: str
    style: str
    language: str
    pacing: str
    example: str
    when_to_use: str


class PersonalityMirror:
    """
    AIlessia's adaptive communication system.
    
    Like a sophisticated mirror, AIlessia reflects back the exact energy,
    depth, and tone that each client needs in each moment.
    """
    
    TONE_PROFILES = {
        "therapeutic": ToneProfile(
            name="therapeutic",
            style="Warm, empathetic, gently guiding",
            language="Soft, affirming, spacious",
            pacing="Slow, reflective, patient",
            example="I sense that you're searching for something deeper here. Tell me, when you close your eyes and imagine this journey, what feeling washes over you first?",
            when_to_use="High vulnerability, seeking guidance, emotional openness"
        ),
        
        "sophisticated_friend": ToneProfile(
            name="sophisticated_friend",
            style="Warm but knowing, elegant casualness",
            language="Refined yet approachable, subtle sophistication",
            pacing="Conversational, natural flow",
            example="You know what would be absolutely perfect? There's this hidden villa in Cap Ferrat that feels like stepping into a Fitzgerald novel. Very you.",
            when_to_use="Default tone, confident clients, relationship building"
        ),
        
        "mystical_guide": ToneProfile(
            name="mystical_guide",
            style="Intuitive, spiritual, almost prophetic",
            language="Poetic, symbolic, transformational",
            pacing="Measured, intentional, meaningful",
            example="The universe has a way of leading us exactly where we need to be. And right now, the French Riviera is calling to the part of you that's ready to bloom.",
            when_to_use="Contemplative archetype, seeking meaning, transformation"
        ),
        
        "luxury_concierge": ToneProfile(
            name="luxury_concierge",
            style="Professional excellence, anticipatory service",
            language="Precise, confident, detail-oriented",
            pacing="Efficient but never rushed",
            example="I've curated something exceptional for you. Based on your preferences, I've secured three experiences that align perfectly with your vision.",
            when_to_use="Achievers, decisive clients, preference for expertise"
        ),
        
        "playful_confidante": ToneProfile(
            name="playful_confidante",
            style="Light, fun, warmly mischievous",
            language="Energetic, enthusiastic, celebratory",
            pacing="Lively, upbeat, engaging",
            example="Oh, you're going to love this! I've found something so perfectly unexpected—it's like the French Riviera's best-kept secret just for you.",
            when_to_use="High energy, excited state, adventurous personalities"
        )
    }
    
    def __init__(self, claude_client=None):
        """
        Initialize the Personality Mirror.
        
        Args:
            claude_client: Optional Claude API client for response generation
        """
        self.claude_client = claude_client
    
    def select_tone(
        self,
        emotional_reading: EmotionalReading,
        conversation_stage: str,
        client_archetype: Optional[str] = None
    ) -> str:
        """
        Choose the right tone for this client at this moment.
        
        Args:
            emotional_reading: Current emotional state
            conversation_stage: Stage of conversation (opening, discovery, recommendation, closing)
            client_archetype: Detected personality archetype
        
        Returns:
            Tone profile name
        """
        # Override from emotional reading if specified
        if emotional_reading.recommended_tone:
            return emotional_reading.recommended_tone
        
        # High vulnerability → therapeutic
        if emotional_reading.vulnerability_shown > 0.7:
            logger.info("Selected therapeutic tone", reason="high_vulnerability")
            return "therapeutic"
        
        # High energy + celebrating → playful_confidante
        if (emotional_reading.energy_level > 0.8 and 
            emotional_reading.primary_state == EmotionalState.CELEBRATING):
            logger.info("Selected playful tone", reason="celebrating_high_energy")
            return "playful_confidante"
        
        # Contemplative archetype → mystical_guide
        if client_archetype == "The Contemplative":
            logger.info("Selected mystical guide", reason="contemplative_archetype")
            return "mystical_guide"
        
        # Achiever + confident → luxury_concierge
        if (client_archetype == "The Achiever" and 
            emotional_reading.primary_state == EmotionalState.CONFIDENT):
            logger.info("Selected luxury concierge", reason="confident_achiever")
            return "luxury_concierge"
        
        # Excited + adventurer → playful_confidante
        if (client_archetype == "The Adventurer" and 
            emotional_reading.energy_level > 0.7):
            logger.info("Selected playful confidante", reason="adventurous_excited")
            return "playful_confidante"
        
        # Default: sophisticated_friend (warm, elegant, knowing)
        logger.info("Selected sophisticated friend", reason="default")
        return "sophisticated_friend"
    
    async def generate_response(
        self,
        content: str,
        tone_name: str,
        client_name: Optional[str] = None,
        emotional_context: Optional[Dict] = None,
        conversation_stage: str = "discovery"
    ) -> str:
        """
        Generate LEXA's response in the adapted tone.
        
        Args:
            content: Core content/message to communicate
            tone_name: Which tone profile to use
            client_name: Client's name for personalization
            emotional_context: Current emotional context
            conversation_stage: Current conversation stage
        
        Returns:
            Generated response in LEXA's voice
        """
        tone_config = self.TONE_PROFILES.get(
            tone_name, 
            self.TONE_PROFILES["sophisticated_friend"]
        )
        
        if not self.claude_client:
            # Fallback: format content with basic tone adjustment
            return self._format_with_tone(content, tone_config, client_name)
        
        # Use Claude for nuanced generation
        prompt = self._build_generation_prompt(
            content, 
            tone_config, 
            client_name,
            emotional_context,
            conversation_stage
        )
        
        try:
            # Anthropic client is sync; call it in a thread.
            def _call():
                msg = self.claude_client.messages.create(
                    model=getattr(settings, "model_name", "claude-3-5-sonnet-latest"),
                    max_tokens=800,
                    system=LEXA_LUXURY_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": prompt}],
                )
                parts = []
                for block in getattr(msg, "content", []) or []:
                    if getattr(block, "type", None) == "text":
                        parts.append(getattr(block, "text", ""))
                return ("\n".join([p for p in parts if p]).strip()) or None

            response = await asyncio.to_thread(_call)
            if not response:
                response = self._format_with_tone(content, tone_config, client_name)
            
            logger.info("Generated response",
                       tone=tone_name,
                       stage=conversation_stage)
            return response
        except Exception as e:
            logger.error("Response generation failed", error=str(e))
            return self._format_with_tone(content, tone_config, client_name)
    
    def _format_with_tone(
        self,
        content: str,
        tone_config: ToneProfile,
        client_name: Optional[str]
    ) -> str:
        """Basic tone formatting without Claude."""
        # Add personalization if name provided
        if client_name and not content.startswith(client_name):
            # Therapeutic: use name gently
            if tone_config.name == "therapeutic":
                content = f"{client_name}, {content}"
            # Sophisticated friend: occasional use
            elif tone_config.name == "sophisticated_friend" and len(content) > 100:
                content = f"{client_name}, {content}"
        
        # Adjust punctuation based on tone
        if tone_config.name == "playful_confidante":
            # Add energy if not already there
            if not content.endswith(("!", "?", "...")):
                content = content.rstrip(".") + "!"
        elif tone_config.name == "mystical_guide":
            # Add thoughtful pauses
            if not "..." in content and len(content) > 50:
                sentences = content.split(". ")
                if len(sentences) > 1:
                    content = sentences[0] + "... " + ". ".join(sentences[1:])
        
        return content
    
    def _build_generation_prompt(
        self,
        content: str,
        tone_config: ToneProfile,
        client_name: Optional[str],
        emotional_context: Optional[Dict],
        conversation_stage: str
    ) -> str:
        """Build prompt for Claude to generate response."""
        name_instruction = f"Speaking to {client_name}. " if client_name else ""
        
        emotional_context_str = ""
        if emotional_context:
            emotional_context_str = f"""
Emotional context:
- Primary emotion: {emotional_context.get('primary_state', 'unknown')}
- Energy level: {emotional_context.get('energy_level', 0.5)}
- Vulnerability: {emotional_context.get('vulnerability', 0.3)}
- Hidden desires: {', '.join(emotional_context.get('hidden_desires', []))}
"""
        
        prompt = f"""{name_instruction}Conversation stage: {conversation_stage}

Your tone: {tone_config.style}
Language style: {tone_config.language}
Pacing: {tone_config.pacing}

Example of this tone:
"{tone_config.example}"
{emotional_context_str}

Core message to communicate:
{content}

Transform this into LEXA's voice with these guidelines:
- Deeply personal and present
- Emotionally intelligent and intuitive
- Never pushy or sales-y
- Anticipatory—she knows what they need
- Creates emotional experiences through words
- Match the tone profile exactly
- Keep it concise (no fluff). Ask at most one question, only if it materially improves the outcome.

Generate the response:"""
        
        return prompt
    
    def generate_greeting(
        self,
        client_name: Optional[str] = None,
        time_of_day: str = "day",
        is_returning: bool = False
    ) -> str:
        """
        Generate LEXA's opening greeting.
        
        Args:
            client_name: Client's name
            time_of_day: Time of day (morning, afternoon, evening, day)
            is_returning: Whether this is a returning client
        
        Returns:
            Personalized greeting
        """
        greetings = {
            "new_client": [
                "Welcome. I'm LEXA - here to design something extraordinary for you.",
                "Hello. I sense you're ready for an experience that truly moves you.",
                "Welcome. Let's create something unforgettable together."
            ],
            "returning_client": [
                f"Welcome back{', ' + client_name if client_name else ''}. Ready to create another beautiful memory?",
                f"It's wonderful to have you back{', ' + client_name if client_name else ''}. What shall we dream up this time?",
                f"{client_name + ', ' if client_name else ''}I'm delighted you've returned. Let's design something even more special."
            ]
        }
        
        greeting_type = "returning_client" if is_returning else "new_client"
        greeting = greetings[greeting_type][0]  # Select first for consistency
        
        return greeting
    
    def generate_transition(
        self,
        from_stage: str,
        to_stage: str,
        tone_name: str
    ) -> str:
        """
        Generate smooth transition between conversation stages.
        
        Args:
            from_stage: Current stage
            to_stage: Next stage
            tone_name: Current tone profile
        
        Returns:
            Transition phrase
        """
        transitions = {
            "therapeutic": {
                "discovery_to_recommendation": "Based on what you've shared, I have some thoughts...",
                "recommendation_to_refinement": "How does this resonate with you?",
                "refinement_to_composition": "Let me bring this to life for you..."
            },
            "sophisticated_friend": {
                "discovery_to_recommendation": "Alright, I know exactly what you need.",
                "recommendation_to_refinement": "What do you think? Does this feel right?",
                "refinement_to_composition": "Perfect. Let me compose something beautiful."
            },
            "mystical_guide": {
                "discovery_to_recommendation": "The path is becoming clear...",
                "recommendation_to_refinement": "Does this speak to your soul?",
                "refinement_to_composition": "Now, let me weave this into your journey..."
            },
            "luxury_concierge": {
                "discovery_to_recommendation": "I have curated the perfect options for you.",
                "recommendation_to_refinement": "Please confirm these selections.",
                "refinement_to_composition": "Excellent. I'll finalize your Experience Script."
            },
            "playful_confidante": {
                "discovery_to_recommendation": "Okay, I've found something perfect!",
                "recommendation_to_refinement": "Yes? Tell me what you think!",
                "refinement_to_composition": "This is going to be amazing. Let me put it all together!"
            }
        }
        
        transition_key = f"{from_stage}_to_{to_stage}"
        tone_transitions = transitions.get(tone_name, transitions["sophisticated_friend"])
        
        return tone_transitions.get(transition_key, "Let's continue...")
    
    def adapt_suggestion_framing(
        self,
        experience_name: str,
        experience_hook: str,
        tone_name: str,
        why_perfect: str
    ) -> str:
        """
        Frame experience suggestion in appropriate tone.
        
        Args:
            experience_name: Name of the experience
            experience_hook: Cinematic hook
            tone_name: Current tone profile
            why_perfect: Why it's perfect for them
        
        Returns:
            Framed suggestion
        """
        framings = {
            "therapeutic": f"I sense that {experience_name} would deeply resonate with you. {experience_hook} {why_perfect}",
            "sophisticated_friend": f"You absolutely need to experience {experience_name}. {experience_hook} It's so perfectly you because {why_perfect}",
            "mystical_guide": f"{experience_hook} This is {experience_name}, and it's calling to you. {why_perfect}",
            "luxury_concierge": f"I recommend {experience_name}. {experience_hook} This aligns with your vision because {why_perfect}",
            "playful_confidante": f"Oh! {experience_name} is perfect! {experience_hook} You're going to love it because {why_perfect}"
        }
        
        return framings.get(tone_name, framings["sophisticated_friend"])
    
    def get_tone_profile(self, tone_name: str) -> Optional[ToneProfile]:
        """Get full tone profile configuration."""
        return self.TONE_PROFILES.get(tone_name)
    
    def list_available_tones(self) -> list[str]:
        """List all available tone profiles."""
        return list(self.TONE_PROFILES.keys())


# Global personality mirror instance
personality_mirror = PersonalityMirror()


def initialize_personality_mirror(claude_client=None) -> PersonalityMirror:
    """
    Inject an optional Claude client into the global PersonalityMirror instance.
    """
    global personality_mirror
    personality_mirror.claude_client = claude_client
    return personality_mirror

