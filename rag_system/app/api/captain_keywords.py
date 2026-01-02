"""
Captain Keyword Monitoring API
Manage keywords and monitor discovered articles
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/captain/keywords", tags=["Keywords"])


class KeywordCreateRequest(BaseModel):
    """Request to create a new keyword"""
    keyword: str
    active: bool = True


class KeywordUpdateRequest(BaseModel):
    """Request to update a keyword"""
    keyword: Optional[str] = None
    active: Optional[bool] = None


class ArticleActionRequest(BaseModel):
    """Request to perform action on an article"""
    action: str  # 'select', 'delete', 'scrape'


@router.get("/")
async def get_keywords(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    active_only: bool = True,
    supabase = Depends(get_supabase)
):
    """
    Get all keywords
    
    All captains can see all keywords (shared view)
    """
    try:
        query = supabase.table('keywords').select('*', count='exact')
        
        if active_only:
            query = query.eq('active', True)
        
        query = query.order('created_at', desc=True)
        query = query.range(skip, skip + limit - 1)
        
        result = query.execute()
        
        return {
            "keywords": result.data,
            "total": result.count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching keywords: {str(e)}")


@router.post("/")
async def create_keyword(
    request: KeywordCreateRequest,
    supabase = Depends(get_supabase)
):
    """
    Create a new keyword
    
    All captains can add keywords
    """
    try:
        # Check if keyword already exists
        existing = supabase.table('keywords')\
            .select('*')\
            .eq('keyword', request.keyword.strip())\
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=400,
                detail=f"Keyword '{request.keyword}' already exists"
            )
        
        # Create keyword
        result = supabase.table('keywords').insert({
            'keyword': request.keyword.strip(),
            'active': request.active,
            'created_by_email': 'system@lexa.com',  # TODO: Get from auth
            'total_articles_found': 0
        }).execute()
        
        return {
            "success": True,
            "message": "Keyword created successfully",
            "keyword": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating keyword: {str(e)}")


@router.put("/{keyword_id}")
async def update_keyword(
    keyword_id: str,
    update: KeywordUpdateRequest,
    supabase = Depends(get_supabase)
):
    """Update a keyword"""
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_data['updated_at'] = 'now()'
        
        result = supabase.table('keywords')\
            .update(update_data)\
            .eq('id', keyword_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Keyword not found")
        
        return {
            "success": True,
            "message": "Keyword updated successfully",
            "keyword": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating keyword: {str(e)}")


@router.delete("/{keyword_id}")
async def delete_keyword(keyword_id: str, supabase = Depends(get_supabase)):
    """Delete a keyword"""
    try:
        result = supabase.table('keywords')\
            .delete()\
            .eq('id', keyword_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Keyword not found")
        
        return {
            "success": True,
            "message": "Keyword deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting keyword: {str(e)}")


@router.get("/{keyword_id}/articles")
async def get_keyword_articles(
    keyword_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """
    Get articles for a specific keyword
    
    Status: 'new', 'selected', 'scraped', 'deleted'
    """
    try:
        query = supabase.table('keyword_articles')\
            .select('*', count='exact')\
            .eq('keyword_id', keyword_id)
        
        if status:
            query = query.eq('status', status)
        
        query = query.order('discovered_at', desc=True)
        query = query.range(skip, skip + limit - 1)
        
        result = query.execute()
        
        return {
            "articles": result.data,
            "total": result.count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching articles: {str(e)}")


@router.get("/articles/all")
async def get_all_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """
    Get all articles across all keywords
    
    Useful for the keyword monitoring page feed
    """
    try:
        query = supabase.table('keyword_articles').select('*, keywords(keyword)', count='exact')
        
        if status:
            query = query.eq('status', status)
        
        if search:
            query = query.or_(
                f'title.ilike.%{search}%,'
                f'summary.ilike.%{search}%'
            )
        
        query = query.order('discovered_at', desc=True)
        query = query.range(skip, skip + limit - 1)
        
        result = query.execute()
        
        return {
            "articles": result.data,
            "total": result.count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching articles: {str(e)}")


@router.post("/articles/{article_id}/action")
async def perform_article_action(
    article_id: str,
    action_request: ArticleActionRequest,
    supabase = Depends(get_supabase)
):
    """
    Perform an action on an article
    
    Actions:
    - 'select': Mark for scraping (adds to scraping queue)
    - 'delete': Mark as not relevant
    - 'scrape': Immediately scrape this article
    """
    try:
        action = action_request.action.lower()
        
        if action == 'select':
            # Mark as selected and add to scraping queue
            article_result = supabase.table('keyword_articles')\
                .update({'status': 'selected', 'selected_at': 'now()'})\
                .eq('id', article_id)\
                .execute()
            
            if not article_result.data:
                raise HTTPException(status_code=404, detail="Article not found")
            
            article = article_result.data[0]
            
            # Add to scraping queue
            supabase.table('scraping_queue').insert({
                'article_id': article_id,
                'url': article['url'],
                'priority': 0,
                'status': 'queued'
            }).execute()
            
            return {
                "success": True,
                "message": "Article queued for scraping",
                "article": article
            }
        
        elif action == 'delete':
            # Mark as deleted (not relevant)
            result = supabase.table('keyword_articles')\
                .update({'status': 'deleted'})\
                .eq('id', article_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Article not found")
            
            return {
                "success": True,
                "message": "Article marked as not relevant",
                "article": result.data[0]
            }
        
        elif action == 'scrape':
            # TODO: Trigger immediate scraping
            result = supabase.table('keyword_articles')\
                .update({'status': 'selected', 'selected_at': 'now()'})\
                .eq('id', article_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Article not found")
            
            return {
                "success": True,
                "message": "Article scraping initiated (feature coming soon)",
                "article": result.data[0]
            }
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid action: {action}. Must be 'select', 'delete', or 'scrape'"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing action: {str(e)}")


@router.get("/health")
async def keywords_health_check():
    """Health check for keyword monitoring"""
    return {
        "status": "healthy",
        "service": "Keyword Monitoring",
        "features": {
            "keyword_management": "available",
            "article_discovery": "available",
            "article_actions": "available",
            "scraping_queue": "available"
        }
    }
