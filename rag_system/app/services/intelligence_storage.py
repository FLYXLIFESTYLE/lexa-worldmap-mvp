"""
Intelligence Storage Service
Saves extracted business intelligence to Supabase
"""

from typing import Dict, List
from datetime import datetime
from app.services.supabase_client import get_supabase


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
        # 1. Save POIs (as before)
        if intelligence.get('pois'):
            for poi in intelligence['pois']:
                poi_data = {
                    'upload_id': upload_id,
                    'scrape_id': scrape_id,
                    'created_by': user_id,
                    **poi
                }
                result = supabase.table('extracted_pois').insert(poi_data).execute()
                if result.data:
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
