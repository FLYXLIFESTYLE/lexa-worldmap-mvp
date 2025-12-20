"""
AIlessia's Experience Script Composer - Creates story-driven luxury experiences.

This module transforms data into emotion, composing cinematic journey narratives
that transform luxury travel into deeply personal, unforgettable experiences.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime
import structlog

from core.ailessia.emotion_interpreter import EmotionalReading, EmotionalState
from core.aibert.desire_anticipator import AnticipatedDesire

logger = structlog.get_logger()


@dataclass
class ExperienceScript:
    """
    Cinematic journey designed by AIlessia.
    
    This is not an itinerary—it's a story-driven emotional experience.
    """
    # Core narrative
    title: str
    cinematic_hook: str
    emotional_arc: str
    story_theme: str
    transformational_promise: str
    
    # Experience composition
    signature_experiences: List[Dict] = field(default_factory=list)
    sensory_journey: Dict = field(default_factory=dict)
    anticipation_moments: List[str] = field(default_factory=list)
    personalized_rituals: List[str] = field(default_factory=list)
    
    # Metadata
    destination: str = ""
    duration_days: int = 0
    total_investment: float = 0.0
    included_elements: List[str] = field(default_factory=list)
    
    # AIlessia's intelligence
    client_archetype: str = ""
    primary_emotions_addressed: List[str] = field(default_factory=list)
    hidden_desires_fulfilled: List[str] = field(default_factory=list)
    
    # Generated content
    full_narrative: str = ""
    pdf_sections: Dict = field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.now)


class ExperienceScriptComposer:
    """
    AIlessia's creative composition system.
    
    This is where AIlessia becomes an artist—transforming cold data
    into warm emotional journeys that clients will treasure forever.
    """
    
    EMOTIONAL_ARCS = {
        "celebration": {
            "arc": "Anticipation → Crescendo → Savoring → Reflection",
            "stages": ["Arrival excitement", "Peak celebration", "Intimate moments", "Integration"],
            "narrative_structure": "Rising action to climactic celebration, then gentle resolution",
            "ideal_for": [EmotionalState.CELEBRATING, EmotionalState.EXCITED]
        },
        "renewal": {
            "arc": "Release → Tranquility → Renewal → Integration",
            "stages": ["Letting go", "Deep rest", "Gentle awakening", "Return with clarity"],
            "narrative_structure": "Descending into peace, resting, then rising renewed",
            "ideal_for": [EmotionalState.STRESSED, EmotionalState.SEEKING_ESCAPE]
        },
        "transformation": {
            "arc": "Departure → Challenge → Breakthrough → Transcendence",
            "stages": ["Leaving known", "Facing edge", "Crossing threshold", "New identity"],
            "narrative_structure": "Hero's journey with meaningful threshold crossing",
            "ideal_for": [EmotionalState.CONTEMPLATIVE, EmotionalState.DREAMY]
        },
        "romance": {
            "arc": "Meeting → Connection → Depth → Commitment",
            "stages": ["Re-meeting", "Shared wonder", "Vulnerability", "Renewed bond"],
            "narrative_structure": "Love story structure with deepening intimacy",
            "ideal_for": [EmotionalState.SEEKING_CONNECTION, EmotionalState.NOSTALGIC]
        },
        "discovery": {
            "arc": "Arrival → Discovery → Wonder → Fulfillment",
            "stages": ["First impressions", "Unveiling secrets", "Peak experiences", "Integration"],
            "narrative_structure": "Classic journey of discovery with crescendo",
            "ideal_for": [EmotionalState.EXCITED, EmotionalState.PLAYFUL, EmotionalState.CONFIDENT]
        }
    }
    
    STORY_THEMES = {
        "romantic_escape": {
            "theme": "Romantic Escape",
            "keywords": ["love", "intimacy", "connection", "romance", "together"],
            "narrative_tone": "Intimate, sensual, emotionally rich",
            "title_templates": [
                "A {destination} Love Story",
                "Together in {destination}",
                "Your {destination} Romance",
                "Intimacy on the {destination}"
            ]
        },
        "celebration_of_achievement": {
            "theme": "Victory Celebration",
            "keywords": ["success", "achievement", "victory", "milestone"],
            "narrative_tone": "Triumphant, joyful, prestigious",
            "title_templates": [
                "Your Victory in {destination}",
                "Celebrating Excellence in {destination}",
                "The {destination} Achievement",
                "Success Realized: {destination}"
            ]
        },
        "transformational_journey": {
            "theme": "Personal Transformation",
            "keywords": ["transform", "growth", "become", "evolve", "meaning"],
            "narrative_tone": "Profound, meaningful, introspective",
            "title_templates": [
                "Becoming: A {destination} Journey",
                "Transformation on the {destination}",
                "Your {destination} Awakening",
                "The {destination} Metamorphosis"
            ]
        },
        "sanctuary_and_renewal": {
            "theme": "Sanctuary & Renewal",
            "keywords": ["peace", "renewal", "escape", "sanctuary", "restore"],
            "narrative_tone": "Serene, restorative, peaceful",
            "title_templates": [
                "Sanctuary in {destination}",
                "Renewal on the {destination}",
                "Your {destination} Refuge",
                "Peace in {destination}"
            ]
        },
        "sensory_indulgence": {
            "theme": "Sensory Journey",
            "keywords": ["taste", "sensation", "pleasure", "indulge", "savor"],
            "narrative_tone": "Lush, sensual, decadent",
            "title_templates": [
                "A {destination} for the Senses",
                "Indulgence in {destination}",
                "Savoring {destination}",
                "The Sensory {destination}"
            ]
        }
    }
    
    def __init__(self, neo4j_client, claude_client=None):
        """
        Initialize the Script Composer.
        
        Args:
            neo4j_client: Neo4j client for experience queries
            claude_client: Optional Claude client for narrative generation
        """
        self.neo4j_client = neo4j_client
        self.claude_client = claude_client
    
    async def compose_experience_script(
        self,
        client_profile: Dict,
        emotional_reading: EmotionalReading,
        anticipated_desires: List[AnticipatedDesire],
        selected_choices: Dict,
        signature_experiences: List[Dict]
    ) -> ExperienceScript:
        """
        Compose a story-driven Experience Script™.
        
        This is AIlessia's artistic masterpiece—transforming data into emotion.
        
        Args:
            client_profile: Client's personality and preferences
            emotional_reading: Current emotional state
            anticipated_desires: Desires AIbert has anticipated
            selected_choices: User's selections (region, theme, time, constraints)
            signature_experiences: Curated experiences from Neo4j
        
        Returns:
            Complete ExperienceScript ready for PDF generation
        """
        logger.info("Beginning script composition",
                   archetype=client_profile.get("archetype"),
                   emotion=emotional_reading.primary_state.value)
        
        # 1. Determine emotional arc
        emotional_arc_type = self._select_emotional_arc(
            emotional_reading,
            anticipated_desires
        )
        emotional_arc = self.EMOTIONAL_ARCS[emotional_arc_type]
        
        # 2. Identify story theme
        story_theme_type = self._identify_story_theme(
            emotional_reading,
            anticipated_desires,
            selected_choices
        )
        story_theme = self.STORY_THEMES[story_theme_type]
        
        # 3. Create title
        title = self._create_title(
            selected_choices.get("destination", "Mediterranean"),
            story_theme,
            client_profile.get("name")
        )
        
        # 4. Create cinematic hook
        hook = await self._create_cinematic_hook(
            selected_choices.get("destination", ""),
            client_profile.get("archetype", "The Explorer"),
            emotional_reading.primary_state,
            story_theme_type
        )
        
        # 5. Sequence experiences for emotional flow
        sequenced_experiences = self._sequence_for_emotional_flow(
            signature_experiences,
            emotional_arc
        )
        
        # 6. Design sensory journey
        sensory_journey = self._design_sensory_progression(
            sequenced_experiences
        )
        
        # 7. Create anticipation moments
        anticipation_moments = self._create_anticipation_moments(
            sequenced_experiences,
            emotional_arc
        )
        
        # 8. Add personalized rituals
        rituals = self._create_personalized_rituals(
            client_profile,
            anticipated_desires,
            story_theme_type
        )
        
        # 9. Create transformational promise
        transformation = self._create_transformational_promise(
            emotional_arc,
            story_theme,
            anticipated_desires
        )
        
        # 10. Calculate totals
        duration_days = self._calculate_duration(sequenced_experiences)
        total_investment = self._calculate_investment(sequenced_experiences)
        included_elements = self._list_included_elements(sequenced_experiences)
        
        # 11. Compose full narrative
        full_narrative = await self._compose_full_narrative(
            hook=hook,
            emotional_arc=emotional_arc,
            experiences=sequenced_experiences,
            sensory_journey=sensory_journey,
            rituals=rituals,
            transformation=transformation,
            client_profile=client_profile
        )
        
        # Create script
        script = ExperienceScript(
            title=title,
            cinematic_hook=hook,
            emotional_arc=emotional_arc["arc"],
            story_theme=story_theme["theme"],
            transformational_promise=transformation,
            signature_experiences=sequenced_experiences,
            sensory_journey=sensory_journey,
            anticipation_moments=anticipation_moments,
            personalized_rituals=rituals,
            destination=selected_choices.get("destination", ""),
            duration_days=duration_days,
            total_investment=total_investment,
            included_elements=included_elements,
            client_archetype=client_profile.get("archetype", ""),
            primary_emotions_addressed=[emotional_reading.primary_state.value],
            hidden_desires_fulfilled=[d.desire_type for d in anticipated_desires[:3]],
            full_narrative=full_narrative
        )
        
        logger.info("Script composition complete",
                   title=title,
                   experiences=len(sequenced_experiences),
                   arc=emotional_arc_type)
        
        return script
    
    def _select_emotional_arc(
        self,
        emotional_reading: EmotionalReading,
        anticipated_desires: List[AnticipatedDesire]
    ) -> str:
        """Determine which emotional arc fits this client's journey."""
        # Check emotional state first
        for arc_name, arc_config in self.EMOTIONAL_ARCS.items():
            if emotional_reading.primary_state in arc_config.get("ideal_for", []):
                return arc_name
        
        # Check anticipated desires
        desire_keywords = " ".join([d.desire_type for d in anticipated_desires]).lower()
        
        if "celebration" in desire_keywords or "achievement" in desire_keywords:
            return "celebration"
        elif "escape" in desire_keywords or "renewal" in desire_keywords:
            return "renewal"
        elif "transformation" in desire_keywords or "meaning" in desire_keywords:
            return "transformation"
        elif "connection" in desire_keywords or "romantic" in desire_keywords:
            return "romance"
        else:
            return "discovery"  # Default
    
    def _identify_story_theme(
        self,
        emotional_reading: EmotionalReading,
        anticipated_desires: List[AnticipatedDesire],
        selected_choices: Dict
    ) -> str:
        """Identify the overarching story theme."""
        # Check selected theme category first
        selected_theme = selected_choices.get("theme_category", "").lower()
        
        theme_mapping = {
            "romance": "romantic_escape",
            "achievement": "celebration_of_achievement",
            "wellness": "sanctuary_and_renewal",
            "culinary": "sensory_indulgence",
            "transformation": "transformational_journey"
        }
        
        if selected_theme in theme_mapping:
            return theme_mapping[selected_theme]
        
        # Check desires
        if anticipated_desires:
            desire_text = anticipated_desires[0].desire_type.lower()
            
            if "romantic" in desire_text or "connection" in desire_text:
                return "romantic_escape"
            elif "achievement" in desire_text or "celebration" in desire_text:
                return "celebration_of_achievement"
            elif "escape" in desire_text or "renewal" in desire_text:
                return "sanctuary_and_renewal"
            elif "transformation" in desire_text or "identity" in desire_text:
                return "transformational_journey"
        
        # Check emotional state
        if emotional_reading.primary_state in [EmotionalState.SEEKING_CONNECTION]:
            return "romantic_escape"
        elif emotional_reading.primary_state in [EmotionalState.SEEKING_ESCAPE]:
            return "sanctuary_and_renewal"
        
        return "sensory_indulgence"  # Default
    
    def _create_title(
        self,
        destination: str,
        story_theme: Dict,
        client_name: Optional[str]
    ) -> str:
        """Create compelling title for the experience script."""
        template = story_theme["title_templates"][0]
        title = template.format(destination=destination)
        
        # Personalize if name provided
        if client_name and len(client_name.split()) == 1:
            title = f"{client_name}'s {title}"
        
        return title
    
    async def _create_cinematic_hook(
        self,
        destination: str,
        archetype: str,
        emotional_state: EmotionalState,
        story_theme: str
    ) -> str:
        """
        Create an opening that captures imagination.
        
        Like the first sentence of a great novel.
        """
        # Predefined hooks for common combinations
        hooks = {
            "romantic_escape": [
                f"Imagine the moment the {destination} sun melts into gold, and you're exactly where you've always belonged—together.",
                f"There's a place where time slows to the rhythm of waves, and your only decision is which sunset to witness next—hand in hand.",
                f"Some journeys change your itinerary. This one changes you—and deepens what you share."
            ],
            "celebration_of_achievement": [
                f"You've earned this. Every sunrise over {destination}, every toast, every moment of pure indulgence—this is yours.",
                f"Success tastes sweeter when savored in {destination}, where every experience reflects the excellence you've achieved.",
                f"This is your victory lap—{destination} style. Prestigious, exclusive, unforgettable."
            ],
            "sanctuary_and_renewal": [
                f"In {destination}, permission is granted: to rest, to release, to simply be.",
                f"There's a place where the world's demands dissolve into sea air and sacred silence—welcome to your sanctuary.",
                f"Let {destination} hold you. Let the Mediterranean heal you. Let yourself return renewed."
            ],
            "transformational_journey": [
                f"Some journeys end where they began. This one ends with a different you—awakened in {destination}.",
                f"The Mediterranean has always called to seekers. Now it's calling to the part of you ready to emerge.",
                f"In {destination}, between ancient stones and endless sea, you'll meet who you're becoming."
            ],
            "sensory_indulgence": [
                f"Every sense awakens in {destination}—from the first taste of dawn to the last whisper of night.",
                f"This is pleasure as an art form: {destination}, where every moment is exquisitely composed.",
                f"Indulgence isn't just allowed here—it's the entire point. Welcome to {destination}."
            ]
        }
        
        theme_hooks = hooks.get(story_theme, hooks["sensory_indulgence"])
        return theme_hooks[0]
    
    def _sequence_for_emotional_flow(
        self,
        experiences: List[Dict],
        emotional_arc: Dict
    ) -> List[Dict]:
        """
        Sequence experiences to follow emotional arc.
        
        Not chronological—emotional.
        """
        if not experiences:
            return []
        
        # Sort by ideal story position
        position_order = {
            "Opening": 1,
            "Building": 2,
            "Crescendo moment": 3,
            "Resolution": 4
        }
        
        sequenced = sorted(
            experiences,
            key=lambda e: position_order.get(e.get("ideal_story_position", "Building"), 2)
        )
        
        # Add sequence numbers
        for i, exp in enumerate(sequenced, 1):
            exp["sequence_number"] = i
            exp["arc_stage"] = emotional_arc["stages"][min(i-1, len(emotional_arc["stages"])-1)]
        
        return sequenced
    
    def _design_sensory_progression(
        self,
        experiences: List[Dict]
    ) -> Dict:
        """Design how senses evolve throughout the journey."""
        sensory_journey = {
            "visual_arc": [],
            "gustatory_arc": [],
            "olfactory_arc": [],
            "auditory_arc": [],
            "tactile_arc": []
        }
        
        for exp in experiences:
            if "sensory_visual" in exp:
                sensory_journey["visual_arc"].append(exp["sensory_visual"])
            if "sensory_gustatory" in exp:
                sensory_journey["gustatory_arc"].append(exp["sensory_gustatory"])
            if "sensory_olfactory" in exp:
                sensory_journey["olfactory_arc"].append(exp["sensory_olfactory"])
            if "sensory_auditory" in exp:
                sensory_journey["auditory_arc"].append(exp["sensory_auditory"])
            if "sensory_tactile" in exp:
                sensory_journey["tactile_arc"].append(exp["sensory_tactile"])
        
        return sensory_journey
    
    def _create_anticipation_moments(
        self,
        experiences: List[Dict],
        emotional_arc: Dict
    ) -> List[str]:
        """Create moments that build anticipation throughout journey."""
        moments = []
        
        for exp in experiences:
            # Get anticipation builders from experience
            for i in range(1, 4):
                key = f"anticipation_builder_{i}"
                if key in exp:
                    moments.append(exp[key])
        
        return moments[:8]  # Limit to 8 moments
    
    def _create_personalized_rituals(
        self,
        client_profile: Dict,
        anticipated_desires: List[AnticipatedDesire],
        story_theme: str
    ) -> List[str]:
        """Create personalized rituals unique to this client."""
        rituals = []
        
        archetype = client_profile.get("archetype", "")
        
        # Archetype-specific rituals
        if archetype == "The Romantic":
            rituals.extend([
                "Private sunrise coffee ritual with personalized playlist",
                "Evening gratitude sharing with champagne at sunset",
                "Love letter writing moment overlooking the sea"
            ])
        elif archetype == "The Achiever":
            rituals.extend([
                "Victory toast at the highest point",
                "Personal achievement reflection session",
                "Trophy moment photo at signature location"
            ])
        elif archetype == "The Contemplative":
            rituals.extend([
                "Morning meditation overlooking the water",
                "Sunset reflection journal time",
                "Meaningful conversation prompts during experiences"
            ])
        elif archetype == "The Hedonist":
            rituals.extend([
                "Daily champagne moment at golden hour",
                "Sensory awakening ritual each morning",
                "Evening indulgence reflection"
            ])
        
        # Theme-specific rituals
        if story_theme == "romantic_escape":
            rituals.append("Daily 'us time' check-in ritual")
        elif story_theme == "sanctuary_and_renewal":
            rituals.append("Morning intention setting, evening release ritual")
        elif story_theme == "transformational_journey":
            rituals.append("Daily transformation marker or symbolic gesture")
        
        return rituals[:5]  # Limit to 5 rituals
    
    def _create_transformational_promise(
        self,
        emotional_arc: Dict,
        story_theme: Dict,
        anticipated_desires: List[AnticipatedDesire]
    ) -> str:
        """Create promise of who they'll become."""
        promises = {
            "romantic_escape": "You'll return more connected, more in love, with memories that deepen your bond forever.",
            "celebration_of_achievement": "You'll return having fully savored your success, feeling the power of your achievement in every cell.",
            "sanctuary_and_renewal": "You'll return renewed, restored, with your soul replenished and your spirit clear.",
            "transformational_journey": "You'll return transformed, carrying the wisdom of this journey into who you're becoming.",
            "sensory_indulgence": "You'll return having experienced pleasure as art, with your senses forever awakened."
        }
        
        # Get promise from theme
        theme_key = [k for k, v in self.STORY_THEMES.items() if v["theme"] == story_theme["theme"]]
        if theme_key:
            return promises.get(theme_key[0], promises["sensory_indulgence"])
        
        return promises["sensory_indulgence"]
    
    def _calculate_duration(self, experiences: List[Dict]) -> int:
        """Calculate journey duration in days."""
        total_hours = sum(exp.get("duration_hours", 0) for exp in experiences)
        # Assume 8 hours of experiences per day
        return max(3, int(total_hours / 6) + 1)
    
    def _calculate_investment(self, experiences: List[Dict]) -> float:
        """Calculate total investment."""
        return sum(exp.get("price_point", 0) for exp in experiences)
    
    def _list_included_elements(self, experiences: List[Dict]) -> List[str]:
        """List all included elements."""
        elements = set()
        
        for exp in experiences:
            elements.add(exp.get("name", "Experience"))
        
        # Standard inclusions
        elements.update([
            "Private transportation throughout",
            "Personal concierge service 24/7",
            "All reservations and arrangements",
            "Personalized welcome amenities",
            "Digital Experience Script with journey details"
        ])
        
        return list(elements)
    
    async def _compose_full_narrative(
        self,
        hook: str,
        emotional_arc: Dict,
        experiences: List[Dict],
        sensory_journey: Dict,
        rituals: List[str],
        transformation: str,
        client_profile: Dict
    ) -> str:
        """
        Compose the full narrative story.
        
        This would ideally use Claude for beautiful prose.
        """
        # Build narrative sections
        narrative_parts = []
        
        # Opening
        narrative_parts.append(f"## Your Journey Begins\n\n{hook}\n")
        
        # Emotional arc description
        narrative_parts.append(
            f"\n## The Journey: {emotional_arc['arc']}\n\n"
            f"This experience follows a carefully composed emotional arc: "
            f"{emotional_arc['narrative_structure']}.\n"
        )
        
        # Signature experiences
        narrative_parts.append("\n## Your Signature Experiences\n")
        for exp in experiences:
            narrative_parts.append(
                f"\n### {exp.get('name', 'Experience')}\n"
                f"*{exp.get('arc_stage', 'Journey moment')}*\n\n"
                f"{exp.get('cinematic_hook', '')}\n\n"
                f"**The Moment:** {exp.get('signature_moment', 'An unforgettable experience')}\n"
            )
        
        # Transformation
        narrative_parts.append(f"\n## Your Transformation\n\n{transformation}\n")
        
        return "\n".join(narrative_parts)


# Global script composer instance placeholder
script_composer = None


def initialize_script_composer(neo4j_client, claude_client=None):
    """Initialize global script composer with clients."""
    global script_composer
    script_composer = ExperienceScriptComposer(neo4j_client, claude_client)
    return script_composer

