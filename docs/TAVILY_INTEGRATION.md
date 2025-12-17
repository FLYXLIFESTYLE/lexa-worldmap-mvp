# Tavily.ai Integration Guide

## What is Tavily?

[Tavily.ai](https://tavily.com/) is a real-time AI search engine designed for AI agents and applications. It provides:
- Real-time web search results
- News and current events
- Domain-specific filtering
- Fast response times
- Clean, structured data

## Setup

### 1. Get Tavily API Key

1. Sign up at [https://tavily.com/](https://tavily.com/)
2. Get your API key from the dashboard
3. Add to Vercel environment variables:
   - Variable name: `TAVILY_API_KEY`
   - Value: `tvly-...your-key...`
   - Apply to: Production, Preview, Development

### 2. Test the Integration

```bash
# Test endpoint
curl -X POST https://lexa-worldmap-mvp.vercel.app/api/tavily/search \
  -H "Content-Type: application/json" \
  -d '{"type": "destination_info", "destination": "French Riviera"}'
```

## Use Cases for LEXA

### 1. **Real-time Destination Information**
```javascript
// Search for current destination info
const response = await fetch('/api/tavily/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'destination_info',
    destination: 'French Riviera',
    context: 'luxury yacht charter'
  })
});
```

**Returns:**
- Latest travel guides
- Current attractions
- Recent reviews
- Updated pricing information

### 2. **Current Events & Festivals**
```javascript
// Search for events happening now or specific month
const response = await fetch('/api/tavily/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'events',
    destination: 'Monaco',
    month: 'May'
  })
});
```

**Returns:**
- Monaco Grand Prix dates
- Film festivals
- Yacht shows
- Art exhibitions
- Local celebrations

### 3. **Weather Information**
```javascript
// Get current or typical weather
const response = await fetch('/api/tavily/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'weather',
    destination: 'Amalfi Coast',
    month: 'June'
  })
});
```

**Returns:**
- Temperature ranges
- Precipitation patterns
- Sea conditions
- Best/worst times to visit

### 4. **POI Research**
```javascript
// Get latest info about specific POI
const response = await fetch('/api/tavily/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'poi',
    poiName: 'Le Louis XV',
    destination: 'Monaco'
  })
});
```

**Returns:**
- Current ratings
- Recent reviews
- Awards/accolades
- Booking availability
- Price range

### 5. **Travel Requirements**
```javascript
// Check current entry requirements
const response = await fetch('/api/tavily/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'travel_requirements',
    destination: 'UAE'
  })
});
```

**Returns:**
- Visa requirements
- Entry restrictions
- Health requirements
- Customs regulations

## Integration with LEXA Chat

### Enhance Conversation Responses

```typescript
// In lib/lexa/claude-client.ts or conversation handler

// When user asks about a destination
if (userQuery.includes('when to visit') || userQuery.includes('best time')) {
  const tavilyResults = await fetch('/api/tavily/search', {
    method: 'POST',
    body: JSON.stringify({
      type: 'weather',
      destination: extractedDestination,
      month: extractedMonth
    })
  });
  
  // Append Tavily results to Claude's context
  const enrichedContext = `
    User question: ${userQuery}
    
    Current information from Tavily:
    ${tavilyResults.results.map(r => r.content).join('\n\n')}
    
    Neo4j knowledge:
    ${neo4jResults}
  `;
}
```

### Real-time Data Quality Agent

```typescript
// In lib/neo4j/data-quality-agent.ts

export async function enrichPOIWithTavily(poiName: string, destination: string) {
  const tavilyData = await searchPOIInfo(poiName, destination);
  
  // Update Neo4j with fresh data
  await session.run(`
    MATCH (p:poi {name: $poiName})
    SET p.last_verified = datetime(),
        p.tavily_score = $score,
        p.recent_reviews = $reviews,
        p.current_status = $status
  `, {
    poiName,
    score: tavilyData.results[0]?.score,
    reviews: tavilyData.results.map(r => r.content),
    status: 'active'
  });
}
```

## API Endpoints

### `/api/tavily/search`

**POST Request Body:**

```typescript
{
  type: 'destination_info' | 'events' | 'weather' | 'poi' | 'travel_requirements' | 'general',
  
  // For destination_info
  destination?: string,
  context?: string,
  
  // For events
  month?: string,
  
  // For poi
  poiName?: string,
  
  // For general search
  query?: string
}
```

**Response:**

```typescript
{
  success: true,
  query: "French Riviera luxury yacht charter",
  results: [
    {
      title: "...",
      url: "...",
      content: "...",
      score: 0.95,
      publishedDate: "2024-12-15"
    }
  ],
  responseTime: 1245 // milliseconds
}
```

## Cost Management

Tavily pricing (as of Dec 2024):
- **Free tier**: 1,000 requests/month
- **Pro**: $50/month for 50,000 requests
- **Enterprise**: Custom pricing

### Optimization Tips

1. **Cache results** for 24 hours
2. **Batch requests** when possible
3. **Use 'basic' search depth** for quick queries
4. **Use 'advanced'** only for critical information
5. **Limit max_results** to 3-5 for most queries

## Example Integration in Captain's Portal

```typescript
// In app/admin/knowledge/editor/page.tsx

const enrichFromTavily = async (destination: string) => {
  setIsEnriching(true);
  
  try {
    const response = await fetch('/api/tavily/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'destination_info',
        destination,
        context: 'luxury travel experiences'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Auto-fill content field with Tavily results
      setEntry({
        ...entry,
        content: data.results.map(r => r.content).join('\n\n'),
        tags: [...entry.tags, 'tavily_enriched']
      });
    }
  } finally {
    setIsEnriching(false);
  }
};
```

## Next Steps

1. **Add Tavily button** in Captain's Portal editor
2. **Auto-enrich POIs** during quality checks
3. **Real-time updates** for LEXA chat responses
4. **Event calendar** showing upcoming events per destination
5. **Weather widget** in destination pages

## Testing

```bash
# Test different search types

# Destination info
curl -X POST http://localhost:3000/api/tavily/search \
  -H "Content-Type: application/json" \
  -d '{"type":"destination_info","destination":"Santorini"}'

# Events
curl -X POST http://localhost:3000/api/tavily/search \
  -H "Content-Type: application/json" \
  -d '{"type":"events","destination":"Monaco","month":"May"}'

# Weather
curl -X POST http://localhost:3000/api/tavily/search \
  -H "Content-Type: application/json" \
  -d '{"type":"weather","destination":"Bahamas","month":"December"}'
```

## Documentation

- [Tavily API Docs](https://docs.tavily.com/)
- [Tavily Pricing](https://tavily.com/pricing)
- [Tavily GitHub](https://github.com/tavily-ai)

