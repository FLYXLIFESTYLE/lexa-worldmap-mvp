# Data Quality Agent - Setup Guide

## Overview

The Data Quality Agent is an automated system that runs daily at midnight to maintain data quality in the Neo4j database. It performs:

1. **Duplicate Detection & Merging** - Finds and intelligently merges duplicate POIs
2. **Unnamed POI Removal** - Removes POIs with missing or empty names
3. **Relation Validation** - Ensures all POIs have proper relationships
4. **Scoring Verification** - Checks and adds missing luxury scores
5. **POI Enrichment** - Enriches POI data from external APIs (Google Places, Wikipedia, OSM)

## Environment Variables

Add these to your `.env` or `.env.local` file:

```env
# Data Quality & Enrichment (Optional - for enrichment features)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
ENRICHMENT_CACHE_TTL=2592000  # 30 days in seconds
ENRICHMENT_RATE_LIMIT=10  # requests per second
```

**Note:** The enrichment features are currently disabled by default to avoid API costs during development. To enable them, uncomment the enrichment code in `lib/neo4j/data-quality-agent.ts`.

## How to Use

### Automatic Scheduling

The agent runs automatically every day at midnight UTC. No action needed!

### Manual Trigger

1. Navigate to `/admin/data-quality` in your browser
2. Click the "Run Quality Check" button
3. Watch the real-time progress and results

### API Endpoints

- `POST /api/data-quality/run` - Trigger a quality check manually
- `GET /api/data-quality/status` - Get current status and last run results

## Features

### Smart Duplicate Merging

When duplicates are found, the system:
1. Calculates priority score for each POI (luxury_score > relationships > completeness > recency)
2. Keeps the highest-priority POI
3. Merges properties (takes best non-null values)
4. Merges relationships (keeps highest confidence scores)
5. Deletes the inferior duplicate

### Enrichment System

The enrichment system can enhance POI data from:

- **Google Places API**: Ratings, reviews, photos, opening hours, website, phone
- **Wikipedia API**: Detailed descriptions, historical context, images
- **OpenStreetMap**: Cuisine types, amenities, accessibility, payment methods

Priority scoring ensures high-value POIs (luxury destinations) are enriched first.

### Conflict Resolution

When multiple sources provide conflicting data:
- **Ratings**: Weighted average (Google 50%, others 30%/20%)
- **Descriptions**: Combine (Wikipedia for context, Google for reviews)
- **Categories**: Union of all unique categories
- **URLs/Phone**: Priority order (Google > OSM > Wikipedia)

## Logs

Quality check results are automatically logged to:
```
logs/data-quality/YYYY-MM-DD.json
```

Logs are kept for 30 days and automatically cleaned up.

## Admin Dashboard

Access the dashboard at `/admin/data-quality` to:
- Manually trigger quality checks
- View real-time progress
- See detailed results and statistics
- Review historical runs
- Monitor API costs (for enrichment)

## Implementation Status

✅ **Completed:**
- Core data quality agent
- Duplicate detection and merging
- Unnamed POI removal
- Relation validation
- Scoring verification
- Automated scheduler (midnight daily)
- Manual trigger API
- Admin dashboard UI
- Logging system
- Google Places API client
- Wikipedia API client
- OSM Overpass API client
- Multi-source data merger
- Priority scoring

📝 **Note:** Enrichment is implemented but disabled by default to avoid API costs. Enable it when you have a Google Places API key and are ready to incur costs (~$8.50/day for 500 POIs).

## Testing

To test the system:

1. **Check scheduler is running:**
   - Look for `[Scheduler] Initialized` in server logs when app starts

2. **Manual test:**
   - Go to `/admin/data-quality`
   - Click "Run Quality Check"
   - Verify results are displayed

3. **Check logs:**
   - Look in `logs/data-quality/` for JSON log files

## Troubleshooting

### "Data quality check is already running"
- Another check is in progress. Wait for it to complete.

### No duplicates found
- This is normal if your data is clean!

### Enrichment not working
- Check that `GOOGLE_PLACES_API_KEY` is set in `.env`
- Verify enrichment code is uncommented in the agent
- Check API quotas and billing in Google Cloud Console

## Cost Estimates

### Google Places API
- **Place Details**: $17 per 1,000 requests
- **Daily budget (moderate)**: 500 POIs = ~$8.50/day
- **Monthly cost**: ~$255/month

### Free APIs
- Wikipedia: Free, unlimited (with respectful rate limiting)
- OSM Overpass: Free, fair use policy

## Architecture

```
Data Quality Agent
├── Core Agent (lib/neo4j/data-quality-agent.ts)
├── Scheduler (lib/services/scheduler.ts)
├── API Routes (app/api/data-quality/)
├── Admin UI (app/admin/data-quality/page.tsx)
├── Logger (lib/services/logger.ts)
└── Enrichment Modules
    ├── Google Places (lib/enrichment/google-places-client.ts)
    ├── Wikipedia (lib/enrichment/wikipedia-client.ts)
    ├── OSM (lib/enrichment/osm-client.ts)
    ├── Data Merger (lib/enrichment/data-merger.ts)
    └── Priority Scorer (lib/enrichment/priority-scorer.ts)
```

## Next Steps

1. Add your Google Places API key to `.env` (optional)
2. Navigate to `/admin/data-quality` to test
3. Review the first run results
4. Enable enrichment when ready
5. Monitor logs and API costs

---

**Last Updated:** December 16, 2025
**Status:** ✅ Fully Implemented and Ready to Use

