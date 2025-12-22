"""
LLM Router (failover between providers)
--------------------------------------

We primarily use Anthropic (Claude). If it's unreachable (timeouts / connection errors),
we automatically fall back to OpenAI (ChatGPT) when configured.

Design goals:
- Keep call sites simple
- Avoid long hangs (short timeouts + small retries)
- Return best-effort results (fallback heuristics if no provider is reachable)
"""

from __future__ import annotations

from typing import Any, Dict, Optional, List
import asyncio
import json
import re
import time
import structlog

from config.settings import settings

logger = structlog.get_logger()


def _is_transient_provider_error(err: Exception) -> bool:
    msg = str(err).lower()
    # Broad but pragmatic: covers DNS/timeout/connection/reset/provider outages.
    transient_markers = [
        "timeout",
        "timed out",
        "temporarily",
        "connection",
        "connect",
        "dns",
        "name or service not known",
        "socket",
        "reset",
        "unreachable",
        "502",
        "503",
        "504",
        "overloaded",
        "try again",
    ]
    return any(m in msg for m in transient_markers)


def _strip_json_fences(s: str) -> str:
    t = (s or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE).strip()
        t = re.sub(r"^```\s*", "", t).strip()
        t = re.sub(r"```$", "", t).strip()
    return t


async def _retry_async(fn, attempts: int = 2, base_delay_s: float = 0.6):
    last_err = None
    for i in range(attempts):
        try:
            return await fn()
        except Exception as e:
            last_err = e
            if i == attempts - 1:
                break
            if not _is_transient_provider_error(e):
                break
            await asyncio.sleep(base_delay_s * (2 ** i))
    raise last_err  # type: ignore


async def extract_json(
    *,
    system: str,
    user_text: str,
    max_tokens: int = 2500,
    prefer: str = "anthropic",
) -> Dict[str, Any]:
    """
    Extract JSON from a provider with automatic failover.
    """
    user_text = (user_text or "")[:20000]
    providers = [prefer, "openai" if prefer != "openai" else "anthropic"]

    last_error: Optional[Exception] = None
    for provider in providers:
        if provider == "anthropic" and settings.anthropic_api_key:
            try:
                return await _retry_async(lambda: _anthropic_json(system=system, user_text=user_text, max_tokens=max_tokens))
            except Exception as e:
                last_error = e
                logger.warning("Anthropic failed; trying fallback if available", error=str(e))
                continue
        if provider == "openai" and settings.openai_api_key:
            try:
                return await _retry_async(lambda: _openai_json(system=system, user_text=user_text, max_tokens=max_tokens))
            except Exception as e:
                last_error = e
                logger.warning("OpenAI failed; trying fallback if available", error=str(e))
                continue

    # Final fallback: return a conservative chunk-only payload
    logger.error("All LLM providers failed; returning fallback JSON", error=str(last_error) if last_error else None)
    return {
        "entities": {"pois": [], "destinations": []},
        "relations": [],
        "knowledge": [],
        "chunks": [{"chunk": user_text[:4000], "purpose": "rag"}],
        "notes": ["All LLM providers unreachable; used fallback extraction."],
    }


async def ocr_and_extract_json(
    *,
    system: str,
    image_bytes: bytes,
    max_tokens: int = 2500,
    prefer: str = "anthropic",
    media_type: str = "image/png",
) -> Dict[str, Any]:
    """
    OCR + extraction from an image with failover.

    Note: OpenAI vision is optional. If not configured, we return a pending-style payload.
    """
    providers = [prefer, "openai" if prefer != "openai" else "anthropic"]

    last_error: Optional[Exception] = None
    for provider in providers:
        if provider == "anthropic" and settings.anthropic_api_key:
            try:
                return await _retry_async(lambda: _anthropic_vision_json(system=system, image_bytes=image_bytes, max_tokens=max_tokens, media_type=media_type))
            except Exception as e:
                last_error = e
                logger.warning("Anthropic vision failed; trying fallback if available", error=str(e))
                continue
        if provider == "openai" and settings.openai_api_key:
            try:
                return await _retry_async(lambda: _openai_vision_json(system=system, image_bytes=image_bytes, max_tokens=max_tokens, media_type=media_type))
            except Exception as e:
                last_error = e
                logger.warning("OpenAI vision failed; trying fallback if available", error=str(e))
                continue

    logger.error("All vision providers failed; returning pending OCR payload", error=str(last_error) if last_error else None)
    return {
        "ocr_text": "",
        "entities": {"pois": [], "destinations": []},
        "relations": [],
        "knowledge": [],
        "chunks": [],
        "notes": ["OCR pending: all providers unreachable. Keep the raw image and retry later."],
        "status": "pending_ocr",
    }


async def generate_text(
    *,
    system: str,
    user_text: str,
    max_tokens: int = 800,
    prefer: str = "anthropic",
) -> str:
    """
    Generate plain text (non-JSON) with failover.
    """
    user_text = (user_text or "")[:12000]
    providers = [prefer, "openai" if prefer != "openai" else "anthropic"]

    last_error: Optional[Exception] = None
    for provider in providers:
        if provider == "anthropic" and settings.anthropic_api_key:
            try:
                return await _retry_async(lambda: _anthropic_text(system=system, user_text=user_text, max_tokens=max_tokens))
            except Exception as e:
                last_error = e
                logger.warning("Anthropic text generation failed; trying fallback if available", error=str(e))
                continue
        if provider == "openai" and settings.openai_api_key:
            try:
                return await _retry_async(lambda: _openai_text(system=system, user_text=user_text, max_tokens=max_tokens))
            except Exception as e:
                last_error = e
                logger.warning("OpenAI text generation failed; trying fallback if available", error=str(e))
                continue

    logger.error("All LLM providers failed; returning user_text as fallback", error=str(last_error) if last_error else None)
    return user_text


async def _anthropic_json(*, system: str, user_text: str, max_tokens: int) -> Dict[str, Any]:
    from anthropic import Anthropic

    def _call() -> str:
        client = Anthropic(api_key=settings.anthropic_api_key)
        msg = client.messages.create(
            model=getattr(settings, "anthropic_model", settings.model_name),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_text}],
        )
        parts: List[str] = []
        for block in getattr(msg, "content", []) or []:
            if getattr(block, "type", None) == "text":
                parts.append(getattr(block, "text", ""))
        return ("\n".join([p for p in parts if p]).strip()) or ""

    raw = await asyncio.to_thread(_call)
    raw = _strip_json_fences(raw)
    return json.loads(raw)


async def _anthropic_text(*, system: str, user_text: str, max_tokens: int) -> str:
    from anthropic import Anthropic

    def _call() -> str:
        client = Anthropic(api_key=settings.anthropic_api_key)
        msg = client.messages.create(
            model=getattr(settings, "anthropic_model", settings.model_name),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_text}],
        )
        parts: List[str] = []
        for block in getattr(msg, "content", []) or []:
            if getattr(block, "type", None) == "text":
                parts.append(getattr(block, "text", ""))
        return ("\n".join([p for p in parts if p]).strip()) or ""

    return await asyncio.to_thread(_call)


async def _anthropic_vision_json(*, system: str, image_bytes: bytes, max_tokens: int, media_type: str) -> Dict[str, Any]:
    import base64
    from anthropic import Anthropic

    def _call() -> str:
        client = Anthropic(api_key=settings.anthropic_api_key)
        b64 = base64.b64encode(image_bytes).decode("ascii")
        msg = client.messages.create(
            model=getattr(settings, "anthropic_model", settings.model_name),
            max_tokens=max_tokens,
            system=system,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                    {"type": "text", "text": "Extract the text and travel entities/relations from this screenshot."},
                ],
            }],
        )
        parts: List[str] = []
        for block in getattr(msg, "content", []) or []:
            if getattr(block, "type", None) == "text":
                parts.append(getattr(block, "text", ""))
        return ("\n".join([p for p in parts if p]).strip()) or ""

    raw = await asyncio.to_thread(_call)
    raw = _strip_json_fences(raw)
    return json.loads(raw)


async def _openai_json(*, system: str, user_text: str, max_tokens: int) -> Dict[str, Any]:
    from openai import OpenAI

    def _call() -> str:
        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=getattr(settings, "openai_text_model", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            max_tokens=max_tokens,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return (resp.choices[0].message.content or "").strip()

    raw = await asyncio.to_thread(_call)
    raw = _strip_json_fences(raw)
    return json.loads(raw)


async def _openai_text(*, system: str, user_text: str, max_tokens: int) -> str:
    from openai import OpenAI

    def _call() -> str:
        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=getattr(settings, "openai_text_model", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return (resp.choices[0].message.content or "").strip()

    return await asyncio.to_thread(_call)


async def _openai_vision_json(*, system: str, image_bytes: bytes, max_tokens: int, media_type: str) -> Dict[str, Any]:
    import base64
    from openai import OpenAI

    def _call() -> str:
        client = OpenAI(api_key=settings.openai_api_key)
        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{media_type};base64,{b64}"
        resp = client.chat.completions.create(
            model=getattr(settings, "openai_vision_model", getattr(settings, "openai_text_model", "gpt-4o-mini")),
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract the text and travel entities/relations from this screenshot."},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
            max_tokens=max_tokens,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return (resp.choices[0].message.content or "").strip()

    raw = await asyncio.to_thread(_call)
    raw = _strip_json_fences(raw)
    return json.loads(raw)


