"""
PII Redactor

Goal: prevent personal data from being sent to the LLM and from being extracted.

We redact common personal identifiers (email, phone, passport/ID, credit card, booking refs)
while keeping business/venue information intact.
"""

from __future__ import annotations

import re
from typing import Dict, Tuple


_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)

# Broad phone matcher (keeps it conservative; we redact typical phone-like patterns)
_PHONE_RE = re.compile(
    r"(?:(?:\+?\d{1,3}[\s\-().]*)?(?:\(?\d{2,4}\)?[\s\-().]*)?\d{3,4}[\s\-().]*\d{3,4})"
)

# Credit card-ish sequences (13–19 digits) with spaces/dashes
_CARD_RE = re.compile(r"\b(?:\d[ -]*?){13,19}\b")

# Passport / ID / booking references (very heuristic; redact lines with these labels)
_SENSITIVE_LINE_RE = re.compile(
    r"(?im)^(.*\b(passport|id\s*number|identity|dob|date of birth|birthdate|booking reference|reservation code|pnr)\b.*)$"
)

# Long digit runs (often booking refs / IDs). We keep it modest to avoid nuking addresses.
_LONG_DIGITS_RE = re.compile(r"\b\d{9,}\b")


def redact_pii(text: str) -> Tuple[str, Dict[str, int]]:
    """
    Redact common PII patterns from free text.

    Returns:
      (redacted_text, stats)
    """
    if not text:
        return text, {"emails": 0, "phones": 0, "cards": 0, "sensitive_lines": 0, "long_digits": 0}

    stats = {"emails": 0, "phones": 0, "cards": 0, "sensitive_lines": 0, "long_digits": 0}
    out = text

    # Line-based redaction for explicit labels
    def _redact_line(m: re.Match) -> str:
        stats["sensitive_lines"] += 1
        return "[REDACTED_SENSITIVE_LINE]"

    out = _SENSITIVE_LINE_RE.sub(_redact_line, out)

    # Emails
    stats["emails"] = len(_EMAIL_RE.findall(out))
    out = _EMAIL_RE.sub("[REDACTED_EMAIL]", out)

    # Credit cards
    stats["cards"] = len(_CARD_RE.findall(out))
    out = _CARD_RE.sub("[REDACTED_CARD]", out)

    # Phone numbers (count approximate by matches)
    phone_matches = _PHONE_RE.findall(out)
    # Filter out very short matches that are likely not phones
    phone_matches = [p for p in phone_matches if len(re.sub(r"\D", "", p)) >= 10]
    stats["phones"] = len(phone_matches)
    if phone_matches:
        out = _PHONE_RE.sub(lambda m: "[REDACTED_PHONE]" if len(re.sub(r"\D", "", m.group(0))) >= 10 else m.group(0), out)

    # Long digit runs (IDs/refs)
    stats["long_digits"] = len(_LONG_DIGITS_RE.findall(out))
    out = _LONG_DIGITS_RE.sub("[REDACTED_ID]", out)

    return out, stats

