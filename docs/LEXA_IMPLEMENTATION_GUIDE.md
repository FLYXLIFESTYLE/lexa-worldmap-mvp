# LEXA Conversation Implementation Guide
# How to Build This in the RAG System

## OVERVIEW

This guide shows how to implement the Experience DNA conversation flow in your RAG system.

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                     CONVERSATION AGENT                       │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │   Context    │  │    Stage      │  │    Question     │ │
│  │   Tracker    │→ │   Manager     │→ │    Generator    │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
│         ↑                  ↑                    ↓           │
│         │                  │                    │           │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │  Information │  │  Repetition   │  │    Response     │ │
│  │  Extractor   │  │   Detector    │  │   Formatter     │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         ↓                                         ↓
┌─────────────────┐                       ┌─────────────────┐
│  Neo4j Database │                       │  Claude AI API  │
│  (Context Store)│                       │  (LLM Responses)│
└─────────────────┘                       └─────────────────┘
```

---

## COMPONENT 1: Context Tracker

**File:** `rag_system/agents/context_tracker.py`

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime

@dataclass
class ConversationContext:
    """
    Tracks all information gathered during conversation
    """
    # Identifiers
    session_id: str
    account_id: str
    started_at: datetime = field(default_factory=datetime.now)
    
    # Stage tracking
    current_stage: str = "wow"  # wow, checkpoint, deepening, synthesis, script, logistics, build
    questions_asked: int = 0
    messages_exchanged: int = 0
    
    # Experience DNA
    story_arc: Optional[str] = None
    core_emotion: Optional[str] = None
    secondary_emotion: Optional[str] = None
    sensory_triggers: List[Dict] = field(default_factory=list)
    
    # What they want
    desired_feelings: List[str] = field(default_factory=list)
    peak_moment_vision: Optional[str] = None
    best_past_experiences: List[Dict] = field(default_factory=list)
    
    # What they DON'T want
    deal_breakers: List[str] = field(default_factory=list)
    worst_past_experiences: List[Dict] = field(default_factory=list)
    
    # Travel details
    companions: List[Dict] = field(default_factory=list)
    rhythm_preference: Optional[str] = None
    structure_preference: Optional[str] = None
    
    # Logistics
    preferred_destination: Optional[str] = None
    preferred_timing: Optional[str] = None
    budget_indicators: List[str] = field(default_factory=list)
    
    # State flags
    has_repeated_self: bool = False
    needs_apology: bool = False
    ready_for_checkpoint: bool = False
    checkpoint_approved: bool = False
    ready_for_synthesis: bool = False
    synthesis_approved: bool = False
    ready_for_script: bool = False
    script_approved: bool = False
    ready_for_logistics: bool = False
    
    # Full message history
    messages: List[Dict] = field(default_factory=list)
    
    def add_message(self, role: str, content: str):
        """Add a message to history"""
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        self.messages_exchanged += 1
        if role == "assistant":
            self.questions_asked += 1
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for storage"""
        return {
            "session_id": self.session_id,
            "account_id": self.account_id,
            "started_at": self.started_at.isoformat(),
            "current_stage": self.current_stage,
            "questions_asked": self.questions_asked,
            "experience_dna": {
                "story_arc": self.story_arc,
                "core_emotion": self.core_emotion,
                "secondary_emotion": self.secondary_emotion,
                "sensory_triggers": self.sensory_triggers,
            },
            "desires": {
                "feelings": self.desired_feelings,
                "peak_moment": self.peak_moment_vision,
                "best_experiences": self.best_past_experiences,
            },
            "avoids": {
                "deal_breakers": self.deal_breakers,
                "worst_experiences": self.worst_past_experiences,
            },
            "travel_details": {
                "companions": self.companions,
                "rhythm": self.rhythm_preference,
                "structure": self.structure_preference,
            },
            "logistics": {
                "destination": self.preferred_destination,
                "timing": self.preferred_timing,
                "budget": self.budget_indicators,
            },
            "messages": self.messages,
        }
```

---

## COMPONENT 2: Information Extractor

**File:** `rag_system/agents/information_extractor.py`

```python
import re
from typing import Dict, List
from .context_tracker import ConversationContext

class InformationExtractor:
    """
    Extracts structured information from client messages
    """
    
    # Emotion keywords
    EMOTION_KEYWORDS = {
        "peace": ["peaceful", "calm", "serene", "tranquil", "still", "quiet"],
        "freedom": ["free", "liberated", "unburdened", "weightless", "spontaneous"],
        "connection": ["together", "intimate", "close", "bonding", "connected"],
        "thrill": ["exciting", "thrilling", "adventurous", "alive", "electric"],
        "awe": ["breathtaking", "stunning", "overwhelming", "awestruck", "humbled"],
        "joy": ["happy", "joyful", "delighted", "cheerful", "elated"],
        "romance": ["romantic", "loving", "passionate", "devoted", "tender"],
        "luxury": ["luxurious", "pampered", "indulgent", "refined", "elegant"],
    }
    
    # Deal-breaker keywords
    NEGATIVE_KEYWORDS = [
        "hate", "dislike", "can't stand", "worst", "never again",
        "ruined", "killed", "destroyed", "awful", "terrible"
    ]
    
    def extract_from_message(self, message: str, context: ConversationContext) -> Dict:
        """
        Extract information from a client message
        Returns dict of extracted info
        """
        message_lower = message.lower()
        extracted = {
            "emotions": [],
            "deal_breakers": [],
            "sensory_triggers": [],
            "companions": [],
            "destination": None,
            "timing": None,
        }
        
        # Extract emotions
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            if any(kw in message_lower for kw in keywords):
                extracted["emotions"].append(emotion)
        
        # Extract deal-breakers
        if any(neg in message_lower for neg in self.NEGATIVE_KEYWORDS):
            # Get the sentence with negative keyword
            sentences = message.split('.')
            for sentence in sentences:
                if any(neg in sentence.lower() for neg in self.NEGATIVE_KEYWORDS):
                    # Extract what they don't want
                    for term in ["crowded", "rushed", "touristy", "staged", "structured", "loud"]:
                        if term in sentence.lower():
                            extracted["deal_breakers"].append(term)
        
        # Extract sensory triggers
        sensory_patterns = {
            "smell": r"(smell|scent|aroma|fragrance) of ([\w\s]+)",
            "taste": r"(taste|flavor) of ([\w\s]+)",
            "sound": r"(sound|music|noise) of ([\w\s]+)",
        }
        
        for sense_type, pattern in sensory_patterns.items():
            matches = re.findall(pattern, message_lower)
            for match in matches:
                extracted["sensory_triggers"].append({
                    "type": sense_type,
                    "detail": match[1].strip()
                })
        
        # Extract companions
        if any(word in message_lower for word in ["wife", "husband", "partner", "spouse"]):
            companion_type = next((w for w in ["wife", "husband", "partner", "spouse"] 
                                 if w in message_lower), "partner")
            extracted["companions"].append({"who": companion_type})
        
        if "kids" in message_lower or "children" in message_lower:
            extracted["companions"].append({"who": "children"})
        
        # Extract destination mentions
        # (This would need a more sophisticated location entity extraction)
        location_keywords = ["beach", "mountains", "city", "countryside", "coast"]
        for loc in location_keywords:
            if loc in message_lower:
                extracted["destination"] = loc
        
        # Extract timing
        months = ["january", "february", "march", "april", "may", "june",
                  "july", "august", "september", "october", "november", "december"]
        for month in months:
            if month in message_lower:
                extracted["timing"] = month.capitalize()
        
        return extracted
    
    def update_context(self, extracted: Dict, context: ConversationContext):
        """
        Update context with extracted information
        """
        # Add emotions
        for emotion in extracted["emotions"]:
            if emotion not in context.desired_feelings:
                context.desired_feelings.append(emotion)
        
        # Add deal-breakers
        for db in extracted["deal_breakers"]:
            if db not in context.deal_breakers:
                context.deal_breakers.append(db)
        
        # Add sensory triggers
        for trigger in extracted["sensory_triggers"]:
            # Check if not duplicate
            if not any(t["detail"] == trigger["detail"] for t in context.sensory_triggers):
                context.sensory_triggers.append(trigger)
        
        # Add companions
        for companion in extracted["companions"]:
            # Check if not duplicate
            if not any(c["who"] == companion["who"] for c in context.companions):
                context.companions.append(companion)
        
        # Update destination
        if extracted["destination"] and not context.preferred_destination:
            context.preferred_destination = extracted["destination"]
        
        # Update timing
        if extracted["timing"] and not context.preferred_timing:
            context.preferred_timing = extracted["timing"]
```

---

## COMPONENT 3: Stage Manager

**File:** `rag_system/agents/stage_manager.py`

```python
from .context_tracker import ConversationContext

class StageManager:
    """
    Manages conversation stage transitions
    """
    
    def should_progress(self, context: ConversationContext) -> tuple[bool, str]:
        """
        Determines if we should move to next stage
        Returns: (should_move, next_stage)
        """
        
        # WOW → CHECKPOINT (after 3 questions)
        if context.current_stage == "wow":
            if context.questions_asked >= 3:
                # Check if we have key elements
                has_info = (
                    len(context.desired_feelings) > 0 or
                    context.peak_moment_vision or
                    len(context.best_past_experiences) > 0
                )
                if has_info:
                    context.ready_for_checkpoint = True
                    return (True, "checkpoint")
            return (False, "wow")
        
        # CHECKPOINT → DEEPENING (after approval)
        if context.current_stage == "checkpoint":
            if context.checkpoint_approved:
                return (True, "deepening")
            return (False, "checkpoint")
        
        # DEEPENING → SYNTHESIS (when DNA is complete)
        if context.current_stage == "deepening":
            has_complete_dna = (
                len(context.desired_feelings) >= 2 and
                len(context.sensory_triggers) >= 1 and
                len(context.companions) > 0
            )
            
            # Or if we've asked enough questions
            if has_complete_dna or context.questions_asked >= 8:
                context.ready_for_synthesis = True
                return (True, "synthesis")
            
            return (False, "deepening")
        
        # SYNTHESIS → SCRIPT (after DNA approval)
        if context.current_stage == "synthesis":
            if context.synthesis_approved:
                context.ready_for_script = True
                return (True, "script")
            return (False, "synthesis")
        
        # SCRIPT → LOGISTICS (after script approval)
        if context.current_stage == "script":
            if context.script_approved:
                context.ready_for_logistics = True
                return (True, "logistics")
            return (False, "script")
        
        # LOGISTICS → BUILD (after destination/timing provided)
        if context.current_stage == "logistics":
            if context.preferred_destination or context.preferred_timing:
                return (True, "build")
            return (False, "logistics")
        
        return (False, context.current_stage)
    
    def detect_approval_signal(self, message: str) -> bool:
        """
        Detects if client is approving/confirming
        """
        approval_signals = [
            "yes", "exactly", "that's right", "perfect", "correct",
            "yes!", "absolutely", "that's it", "spot on", "right",
            "👍", "✓", "✔️", "continue", "let's go", "sounds good"
        ]
        
        message_lower = message.lower().strip()
        return any(signal in message_lower for signal in approval_signals)
    
    def update_stage(self, context: ConversationContext):
        """
        Check and update stage if necessary
        """
        should_move, next_stage = self.should_progress(context)
        if should_move:
            print(f"[Stage Manager] Moving from {context.current_stage} → {next_stage}")
            context.current_stage = next_stage
```

---

## COMPONENT 4: Question Generator

**File:** `rag_system/agents/question_generator.py`

```python
from .context_tracker import ConversationContext
from typing import Optional

class QuestionGenerator:
    """
    Generates context-aware questions based on stage and gathered info
    """
    
    # The 3 WOW questions (always the same)
    WOW_QUESTIONS = [
        "Tell me about a moment from a trip that lives in you forever. Not the place—the moment. What do you still feel when you remember it?",
        
        "And the opposite: what ruined a trip for you? Not logistics—but a feeling. Crowded? Performative? Too structured? What made you think 'never again'?",
        
        "If this experience had one 'foodgasm' moment—one scene you'd replay forever—what would it be? A taste? A view? A feeling of complete freedom?"
    ]
    
    def generate(self, context: ConversationContext) -> str:
        """
        Generate next question/response based on context
        """
        
        if context.current_stage == "wow":
            return self._generate_wow_question(context)
        
        elif context.current_stage == "checkpoint":
            return self._generate_checkpoint(context)
        
        elif context.current_stage == "deepening":
            return self._generate_deepening_question(context)
        
        elif context.current_stage == "synthesis":
            return self._generate_synthesis(context)
        
        elif context.current_stage == "script":
            return self._generate_script(context)
        
        elif context.current_stage == "logistics":
            return self._generate_logistics_question(context)
        
        elif context.current_stage == "build":
            return self._generate_final_experience(context)
        
        return "Tell me more..."
    
    def _generate_wow_question(self, context: ConversationContext) -> str:
        """Questions 1-3 (The WOW)"""
        if context.questions_asked < 3:
            return self.WOW_QUESTIONS[context.questions_asked]
        return self._generate_checkpoint(context)
    
    def _generate_checkpoint(self, context: ConversationContext) -> str:
        """90-second checkpoint statement"""
        feelings = ", ".join(context.desired_feelings[:3]) if context.desired_feelings else "something profound"
        avoids = ", ".join(context.deal_breakers[:2]) if context.deal_breakers else "the ordinary"
        
        return f"""Here's what I'm hearing:

You're chasing {feelings}. You want experiences that stick—not in your camera roll, but in your body. The kind of moments you replay when you need to remember what alive feels like.

What you DON'T want: {avoids}. No performance. No rushing. Just presence.

I already have some ideas forming—experiences that match what you're seeking.

Does this feel right, or am I missing something?"""
    
    def _generate_deepening_question(self, context: ConversationContext) -> str:
        """Adaptive questions to fill DNA gaps"""
        
        # Priority 1: Get companions if unknown
        if not context.companions:
            return "Who are you traveling with? And how do they experience magic?"
        
        # Priority 2: Get more sensory details
        if len(context.sensory_triggers) < 2:
            return "When you imagine that perfect moment—what are you sensing? A smell, a taste, a sound? What's the detail that makes it visceral?"
        
        # Priority 3: Rhythm preference
        if not context.rhythm_preference:
            return "Do you want early magic—sunrise moments and fresh mornings? Or late luxury—long dinners and midnight swims?"
        
        # Priority 4: Story arc
        if not context.story_arc:
            return "Is there something this experience is marking? A celebration, a reconnection, a reset? Or is it simpler—just pure, unapologetic luxury?"
        
        # Default: Explore past experience
        return "What's the best trip you've ever taken? Not where—but why. What made it unforgettable?"
    
    def _generate_synthesis(self, context: ConversationContext) -> str:
        """Experience DNA statement"""
        story = context.story_arc or self._infer_story(context)
        emotion = self._format_emotions(context)
        triggers = self._format_triggers(context)
        
        return f"""I'm seeing your experience DNA:

**Story:** {story}

**Emotion:** {emotion}

**Trigger:** {triggers}

Does this land?"""
    
    def _generate_script(self, context: ConversationContext) -> str:
        """Three-act experience script"""
        # This would be a longer template
        return """Here's your experience script—the DNA of what will stay with you forever:

[ACT 1: ARRIVAL]
[ACT 2: THE PEAK]
[ACT 3: THE AFTERGLOW]

Does this feel like the experience you're seeking?"""
    
    def _generate_logistics_question(self, context: ConversationContext) -> str:
        """Ask about timing/destination"""
        return "Do you have a destination in mind? Or a time you want to travel? Or should I suggest where this experience comes alive?"
    
    def _generate_final_experience(self, context: ConversationContext) -> str:
        """The full experience design with real places"""
        return "Here's how your experience unfolds:\n\n[Full itinerary with specific places]"
    
    # Helper methods
    def _infer_story(self, context: ConversationContext) -> str:
        """Infer story arc from context"""
        if context.companions:
            return f"A journey of presence and connection with your {context.companions[0]['who']}"
        return "A transformative experience of luxury and meaning"
    
    def _format_emotions(self, context: ConversationContext) -> str:
        """Format emotions nicely"""
        if len(context.desired_feelings) >= 2:
            return f"{context.desired_feelings[0].capitalize()} mixed with {context.desired_feelings[1]}"
        elif len(context.desired_feelings) == 1:
            return context.desired_feelings[0].capitalize()
        return "Deep presence and sensory luxury"
    
    def _format_triggers(self, context: ConversationContext) -> str:
        """Format sensory triggers"""
        if context.sensory_triggers:
            triggers_str = ", ".join([t["detail"] for t in context.sensory_triggers[:3]])
            return triggers_str
        return "Sensory moments that anchor the memory"
```

---

## COMPONENT 5: Main Conversation Agent

**File:** `rag_system/agents/conversation_agent.py`

```python
from .context_tracker import ConversationContext
from .information_extractor import InformationExtractor
from .stage_manager import StageManager
from .question_generator import QuestionGenerator
from anthropic import Anthropic
import os

class LexaConversationAgent:
    """
    Main conversation orchestrator
    """
    
    def __init__(self):
        self.extractor = InformationExtractor()
        self.stage_manager = StageManager()
        self.question_gen = QuestionGenerator()
        self.claude = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
    async def process_message(
        self, 
        user_message: str, 
        context: ConversationContext
    ) -> tuple[str, ConversationContext]:
        """
        Process a user message and return response
        """
        
        # 1. Add user message to context
        context.add_message("user", user_message)
        
        # 2. Extract information from message
        extracted = self.extractor.extract_from_message(user_message, context)
        self.extractor.update_context(extracted, context)
        
        # 3. Check for approval signals
        if context.current_stage in ["checkpoint", "synthesis", "script"]:
            if self.stage_manager.detect_approval_signal(user_message):
                if context.current_stage == "checkpoint":
                    context.checkpoint_approved = True
                elif context.current_stage == "synthesis":
                    context.synthesis_approved = True
                elif context.current_stage == "script":
                    context.script_approved = True
        
        # 4. Update stage if necessary
        self.stage_manager.update_stage(context)
        
        # 5. Generate response
        response = self.question_gen.generate(context)
        
        # 6. Add response to context
        context.add_message("assistant", response)
        
        # 7. Save context (to database)
        await self._save_context(context)
        
        return response, context
    
    async def _save_context(self, context: ConversationContext):
        """Save context to database"""
        # Implement database save logic
        pass
```

---

## INTEGRATION POINTS

### 1. API Endpoint Update
**File:** `app/api/lexa/chat/route.ts`

```typescript
// Update to use new conversation agent
const response = await conversationAgent.process_message(
  user_message,
  session_context
);
```

### 2. Context Loading
**File:** `rag_system/agents/context_loader.py`

```python
async def load_or_create_context(session_id: str, account_id: str) -> ConversationContext:
    """
    Load existing context or create new one
    """
    # Try to load from database
    stored = await db.get_context(session_id)
    
    if stored:
        return ConversationContext.from_dict(stored)
    else:
        return ConversationContext(
            session_id=session_id,
            account_id=account_id
        )
```

---

## TESTING

### Unit Tests
Test each component independently:
- Context tracker stores info correctly
- Information extractor parses messages
- Stage manager progresses appropriately
- Question generator creates context-aware questions

### Integration Tests
Test full conversation flows:
- Happy path (all stages)
- Repetition handling
- Approval/rejection flows
- Incomplete information scenarios

### Sample Conversations
Create fixtures with expected behaviors for validation.

---

## DEPLOYMENT CHECKLIST

- [ ] Implement all 5 components
- [ ] Add database persistence for contexts
- [ ] Update API endpoints
- [ ] Add logging for debugging
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with real conversations
- [ ] Deploy to staging
- [ ] Get user feedback
- [ ] Deploy to production

---

## MONITORING

Track metrics:
- Average questions before synthesis
- Checkpoint approval rate
- Repetition instances
- Stage progression time
- User satisfaction signals

---

This is your implementation roadmap. Ready to build? 🚀

