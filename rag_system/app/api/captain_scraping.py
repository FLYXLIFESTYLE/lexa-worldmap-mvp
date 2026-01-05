"""
Captain Portal - URL Scraping API
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import uuid
from datetime import datetime

from app.services.web_scraper import web_scraper
from app.services.multipass_extractor import run_fast_extraction
from app.services.pii_redactor import redact_pii
from app.services.intelligence_storage import save_intelligence_to_db
from app.services.supabase_auth import get_current_user
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/captain/scrape", tags=["Scraping"])


class ScrapeURLRequest(BaseModel):
    """Request model for URL scraping"""
    url: HttpUrl
    extract_subpages: bool = True
    extract_intelligence: bool = True
    force: bool = False


class ScrapeURLResponse(BaseModel):
    """Response model for URL scraping"""
    success: bool = True
    scrape_id: str
    url: str
    status: str
    content_length: int
    subpage_count: Optional[int] = None
    pois_extracted: int = 0
    intelligence_extracted: Optional[dict] = None
    extracted_data: Optional[dict] = None
    extraction_contract: Optional[dict] = None
    counts_real: Optional[dict] = None
    counts_estimated: Optional[dict] = None
    already_scraped: bool = False
    previous_scraped_at: Optional[str] = None
    message: str
    debug: Optional[dict] = None


@router.post("/url", response_model=ScrapeURLResponse)
async def scrape_url(
    request: ScrapeURLRequest,
    http_request: Request,
    supabase = Depends(get_supabase)
):
    """
    Scrape a URL and optionally extract intelligence
    
    **What it does:**
    1. Scrapes the URL content
    2. Discovers subpages (if requested)
    3. Extracts intelligence with Claude AI (if requested)
    4. Saves to database
    
    **Returns:**
    - Scrape ID for tracking
    - Content stats
    - Extraction results
    """
    try:
        user = await get_current_user(http_request)
        user_id = user.get("id")
        user_email = (user.get("email") or "").lower()

        # Dedupe: if URL already scraped successfully and we have cached extraction, reuse it (unless force=true)
        existing = supabase.table("scraped_urls")\
            .select("*")\
            .eq("url", str(request.url))\
            .limit(1)\
            .execute()
        if existing.data:
            row = existing.data[0]
            meta = row.get("metadata") if isinstance(row, dict) else {}
            if not isinstance(meta, dict):
                meta = {}
            if (not request.force) and row.get("scraping_status") == "success" and meta.get("extraction_contract") and meta.get("extracted_data"):
                # Best-effort: materialize cached extraction into extracted_pois so it shows up in Verify/Browse.
                try:
                    poi_exists = supabase.table("extracted_pois")\
                        .select("id")\
                        .eq("scrape_id", row.get("id"))\
                        .limit(1)\
                        .execute()
                    if not getattr(poi_exists, "data", None):
                        await save_intelligence_to_db(
                            supabase=supabase,
                            intelligence=meta.get("extracted_data") or {},
                            source_type="url_scrape",
                            source_id=row.get("id"),
                            source_metadata={"filename": str(request.url)},
                            uploaded_by=user_id,
                        )
                except Exception:
                    pass

                return ScrapeURLResponse(
                    scrape_id=row.get("id"),
                    url=str(request.url),
                    status="completed",
                    content_length=int(row.get("content_length") or 0),
                    subpage_count=int(row.get("subpages_discovered") or 0),
                    pois_extracted=int(row.get("pois_discovered") or 0),
                    intelligence_extracted={
                        "pois": int(row.get("pois_discovered") or 0),
                        "experiences": int((meta.get("counts_real") or {}).get("sub_experiences", 0)) if isinstance(meta.get("counts_real"), dict) else 0,
                        "service_providers": int((meta.get("counts_real") or {}).get("service_providers", 0)) if isinstance(meta.get("counts_real"), dict) else 0,
                    },
                    extracted_data=meta.get("extracted_data"),
                    extraction_contract=meta.get("extraction_contract"),
                    counts_real=meta.get("counts_real") or {},
                    counts_estimated=meta.get("counts_estimated") or {},
                    already_scraped=True,
                    previous_scraped_at=row.get("last_scraped") or row.get("scraped_at"),
                    message="URL already scraped - showing existing extraction",
                )

        # Scrape the URL + subpages content (when enabled)
        if request.extract_subpages:
            scrape_result = await web_scraper.scrape_url_with_subpages_content(str(request.url))
        else:
            scrape_result = await web_scraper.scrape_url(str(request.url), extract_subpages=False)
        
        scrape_id = (existing.data[0].get("id") if existing.data else None) or str(uuid.uuid4())
        
        # Save scraped URL to database (shared view across captains)
        try:
            supabase.table("scraped_urls").upsert({
                "id": scrape_id,
                "url": str(request.url),
                "domain": scrape_result.get("metadata", {}).get("domain"),
                "entered_by": user_id,
                "entered_by_email": user_email,
                "scraped_at": datetime.utcnow().isoformat(),
                "last_scraped": datetime.utcnow().isoformat(),
                "scraping_status": "processing",
                "content_length": len(scrape_result.get("content", "")),
                "subpages_discovered": int(scrape_result.get("subpage_count") or 0),
                "subpages": scrape_result.get("subpages", []),
                "metadata": {
                    **(scrape_result.get("metadata", {}) or {}),
                    "pages_fetched": scrape_result.get("pages_fetched"),
                },
            }, on_conflict="url").execute()
        except Exception:
            pass
        
        # Extract intelligence if requested (fast, single-pass)
        extracted_pois = 0
        extracted_experiences = 0
        extracted = None
        contract = None
        real_counts = {}
        est_counts = {}

        content_text = (scrape_result.get("content") or "").strip()
        if request.extract_intelligence and len(content_text) >= 80:
            content_redacted, pii_stats = redact_pii(scrape_result["content"])
            # Store a safe snapshot of the source text (redacted) for Brain v2 Step 1
            source_text_limit = 60000
            source_text_truncated = len(content_redacted or "") > source_text_limit
            source_text_redacted = (content_redacted or "")[:source_text_limit]

            contract = await run_fast_extraction(content_redacted, {
                "upload_id": scrape_id,
                "filename": str(request.url),
                "file_type": "url",
                "text_length": len(content_redacted),
            })
            final_package = contract.get("final_package", {}) or {}

            # Local legacy mapping (minimal; aligned with Captain upload editor)
            def _safe_list(v):
                return v if isinstance(v, list) else []

            pois = []
            for venue in _safe_list(final_package.get("venues")):
                pois.append({
                    "name": venue.get("name"),
                    "type": venue.get("kind") or venue.get("type"),
                    "location": venue.get("location"),
                    "description": venue.get("description"),
                    "category": ", ".join(venue.get("tags", [])) if venue.get("tags") else None,
                    "address": None,
                    "coordinates": venue.get("coordinates") or {"lat": None, "lng": None},
                    "confidence": venue.get("confidence"),
                })

            experiences = []
            for exp in _safe_list(final_package.get("sub_experiences")):
                experiences.append({
                    "experience_title": exp.get("title") or exp.get("moment") or exp.get("name"),
                    "experience_type": exp.get("category") or exp.get("type"),
                    "description": exp.get("description"),
                    "location": exp.get("location"),
                    "duration": exp.get("duration"),
                    "unique_elements": ", ".join(exp.get("highlights", [])) if exp.get("highlights") else None,
                    "emotional_goal": exp.get("emotional_goal"),
                    "target_audience": exp.get("target_audience"),
                    "estimated_budget": exp.get("estimated_budget"),
                    "confidence": exp.get("confidence"),
                })

            providers = []
            for provider in _safe_list(final_package.get("service_providers")):
                providers.append({
                    "name": provider.get("name") or provider.get("provider"),
                    "service_type": provider.get("kind") or provider.get("type") or provider.get("category"),
                    "description": provider.get("description") or provider.get("role") or provider.get("context") or provider.get("service"),
                    "website": provider.get("website"),
                    "notes": provider.get("notes") or (", ".join(provider.get("services", [])) if provider.get("services") else None),
                    "confidence": provider.get("confidence"),
                })

            extracted = {
                "pois": pois,
                "experiences": experiences,
                "experience_overview": final_package.get("experience_overview"),
                "trends": [],
                "client_insights": [],
                "price_intelligence": {},
                "competitor_analysis": [],
                "operational_learnings": [],
                "service_providers": providers,
                "emotional_map": final_package.get("emotional_map", []),
                "client_archetypes": final_package.get("client_archetypes", []),
                "offerings": ((final_package.get("metadata", {}) or {}).get("core_offerings") if isinstance(final_package, dict) else []) or [],
                "metadata": final_package.get("metadata", {}),
            }

            extracted_pois = len(pois)
            extracted_experiences = len(experiences)
            counts = (final_package.get("counts", {}) if isinstance(final_package, dict) else {}) or {}
            real_counts = counts.get("real_extracted", {}) if isinstance(counts, dict) else {}
            est_counts = counts.get("estimated_potential", {}) if isinstance(counts, dict) else {}

            # Update scraped_urls row (best effort)
            try:
                supabase.table("scraped_urls").update({
                    "scraping_status": "success",
                    "content_length": len(content_redacted),
                    "pois_discovered": extracted_pois,
                    "relationships_discovered": len(final_package.get("relationships", []) or []),
                    "metadata": {
                        **(scrape_result.get("metadata", {}) or {}),
                        "pii_redaction": pii_stats,
                        "source_text_redacted": source_text_redacted,
                        "source_text_length": len(content_redacted or ""),
                        "source_text_truncated": source_text_truncated,
                        "counts_real": real_counts,
                        "counts_estimated": est_counts,
                        "captain_summary": (final_package.get("metadata", {}) or {}).get("captain_summary"),
                        "report_markdown": (final_package.get("metadata", {}) or {}).get("report_markdown"),
                        "extraction_contract": contract,
                        "extracted_data": extracted,
                    },
                }).eq("id", scrape_id).execute()
            except Exception:
                pass

            # Materialize extracted POIs into `extracted_pois` so they can be verified/approved in the portal (best effort).
            try:
                await save_intelligence_to_db(
                    supabase=supabase,
                    intelligence=extracted,
                    source_type="url_scrape",
                    source_id=scrape_id,
                    source_metadata={"filename": str(request.url)},
                    uploaded_by=user_id,
                )
            except Exception:
                pass
        elif request.extract_intelligence and len(content_text) < 80:
            # Mark failure explicitly so the UI doesn't open an empty editor.
            try:
                supabase.table("scraped_urls").update({
                    "scraping_status": "failed",
                    "error_message": "No readable content extracted from URL (content too short).",
                    "metadata": {
                        **(scrape_result.get("metadata", {}) or {}),
                        "content_length": len(content_text),
                    },
                }).eq("id", scrape_id).execute()
            except Exception:
                pass

            return ScrapeURLResponse(
                success=False,
                scrape_id=scrape_id,
                url=str(request.url),
                status="failed",
                content_length=len(content_text),
                subpage_count=scrape_result.get("subpage_count"),
                pois_extracted=0,
                intelligence_extracted=None,
                extracted_data=None,
                extraction_contract=None,
                counts_real={},
                counts_estimated={},
                message="No readable content extracted from URL. Try Force refresh or a different page on the same site.",
                debug=(scrape_result.get("metadata", {}) or {}).get("content_debug") if isinstance(scrape_result.get("metadata", {}), dict) else None,
            )
        
        return ScrapeURLResponse(
            scrape_id=scrape_id,
            url=str(request.url),
            status="completed",
            content_length=len(scrape_result.get("content", "")),
            subpage_count=scrape_result.get("subpage_count"),
            pois_extracted=extracted_pois,
            intelligence_extracted={
                "pois": extracted_pois,
                "experiences": extracted_experiences,
                "service_providers": len((extracted or {}).get("service_providers", []) if isinstance(extracted, dict) else []),
            } if request.extract_intelligence else None,
            extracted_data=extracted,
            extraction_contract=contract,
            counts_real=real_counts,
            counts_estimated=est_counts,
            message="URL scraped successfully",
            debug=(scrape_result.get("metadata", {}) or {}).get("content_debug") if isinstance(scrape_result.get("metadata", {}), dict) else None,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")


@router.get("/urls")
async def list_scraped_urls(
    limit: int = 50,
    offset: int = 0,
    supabase = Depends(get_supabase)
):
    """
    List all scraped URLs (shared view for all captains)
    
    **Query Parameters:**
    - limit: Number of results (default: 50)
    - offset: Pagination offset (default: 0)
    """
    try:
        response = supabase.table("scraped_urls")\
            .select("*")\
            .order("scraped_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Get total count
        count_response = supabase.table("scraped_urls")\
            .select("id", count="exact")\
            .execute()
        
        total_count = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
        
        return {
            "urls": response.data,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch URLs: {str(e)}")


@router.get("/id/{scrape_id}")
async def get_scrape_detail(
    scrape_id: str,
    supabase = Depends(get_supabase),
):
    """
    Fetch one scraped URL record (shared view).
    """
    response = supabase.table("scraped_urls")\
        .select("*")\
        .eq("id", scrape_id)\
        .limit(1)\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Scrape not found")

    return {"scrape": response.data[0]}


class UpdateScrapeRequest(BaseModel):
    metadata: Optional[dict] = None


@router.put("/id/{scrape_id}")
async def update_scrape(
    scrape_id: str,
    body: UpdateScrapeRequest,
    http_request: Request,
    supabase = Depends(get_supabase),
):
    """
    Update a scraped URL record (admin-only).
    Used to persist edited extracted data back into the scraped_urls.metadata cache.
    """
    user = await get_current_user(http_request)
    user_id = user.get("id")
    user_email = (user.get("email") or "").lower()

    # Admin check via captain_profiles (this is what the Next.js middleware uses)
    try:
        role_resp = supabase.table("captain_profiles").select("role").eq("user_id", user_id).limit(1).execute()
        role = role_resp.data[0].get("role") if role_resp.data else None
        if role != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="Admin only")

    existing = supabase.table("scraped_urls")\
        .select("id, metadata")\
        .eq("id", scrape_id)\
        .limit(1)\
        .execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Scrape not found")

    updates = {}
    if body.metadata is not None and isinstance(body.metadata, dict):
        current_meta = existing.data[0].get("metadata") or {}
        if not isinstance(current_meta, dict):
            current_meta = {}
        next_meta = {**current_meta, **body.metadata}
        # Simple edit versioning (auditability)
        try:
            current_v = int(current_meta.get("edit_version") or 0)
        except Exception:
            current_v = 0
        next_meta["edit_version"] = current_v + 1
        next_meta["last_edited_at"] = datetime.utcnow().isoformat()
        next_meta["last_edited_by"] = user_id
        next_meta["last_edited_by_email"] = user_email
        updates["metadata"] = next_meta
    if not updates:
        return {"success": True, "scrape_id": scrape_id}

    supabase.table("scraped_urls").update(updates).eq("id", scrape_id).execute()
    return {"success": True, "scrape_id": scrape_id}


@router.get("/queue")
async def get_scraping_queue(supabase = Depends(get_supabase)):
    """
    Get scraping queue status
    
    Shows URLs that are pending or in progress
    """
    try:
        response = supabase.table("scraping_queue")\
            .select("*")\
            .in_("status", ["pending", "processing"])\
            .order("created_at", desc=False)\
            .execute()
        
        return {
            "queue": response.data,
            "count": len(response.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch queue: {str(e)}")


@router.get("/health")
async def scraping_health_check():
    """Health check for scraping service"""
    return {
        "status": "healthy",
        "service": "URL Scraping",
        "features": {
            "content_extraction": "available",
            "subpage_discovery": "available",
            "intelligence_extraction": "available"
        }
    }
