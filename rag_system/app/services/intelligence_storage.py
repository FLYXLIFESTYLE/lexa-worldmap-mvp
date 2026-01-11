"""
Intelligence Storage Service
Saves extracted business intelligence to Supabase
"""

from typing import Dict, List, Optional
from datetime import datetime
from app.services.supabase_client import get_supabase


def _as_list(v):
    return v if isinstance(v, list) else []

def _looks_like_bad_poi_name(name: str) -> bool:
    """
    Hard gate to prevent junk POIs like sentence fragments:
    e.g. "by the French family behind Pernod Ricard. It will open..."

    Keep conservative: block only obvious garbage.
    """
    if not isinstance(name, str):
        return True
    n = name.strip()
    if not n:
        return True
    if len(n) > 120:
        return True
    # Multiple sentences
    if n.count(".") >= 2 or n.count("!") >= 2 or n.count("?") >= 2:
        return True
    # Too many commas often indicates a paragraph fragment
    if n.count(",") >= 3:
        return True
    lower = n.lower()
    if lower.startswith(("by ", "and ", "it ", "this ", "they ", "the ")):
        return True
    return False

def _map_source_type_to_source_ref(source_type: str) -> str:
    # Align backend source types to the canonical allowlist vocabulary.
    if source_type == "file_upload":
        return "upload"
    if source_type == "text_paste":
        return "paste"
    if source_type == "url_scrape":
        return "url_scrape"
    return "manual"

def _default_source_refs(*, source_type: str, source_id: str, source_url: str = None) -> list:
    return [
        {
            "source_type": _map_source_type_to_source_ref(source_type),
            "source_id": str(source_id),
            "source_url": source_url,
            "captured_at": datetime.utcnow().isoformat() + "Z",
            "external_ids": {},
            "license": None,
        }
    ]

def _save_knowledge_nugget(
    supabase,
    *,
    user_id: str,
    upload_id: str,
    scrape_id: str,
    destination: str,
    text: str,
    source_type: str,
    source_id: str,
    source_url: str = None,
    nugget_type: str = "poi_fragment",
):
    """
    Save valuable unstructured snippets that are NOT POIs.
    This keeps intelligence without polluting extracted_pois.
    """
    try:
        t = (text or "").strip()
        if not t:
            return False
        # Keep it short; we do not store full articles here.
        if len(t) > 1500:
            t = t[:1500]
        payload = {
            "upload_id": upload_id,
            "scrape_id": scrape_id,
            "created_by": user_id,
            "nugget_type": nugget_type,
            "destination": destination,
            "text": t,
            "source_refs": _default_source_refs(source_type=source_type, source_id=source_id, source_url=source_url),
            "citations": [],
            "enrichment": {"source_type": source_type},
        }
        supabase.table("knowledge_nuggets").insert(payload).execute()
        return True
    except Exception:
        return False

def _clamp_int(v, lo: int, hi: int, default: int):
    try:
        n = int(round(float(v)))
    except Exception:
        return default
    return max(lo, min(hi, n))


def _parse_confidence_to_0_100(v) -> int:
    """
    Accepts confidence as:
    - 0..100 int
    - 0..1 float
    - string number
    Returns int 0..100.
    """
    if v is None:
        return 80
    try:
        f = float(v)
    except Exception:
        return 80
    if f <= 1.0:
        f = f * 100.0
    return _clamp_int(f, 0, 100, 80)


def _extract_lat_lng(poi: Dict) -> tuple:
    coords = poi.get("coordinates") if isinstance(poi, dict) else None
    if not isinstance(coords, dict):
        coords = {}
    lat = poi.get("latitude", poi.get("lat", coords.get("lat")))
    lng = poi.get("longitude", poi.get("lng", coords.get("lng")))
    try:
        lat = float(lat) if lat is not None else None
    except Exception:
        lat = None
    try:
        lng = float(lng) if lng is not None else None
    except Exception:
        lng = None
    return lat, lng


def _normalize_poi_for_extracted_pois(poi: Dict, *, source_file: Optional[str], source_type: str) -> Dict:
    """
    Map whatever the extractor produced into the `extracted_pois` schema.
    This is critical because Supabase rejects unknown columns.
    """
    if not isinstance(poi, dict):
        return {}

    name = (poi.get("name") or "").strip()
    if not name:
        return {}
    if _looks_like_bad_poi_name(name):
        return {}

    destination = poi.get("destination") or poi.get("location") or poi.get("city") or poi.get("where")
    if isinstance(destination, str):
        destination = destination.strip() or None
    else:
        destination = None

    category = poi.get("category") or poi.get("type") or poi.get("kind")
    if isinstance(category, str):
        category = category.strip() or None
    else:
        category = None

    lat, lng = _extract_lat_lng(poi)

    confidence_score = _parse_confidence_to_0_100(poi.get("confidence_score", poi.get("confidence")))

    luxury_score = poi.get("luxury_score", poi.get("luxury"))
    # luxury can be 0..1 or 0..10; normalize to 0..10 int
    try:
        lf = float(luxury_score) if luxury_score is not None else None
    except Exception:
        lf = None
    if lf is None:
        luxury_score_norm = None
    else:
        if lf <= 1.0:
            lf = lf * 10.0
        luxury_score_norm = _clamp_int(lf, 0, 10, 0)

    normalized = {
        "name": name,
        "destination": destination,
        "category": category,
        "description": poi.get("description"),
        "address": poi.get("address"),
        "latitude": lat,
        "longitude": lng,
        "confidence_score": confidence_score,
        "luxury_score": luxury_score_norm,
        "price_level": _clamp_int(poi.get("price_level"), 0, 4, 0) if poi.get("price_level") is not None else None,
        "themes": _as_list(poi.get("themes")),
        "keywords": _as_list(poi.get("keywords")),
        "luxury_indicators": _as_list(poi.get("luxury_indicators")),
        "insider_tips": poi.get("insider_tips"),
        "best_time": poi.get("best_time"),
        "booking_info": poi.get("booking_info"),
        "yacht_accessible": bool(poi.get("yacht_accessible")) if poi.get("yacht_accessible") is not None else None,
        "marina_distance": poi.get("marina_distance"),
        "source_file": source_file,
        # Investor-grade brain fields (stored first-class in DB)
        # These keys are now columns (020_extracted_pois_brain_fields.sql).
        "emotional_map": _as_list(poi.get("emotional_map")),
        "sensory_triggers": _as_list(poi.get("sensory_triggers")),
        "client_archetypes": _as_list(poi.get("client_archetypes")),
        "conversation_triggers": _as_list(poi.get("conversation_triggers")),
        "pricing": poi.get("pricing") if isinstance(poi.get("pricing"), dict) else None,
        "source_refs": _as_list(poi.get("source_refs")),
        "citations": _as_list(poi.get("citations")),
        "enrichment": poi.get("enrichment") if isinstance(poi.get("enrichment"), dict) else None,
        "emotion_confidence": _clamp_int(poi.get("emotion_confidence"), 0, 100, 0) if poi.get("emotion_confidence") is not None else None,
        "luxury_score_confidence": _clamp_int(poi.get("luxury_score_confidence"), 0, 100, 0) if poi.get("luxury_score_confidence") is not None else None,
        "metadata": {
            "source_type": source_type,
            "raw": poi,
        },
    }

    # Remove keys with None to avoid overwriting defaults unnecessarily.
    return {k: v for k, v in normalized.items() if v is not None}


async def save_intelligence_to_db(
    supabase,
    intelligence: Dict,
    source_type: str,
    source_id: str,
    source_metadata: Dict = None,
    uploaded_by: str = None
) -> Dict[str, int]:
    """
    Save all extracted intelligence to database
    
    Args:
        supabase: Supabase client instance
        intelligence: Dict with all extracted intelligence
        source_type: 'file_upload', 'text_paste', 'url_scrape'
        source_id: Upload ID or scrape ID
        source_metadata: Additional metadata about the source
        uploaded_by: User ID who uploaded/scraped
    
    Returns: Count of items saved per category
    """
    counts = {
        'pois': 0,
        'experiences': 0,
        'trends': 0,
        'insights': 0,
        'prices': 0,
        'competitors': 0,
        'learnings': 0
    }
    
    # Determine upload_id vs scrape_id based on source_type
    upload_id = source_id if source_type in ['file_upload', 'text_paste'] else None
    scrape_id = source_id if source_type == 'url_scrape' else None
    user_id = uploaded_by
    
    try:
        # 1. Save POIs (normalize to match schema)
        source_file = None
        source_url = None
        if isinstance(source_metadata, dict):
            source_file = source_metadata.get("filename") or source_metadata.get("title")
            source_url = source_metadata.get("url")

        # If this source was re-processed, wipe previously materialized POIs first (best-effort)
        try:
            if upload_id:
                supabase.table("extracted_pois").delete().eq("upload_id", upload_id).eq("created_by", user_id).execute()
            if scrape_id:
                supabase.table("extracted_pois").delete().eq("scrape_id", scrape_id).eq("created_by", user_id).execute()
        except Exception:
            pass

        if intelligence.get('pois'):
            for poi in _as_list(intelligence.get("pois")):
                # If the "name" is actually a sentence fragment, store it as a knowledge nugget instead.
                raw_name = (poi.get("name") or "").strip() if isinstance(poi, dict) else ""
                if raw_name and _looks_like_bad_poi_name(raw_name):
                    dest = poi.get("destination") or poi.get("location") or poi.get("city") or poi.get("where")
                    if not isinstance(dest, str):
                        dest = None
                    # Prefer the raw "name" fragment; fall back to description if needed.
                    frag = raw_name
                    if isinstance(poi.get("description"), str) and poi.get("description") and len(frag) < 40:
                        frag = (poi.get("description") or "").strip() or frag
                    _save_knowledge_nugget(
                        supabase,
                        user_id=user_id,
                        upload_id=upload_id,
                        scrape_id=scrape_id,
                        destination=(dest.strip() if isinstance(dest, str) else None),
                        text=frag,
                        source_type=source_type,
                        source_id=source_id,
                        source_url=source_url,
                        nugget_type="poi_fragment",
                    )
                    continue

                normalized = _normalize_poi_for_extracted_pois(poi, source_file=source_file, source_type=source_type)
                if not normalized:
                    continue

                # Hardening: always attach provenance (source_refs) if missing.
                if not isinstance(normalized.get("source_refs"), list) or len(normalized.get("source_refs")) == 0:
                    normalized["source_refs"] = _default_source_refs(
                        source_type=source_type, source_id=source_id, source_url=source_url
                    )

                poi_data = {
                    "upload_id": upload_id,
                    "scrape_id": scrape_id,
                    "created_by": user_id,
                    **normalized,
                }

                result = supabase.table('extracted_pois').insert(poi_data).execute()
                if getattr(result, "data", None):
                    counts['pois'] += 1
        
        # 2. Save Experience Ideas
        if intelligence.get('experiences'):
            for exp in intelligence['experiences']:
                exp_data = {
                    'upload_id': upload_id,
                    'scrape_id': scrape_id,
                    'created_by': user_id,
                    'experience_title': exp.get('experience_title'),
                    'experience_type': exp.get('experience_type'),
                    'target_audience': exp.get('target_audience'),
                    'emotional_goal': exp.get('emotional_goal'),
                    'narrative_arc': exp.get('narrative_arc'),
                    'key_moments': exp.get('key_moments', []),
                    'duration': exp.get('duration'),
                    'estimated_budget': exp.get('estimated_budget'),
                    'unique_elements': exp.get('unique_elements'),
                    'inspiration_source': exp.get('inspiration_source')
                }
                result = supabase.table('extracted_experiences').insert(exp_data).execute()
                if result.data:
                    counts['experiences'] += 1
        
        # 3. Save Market Trends
        if intelligence.get('trends'):
            for trend in intelligence['trends']:
                trend_data = {
                    'upload_id': upload_id,
                    'scrape_id': scrape_id,
                    'discovered_by': user_id,
                    'trend_name': trend.get('trend_name'),
                    'trend_category': trend.get('trend_category'),
                    'description': trend.get('description'),
                    'target_demographic': trend.get('target_demographic'),
                    'growth_indicator': trend.get('growth_indicator'),
                    'geographical_focus': trend.get('geographical_focus'),
                    'seasonality': trend.get('seasonality'),
                    'price_impact': trend.get('price_impact'),
                    'business_opportunity': trend.get('business_opportunity')
                }
                result = supabase.table('market_trends').insert(trend_data).execute()
                if result.data:
                    counts['trends'] += 1
        
        # 4. Save Client Insights
        if intelligence.get('client_insights'):
            for insight in intelligence['client_insights']:
                insight_data = {
                    'upload_id': upload_id,
                    'scrape_id': scrape_id,
                    'discovered_by': user_id,
                    'insight_category': insight.get('insight_category'),
                    'client_segment': insight.get('client_segment'),
                    'insight_description': insight.get('insight_description'),
                    'emotional_drivers': insight.get('emotional_drivers'),
                    'decision_criteria': insight.get('decision_criteria'),
                    'price_sensitivity': insight.get('price_sensitivity'),
                    'booking_timeline': insight.get('booking_timeline'),
                    'information_sources': insight.get('information_sources', []),
                    'pain_points': insight.get('pain_points'),
                    'unmet_needs': insight.get('unmet_needs')
                }
                result = supabase.table('client_insights').insert(insight_data).execute()
                if result.data:
                    counts['insights'] += 1
        
        # 5. Save Price Intelligence
        if intelligence.get('price_intelligence'):
            price_data = intelligence['price_intelligence']
            if isinstance(price_data, dict) and price_data:
                price_record = {
                    'upload_id': upload_id,
                    'scrape_id': scrape_id,
                    'discovered_by': user_id,
                    **price_data
                }
                result = supabase.table('price_intelligence').insert(price_record).execute()
                if result.data:
                    counts['prices'] += 1
        
        # 6. Save Competitor Analysis
        if intelligence.get('competitor_analysis'):
            for comp in intelligence['competitor_analysis']:
                comp_data = {
                    'upload_id': upload_id,
                    'scrape_id': scrape_id,
                    'discovered_by': user_id,
                    'competitor_name': comp.get('competitor_name'),
                    'competitor_type': comp.get('competitor_type'),
                    'website': comp.get('website'),
                    'strengths': comp.get('strengths'),
                    'weaknesses': comp.get('weaknesses'),
                    'pricing_model': comp.get('pricing_model'),
                    'target_market': comp.get('target_market'),
                    'differentiation': comp.get('differentiation'),
                    'lessons_for_lexa': comp.get('lessons_for_lexa')
                }
                result = supabase.table('competitor_analysis').insert(comp_data).execute()
                if result.data:
                    counts['competitors'] += 1
        
        # 7. Save Operational Learnings
        if intelligence.get('operational_learnings'):
            for learning in intelligence['operational_learnings']:
                learning_data = {
                    'upload_id': upload_id,
                    'scrape_id': scrape_id,
                    'discovered_by': user_id,
                    'topic': learning.get('topic'),
                    'category': learning.get('category'),
                    'destination': learning.get('destination'),
                    'learning': learning.get('learning'),
                    'actionable': learning.get('actionable')
                }
                result = supabase.table('operational_learnings').insert(learning_data).execute()
                if result.data:
                    counts['learnings'] += 1
        
        return counts
        
    except Exception as e:
        print(f"Error saving intelligence to database: {str(e)}")
        return counts


async def get_intelligence_for_script_creation(
    supabase,
    destination: str = None,
    themes: List[str] = None,
    target_audience: str = None,
    budget_range: tuple = None
) -> Dict:
    """
    Retrieve relevant intelligence for LEXA script creation
    
    This is called by LEXA when creating experience scripts
    to enhance recommendations with real-world intelligence
    
    Args:
        supabase: Supabase client instance
        destination: Target destination
        themes: List of theme names
        target_audience: Target audience description
        budget_range: (min, max) budget tuple
    """
    intelligence = {
        'experiences': [],
        'trends': [],
        'insights': [],
        'prices': [],
        'learnings': []
    }
    
    try:
        # Get relevant experience ideas
        exp_query = supabase.table('extracted_experiences').select('*')
        if target_audience:
            exp_query = exp_query.ilike('target_audience', f'%{target_audience}%')
        exp_result = exp_query.order('usage_count', desc=True).limit(10).execute()
        intelligence['experiences'] = exp_result.data
        
        # Get active market trends
        trends_result = supabase.table('market_trends')\
            .select('*')\
            .eq('verified', True)\
            .order('relevance_score', desc=True)\
            .limit(10)\
            .execute()
        intelligence['trends'] = trends_result.data
        
        # Get client insights
        insights_query = supabase.table('client_insights').select('*')
        if target_audience:
            insights_query = insights_query.ilike('client_segment', f'%{target_audience}%')
        insights_result = insights_query.order('usage_count', desc=True).limit(10).execute()
        intelligence['insights'] = insights_result.data
        
        # Get price intelligence
        price_query = supabase.table('price_intelligence').select('*')
        if destination:
            price_query = price_query.ilike('destination', f'%{destination}%')
        price_result = price_query.limit(10).execute()
        intelligence['prices'] = price_result.data
        
        # Get operational learnings
        learning_query = supabase.table('operational_learnings').select('*')
        if destination:
            learning_query = learning_query.ilike('destination', f'%{destination}%')
        learning_result = learning_query.eq('verified', True).limit(10).execute()
        intelligence['learnings'] = learning_result.data
        
        return intelligence
        
    except Exception as e:
        print(f"Error retrieving intelligence: {str(e)}")
        return intelligence


async def increment_usage_count(supabase, table: str, record_id: str):
    """
    Track how often LEXA uses each piece of intelligence
    
    Args:
        supabase: Supabase client instance
        table: Table name
        record_id: Record ID to increment
    """
    try:
        supabase.rpc(
            f'increment_usage_count',
            {'table_name': table, 'record_id': record_id}
        ).execute()
    except Exception as e:
        print(f"Error incrementing usage count: {str(e)}")
