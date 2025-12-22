"""
Google Places enrichment (paid phase; manual batch jobs)

No scraping. Uses official Google Places API with field masks for cost control.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import structlog
import httpx

from config.settings import settings
from database.account_manager import account_manager
from database.neo4j_client import neo4j_client

logger = structlog.get_logger()
router = APIRouter()


def _require_admin_token(x_lexa_admin_token: Optional[str]) -> None:
    expected = getattr(settings, "lexa_admin_token", None)
    if expected and x_lexa_admin_token != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _supabase():
    if account_manager is None:
        raise HTTPException(status_code=503, detail="Supabase not initialized")
    return account_manager.supabase


class PlacesEnrichRequest(BaseModel):
    requested_by_user_id: str = Field(..., description="Supabase auth user.id (captain/admin)")
    destination: str = Field(..., description="Human destination label, e.g. 'Bali' or 'St. Tropez'")
    categories: List[str] = Field(default_factory=lambda: ["spa", "wellness"], description="e.g. spa, wellness, beach club, fine dining, hotel")
    max_places: int = Field(default=50, ge=1, le=500)
    max_requests: int = Field(default=120, ge=10, le=2000)
    language_code: str = Field(default="en")


@router.post("/admin/places/enrich")
async def enrich_places(
    request: PlacesEnrichRequest,
    x_lexa_admin_token: Optional[str] = Header(default=None),
):
    """
    Manual enrichment job. Quota-capped.
    Steps:
    - searchText per category to collect Place IDs (dedupe)
    - place details per Place ID with field mask
    - upsert into Supabase (raw+normalized)
    - project to Neo4j (poi nodes)
    """
    _require_admin_token(x_lexa_admin_token)

    if not settings.google_places_api_key:
        raise HTTPException(status_code=400, detail="GOOGLE_PLACES_API_KEY not configured on backend")

    job_id = str(_uuid4())
    now = datetime.now(timezone.utc).isoformat()

    params = {
        "destination": request.destination,
        "categories": request.categories,
        "max_places": request.max_places,
        "max_requests": request.max_requests,
        "language_code": request.language_code,
    }

    # Create job record
    try:
        _supabase().table("places_enrichment_jobs").insert({
            "id": job_id,
            "requested_by_user_id": request.requested_by_user_id,
            "status": "running",
            "params": params,
            "progress": {"started_at": now, "requests_used": 0, "places_found": 0, "places_upserted": 0, "neo4j_upserted": 0},
        }).execute()
    except Exception as e:
        logger.warning("Failed to insert job row (tables may be missing)", error=str(e))

    requests_used = 0
    place_ids: List[str] = []

    # SearchText endpoint (new Places API)
    search_url = "https://places.googleapis.com/v1/places:searchText"
    details_base = "https://places.googleapis.com/v1/places/"

    search_field_mask = ",".join([
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.types",
        "places.rating",
        "places.userRatingCount",
    ])

    details_field_mask = ",".join([
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "types",
        "rating",
        "userRatingCount",
        "websiteUri",
        "internationalPhoneNumber",
        "regularOpeningHours",
    ])

    headers_base = {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1) Discovery
        for cat in request.categories:
            if requests_used >= request.max_requests:
                break

            text_query = f"{cat} in {request.destination}"
            body = {
                "textQuery": text_query,
                "maxResultCount": min(20, max(1, request.max_places)),
                "languageCode": request.language_code,
            }

            try:
                resp = await client.post(
                    search_url,
                    headers={**headers_base, "X-Goog-FieldMask": search_field_mask},
                    json=body,
                )
                requests_used += 1
                resp.raise_for_status()
                data = resp.json()
                for p in (data.get("places") or []):
                    pid = p.get("id")
                    if pid and pid not in place_ids:
                        place_ids.append(pid)
                        if len(place_ids) >= request.max_places:
                            break
            except Exception as e:
                logger.warning("Places searchText failed", category=cat, error=str(e))
                continue

            if len(place_ids) >= request.max_places:
                break

        # 2) Details + persist + Neo4j projection
        places_upserted = 0
        neo4j_upserted = 0

        for pid in place_ids:
            if requests_used >= request.max_requests:
                break

            try:
                resp = await client.get(
                    f"{details_base}{pid}",
                    headers={**headers_base, "X-Goog-FieldMask": details_field_mask},
                )
                requests_used += 1
                resp.raise_for_status()
                place = resp.json()
            except Exception as e:
                logger.warning("Places details failed", place_id=pid, error=str(e))
                continue

            # Normalize
            display_name = ((place.get("displayName") or {}).get("text")) if isinstance(place.get("displayName"), dict) else place.get("displayName")
            formatted_address = place.get("formattedAddress")
            location = place.get("location") or {}
            lat = location.get("latitude")
            lon = location.get("longitude")
            types = place.get("types") or []
            rating = place.get("rating")
            user_rating_count = place.get("userRatingCount")
            website_uri = place.get("websiteUri")
            phone = place.get("internationalPhoneNumber")
            opening = place.get("regularOpeningHours") or {}

            # Upsert in Supabase
            try:
                _supabase().table("google_places_places").upsert({
                    "place_id": pid,
                    "display_name": display_name,
                    "formatted_address": formatted_address,
                    "lat": lat,
                    "lon": lon,
                    "types": types,
                    "rating": rating,
                    "user_rating_count": user_rating_count,
                    "website_uri": website_uri,
                    "international_phone_number": phone,
                    "regular_opening_hours": opening,
                    "raw": place,
                    "last_fetched_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
                _supabase().table("places_job_places").upsert({
                    "job_id": job_id,
                    "place_id": pid,
                }).execute()
                places_upserted += 1
            except Exception as e:
                logger.warning("Supabase upsert failed (tables may be missing)", error=str(e))

            # Project to Neo4j as a POI
            try:
                poi_uid = f"gplaces:{pid}"
                poi_type = types[0] if types else None
                await neo4j_client.execute_query(
                    """
                    MERGE (p:poi {poi_uid: $poi_uid})
                    ON CREATE SET p.source = 'google_places', p.created_at = datetime()
                    SET p.place_id = $place_id,
                        p.name = coalesce(p.name, $name),
                        p.type = coalesce(p.type, $type),
                        p.destination_name = coalesce(p.destination_name, $destination),
                        p.lat = coalesce(p.lat, $lat),
                        p.lon = coalesce(p.lon, $lon),
                        p.google_rating = $rating,
                        p.google_user_rating_count = $user_rating_count,
                        p.website = $website,
                        p.phone = $phone,
                        p.formatted_address = $formatted_address,
                        p.updated_at = datetime()
                    RETURN p
                    """,
                    {
                        "poi_uid": poi_uid,
                        "place_id": pid,
                        "name": display_name or formatted_address or pid,
                        "type": poi_type,
                        "destination": request.destination,
                        "lat": lat,
                        "lon": lon,
                        "rating": rating,
                        "user_rating_count": user_rating_count,
                        "website": website_uri,
                        "phone": phone,
                        "formatted_address": formatted_address,
                    },
                )
                # Link to destination node
                await neo4j_client.execute_query(
                    """
                    MATCH (p:poi {poi_uid: $poi_uid})
                    MERGE (d:destination {name: $destination})
                    MERGE (p)-[:located_in]->(d)
                    RETURN d
                    """,
                    {"poi_uid": poi_uid, "destination": request.destination},
                )
                neo4j_upserted += 1
            except Exception as e:
                logger.warning("Neo4j projection failed", place_id=pid, error=str(e))

            # Update progress occasionally (best effort)
            if (places_upserted % 10) == 0:
                _update_job_progress(job_id, requests_used, len(place_ids), places_upserted, neo4j_upserted)

        _update_job_progress(job_id, requests_used, len(place_ids), places_upserted, neo4j_upserted, done=True)

    return {
        "job_id": job_id,
        "destination": request.destination,
        "categories": request.categories,
        "requests_used": requests_used,
        "places_found": len(place_ids),
        "places_upserted": places_upserted,
        "neo4j_upserted": neo4j_upserted,
        "status": "completed",
    }


def _update_job_progress(
    job_id: str,
    requests_used: int,
    places_found: int,
    places_upserted: int,
    neo4j_upserted: int,
    done: bool = False,
) -> None:
    try:
        payload = {
            "requests_used": requests_used,
            "places_found": places_found,
            "places_upserted": places_upserted,
            "neo4j_upserted": neo4j_upserted,
        }
        update = {
            "progress": payload,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if done:
            update["status"] = "completed"
        _supabase().table("places_enrichment_jobs").update(update).eq("id", job_id).execute()
    except Exception:
        pass


def _uuid4():
    import uuid
    return uuid.uuid4()


