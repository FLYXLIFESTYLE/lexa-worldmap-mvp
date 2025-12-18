# 🎭 Real-Time Events & Travel Restrictions Integration

**How to integrate live events, visa requirements, and travel restrictions into LEXA**

---

## 🎪 **Part 1: Real-Time Events**

### **Data Sources**

#### **Option 1: Predicthq (Best for Events)** ⭐ RECOMMENDED

**What:** Real-time events API with 6M+ events worldwide  
**Coverage:** Concerts, festivals, sports, conferences, public holidays  
**Pricing:** 
- Free tier: 1,000 API calls/month
- Starter: $99/month (10K calls)
- Pro: $499/month (unlimited)

**Website:** https://www.predicthq.com/

**API Example:**
```typescript
// lib/integrations/predicthq-client.ts

interface Event {
  id: string;
  title: string;
  description: string;
  category: string; // concerts, festivals, sports, conferences
  start: string;
  end: string;
  location: {
    lat: number;
    lon: number;
    address: string;
  };
  impact: string; // minor, moderate, major, severe
  rank: number; // 0-100 (predicted attendance/impact)
}

export async function fetchEventsNearDestination(
  destination: string,
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<Event[]> {
  const response = await fetch(
    `https://api.predicthq.com/v1/events/?` +
    `location.origin=${lat},${lon}&` +
    `location.within=50km&` +
    `start.gte=${startDate}&` +
    `start.lte=${endDate}&` +
    `rank.gte=60&` + // Only significant events
    `category=concerts,festivals,sports,conferences`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.PREDICTHQ_API_KEY}`,
        'Accept': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

---

#### **Option 2: Tavily AI (Already Integrated!)** ⭐ FREE

**What:** You already have Tavily! Use it for event searches.  
**Coverage:** Real-time web search for events  
**Pricing:** Already paid for

**API Example:**
```typescript
// Use existing Tavily integration

export async function searchUpcomingEvents(destination: string, month: string) {
  const response = await fetch('/api/tavily/search', {
    method: 'POST',
    body: JSON.stringify({
      query: `upcoming events in ${destination} in ${month} 2025`,
      search_depth: 'advanced',
      max_results: 10
    })
  });
  
  return await response.json();
}
```

---

#### **Option 3: Ticketmaster API** (Free)

**What:** Concerts, sports, theater, festivals  
**Coverage:** Global (strong in US/Europe)  
**Pricing:** FREE up to 5,000 calls/day

**Website:** https://developer.ticketmaster.com/

---

### **Implementation: Event Storage in Neo4j**

#### **Schema Design:**

```cypher
// Create Event nodes
CREATE (e:Event {
  event_id: 'evt_123',
  title: 'Cannes Film Festival',
  description: 'World-famous film festival',
  category: 'festival',
  start_date: datetime('2025-05-14T00:00:00Z'),
  end_date: datetime('2025-05-25T23:59:59Z'),
  impact_level: 'severe',
  impact_score: 95,
  source: 'predicthq',
  created_at: datetime(),
  updated_at: datetime()
})

// Relationship: Event affects Destination
CREATE (e)-[:AFFECTS_DESTINATION {
  impact_type: 'pricing_surge',
  price_multiplier: 2.5,
  crowd_level: 'extreme',
  booking_difficulty: 'very_hard'
}]->(d:destination {name: 'Cannes'})

// Relationship: Event happens at POI
CREATE (e)-[:TAKES_PLACE_AT]->(p:poi {name: 'Palais des Festivals'})

// Relationship: Event evokes emotions
CREATE (e)-[:EVOKES]->(em:Emotion {name: 'excitement'})
```

---

### **API Endpoints to Create:**

#### **1. Fetch Events for Destination**

```typescript
// app/api/events/destination/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  
  const session = neo4j.driver.session();
  
  // Check Neo4j first (cached events)
  const cachedEvents = await session.run(`
    MATCH (e:Event)-[:AFFECTS_DESTINATION]->(d:destination)
    WHERE toLower(d.name) CONTAINS toLower($destination)
      AND e.start_date >= datetime($start)
      AND e.start_date <= datetime($end)
    RETURN e
    ORDER BY e.impact_score DESC
  `, { destination, start: startDate, end: endDate });
  
  if (cachedEvents.records.length > 0) {
    return NextResponse.json(cachedEvents.records);
  }
  
  // Fetch from PredictHQ or Tavily
  const events = await fetchEventsNearDestination(...);
  
  // Store in Neo4j for caching
  await storeEventsInNeo4j(events);
  
  return NextResponse.json(events);
}
```

---

#### **2. User Event Notifications**

```typescript
// app/api/user/event-notifications/route.ts

export async function GET(request: Request) {
  const user = await getCurrentUser();
  
  const session = neo4j.driver.session();
  
  // Find events at user's saved destinations
  const result = await session.run(`
    // User's saved destinations
    MATCH (u:User {id: $userId})-[:HAS_FAVORITE]->(d:destination)
    
    // Events affecting those destinations
    MATCH (e:Event)-[:AFFECTS_DESTINATION]->(d)
    WHERE e.start_date >= datetime() 
      AND e.start_date <= datetime() + duration({days: 90})
    
    RETURN e.title, e.start_date, d.name as destination, e.impact_level
    ORDER BY e.start_date ASC
    LIMIT 10
  `, { userId: user.id });
  
  return NextResponse.json(result.records);
}
```

---

### **UI Components:**

#### **1. Event Card in Destination View**

```tsx
// components/events/event-card.tsx

export function EventCard({ event }: { event: Event }) {
  return (
    <Card className="event-card">
      <div className="flex items-start gap-4">
        <Calendar className="text-primary" />
        <div>
          <h3 className="font-semibold">{event.title}</h3>
          <p className="text-sm text-gray-600">
            {format(event.start_date, 'MMM dd, yyyy')}
          </p>
          <Badge variant={getImpactVariant(event.impact_level)}>
            {event.impact_level} impact
          </Badge>
          <p className="mt-2 text-sm">{event.description}</p>
          
          {event.impact_level === 'severe' && (
            <Alert className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                High demand expected. Prices may be 2-3x higher. Book early!
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </Card>
  );
}
```

---

#### **2. User Dashboard - "Events at Your Destinations"**

```tsx
// app/dashboard/events/page.tsx

export default function UserEventsPage() {
  const { data: events } = useSWR('/api/user/event-notifications');
  
  return (
    <div className="space-y-6">
      <h1>Upcoming Events at Your Destinations</h1>
      
      {events?.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
      
      {events?.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="No upcoming events"
          description="Add destinations to your favorites to see relevant events"
        />
      )}
    </div>
  );
}
```

---

## 🛂 **Part 2: Visa Requirements & Travel Restrictions**

### **Data Sources**

#### **Option 1: Sherpa° API** ⭐ RECOMMENDED

**What:** Real-time travel requirements (visas, COVID, vaccines, documents)  
**Coverage:** 200+ countries  
**Pricing:** 
- Free tier: 100 requests/month
- Starter: $99/month (2,500 requests)
- Pro: Custom pricing

**Website:** https://www.joinsherpa.com/sherpa-api

**API Example:**
```typescript
// lib/integrations/sherpa-client.ts

interface VisaRequirement {
  required: boolean;
  type: 'visa_free' | 'visa_on_arrival' | 'evisa' | 'embassy_visa';
  max_stay_days: number;
  processing_time_days: number;
  cost_usd: number;
  requirements: string[];
  restrictions: string[];
}

export async function getVisaRequirements(
  fromCountry: string,
  toCountry: string,
  passportCountry: string
): Promise<VisaRequirement> {
  const response = await fetch(
    `https://requirements-api.joinsherpa.com/v2/trips?` +
    `origin=${fromCountry}&` +
    `destination=${toCountry}&` +
    `citizenship=${passportCountry}`,
    {
      headers: {
        'Authorization': `ApiKey ${process.env.SHERPA_API_KEY}`
      }
    }
  );
  
  return await response.json();
}
```

---

#### **Option 2: IATA Travel Centre (Free)**

**What:** IATA's official travel requirements database  
**Coverage:** All countries  
**Pricing:** FREE

**Website:** https://www.iatatravelcentre.com/

*Note: No official API, but can scrape or use their widget*

---

#### **Option 3: Travel State Gov (US State Department)**

**What:** Travel advisories, safety warnings  
**Coverage:** All countries (from US perspective)  
**Pricing:** FREE

**API:** https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/

---

### **Implementation: Visa Data in Neo4j**

#### **Schema Design:**

```cypher
// Create Country nodes (if not exist)
MERGE (c:country {name: 'France', code: 'FR'})

// Create VisaPolicy relationships
MATCH (from:country {code: 'US'})
MATCH (to:country {code: 'FR'})
CREATE (from)-[:VISA_POLICY {
  policy_type: 'visa_free',
  max_stay_days: 90,
  passport_validity_months: 6,
  requirements: ['Valid passport', 'Return ticket', 'Proof of funds'],
  updated_at: datetime(),
  source: 'sherpa'
}]->(to)

// Create TravelAdvisory nodes
CREATE (ta:TravelAdvisory {
  country: 'France',
  level: 2,
  level_description: 'Exercise Increased Caution',
  reasons: ['Terrorism risk', 'Civil unrest'],
  last_updated: datetime('2025-12-01'),
  source: 'US State Department'
})
```

---

### **API Endpoints:**

#### **1. Check Visa Requirements**

```typescript
// app/api/travel/visa-check/route.ts

export async function POST(request: Request) {
  const { fromCountry, toCountry, citizenship } = await request.json();
  
  const session = neo4j.driver.session();
  
  // Check Neo4j cache first
  const cached = await session.run(`
    MATCH (from:country {code: $from})-[vp:VISA_POLICY]->(to:country {code: $to})
    WHERE duration.between(vp.updated_at, datetime()).days < 30
    RETURN vp
  `, { from: citizenship, to: toCountry });
  
  if (cached.records.length > 0) {
    return NextResponse.json(cached.records[0]);
  }
  
  // Fetch from Sherpa API
  const visaInfo = await getVisaRequirements(fromCountry, toCountry, citizenship);
  
  // Store in Neo4j
  await storeVisaPolicy(visaInfo);
  
  return NextResponse.json(visaInfo);
}
```

---

#### **2. Travel Advisories**

```typescript
// app/api/travel/advisories/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  
  const session = neo4j.driver.session();
  
  const result = await session.run(`
    MATCH (ta:TravelAdvisory {country: $country})
    WHERE duration.between(ta.last_updated, datetime()).days < 7
    RETURN ta
    ORDER BY ta.last_updated DESC
    LIMIT 1
  `, { country });
  
  if (result.records.length > 0) {
    return NextResponse.json(result.records[0]);
  }
  
  // Fetch latest from State Department
  const advisory = await fetchTravelAdvisory(country);
  
  // Store in Neo4j
  await storeTravelAdvisory(advisory);
  
  return NextResponse.json(advisory);
}
```

---

### **UI Components:**

#### **1. Visa Requirements Widget**

```tsx
// components/travel/visa-requirements.tsx

export function VisaRequirements({ destination }: { destination: string }) {
  const { data: visa } = useSWR(`/api/travel/visa-check?to=${destination}`);
  
  if (!visa) return <Loading />;
  
  return (
    <Card>
      <CardHeader>
        <Shield className="h-5 w-5" />
        <CardTitle>Visa Requirements for {destination}</CardTitle>
      </CardHeader>
      <CardContent>
        {visa.policy_type === 'visa_free' ? (
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>No visa required!</AlertTitle>
            <AlertDescription>
              You can stay up to {visa.max_stay_days} days visa-free.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Visa required</AlertTitle>
            <AlertDescription>
              Type: {visa.policy_type}<br />
              Processing time: {visa.processing_time_days} days<br />
              Cost: ${visa.cost_usd}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4">
          <h4 className="font-semibold">Requirements:</h4>
          <ul className="list-disc list-inside">
            {visa.requirements.map(req => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 📊 **Part 3: Data Update Strategy**

### **Refresh Frequencies:**

| Data Type | Refresh Frequency | Source | Cost/Month |
|-----------|------------------|---------|------------|
| **Events** | Weekly | PredictHQ or Tavily | $0-99 |
| **Visa Policies** | Monthly | Sherpa° | $0-99 |
| **Travel Advisories** | Weekly | State Dept | FREE |
| **Weather** | Real-time | Tavily | Included |

### **Cron Jobs:**

```typescript
// lib/cron/update-events.ts

import * as cron from 'node-cron';

// Update events every Sunday at 2 AM
cron.schedule('0 2 * * 0', async () => {
  console.log('Updating events for all destinations...');
  await updateEventsForAllDestinations();
});

// Update visa policies every 1st of month
cron.schedule('0 3 1 * *', async () => {
  console.log('Updating visa policies...');
  await updateVisaPolicies();
});

// Update travel advisories every Monday
cron.schedule('0 4 * * 1', async () => {
  console.log('Updating travel advisories...');
  await updateTravelAdvisories();
});
```

---

## 🎯 **Priority Implementation Order:**

### **Week 1: Events via Tavily** (Already Have!)
1. ✅ Use existing Tavily integration
2. ✅ Create event search endpoint
3. ✅ Build event card component
4. ✅ Add to destination pages

**Time:** 1 day  
**Cost:** $0 (already have Tavily)

### **Week 2: Visa Requirements**
1. ✅ Sign up for Sherpa° free tier
2. ✅ Create visa check endpoint
3. ✅ Build visa widget component
4. ✅ Add to trip planning

**Time:** 2 days  
**Cost:** $0 (free tier)

### **Week 3: User Event Notifications**
1. ✅ Create user favorites schema
2. ✅ Build notification system
3. ✅ Add events dashboard to user account

**Time:** 2 days  
**Cost:** $0

---

## 💰 **Total Cost: $0-198/month**

- Free tier: Tavily (included) + Sherpa° free + State Dept = **$0/month**
- Paid tier: Tavily ($50) + Sherpa° ($99) + PredictHQ ($99) = **$248/month**

**Recommendation:** Start with free tier, upgrade when you have 1,000+ users

---

**Last Updated:** December 17, 2025  
**Status:** Design complete, ready for implementation  
**Priority:** High (valuable user feature)

