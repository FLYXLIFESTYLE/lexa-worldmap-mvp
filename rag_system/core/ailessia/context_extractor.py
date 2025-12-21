"""
LEXA Context Extractor (MVP)
---------------------------
Extracts *lightweight* structured context from user messages so the rest of the
system can behave intelligently without hallucinating.

Design principles:
- Conservative extraction (prefer storing raw text over guessing)
- Deterministic heuristics for demo stability
- Async API so we can upgrade to LLM-assisted extraction later
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import re


@dataclass
class ContextExtractionResult:
    """
    Returned by ContextExtractor.extract().
    """

    extracted: Dict[str, Any]
    updated_intake: Dict[str, Any]
    signals: Dict[str, Any]


class ContextExtractor:
    def __init__(self, claude_client: Any = None):
        self.claude_client = claude_client

    async def extract(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        intake_state: Optional[Dict[str, Any]] = None,
        last_question_key: Optional[str] = None,
    ) -> ContextExtractionResult:
        """
        Extract constraints + behavioral signals, then merge into intake_state.
        """

        intake_state = dict(intake_state or {})

        msg = (message or "").strip()
        msg_l = msg.lower()

        extracted: Dict[str, Any] = {}
        signals: Dict[str, Any] = {}

        # --- Behavioral signals (tiny, but helpful for tone & pacing) ---
        signals["is_short_answer"] = len(msg.split()) <= 4
        signals["has_urgency"] = any(w in msg_l for w in ["asap", "urgent", "quick", "fast", "now"])
        signals["dislikes_questions"] = any(w in msg_l for w in ["don't ask", "no questions", "skip questions"])

        # --- Practical constraints ---
        constraints: Dict[str, Any] = {}

        budget = _extract_budget(msg)
        if budget:
            constraints["budget"] = budget

        duration_days = _extract_duration_days(msg_l)
        if duration_days:
            constraints["duration_days"] = duration_days

        month = _extract_month(msg_l)
        if month:
            constraints["month"] = month

        destination_hint = _extract_destination_hint(msg)
        if destination_hint:
            constraints["destination_hint"] = destination_hint

        if constraints:
            constraints.setdefault("raw", msg)
            extracted["constraints"] = constraints

            # Merge into intake_state.constraints without overwriting existing values
            intake_state.setdefault("constraints", {})
            if isinstance(intake_state["constraints"], dict):
                for k, v in constraints.items():
                    if intake_state["constraints"].get(k) in (None, "", [], {}):
                        intake_state["constraints"][k] = v

        # Keep signals in intake_state for later use
        intake_state.setdefault("_signals", {})
        if isinstance(intake_state["_signals"], dict):
            intake_state["_signals"].update(signals)

        return ContextExtractionResult(extracted=extracted, updated_intake=intake_state, signals=signals)


def _extract_budget(text: str) -> Optional[Dict[str, Any]]:
    t = (text or "").strip()
    if not t:
        return None

    # €5000 / $10,000 / £8000 / € 5k
    m = re.search(r"(?P<sym>€|\$|£)\s?(?P<num>\d[\d,\.]*)\s?(?P<k>k)?", t, re.IGNORECASE)
    if m:
        currency = {"€": "EUR", "$": "USD", "£": "GBP"}.get(m.group("sym"), None)
        num_raw = m.group("num").replace(",", "")
        try:
            num = float(num_raw)
        except ValueError:
            return None
        if m.group("k"):
            num *= 1000
        return {"amount": int(num), "currency": currency}

    # 20k / 120k (no currency)
    m = re.search(r"\b(?P<num>\d{1,3})\s?k\b", t, re.IGNORECASE)
    if m:
        try:
            return {"amount": int(m.group("num")) * 1000, "currency": None}
        except ValueError:
            return None

    return None


def _extract_duration_days(text_lower: str) -> Optional[int]:
    t = (text_lower or "").strip()
    if not t:
        return None

    if "weekend" in t:
        return 2

    m = re.search(r"(\d+)\s*(day|days)\b", t)
    if m:
        return int(m.group(1))

    m = re.search(r"(\d+)\s*(week|weeks)\b", t)
    if m:
        return int(m.group(1)) * 7

    return None


def _extract_month(text_lower: str) -> Optional[str]:
    months = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
    ]
    for m in months:
        if m in (text_lower or ""):
            return m
    return None


def _extract_destination_hint(text: str) -> Optional[str]:
    t = (text or "").strip()
    if not t:
        return None

    # "from Split to Monaco"
    m = re.search(r"\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s|$)", t, re.IGNORECASE)
    if m:
        return f"from {m.group(1).strip()} to {m.group(2).strip()}"

    for key in [
        "french riviera",
        "monaco",
        "cannes",
        "nice",
        "saint tropez",
        "st. tropez",
        "amalfi",
        "croatia",
        "split",
        "uae",
        "dubai",
    ]:
        if re.search(rf"\b{re.escape(key)}\b", t, re.IGNORECASE):
            return key

    return None


# Lazily initialized singleton (routes can initialize on first use)
context_extractor: Optional[ContextExtractor] = None


def get_or_create_context_extractor(claude_client: Any = None) -> ContextExtractor:
    global context_extractor
    if context_extractor is None:
        context_extractor = ContextExtractor(claude_client=claude_client)
    return context_extractor

