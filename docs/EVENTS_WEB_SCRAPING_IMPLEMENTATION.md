# 🎭 Events Web Scraping - Implementation Guide

**Priority: NEXT (After fixing enrichment issues)**

---

## 🎯 **Goal**

Scrape events from the web, create `Event` nodes in Neo4j, and link them to destinations with proper relationships.

---

## 🌐 **Event Sources**

### **Option 1: Tavily AI (Easiest - Already Have!)** ⭐ **RECOMMENDED**

Use existing Tavily integration to search for events.

**Advantages:**
- ✅ Already integrated
- ✅ No additional cost
- ✅ Real-time web scraping
- ✅ Returns structured data

**Example:**
```typescript
const events = await tavily.search({
  query: "upcoming luxury events in St. Tropez June 2025",
  search_depth: "advanced"
});
```

---

### **Option 2: Event-Specific Websites**

Scrape directly from event websites:
- **Time Out:** `https://www.timeout.com/monaco/things-to-do`
- **Eventbrite:** `https://www.eventbrite.com/d/france--cannes/events/`
- **TripAdvisor Events:** Destination event calendars
- **Local tourism boards:** Official event calendars

**Challenge:** Each site has different HTML structure

---

## 🗄️ **Neo4j Schema for Events**

### **Event Node Structure:**

```cypher
CREATE (e:Event {
  event_id: 'evt_123abc',                    // Unique ID
  title: 'Cannes Film Festival',
  description: 'Annual film festival...',
  category: 'festival',                       // festival, concert, sports, conference, holiday
  subcategory: 'film',                        // more specific
  start_date: datetime('2025-05-14'),
  end_date: datetime('2025-05-25'),
  is_recurring: true,
  recurrence_pattern: 'annual_may',
  
  // Impact
  impact_level: 'severe',                     // minor, moderate, major, severe
  impact_score: 95,                          // 0-100
  expected_attendance: 100000,
  price_impact_multiplier: 2.5,              // How much prices increase
  crowd_level: 10,                           // 1-10
  
  // Practical info
  ticket_required: true,
  avg_ticket_price_eur: 50,
  booking_url: 'https://...',
  official_website: 'https://...',
  
  // Metadata
  source: 'web_scraping',
  source_url: 'https://...',
  scraped_at: datetime(),
  verified_by_captain: false,
  
  // Tags for search
  tags: ['luxury', 'cinema', 'red_carpet', 'celebrity']
})
```

---

### **Relationships:**

```cypher
// Event affects Destination
CREATE (e:Event)-[:AFFECTS_DESTINATION {
  impact_type: 'pricing_surge',
  price_multiplier: 2.5,
  crowd_level: 'extreme',
  booking_difficulty: 'very_hard',
  best_book_before_days: 180
}]->(d:destination {name: 'Cannes'})

// Event takes place at POI
CREATE (e:Event)-[:TAKES_PLACE_AT]->(p:poi {name: 'Palais des Festivals'})

// Event evokes emotions
CREATE (e:Event)-[:EVOKES {
  confidence: 0.9
}]->(em:Emotion {name: 'excitement'})

// Event amplifies desires
CREATE (e:Event)-[:AMPLIFIES_DESIRE]->(des:Desire {name: 'social_status'})
```

---

## 🛠️ **Implementation**

### **Step 1: Event Scraper Script**

```typescript
// scripts/scrape-events.ts

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface ScrapedEvent {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  start_date: string;
  end_date?: string;
  location: string;
  impact_level: 'minor' | 'moderate' | 'major' | 'severe';
  impact_score: number;
  source_url: string;
  tags: string[];
}

// Target destinations
const DESTINATIONS = [
  'St. Tropez',
  'Monaco',
  'Cannes',
  'Nice',
  'Antibes'
];

// Time range: next 12 months
const MONTHS = [
  'May 2025', 'June 2025', 'July 2025', 'August 2025',
  'September 2025', 'October 2025', 'November 2025', 'December 2025',
  'January 2026', 'February 2026', 'March 2026', 'April 2026'
];

async function searchEventsWithTavily(destination: string, month: string): Promise<ScrapedEvent[]> {
  console.log(`  🔎 Searching events for ${destination} in ${month}...`);
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `major events ${destination} ${month} festivals concerts`,
        search_depth: 'advanced',
        max_results: 10,
        include_answer: true
      })
    });

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log(`    ℹ️  No events found`);
      return [];
    }

    // Use AI to extract structured event data from search results
    const events = await extractEventsFromSearchResults(data.results, destination, month);
    console.log(`    ✅ Found ${events.length} events`);
    
    return events;
    
  } catch (error) {
    console.error(`    ❌ Error searching events:`, error);
    return [];
  }
}

async function extractEventsFromSearchResults(
  results: any[],
  destination: string,
  month: string
): Promise<ScrapedEvent[]> {
  try {
    // Combine search results
    const content = results.map(r => `${r.title}\n${r.content}\nURL: ${r.url}`).join('\n\n---\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Extract major events from these search results for ${destination} in ${month}.

Return ONLY a JSON array of events:
[{
  "title": "Event name",
  "description": "Brief description (1-2 sentences)",
  "category": "festival" | "concert" | "sports" | "conference" | "holiday",
  "subcategory": "film|music|yacht|art|...",
  "start_date": "2025-05-14",
  "end_date": "2025-05-25",
  "location": "${destination}",
  "impact_level": "minor" | "moderate" | "major" | "severe",
  "impact_score": 0-100,
  "source_url": "URL from search results",
  "tags": ["luxury", "cinema", "etc"]
}]

Only include SIGNIFICANT events (not daily activities). Return ONLY valid JSON array.

Search results:
${content.substring(0, 8000)}
`
      }]
    });

    const textContent = response.content[0];
    if (textContent.type === 'text') {
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return [];
  } catch (error) {
    console.error(`    ⚠️  Failed to extract events:`, error);
    return [];
  }
}

async function storeEventInNeo4j(
  driver: any,
  event: ScrapedEvent
): Promise<void> {
  const session = driver.session();
  
  try {
    const eventId = `evt_${Buffer.from(event.title + event.start_date).toString('base64').substring(0, 16)}`;
    
    // Create Event node
    await session.run(`
      MERGE (e:Event {event_id: $event_id})
      SET e.title = $title,
          e.description = $description,
          e.category = $category,
          e.subcategory = $subcategory,
          e.start_date = datetime($start_date),
          e.end_date = CASE WHEN $end_date IS NOT NULL THEN datetime($end_date) ELSE null END,
          e.impact_level = $impact_level,
          e.impact_score = $impact_score,
          e.source = 'web_scraping',
          e.source_url = $source_url,
          e.scraped_at = datetime(),
          e.verified_by_captain = false,
          e.tags = $tags
    `, {
      event_id: eventId,
      title: event.title,
      description: event.description,
      category: event.category,
      subcategory: event.subcategory || null,
      start_date: event.start_date,
      end_date: event.end_date || null,
      impact_level: event.impact_level,
      impact_score: event.impact_score,
      source_url: event.source_url,
      tags: event.tags
    });

    // Link to Destination
    await session.run(`
      MATCH (e:Event {event_id: $event_id})
      MATCH (d:destination)
      WHERE toLower(d.name) CONTAINS toLower($destination)
      MERGE (e)-[:AFFECTS_DESTINATION {
        impact_type: 'pricing_surge',
        price_multiplier: CASE 
          WHEN $impact_level = 'severe' THEN 2.5
          WHEN $impact_level = 'major' THEN 1.8
          WHEN $impact_level = 'moderate' THEN 1.3
          ELSE 1.0
        END,
        crowd_level: $impact_score / 10.0,
        booking_difficulty: CASE
          WHEN $impact_score >= 80 THEN 'very_hard'
          WHEN $impact_score >= 60 THEN 'hard'
          WHEN $impact_score >= 40 THEN 'moderate'
          ELSE 'easy'
        END
      }]->(d)
    `, {
      event_id: eventId,
      destination: event.location,
      impact_level: event.impact_level,
      impact_score: event.impact_score
    });

    // Infer and create emotional relationships
    await session.run(`
      MATCH (e:Event {event_id: $event_id})
      MERGE (em:Emotion {name: 'excitement'})
      MERGE (e)-[:EVOKES {confidence: 0.8, source: 'event_inference'}]->(em)
    `, { event_id: eventId });

  } finally {
    await session.close();
  }
}

async function scrapeEvents() {
  console.log('🎭 Scraping Events from Web\n');

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    let totalScraped = 0;
    let totalStored = 0;

    for (const destination of DESTINATIONS) {
      console.log(`\n📍 ${destination}`);

      for (const month of MONTHS.slice(0, 6)) { // Next 6 months
        const events = await searchEventsWithTavily(destination, month);

        for (const event of events) {
          await storeEventInNeo4j(driver, event);
          console.log(`      ✅ Stored: ${event.title} (${event.start_date})`);
          totalStored++;
        }

        totalScraped += events.length;

        // Delay between searches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n🎉 Event Scraping Complete!');
    console.log(`🔍 Total events scraped: ${totalScraped}`);
    console.log(`💾 Total events stored: ${totalStored}`);
    console.log(`\n💡 Query: MATCH (e:Event) RETURN e ORDER BY e.start_date`);

  } finally {
    await driver.close();
  }
}

scrapeEvents().catch(console.error);
```

---

### **Step 2: API Endpoints**

```typescript
// app/api/events/destination/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const startDate = searchParams.get('start_date') || new Date().toISOString();
  const endDate = searchParams.get('end_date');
  
  const session = neo4j.driver.session();
  
  const result = await session.run(`
    MATCH (e:Event)-[:AFFECTS_DESTINATION]->(d:destination)
    WHERE toLower(d.name) CONTAINS toLower($destination)
      AND e.start_date >= datetime($start)
      ${endDate ? 'AND e.start_date <= datetime($end)' : ''}
    RETURN e
    ORDER BY e.start_date ASC
    LIMIT 50
  `, { destination, start: startDate, end: endDate });
  
  return NextResponse.json(result.records.map(r => r.get('e').properties));
}
```

---

### **Step 3: UI Component**

```tsx
// components/events/event-calendar.tsx

export function EventCalendar({ destination }: { destination: string }) {
  const { data: events } = useSWR(`/api/events/destination?destination=${destination}`);
  
  if (!events || events.length === 0) {
    return (
      <EmptyState 
        icon={Calendar}
        title="No upcoming events"
        description="Check back later for event updates"
      />
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events in {destination}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event: any) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 📊 **Cost & Timeline**

### **Development Time:**
- Script creation: 3 hours
- API endpoints: 2 hours
- UI components: 2 hours
- Testing: 1 hour
- **Total: 8 hours (1 day)**

### **Running Cost:**
- Tavily API: $0.005 per search
- 5 destinations × 6 months = 30 searches
- **Cost per run: ~$0.15**

### **Frequency:**
- Run monthly to update events
- **Annual cost: ~$1.80**

---

## 🎯 **Implementation Checklist**

### **Phase 1: Core Scraping** (3 hours)
- [ ] Create `scripts/scrape-events.ts`
- [ ] Test with one destination
- [ ] Verify Event nodes created in Neo4j
- [ ] Check relationships (AFFECTS_DESTINATION)

### **Phase 2: API & UI** (4 hours)
- [ ] Create `/api/events/destination/route.ts`
- [ ] Create `EventCalendar` component
- [ ] Create `EventCard` component
- [ ] Add to destination pages

### **Phase 3: Enhancement** (1 hour)
- [ ] Add event filtering by category
- [ ] Add "Save to favorites" button
- [ ] Add price impact warnings
- [ ] Add calendar export

---

## 📝 **Example Queries**

```cypher
// Find all severe impact events
MATCH (e:Event)
WHERE e.impact_level = 'severe'
RETURN e.title, e.start_date, e.impact_score
ORDER BY e.start_date

// Events affecting French Riviera
MATCH (e:Event)-[:AFFECTS_DESTINATION]->(d:destination)
WHERE d.name IN ['St. Tropez', 'Monaco', 'Cannes']
RETURN e.title, d.name, e.start_date
ORDER BY e.start_date

// Events with high price impact
MATCH (e:Event)-[r:AFFECTS_DESTINATION]->()
WHERE r.price_multiplier >= 2.0
RETURN e.title, r.price_multiplier, e.start_date
```

---

## 🚀 **Next Steps**

1. **Create script** → Test with St. Tropez only
2. **Verify Neo4j** → Check Event nodes created
3. **Build API** → Test endpoint
4. **Create UI** → Add to destination page
5. **Run for all destinations** → Populate database

---

**Status:** Ready to implement  
**Priority:** HIGH (after fixing highlights/experience nodes)  
**Timeline:** 1 day  
**Cost:** ~$0.15 per run, ~$1.80/year

