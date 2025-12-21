"""
LEXA Emotional Profile Builder (MVP)
-----------------------------------
Builds a *stable* client profile snapshot from:
- intake_state (6-question Intake OS)
- lightweight context extraction (constraints + behavior signals)
- emotional reading (state/archetype/needs)

Persistence strategy (no new DB tables required):
- conversation_sessions.key_moments: store a single upserted snapshot ("emotional_profile_v1")
- client_accounts.communication_preferences + buying_patterns: merge small, durable signals

Important:
- Do NOT change client_accounts.emotional_profile shape here; it is used as an emotion->score map
  for recommendations. Keep this builder separate.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from core.ailessia.emotion_interpreter import EmotionalReading


def build_profile_snapshot(
    *,
    account_id: str,
    session_id: str,
    emotional_reading: EmotionalReading,
    intake_state: Optional[Dict[str, Any]] = None,
    extracted: Optional[Dict[str, Any]] = None,
    signals: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build a compact snapshot that is safe to persist into key_moments.
    """
    intake_state = intake_state or {}
    extracted = extracted or {}
    signals = signals or {}

    constraints = {}
    if isinstance(intake_state.get("constraints"), dict):
        constraints.update(intake_state.get("constraints") or {})
    if isinstance(extracted.get("constraints"), dict):
        # Prefer any newly extracted constraint fields if not already set
        for k, v in (extracted.get("constraints") or {}).items():
            if constraints.get(k) in (None, "", [], {}):
                constraints[k] = v

    snapshot = {
        "version": "v1",
        "timestamp": datetime.now().isoformat(),
        "account_id": account_id,
        "session_id": session_id,
        "archetype": emotional_reading.detected_archetype,
        "emotional_state": emotional_reading.primary_state.value,
        "recommended_tone": emotional_reading.recommended_tone,
        "energy_level": round(float(emotional_reading.energy_level or 0.0), 3),
        "openness_to_experience": round(float(emotional_reading.openness_to_experience or 0.0), 3),
        "vulnerability_shown": round(float(emotional_reading.vulnerability_shown or 0.0), 3),
        "hidden_desires": list((emotional_reading.hidden_desires or [])[:8]),
        "emotional_needs": list((emotional_reading.emotional_needs or [])[:8]),
        "intake_signals": {
            "primary_emotion_goal": intake_state.get("primary_emotion_goal"),
            "social_appetite": intake_state.get("social_appetite"),
            "meaning_anchor": intake_state.get("meaning_anchor"),
            "red_lines": intake_state.get("red_lines") if isinstance(intake_state.get("red_lines"), list) else [],
            "energy_rhythm": intake_state.get("energy_rhythm"),
        },
        "constraints": _sanitize_constraints(constraints),
        "behavioral_signals": _sanitize_signals(signals),
    }

    return snapshot


def merge_account_json(
    *,
    existing_communication_preferences: Optional[Dict[str, Any]] = None,
    existing_buying_patterns: Optional[Dict[str, Any]] = None,
    snapshot: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Merge small stable fields into the account JSONB blobs.
    Keeps the shape predictable and avoids overwriting unrelated keys.
    """
    comm = dict(existing_communication_preferences or {})
    buying = dict(existing_buying_patterns or {})

    comm.setdefault("lexa", {})
    if isinstance(comm.get("lexa"), dict):
        comm["lexa"].update(
            {
                "preferred_tone": snapshot.get("recommended_tone"),
                "dislikes_questions": (snapshot.get("behavioral_signals") or {}).get("dislikes_questions"),
                "has_urgency": (snapshot.get("behavioral_signals") or {}).get("has_urgency"),
                "energy_level": snapshot.get("energy_level"),
                "last_updated": snapshot.get("timestamp"),
            }
        )

    buying.setdefault("lexa", {})
    if isinstance(buying.get("lexa"), dict):
        c = snapshot.get("constraints") or {}
        buying["lexa"].update(
            {
                "budget_hint": c.get("budget"),
                "duration_days_hint": c.get("duration_days"),
                "month_hint": c.get("month"),
                "destination_hint": c.get("destination_hint") or c.get("destination"),
                "last_updated": snapshot.get("timestamp"),
            }
        )

    return comm, buying


def upsert_emotional_profile_key_moment(
    *,
    key_moments: Optional[List[Dict[str, Any]]],
    snapshot: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Insert or replace the latest emotional profile snapshot key moment.
    """
    km_list: List[Dict[str, Any]] = list(key_moments or [])
    km = {"type": "emotional_profile_v1", "timestamp": snapshot.get("timestamp"), "snapshot": snapshot}

    for i in range(len(km_list) - 1, -1, -1):
        if isinstance(km_list[i], dict) and km_list[i].get("type") == "emotional_profile_v1":
            km_list[i] = km
            return km_list

    km_list.append(km)
    return km_list


def apply_micro_feedback_to_communication_preferences(
    *,
    existing_communication_preferences: Optional[Dict[str, Any]] = None,
    feedback_text: Optional[str] = None,
    emotional_resonance_rating: Optional[int] = None,
    personalization_rating: Optional[int] = None,
    value_rating: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Very small "learning" step from micro-feedback.

    We keep it conservative: set a couple preference hints that downstream systems
    can respect (tone/detail level/pacing). Avoid overfitting.
    """
    comm = dict(existing_communication_preferences or {})
    comm.setdefault("lexa", {})
    if not isinstance(comm.get("lexa"), dict):
        comm["lexa"] = {}

    lexa = comm["lexa"]
    text = (feedback_text or "").lower().strip()

    # Detail level heuristics
    if any(k in text for k in ["more detail", "more specific", "too vague", "add details"]):
        lexa["detail_level"] = "high"
    if any(k in text for k in ["too long", "shorter", "less text", "more concise"]):
        lexa["detail_level"] = "low"

    # Pacing heuristics
    if any(k in text for k in ["faster", "skip", "no questions", "straight to"]):
        lexa["pacing"] = "fast"
    if any(k in text for k in ["slow down", "gentler", "more space"]):
        lexa["pacing"] = "slow"

    # If resonance is low, default to warmer, more supportive tone.
    # (We don't override when user explicitly asked for a different vibe.)
    if emotional_resonance_rating is not None and emotional_resonance_rating <= 3:
        lexa.setdefault("preferred_tone", "therapeutic")

    # Store latest feedback (small)
    lexa["last_micro_feedback"] = {
        "timestamp": datetime.now().isoformat(),
        "emotional_resonance_rating": emotional_resonance_rating,
        "personalization_rating": personalization_rating,
        "value_rating": value_rating,
        "feedback_text": feedback_text,
    }

    return comm


def upsert_micro_feedback_key_moment(
    *,
    key_moments: Optional[List[Dict[str, Any]]],
    feedback: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Insert or replace the latest micro-feedback snapshot key moment.
    """
    km_list: List[Dict[str, Any]] = list(key_moments or [])
    km = {"type": "micro_feedback_v1", "timestamp": datetime.now().isoformat(), "feedback": feedback}

    for i in range(len(km_list) - 1, -1, -1):
        if isinstance(km_list[i], dict) and km_list[i].get("type") == "micro_feedback_v1":
            km_list[i] = km
            return km_list

    km_list.append(km)
    return km_list


def _sanitize_constraints(constraints: Dict[str, Any]) -> Dict[str, Any]:
    """
    Keep only a small safe subset (avoid large raw blobs).
    """
    safe: Dict[str, Any] = {}
    if not isinstance(constraints, dict):
        return safe

    for k in ["destination", "destination_hint", "duration_days", "month", "budget"]:
        v = constraints.get(k)
        if v not in (None, "", [], {}):
            safe[k] = v
    return safe


def _sanitize_signals(signals: Dict[str, Any]) -> Dict[str, Any]:
    safe: Dict[str, Any] = {}
    if not isinstance(signals, dict):
        return safe

    for k in ["is_short_answer", "has_urgency", "dislikes_questions"]:
        v = signals.get(k)
        if v is not None:
            safe[k] = bool(v)
    return safe


