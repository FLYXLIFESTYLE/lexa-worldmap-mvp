# ☀️ Weather & Best Time to Travel - Implementation Guide

**Priority feature: Help users plan travel based on weather and seasonal factors**

---

## 🎯 **Part 1: Real-Time Weather (Using Tavily - Already Have!)**

### **Implementation (2 hours)** ⚡

Since you already have Tavily integrated, this is extremely quick!

#### **Step 1: Weather API Endpoint**

```typescript
// app/api/weather/destination/route.ts

import { TavilyClient } from '@/lib/integrations/tavily-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const date = searchParams.get('date'); // Optional: for forecast
  
  if (!destination) {
    return NextResponse.json({ error: 'Destination required' }, { status: 400 });
  }
  
  const tavily = new TavilyClient();
  
  // Current weather
  const currentWeatherQuery = date 
    ? `weather forecast in ${destination} on ${date}`
    : `current weather in ${destination} today`;
  
  const weatherResult = await tavily.answerQuery(currentWeatherQuery);
  
  // Parse the answer (Tavily returns natural language)
  const parsed = parseWeatherFromNaturalLanguage(weatherResult.answer);
  
  return NextResponse.json({
    destination,
    date: date || new Date().toISOString().split('T')[0],
    answer: weatherResult.answer,
    parsed: parsed,
    sources: weatherResult.results.slice(0, 3).map(r => r.url)
  });
}

function parseWeatherFromNaturalLanguage(answer: string) {
  // Extract temperature, conditions from natural language
  const tempMatch = answer.match(/(\d+)°[CF]/);
  const conditionMatch = answer.match(/(sunny|cloudy|rainy|stormy|clear|partly)/i);
  
  return {
    temperature: tempMatch ? tempMatch[1] : null,
    condition: conditionMatch ? conditionMatch[1] : null,
    raw: answer
  };
}
```

---

#### **Step 2: Weather Widget Component**

```tsx
// components/weather/weather-widget.tsx

'use client';

import { Cloud, Sun, CloudRain, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useSWR from 'swr';

interface WeatherWidgetProps {
  destination: string;
  date?: string;
}

export function WeatherWidget({ destination, date }: WeatherWidgetProps) {
  const { data, isLoading } = useSWR(
    `/api/weather/destination?destination=${destination}${date ? `&date=${date}` : ''}`,
    fetcher
  );
  
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    );
  }
  
  const getWeatherIcon = (condition: string | null) => {
    if (!condition) return <Cloud />;
    const lower = condition.toLowerCase();
    if (lower.includes('sunny') || lower.includes('clear')) return <Sun />;
    if (lower.includes('rain')) return <CloudRain />;
    return <Cloud />;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getWeatherIcon(data?.parsed?.condition)}
          Weather in {destination}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data?.parsed?.temperature && (
            <div className="text-3xl font-bold">
              {data.parsed.temperature}°C
            </div>
          )}
          
          <p className="text-gray-600">{data?.answer}</p>
          
          {data?.sources && (
            <div className="text-xs text-gray-400 mt-4">
              Sources: {data.sources.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" className="underline ml-2">
                  [{i + 1}]
                </a>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

#### **Step 3: Add to Destination Pages**

```tsx
// app/destinations/[slug]/page.tsx

import { WeatherWidget } from '@/components/weather/weather-widget';

export default function DestinationPage({ params }: { params: { slug: string } }) {
  const destination = decodeURIComponent(params.slug);
  
  return (
    <div className="space-y-6">
      <h1>{destination}</h1>
      
      {/* Add weather widget */}
      <WeatherWidget destination={destination} />
      
      {/* Rest of destination content */}
      <DestinationPOIs destination={destination} />
      <DestinationRecommendations destination={destination} />
    </div>
  );
}
```

---

## 📅 **Part 2: Best Time to Travel (Static Data in Neo4j)**

### **Implementation (1 day)**

This is mostly data entry + simple queries. No external APIs needed!

#### **Step 1: Define Seasonal Data Schema**

```cypher
// Add seasonal properties to destination nodes

MATCH (d:destination {name: 'St. Tropez'})
SET d.seasonal_data = {
  best_months: ['May', 'June', 'September', 'October'],
  peak_season: {
    months: ['July', 'August'],
    characteristics: 'Extremely busy, highest prices, all venues open, perfect weather',
    price_level: 'very_high',
    crowd_level: 'extreme',
    avg_temp_c: '28-32'
  },
  shoulder_season: {
    months: ['April', 'May', 'September', 'October'],
    characteristics: 'Pleasant weather, moderate crowds, good prices, most venues open',
    price_level: 'moderate',
    crowd_level: 'medium',
    avg_temp_c: '20-26'
  },
  low_season: {
    months: ['November', 'December', 'January', 'February', 'March'],
    characteristics: 'Cool weather, many venues closed, very quiet, lowest prices',
    price_level: 'low',
    crowd_level: 'minimal',
    avg_temp_c: '10-16'
  },
  major_events: [
    {
      name: 'Les Voiles de Saint-Tropez',
      months: ['September', 'October'],
      impact: 'high',
      description: 'Classic yacht racing regatta, very busy, expensive'
    },
    {
      name: 'Tropézienne Party',
      months: ['June'],
      impact: 'moderate',
      description: 'Summer party season kicks off'
    }
  ],
  weather_highlights: {
    summer: 'Hot and sunny, 28-32°C, perfect beach weather, no rain',
    winter: 'Mild but cool, 10-16°C, some rain, many venues closed',
    spring: 'Pleasant, 18-24°C, flowers blooming, increasing activity',
    fall: 'Warm, 20-26°C, still swimmable, fewer tourists'
  }
}
```

---

#### **Step 2: Bulk Import Seasonal Data**

```typescript
// scripts/import-seasonal-data.ts

import * as neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SEASONAL_DATA = {
  'St. Tropez': {
    best_months: ['May', 'June', 'September', 'October'],
    peak_season: {
      months: ['July', 'August'],
      characteristics: 'Extremely busy, highest prices, all venues open',
      price_multiplier: 2.5,
      crowd_level: 10,
      avg_temp_c: 30
    },
    shoulder_season: {
      months: ['April', 'May', 'September', 'October'],
      characteristics: 'Pleasant weather, moderate crowds',
      price_multiplier: 1.3,
      crowd_level: 6,
      avg_temp_c: 23
    },
    low_season: {
      months: ['November', 'December', 'January', 'February', 'March'],
      characteristics: 'Cool, many venues closed',
      price_multiplier: 0.7,
      crowd_level: 2,
      avg_temp_c: 13
    }
  },
  'Monaco': {
    best_months: ['May', 'June', 'September'],
    peak_season: {
      months: ['May', 'July', 'August'],
      characteristics: 'Grand Prix in May, summer festivals',
      price_multiplier: 3.0,
      crowd_level: 10,
      avg_temp_c: 28
    },
    // ... etc
  },
  // Add all your destinations
};

async function importSeasonalData() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
  );

  const session = driver.session();

  for (const [destName, data] of Object.entries(SEASONAL_DATA)) {
    await session.run(
      `
      MATCH (d:destination)
      WHERE toLower(d.name) CONTAINS toLower($name)
      SET d.seasonal_data = $data,
          d.seasonal_data_updated = datetime()
      RETURN d.name
      `,
      { name: destName, data: JSON.stringify(data) }
    );
    
    console.log(`✅ Updated seasonal data for ${destName}`);
  }

  await session.close();
  await driver.close();
}

importSeasonalData();
```

---

#### **Step 3: Best Time to Travel API**

```typescript
// app/api/destinations/best-time/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const month = searchParams.get('month'); // Optional: check specific month
  
  const session = neo4j.driver.session();
  
  const result = await session.run(
    `
    MATCH (d:destination)
    WHERE toLower(d.name) CONTAINS toLower($destination)
    RETURN d.name as name,
           d.seasonal_data as seasonal_data
    LIMIT 1
    `,
    { destination }
  );
  
  if (result.records.length === 0) {
    return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
  }
  
  const record = result.records[0];
  const seasonalData = JSON.parse(record.get('seasonal_data'));
  
  // If specific month requested, determine which season
  if (month) {
    const season = determineSeasonForMonth(seasonalData, month);
    return NextResponse.json({
      destination: record.get('name'),
      month,
      season,
      recommendation: generateRecommendation(season, month)
    });
  }
  
  return NextResponse.json({
    destination: record.get('name'),
    seasonal_data: seasonalData,
    best_months: seasonalData.best_months
  });
}

function determineSeasonForMonth(data: any, month: string) {
  if (data.peak_season.months.includes(month)) {
    return { type: 'peak', ...data.peak_season };
  } else if (data.shoulder_season.months.includes(month)) {
    return { type: 'shoulder', ...data.shoulder_season };
  } else {
    return { type: 'low', ...data.low_season };
  }
}

function generateRecommendation(season: any, month: string) {
  const recommendations = {
    peak: `${month} is peak season. Expect crowds and high prices, but perfect weather and all venues open. Book 3-6 months in advance.`,
    shoulder: `${month} is shoulder season. Great balance of good weather, moderate crowds, and reasonable prices. Book 1-3 months ahead.`,
    low: `${month} is low season. Quiet and affordable, but many luxury venues may be closed. Good for budget-conscious travelers.`
  };
  
  return recommendations[season.type as keyof typeof recommendations];
}
```

---

#### **Step 4: Best Time to Travel Component**

```tsx
// components/travel/best-time-calendar.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface BestTimeCalendarProps {
  destination: string;
}

export function BestTimeCalendar({ destination }: BestTimeCalendarProps) {
  const { data } = useSWR(`/api/destinations/best-time?destination=${destination}`);
  
  if (!data) return <Loading />;
  
  const monthColors = {
    peak: 'bg-red-100 text-red-800 border-red-300',
    shoulder: 'bg-green-100 text-green-800 border-green-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300'
  };
  
  const getMonthSeason = (month: string) => {
    const { peak_season, shoulder_season, low_season } = data.seasonal_data;
    if (peak_season.months.includes(month)) return 'peak';
    if (shoulder_season.months.includes(month)) return 'shoulder';
    return 'low';
  };
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar />
          Best Time to Visit {destination}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Quick Summary */}
        <div className="mb-6 p-4 bg-primary/10 rounded-lg">
          <h3 className="font-semibold mb-2">Recommended Months:</h3>
          <div className="flex flex-wrap gap-2">
            {data.seasonal_data.best_months.map((month: string) => (
              <Badge key={month} variant="default" className="px-3 py-1">
                {month}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Month Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {months.map(month => {
            const season = getMonthSeason(month);
            return (
              <div
                key={month}
                className={`p-3 rounded-lg border-2 ${monthColors[season]} cursor-pointer hover:shadow-md transition-shadow`}
              >
                <div className="font-semibold text-sm">{month.slice(0, 3)}</div>
                <div className="text-xs mt-1">
                  {season === 'peak' && '🔥 Peak'}
                  {season === 'shoulder' && '👍 Good'}
                  {season === 'low' && '❄️ Quiet'}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Season Breakdown */}
        <div className="mt-6 space-y-4">
          <SeasonCard
            title="Peak Season"
            months={data.seasonal_data.peak_season.months}
            data={data.seasonal_data.peak_season}
            icon={<TrendingUp className="text-red-600" />}
          />
          
          <SeasonCard
            title="Shoulder Season"
            months={data.seasonal_data.shoulder_season.months}
            data={data.seasonal_data.shoulder_season}
            icon={<TrendingUp className="text-green-600" />}
          />
          
          <SeasonCard
            title="Low Season"
            months={data.seasonal_data.low_season.months}
            data={data.seasonal_data.low_season}
            icon={<TrendingDown className="text-blue-600" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SeasonCard({ title, months, data, icon }: any) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-semibold">{title}</h4>
        <Badge variant="outline">{months.join(', ')}</Badge>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{data.characteristics}</p>
      
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <span>Price: {data.price_level}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>👥 Crowds: {data.crowd_level}/10</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🌡️ {data.avg_temp_c}°C</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 **Implementation Checklist**

### **Phase 1: Weather (2 hours)** ⚡ DO FIRST

- [ ] Create `/api/weather/destination/route.ts`
- [ ] Create `WeatherWidget` component
- [ ] Add to destination pages
- [ ] Test with St. Tropez, Monaco, Cannes

**Cost:** $0 (using Tavily)  
**Impact:** High (users expect this)

---

### **Phase 2: Best Time Data Entry (4 hours)**

- [ ] Create seasonal data template
- [ ] Research/compile data for 10 destinations
- [ ] Create `scripts/import-seasonal-data.ts`
- [ ] Run import script

**Cost:** $0  
**Impact:** Very high (strategic planning tool)

---

### **Phase 3: Best Time UI (4 hours)**

- [ ] Create `/api/destinations/best-time/route.ts`
- [ ] Create `BestTimeCalendar` component
- [ ] Add to destination pages
- [ ] Add to LEXA recommendations

**Cost:** $0  
**Impact:** Very high (helps users choose dates)

---

## 📊 **Total Time: 1 day (10 hours)**

**Breakdown:**
- Weather: 2 hours ⚡
- Data entry: 4 hours
- Best Time UI: 4 hours

**Total Cost:** $0 (all using existing tools!)

---

## 💡 **Quick Win: Start with Weather Only**

If you want immediate results:

1. **Today (2 hours):** Implement weather widget
2. **This weekend (4 hours):** Add seasonal data for top 10 destinations
3. **Next week (4 hours):** Build best time calendar

**Result:** Full weather + best time feature in 1 week!

---

**Last Updated:** December 17, 2025  
**Status:** Ready to implement  
**Priority:** HIGH (user-requested feature)  
**Complexity:** LOW (using existing Tavily integration)

