"""
FastAPI Main Application Entry Point
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
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

# CORS configuration
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://lexa-worldmap-mvp.vercel.app",
    "https://lexa-worldmap-mvp-git-main-flyxlifestyles-projects.vercel.app",  # Git branch preview
]

# CORS middleware (allow Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Exception handler to ensure CORS headers are always sent
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure CORS headers are sent even on errors"""
    origin = request.headers.get("origin")
    if origin in CORS_ORIGINS:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    else:
        headers = {}
    
    import traceback
    error_detail = str(exc)
    traceback_str = traceback.format_exc()
    print(f"Unhandled exception: {error_detail}")
    print(traceback_str)
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {error_detail}"},
        headers=headers
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with CORS headers"""
    origin = request.headers.get("origin")
    if origin in CORS_ORIGINS:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    else:
        headers = {}
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers"""
    origin = request.headers.get("origin")
    if origin in CORS_ORIGINS:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    else:
        headers = {}
    
    # NOTE: `exc.body` can be bytes, which is not JSON serializable.
    body_value = exc.body
    if isinstance(body_value, (bytes, bytearray)):
        try:
            body_value = body_value.decode("utf-8", errors="replace")
        except Exception:
            body_value = "<binary>"

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": body_value},
        headers=headers
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

try:
    from app.api.market_intelligence import router as market_intel_router
    app.include_router(market_intel_router)
except ImportError as e:
    print(f"Warning: Could not import market intelligence router: {e}")

try:
    from app.api.company_brain import router as company_brain_router
    app.include_router(company_brain_router)
except ImportError as e:
    print(f"Warning: Could not import company brain router: {e}")


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


@app.post("/test/extraction")
async def test_extraction(request: dict = None):
    """Test endpoint to verify Claude extraction is working"""
    from app.services.intelligence_extractor import extract_all_intelligence
    from fastapi import Body
    
    # Get text from request body or use default
    if request and isinstance(request, dict) and "text" in request:
        test_text = request["text"]
    else:
        test_text = """Wellness Cruise 

DAY 1 – ST-LAURENT-DU-VAR → BEAULIEU-SUR-MER & ÈZE
Arrival · Decompression · Nervous System Reset
• Private embarkation in St-Laurent-du-Var
• Welcome onboard with mineralised water, adaptogenic tonics & anti-jet-lag supplements
• Light detox lunch onboard
Afternoon – Beaulieu-sur-Mer
• Gentle coastal cruise and anchorage
• Sea immersion therapy & floating meditation
Exclusive Shore Experience – Èze
• Private transfer to Èze
• Mindful walk through the village & nature paths
• Optional Fragonard Wellness Atelier (olfactive grounding & breath)
Evening
• Sound healing or guided breathwork on deck
• Early, clean Mediterranean dinner or dinner at La Chevre d'Or

Hotel du Cap-Eden-Roc Spa
Cheval Blanc St-Tropez Spa by Guerlain
Elsa (Monaco) 1 * Michelin
Drip Hydration (UK based but operates internationally)
Epulsive (Tailored workouts using EMS suits)"""
    
    print(f"=== TEST EXTRACTION CALLED ===")
    print(f"Text length: {len(test_text)}")
    print(f"First 200 chars: {test_text[:200]}")
    
    try:
        result = await extract_all_intelligence(test_text, "test_document.txt")
        print(f"=== TEST EXTRACTION RESULT ===")
        print(f"POIs: {len(result.get('pois', []))}")
        print(f"Experiences: {len(result.get('experiences', []))}")
        print(f"Competitors: {len(result.get('competitor_analysis', []))}")
        
        return {
            "success": True,
            "text_length": len(test_text),
            "extracted": {
                "pois": len(result.get("pois", [])),
                "experiences": len(result.get("experiences", [])),
                "competitors": len(result.get("competitor_analysis", [])),
                "trends": len(result.get("trends", []))
            },
            "data": result
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"=== TEST EXTRACTION ERROR ===")
        print(error_trace)
        return {
            "success": False,
            "error": str(e),
            "traceback": error_trace
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
