# LEXA Context Memory & Tracking System
# Prevents repetition and builds on previous answers

## CONTEXT TRACKING STRUCTURE

```python
class ConversationContext:
    """
    Tracks everything the client has told us to prevent repetitive questions
    """
    
    # STAGE TRACKING
    current_stage: str  # wow, deepening, synthesis, script, logistics, build
    questions_asked: int
    time_elapsed: int  # seconds since conversation start
    
    # EXPERIENCE DNA
    story_arc: str | None  # The narrative they're seeking
    core_emotion: str | None  # Primary feeling
    sensory_triggers: list[dict]  # [{"type": "smell", "detail": "lavender"}]
    
    # WHAT THEY WANT
    desired_feelings: list[str]  # ["peace", "adventure", "romance"]
    peak_moment_vision: str | None  # Their "foodgasm" moment
    best_past_experiences: list[dict]  # [{"description": "...", "what_made_it_special": "..."}]
    
    # WHAT THEY DON'T WANT
    deal_breakers: list[str]  # ["crowds", "rushing", "touristy"]
    worst_past_experiences: list[dict]  # What ruined trips
    
    # TRAVEL DETAILS
    companions: list[dict]  # [{"who": "wife", "needs": "spa time"}]
    rhythm_preference: str | None  # "early starts" | "late luxury" | "flexible"
    structure_preference: str | None  # "structured" | "spontaneous" | "mix"
    
    # LOGISTICS (Only filled in Stage 5)
    preferred_destination: str | None
    preferred_timing: str | None  # "June 2024"
    budget_indicators: list[str]  # Inferred from language
    
    # TRACKING FLAGS
    has_repeated_self: bool  # Client said "I already told you"
    needs_apology: bool  # We asked something they already answered
    ready_for_synthesis: bool  # Enough info for DNA statement
    ready_for_script: bool  # DNA approved, ready to build script
    ready_for_logistics: bool  # Script approved, ready for when/where
```

---

## INFORMATION EXTRACTION RULES

After each client message, extract and store:

### 1. FEELINGS & EMOTIONS
**Keywords to watch for:**
- Feelings: "I felt...", "it made me feel...", "I want to feel..."
- Emotions: peace, joy, freedom, connection, adventure, awe, etc.
- Sensory details: "the smell of...", "the taste of...", "the sound of..."

**Example:**
Client: "The best trip was when we had that private dinner overlooking the Amalfi Coast. The lemon scent mixed with sea air—I still remember it."

**Extract:**
```python
{
    "desired_feelings": ["romance", "intimacy", "sensory luxury"],
    "sensory_triggers": [
        {"type": "smell", "detail": "lemon and sea air"},
        {"type": "visual", "detail": "coastal views"}
    ],
    "peak_moment_vision": "Private dinner with dramatic views and coastal scents"
}
```

### 2. DEAL-BREAKERS (What They DON'T Want)
**Keywords:**
- "I hate...", "I can't stand...", "never again...", "worst was..."
- Negative language: "ruined", "killed the mood", "turned me off"

**Example:**
Client: "I can't stand being rushed through places like a tourist bus tour."

**Extract:**
```python
{
    "deal_breakers": ["rushing", "group tours", "touristy pace"]
}
```

### 3. TRAVEL COMPANIONS
**Keywords:**
- "my wife", "my partner", "my kids", "solo", "with friends"
- Needs: "she needs...", "he loves...", "they want..."

**Example:**
Client: "This is for me and my wife. She loves spa treatments."

**Extract:**
```python
{
    "companions": [
        {"who": "wife", "needs": ["spa treatments", "relaxation"]}
    ]
}
```

### 4. PAST EXPERIENCES
Store both positive and negative:

**Example:**
Client: "Best trip was when we stumbled on a hidden restaurant in Tuscany. Worst was a pre-packaged tour where everything felt staged."

**Extract:**
```python
{
    "best_past_experiences": [
        {
            "description": "Hidden restaurant in Tuscany",
            "what_made_it_special": "Discovery, authenticity, spontaneity"
        }
    ],
    "worst_past_experiences": [
        {
            "description": "Pre-packaged tour",
            "what_went_wrong": "Felt staged, inauthentic, over-structured"
        }
    ]
}
```

---

## STAGE PROGRESSION LOGIC

```python
def should_move_to_next_stage(context: ConversationContext) -> tuple[bool, str]:
    """
    Determines if we have enough information to progress
    Returns: (should_move, next_stage_name)
    """
    
    # STAGE 1 → STAGE 2 (WOW → DEEPENING)
    if context.current_stage == "wow":
        if context.questions_asked >= 3:
            # Check if we have key elements
            has_desired = len(context.desired_feelings) > 0 or context.peak_moment_vision
            has_avoids = len(context.deal_breakers) > 0
            has_memory = len(context.best_past_experiences) > 0
            
            if has_desired and (has_avoids or has_memory):
                return (True, "checkpoint")
        return (False, "wow")
    
    # CHECKPOINT → DEEPENING
    if context.current_stage == "checkpoint":
        # Wait for client approval
        if context.ready_for_synthesis:
            return (True, "deepening")
        return (False, "checkpoint")
    
    # DEEPENING → SYNTHESIS
    if context.current_stage == "deepening":
        # Check if we have complete DNA
        has_story = context.story_arc is not None
        has_emotion = context.core_emotion is not None
        has_trigger = len(context.sensory_triggers) > 0
        
        if has_story and has_emotion and has_trigger:
            return (True, "synthesis")
        
        # Or if we've asked enough (6-8 total questions)
        if context.questions_asked >= 8:
            return (True, "synthesis")
        
        return (False, "deepening")
    
    # SYNTHESIS → SCRIPT
    if context.current_stage == "synthesis":
        if context.ready_for_script:
            return (True, "script")
        return (False, "synthesis")
    
    # SCRIPT → LOGISTICS
    if context.current_stage == "script":
        if context.ready_for_logistics:
            return (True, "logistics")
        return (False, "script")
    
    # LOGISTICS → BUILD
    if context.current_stage == "logistics":
        if context.preferred_destination or context.preferred_timing:
            return (True, "build")
        return (False, "logistics")
    
    return (False, context.current_stage)
```

---

## REPETITION DETECTION

```python
def is_repetitive_question(new_question: str, context: ConversationContext) -> tuple[bool, str]:
    """
    Checks if we're asking something the client already answered
    Returns: (is_repetitive, what_they_already_said)
    """
    
    question_lower = new_question.lower()
    
    # Check: Asking about feelings when they already shared
    if "what do you want to feel" in question_lower or "how do you want to feel" in question_lower:
        if context.desired_feelings:
            return (True, f"You already told me you want to feel: {', '.join(context.desired_feelings)}")
    
    # Check: Asking about destination when they already said
    if "where" in question_lower and "want to go" in question_lower:
        if context.preferred_destination:
            return (True, f"You mentioned {context.preferred_destination}")
    
    # Check: Asking about timing when they already said
    if "when" in question_lower and ("want to travel" in question_lower or "planning" in question_lower):
        if context.preferred_timing:
            return (True, f"You said {context.preferred_timing}")
    
    # Check: Asking about companions when they already said
    if "who" in question_lower and ("traveling with" in question_lower or "coming with" in question_lower):
        if context.companions:
            return (True, f"You're traveling with {', '.join([c['who'] for c in context.companions])}")
    
    # Check: Asking about deal-breakers when they already shared
    if "what don't you want" in question_lower or "what ruins" in question_lower:
        if context.deal_breakers:
            return (True, f"You already said you don't want: {', '.join(context.deal_breakers)}")
    
    return (False, "")
```

---

## CONTEXT-AWARE QUESTION GENERATION

```python
def generate_next_question(context: ConversationContext) -> str:
    """
    Generates the next question based on what we already know
    """
    
    # STAGE 1: WOW (Questions 1-3)
    if context.current_stage == "wow":
        if context.questions_asked == 0:
            return "Tell me about a moment from a trip that lives in you forever. Not the place—the moment. What do you still feel when you remember it?"
        
        elif context.questions_asked == 1:
            return "And the opposite: what ruined a trip for you? Not logistics—but a feeling. Crowded? Performative? Too structured? What made you think 'never again'?"
        
        elif context.questions_asked == 2:
            return "If this experience had one 'foodgasm' moment—one scene you'd replay forever—what would it be? A taste? A view? A feeling of complete freedom?"
    
    # CHECKPOINT
    if context.current_stage == "checkpoint":
        return generate_synthesis_statement(context) + "\n\nDoes this feel right, or am I missing something?"
    
    # STAGE 2: DEEPENING (Adaptive based on gaps)
    if context.current_stage == "deepening":
        
        # Priority 1: Get travel companions if not known
        if not context.companions:
            return "Who are you traveling with? And how do they experience magic?"
        
        # Priority 2: Get sensory details if sparse
        if len(context.sensory_triggers) < 2:
            return "When you imagine that perfect moment—what are you sensing? A smell, a taste, a sound? What's the detail that makes it visceral?"
        
        # Priority 3: Understand rhythm if not clear
        if not context.rhythm_preference:
            return "Do you want early magic—sunrise moments and fresh mornings? Or late luxury—long dinners and midnight swims?"
        
        # Priority 4: Check for hidden needs
        if not context.story_arc:
            return "Is there something this experience is marking? A celebration, a reconnection, a reset? Or is it simpler—just pure, unapologetic luxury?"
        
        # Default: Explore their best past experience more
        if context.best_past_experiences and len(context.best_past_experiences) > 0:
            best = context.best_past_experiences[0]
            return f"You mentioned {best['description']}. What made that so special? Was it the discovery? The timing? The company?"
    
    # STAGE 3: SYNTHESIS
    if context.current_stage == "synthesis":
        return generate_experience_dna_statement(context) + "\n\nDoes this land?"
    
    # STAGE 4: SCRIPT
    if context.current_stage == "script":
        return generate_experience_script(context)
    
    # STAGE 5: LOGISTICS
    if context.current_stage == "logistics":
        if not context.preferred_destination and not context.preferred_timing:
            return "Do you have a destination in mind? Or a time you want to travel? Or should I suggest where this experience comes alive?"
        
        # They gave destination, check if it matches
        if context.preferred_destination and not context.preferred_timing:
            return validate_destination_and_suggest_timing(context)
        
        # They gave timing, suggest destinations
        if context.preferred_timing and not context.preferred_destination:
            return suggest_destinations_for_timing(context)
    
    return "Tell me more..."  # Fallback


def generate_synthesis_statement(context: ConversationContext) -> str:
    """
    Creates the 90-second checkpoint statement
    """
    feelings = ", ".join(context.desired_feelings[:3]) if context.desired_feelings else "something profound"
    avoids = ", ".join(context.deal_breakers[:2]) if context.deal_breakers else "noise"
    
    return f"""Here's what I'm hearing:

You're chasing {feelings}. You want experiences that stick—not in your camera roll, but in your body. The kind of moments you replay when you need to remember what alive feels like.

What you DON'T want: {avoids}. No performance. No rushing. Just presence.

I already have some ideas forming—experiences that match what you're seeking."""


def generate_experience_dna_statement(context: ConversationContext) -> str:
    """
    Creates the Experience DNA synthesis
    """
    story = context.story_arc or "A journey of presence and sensory luxury"
    emotion = context.core_emotion or "Deep connection mixed with awe"
    triggers = ", ".join([t['detail'] for t in context.sensory_triggers[:3]]) if context.sensory_triggers else "Coastal scents and golden light"
    
    return f"""I'm seeing your experience DNA:

**Story:** {story}

**Emotion:** {emotion}

**Trigger:** {triggers}"""
```

---

## ERROR RECOVERY SYSTEM

```python
def handle_client_frustration(message: str, context: ConversationContext) -> str:
    """
    Detects and recovers from repetition complaints
    """
    
    frustration_signals = [
        "i already told you",
        "i just said",
        "i mentioned",
        "like i said",
        "as i told you",
        "i explained"
    ]
    
    if any(signal in message.lower() for signal in frustration_signals):
        context.has_repeated_self = True
        context.needs_apology = True
        
        # Find what they're frustrated about
        relevant_info = extract_what_they_already_said(message, context)
        
        return f"""You're absolutely right—my apologies. You said {relevant_info}. Let me design with that.

{generate_next_meaningful_action(context)}"""
    
    return None  # No frustration detected


def extract_what_they_already_said(message: str, context: ConversationContext) -> str:
    """
    Identifies what information they're referencing
    """
    
    # Check recent context for what they're frustrated about
    if any(word in message.lower() for word in ["wife", "her", "spouse", "partner"]):
        if context.companions:
            return f"this is for you and your {context.companions[0]['who']}"
    
    if any(word in message.lower() for word in ["beach", "coast", "ocean", "sea"]):
        if context.preferred_destination:
            return f"you want somewhere near {context.preferred_destination}"
    
    if any(word in message.lower() for word in ["spa", "treatment", "massage"]):
        if context.companions and any("spa" in str(c.get('needs', [])) for c in context.companions):
            return "she loves spa treatments"
    
    # Default: acknowledge without specifics
    return "what you've already shared"


def generate_next_meaningful_action(context: ConversationContext) -> str:
    """
    After apology, do something useful—don't ask another question
    """
    
    if context.ready_for_synthesis:
        return generate_experience_dna_statement(context)
    
    if context.ready_for_script:
        return generate_experience_script(context)
    
    if context.ready_for_logistics:
        return "Let me suggest the perfect place and timing for this..."
    
    # If we have enough info, make a statement instead of asking
    if len(context.desired_feelings) > 0 and len(context.sensory_triggers) > 0:
        return generate_synthesis_statement(context)
    
    return "Let me think about what you've shared..."
```

---

## USAGE IN CONVERSATION AGENT

```python
# Initialize context
context = ConversationContext()

# For each user message:
1. Extract information from message
2. Update context with extracted info
3. Check if question would be repetitive
4. Check for frustration signals
5. Determine current stage
6. Check if ready to progress
7. Generate next response based on context

# Example flow:
user_message = "A nice weekend with my wife. She loves spa treatments."

# Extract
context.companions.append({"who": "wife", "needs": ["spa treatments"]})
context.desired_feelings.append("relaxation")

# Check repetition
is_repeat, what_they_said = is_repetitive_question(
    "Who are you traveling with?",
    context
)
# Returns: (True, "You're traveling with wife")

# Don't ask that question! Ask something else instead.
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Add ConversationContext class to conversation agent
- [ ] Implement information extraction after each message
- [ ] Add repetition detection before asking questions
- [ ] Add frustration signal detection
- [ ] Add stage progression logic
- [ ] Add context-aware question generation
- [ ] Test with sample conversations
- [ ] Add logging for debugging

---

## SUCCESS METRICS

Context tracking is working if:
1. We never ask what they already told us
2. We catch "I already told you" signals
3. We use their past answers to inform future questions
4. We progress through stages naturally
5. We synthesize their DNA accurately from accumulated info

