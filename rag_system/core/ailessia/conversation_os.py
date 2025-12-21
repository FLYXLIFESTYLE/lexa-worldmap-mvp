"""
LEXA Conversation OS (Intake Gate)
---------------------------------
Implements a ≤6-question intake flow to gather the minimum emotional + practical
inputs needed for a strong first "wow" Experience Script.

This file is intentionally deterministic and small for demo stability.
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple


# Keys are stored in intake_state. Order matters.
INTAKE_QUESTIONS = [
    (
        "primary_emotion_goal",
        "When it's over, what do you want to feel first - calm, thrill, romance, pride, freedom, belonging... or something else?",
    ),
    (
        "meaning_anchor",
        "What is this really for - celebration, reconnection, recovery, proving something, or a private reset?",
    ),
    (
        "social_appetite",
        "Should the atmosphere feel private/discreet, social/lively, or balanced?",
    ),
    (
        "energy_rhythm",
        "What rhythm feels luxurious to you: late mornings + elegant nights, early starts + big days, or a slower, protected pace?",
    ),
    (
        "red_lines",
        "What do you never want to feel on this trip? Name 1–3 red lines.",
    ),
    (
        "constraints",
        "Any constraints I must respect (dates/month, duration, budget range, must-haves, must-avoid, privacy/security)?",
    ),
]


def is_intake_complete(intake_state: Optional[Dict]) -> bool:
    s = intake_state or {}
    fast = _fast_intake_enabled(s)

    # Must-haves (emotional)
    if not _has_value(s.get("primary_emotion_goal")):
        return False
    if not _has_value(s.get("meaning_anchor")):
        return False
    if not fast and not _has_value(s.get("social_appetite")):
        return False

    # Red lines
    red = s.get("red_lines")
    if not fast:
        if isinstance(red, list):
            if len([x for x in red if _has_value(x)]) == 0:
                return False
        else:
            if not _has_value(red):
                return False

    # Energy rhythm
    er = s.get("energy_rhythm")
    if not fast:
        if isinstance(er, dict):
            if not _has_value(er.get("raw")):
                return False
        else:
            if not _has_value(er):
                return False

    # Constraints: accept any structured constraint OR a raw line
    c = s.get("constraints")
    if isinstance(c, dict):
        if not any(_has_value(v) for v in c.values()):
            return False
    else:
        if not _has_value(c):
            return False

    return True


def next_intake_question(intake_state: Optional[Dict]) -> Optional[Tuple[str, str]]:
    s = intake_state or {}
    fast = _fast_intake_enabled(s)

    # Fast-intake mode: fewer questions, we infer the rest.
    # Triggered by the user's explicit dislike of questions or urgency signal.
    if fast:
        # Always prioritize the "design intent" and hard constraints.
        if not _has_value(s.get("primary_emotion_goal")):
            return INTAKE_QUESTIONS[0]

        if not _has_value(s.get("meaning_anchor")):
            # find the meaning_anchor question in the list
            for k, q in INTAKE_QUESTIONS:
                if k == "meaning_anchor":
                    return (k, q)

        c = s.get("constraints")
        if isinstance(c, dict):
            if not any(_has_value(v) for v in c.values()):
                for k, q in INTAKE_QUESTIONS:
                    if k == "constraints":
                        return (k, q)
        else:
            if not _has_value(c):
                for k, q in INTAKE_QUESTIONS:
                    if k == "constraints":
                        return (k, q)

        # Optional safety: try to get at least one red line if not provided.
        red = s.get("red_lines")
        if isinstance(red, list):
            if len([x for x in red if _has_value(x)]) == 0:
                for k, q in INTAKE_QUESTIONS:
                    if k == "red_lines":
                        return (k, q)
        else:
            if not _has_value(red):
                for k, q in INTAKE_QUESTIONS:
                    if k == "red_lines":
                        return (k, q)

        return None

    for key, q in INTAKE_QUESTIONS:
        if key == "red_lines":
            red = s.get("red_lines")
            if isinstance(red, list) and len([x for x in red if _has_value(x)]) > 0:
                continue
            if isinstance(red, str) and _has_value(red):
                continue
            return (key, q)

        if key == "energy_rhythm":
            er = s.get("energy_rhythm")
            if isinstance(er, dict) and _has_value(er.get("raw")):
                continue
            if isinstance(er, str) and _has_value(er):
                continue
            return (key, q)

        if key == "constraints":
            c = s.get("constraints")
            if isinstance(c, dict) and any(_has_value(v) for v in c.values()):
                continue
            if isinstance(c, str) and _has_value(c):
                continue
            return (key, q)

        if not _has_value(s.get(key)):
            return (key, q)

    return None


def build_question_with_examples(question_key: str, question_text: str) -> str:
    examples = {
        "primary_emotion_goal": "Examples: \"quiet closeness\", \"electric freedom\", \"romance + awe\", \"I want to feel proud and completely looked after.\"",
        "meaning_anchor": "Examples: \"reconnect with my wife\", \"celebration\", \"recover after a hard year\", \"a story we'll tell forever.\"",
        "social_appetite": "Examples: \"private and discreet\", \"social and lively\", \"balanced.\"",
        "energy_rhythm": "Examples: \"late starts + peak evenings\", \"early starts + big days\", \"two peaks, lots of recovery.\"",
        "red_lines": "Examples: \"no crowds\", \"no early mornings\", \"no tourist traps\", \"no being photographed\", \"no chaotic logistics.\"",
        "constraints": "Examples: \"July, 3 weeks, EUR 80-120k\", \"must have a yacht day\", \"must avoid extreme heat\", \"privacy is critical.\"",
    }

    ex = examples.get(question_key)
    if ex:
        return f"{question_text}\n\n{ex}"
    return question_text


def _has_value(v) -> bool:
    if v is None:
        return False
    if isinstance(v, str):
        return v.strip() != ""
    if isinstance(v, (list, tuple, set)):
        return len(v) > 0
    if isinstance(v, dict):
        return len(v) > 0
    return True


def _fast_intake_enabled(intake_state: Dict) -> bool:
    """
    Returns True when the user signaled they don't want many questions (or urgency),
    so we switch to a shorter intake and infer the rest.
    """
    s = intake_state or {}
    sig = s.get("_signals") if isinstance(s.get("_signals"), dict) else {}
    return bool(sig.get("dislikes_questions") or sig.get("has_urgency"))

