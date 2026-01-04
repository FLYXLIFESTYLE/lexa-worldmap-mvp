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
from app.services.supabase_auth import get_current_user
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/captain/scrape", tags=["Scraping"])


class ScrapeURLRequest(BaseModel):
    """Request model for URL scraping"""
    url: HttpUrl
    extract_subpages: bool = True
    extract_intelligence: bool = True


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
    message: str


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

        # Scrape the URL + subpages content (when enabled)
        if request.extract_subpages:
            scrape_result = await web_scraper.scrape_url_with_subpages_content(str(request.url))
        else:
            scrape_result = await web_scraper.scrape_url(str(request.url), extract_subpages=False)
        
        scrape_id = str(uuid.uuid4())
        
        # Save scraped URL to database (shared view across captains)
        try:
            supabase.table("scraped_urls").insert({
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
            }).execute()
        except Exception:
            pass
        
        # Extract intelligence if requested (fast, single-pass)
        extracted_pois = 0
        extracted_experiences = 0
        extracted = None
        contract = None
        real_counts = {}
        est_counts = {}

        if request.extract_intelligence and scrape_result.get("content"):
            content_redacted, pii_stats = redact_pii(scrape_result["content"])

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
                "trends": [],
                "client_insights": [],
                "price_intelligence": {},
                "competitor_analysis": [],
                "operational_learnings": [],
                "service_providers": providers,
                "emotional_map": final_package.get("emotional_map", []),
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
            message="URL scraped successfully"
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
