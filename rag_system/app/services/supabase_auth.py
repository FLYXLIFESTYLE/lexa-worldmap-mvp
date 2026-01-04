"""
Supabase Auth helper (FastAPI backend)

We accept the Supabase access token (JWT) from the frontend and resolve
the current user via Supabase Auth API.

This allows the backend to:
- attribute uploads to the correct user (uploaded_by)
- enforce per-user access on history/detail/delete endpoints
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException, Request


def _get_supabase_config() -> tuple[str, str]:
    supabase_url = os.getenv("SUPABASE_URL") or ""
    supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or ""
    if not supabase_url or not supabase_service_key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY not configured on backend.")
    return supabase_url, supabase_service_key


def _extract_bearer_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth:
        return None
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Resolve current Supabase user from Authorization: Bearer <access_token>.
    Raises 401 if missing/invalid.
    """
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization token")

    supabase_url, supabase_service_key = _get_supabase_config()
    url = f"{supabase_url.rstrip('/')}/auth/v1/user"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": supabase_service_key,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return resp.json()

