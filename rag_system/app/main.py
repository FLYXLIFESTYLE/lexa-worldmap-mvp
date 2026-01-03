"""
FastAPI Main Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="LEXA Intelligence API",
    description="Backend API for LEXA Captain Portal & Intelligence Extraction",
    version="1.0.0"
)

# CORS middleware (allow Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://lexa-worldmap-mvp.vercel.app",
        "https://lexa-worldmap-mvp-git-main-flyxlifestyles-projects.vercel.app",  # Git branch preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
try:
    from app.api.captain_upload import router as upload_router
    app.include_router(upload_router)
except ImportError as e:
    print(f"Warning: Could not import upload router: {e}")

try:
    from app.api.captain_scraping import router as scraping_router
    app.include_router(scraping_router)
except ImportError as e:
    print(f"Warning: Could not import scraping router: {e}")

try:
    from app.api.captain_pois import router as pois_router
    app.include_router(pois_router)
except ImportError as e:
    print(f"Warning: Could not import POIs router: {e}")

try:
    from app.api.captain_keywords import router as keywords_router
    app.include_router(keywords_router)
except ImportError as e:
    print(f"Warning: Could not import keywords router: {e}")

try:
    from app.api.captain_stats import router as stats_router
    app.include_router(stats_router)
except ImportError as e:
    print(f"Warning: Could not import stats router: {e}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "LEXA Intelligence API",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "upload": "/api/captain/upload/*",
            "scraping": "/api/captain/scrape/*",
            "pois": "/api/captain/pois/*",
            "keywords": "/api/captain/keywords/*",
            "stats": "/api/captain/stats/*"
        }
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected" if os.getenv("SUPABASE_URL") else "not configured",
        "ai": "ready" if os.getenv("ANTHROPIC_API_KEY") else "not configured",
        "services": {
            "file_processing": "available",
            "intelligence_extraction": "available",
            "web_scraping": "available",
            "poi_management": "available",
            "keyword_monitoring": "available",
            "statistics": "available"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
