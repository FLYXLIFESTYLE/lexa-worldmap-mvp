"""
Captain Portal - URL Scraping API
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import uuid
from datetime import datetime

from app.services.web_scraper import web_scraper
from app.services.intelligence_extractor import extract_all_intelligence
from app.services.intelligence_storage import save_intelligence_to_db
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/captain/scrape", tags=["Scraping"])


class ScrapeURLRequest(BaseModel):
    """Request model for URL scraping"""
    url: HttpUrl
    extract_subpages: bool = True
    extract_intelligence: bool = True


class ScrapeURLResponse(BaseModel):
    """Response model for URL scraping"""
    scrape_id: str
    url: str
    status: str
    content_length: int
    subpage_count: Optional[int] = None
    extracted_pois: Optional[int] = None
    extracted_experiences: Optional[int] = None
    message: str


@router.post("/url", response_model=ScrapeURLResponse)
async def scrape_url(
    request: ScrapeURLRequest,
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
        # Scrape the URL
        scrape_result = await web_scraper.scrape_url(
            str(request.url),
            extract_subpages=request.extract_subpages
        )
        
        scrape_id = str(uuid.uuid4())
        
        # Save scraped URL to database
        scrape_record = {
            "id": scrape_id,
            "url": str(request.url),
            "content": scrape_result["content"],
            "metadata": scrape_result["metadata"],
            "word_count": scrape_result["word_count"],
            "subpage_urls": scrape_result.get("subpages", []),
            "subpage_count": scrape_result.get("subpage_count", 0),
            "scraped_at": datetime.utcnow().isoformat(),
            "status": "completed"
        }
        
        supabase.table("scraped_urls").insert(scrape_record).execute()
        
        # Extract intelligence if requested
        extracted_pois = 0
        extracted_experiences = 0
        
        if request.extract_intelligence and scrape_result["content"]:
            intelligence = await extract_all_intelligence(
                scrape_result["content"]
            )
            
            # Save to database
            await save_intelligence_to_db(
                supabase=supabase,
                intelligence=intelligence,
                source_type="url_scrape",
                source_id=scrape_id,
                uploaded_by=None  # System upload
            )
            
            extracted_pois = len(intelligence.get("pois", []))
            extracted_experiences = len(intelligence.get("experiences", []))
            
            # Update scrape record with extraction results
            supabase.table("scraped_urls").update({
                "extraction_completed": True,
                "extracted_pois_count": extracted_pois,
                "extracted_experiences_count": extracted_experiences
            }).eq("id", scrape_id).execute()
        
        return ScrapeURLResponse(
            scrape_id=scrape_id,
            url=str(request.url),
            status="completed",
            content_length=len(scrape_result["content"]),
            subpage_count=scrape_result.get("subpage_count"),
            extracted_pois=extracted_pois if request.extract_intelligence else None,
            extracted_experiences=extracted_experiences if request.extract_intelligence else None,
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
