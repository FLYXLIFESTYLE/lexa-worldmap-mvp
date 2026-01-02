"""
Captain Statistics & Analytics API
Dashboard stats and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/captain/stats", tags=["Statistics"])


@router.get("/dashboard")
async def get_dashboard_stats(
    time_range: str = Query('30d', regex='^(7d|30d|90d|all)$'),
    supabase = Depends(get_supabase)
):
    """
    Get dashboard statistics
    
    Time ranges: 7d, 30d, 90d, all
    """
    try:
        # Calculate date filter
        date_filter = None
        if time_range != 'all':
            days = int(time_range[:-1])
            date_filter = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Total uploads
        uploads_query = supabase.table('captain_uploads').select('*', count='exact')
        if date_filter:
            uploads_query = uploads_query.gte('uploaded_at', date_filter)
        uploads_result = uploads_query.execute()
        total_uploads = uploads_result.count or 0
        
        # Total POIs discovered
        pois_query = supabase.table('extracted_pois').select('*', count='exact')
        if date_filter:
            pois_query = pois_query.gte('created_at', date_filter)
        pois_result = pois_query.execute()
        total_pois = pois_result.count or 0
        
        # Verified POIs
        verified_pois_query = supabase.table('extracted_pois')\
            .select('*', count='exact')\
            .eq('verified', True)
        if date_filter:
            verified_pois_query = verified_pois_query.gte('verified_at', date_filter)
        verified_pois_result = verified_pois_query.execute()
        verified_pois = verified_pois_result.count or 0
        
        # Promoted POIs
        promoted_pois_result = supabase.table('extracted_pois')\
            .select('*', count='exact')\
            .eq('promoted_to_main', True)\
            .execute()
        promoted_pois = promoted_pois_result.count or 0
        
        # Scraped URLs
        urls_query = supabase.table('scraped_urls').select('*', count='exact')
        if date_filter:
            urls_query = urls_query.gte('scraped_at', date_filter)
        urls_result = urls_query.execute()
        total_urls = urls_result.count or 0
        
        # Active keywords
        keywords_result = supabase.table('keywords')\
            .select('*', count='exact')\
            .eq('active', True)\
            .execute()
        active_keywords = keywords_result.count or 0
        
        # Articles discovered
        articles_query = supabase.table('keyword_articles').select('*', count='exact')
        if date_filter:
            articles_query = articles_query.gte('discovered_at', date_filter)
        articles_result = articles_query.execute()
        total_articles = articles_result.count or 0
        
        # New articles (status = 'new')
        new_articles_result = supabase.table('keyword_articles')\
            .select('*', count='exact')\
            .eq('status', 'new')\
            .execute()
        new_articles = new_articles_result.count or 0
        
        # Intelligence extraction stats
        experiences_result = supabase.table('extracted_experiences')\
            .select('*', count='exact')\
            .execute()
        total_experiences = experiences_result.count or 0
        
        trends_result = supabase.table('market_trends')\
            .select('*', count='exact')\
            .execute()
        total_trends = trends_result.count or 0
        
        insights_result = supabase.table('client_insights')\
            .select('*', count='exact')\
            .execute()
        total_insights = insights_result.count or 0
        
        return {
            "time_range": time_range,
            "uploads": {
                "total": total_uploads,
                "successful": total_uploads,  # TODO: Add processing status filter
                "failed": 0
            },
            "pois": {
                "total": total_pois,
                "verified": verified_pois,
                "promoted": promoted_pois,
                "pending_verification": total_pois - verified_pois
            },
            "scraping": {
                "total_urls": total_urls,
                "successful": total_urls,  # TODO: Add status filter
                "failed": 0
            },
            "keywords": {
                "active": active_keywords,
                "articles_discovered": total_articles,
                "new_articles": new_articles
            },
            "intelligence": {
                "experiences": total_experiences,
                "trends": total_trends,
                "insights": total_insights
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")


@router.get("/uploads")
async def get_upload_stats(
    time_range: str = Query('30d', regex='^(7d|30d|90d|all)$'),
    supabase = Depends(get_supabase)
):
    """
    Get detailed upload statistics
    """
    try:
        # Calculate date filter
        date_filter = None
        if time_range != 'all':
            days = int(time_range[:-1])
            date_filter = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get uploads with stats
        query = supabase.table('captain_uploads')\
            .select('file_type, processing_status, pois_discovered, confidence_score')
        
        if date_filter:
            query = query.gte('uploaded_at', date_filter)
        
        result = query.execute()
        uploads = result.data
        
        # Calculate stats
        by_type = {}
        by_status = {}
        total_pois = 0
        avg_confidence = 0
        
        for upload in uploads:
            # By file type
            file_type = upload.get('file_type', 'unknown')
            by_type[file_type] = by_type.get(file_type, 0) + 1
            
            # By status
            status = upload.get('processing_status', 'unknown')
            by_status[status] = by_status.get(status, 0) + 1
            
            # POIs and confidence
            total_pois += upload.get('pois_discovered', 0)
            avg_confidence += upload.get('confidence_score', 0)
        
        avg_confidence = avg_confidence / len(uploads) if uploads else 0
        
        return {
            "time_range": time_range,
            "total_uploads": len(uploads),
            "by_file_type": by_type,
            "by_status": by_status,
            "total_pois_discovered": total_pois,
            "average_confidence_score": round(avg_confidence, 1)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching upload stats: {str(e)}")


@router.get("/pois")
async def get_poi_stats(
    time_range: str = Query('30d', regex='^(7d|30d|90d|all)$'),
    supabase = Depends(get_supabase)
):
    """
    Get detailed POI statistics
    """
    try:
        # Calculate date filter
        date_filter = None
        if time_range != 'all':
            days = int(time_range[:-1])
            date_filter = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get POIs
        query = supabase.table('extracted_pois')\
            .select('category, destination, verified, enhanced, promoted_to_main, confidence_score, luxury_score')
        
        if date_filter:
            query = query.gte('created_at', date_filter)
        
        result = query.execute()
        pois = result.data
        
        # Calculate stats
        by_category = {}
        by_destination = {}
        verified_count = 0
        enhanced_count = 0
        promoted_count = 0
        avg_confidence = 0
        avg_luxury = 0
        
        for poi in pois:
            # By category
            category = poi.get('category', 'Uncategorized')
            by_category[category] = by_category.get(category, 0) + 1
            
            # By destination
            destination = poi.get('destination', 'Unknown')
            by_destination[destination] = by_destination.get(destination, 0) + 1
            
            # Verification status
            if poi.get('verified'):
                verified_count += 1
            if poi.get('enhanced'):
                enhanced_count += 1
            if poi.get('promoted_to_main'):
                promoted_count += 1
            
            # Scores
            avg_confidence += poi.get('confidence_score', 0)
            avg_luxury += poi.get('luxury_score', 0) or 0
        
        avg_confidence = avg_confidence / len(pois) if pois else 0
        avg_luxury = avg_luxury / len(pois) if pois else 0
        
        return {
            "time_range": time_range,
            "total_pois": len(pois),
            "by_category": by_category,
            "by_destination": by_destination,
            "verification": {
                "verified": verified_count,
                "enhanced": enhanced_count,
                "promoted": promoted_count,
                "pending": len(pois) - verified_count
            },
            "scores": {
                "average_confidence": round(avg_confidence, 1),
                "average_luxury": round(avg_luxury, 1)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching POI stats: {str(e)}")


@router.get("/intelligence")
async def get_intelligence_stats(supabase = Depends(get_supabase)):
    """
    Get intelligence extraction statistics
    """
    try:
        # Count each intelligence type
        stats = {}
        
        tables = [
            'extracted_experiences',
            'market_trends',
            'client_insights',
            'price_intelligence',
            'competitor_analysis',
            'operational_learnings'
        ]
        
        for table in tables:
            result = supabase.table(table).select('*', count='exact').execute()
            stats[table] = result.count or 0
        
        # Get most recent items
        recent_experiences = supabase.table('extracted_experiences')\
            .select('experience_title, created_at')\
            .order('created_at', desc=True)\
            .limit(5)\
            .execute()
        
        recent_trends = supabase.table('market_trends')\
            .select('trend_name, created_at')\
            .order('created_at', desc=True)\
            .limit(5)\
            .execute()
        
        return {
            "totals": stats,
            "recent": {
                "experiences": recent_experiences.data,
                "trends": recent_trends.data
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching intelligence stats: {str(e)}")


@router.get("/health")
async def stats_health_check():
    """Health check for statistics"""
    return {
        "status": "healthy",
        "service": "Statistics & Analytics",
        "features": {
            "dashboard_stats": "available",
            "upload_analytics": "available",
            "poi_analytics": "available",
            "intelligence_analytics": "available"
        }
    }
