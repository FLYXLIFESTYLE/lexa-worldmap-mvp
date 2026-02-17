# Stage 3: Booking Assets (Operational Document)

## Purpose
Operational document for charter team, concierge, and booking agents. Contains all logistics needed to execute the experience — POIs, contacts, timing, requirements, alternatives.

---

## When Generated
- **Trigger:** Confirmed booking
- **Timing:** Generated immediately upon booking confirmation
- **Access:** Operations team, charter manager, concierge — NOT shared with guest

---

## Document Structure

### 3.1 Booking Summary Header

**Format:**
```
EXPERIENCE BOOKING ASSETS
{Experience Name}™

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Booking Reference:    {BOOKING_ID}
Guest(s):            {Guest names}
Journey Type:        {Individual / Couples / Family / Group}
Dates:               {Start Date} — {End Date}
Duration:            {X} Days / {X} Nights
Region:              {Region}
Vessel:              {Yacht name} (if assigned)
Generated:           {Date}
Version:             {X.X}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 3.2 Guest Profile Summary

**Purpose:** Key info about guests for service personalization.

**Format:**
```
GUEST PROFILE

Primary Guest:
  Name:              {Full name}
  Preferences:       {Key preferences from profiling}
  Dietary:           {Restrictions/preferences}
  Wellness Focus:    {What they want from treatments}
  Mobility:          {Any considerations}
  Communication:     {How they like to be approached}
  
[For Couples]
Partner:
  Name:              {Full name}
  Preferences:       {Key preferences}
  Dietary:           {Restrictions}
  Wellness Focus:    {Treatment preferences}
  
Special Notes:
  {Any specific requests, occasions, sensitivities}
```

**Data Source:** Pre-voyage profiling questionnaire

---

### 3.3 POI Database (Full Details)

**Purpose:** Complete information for every POI in the experience.

**Format per POI:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POI: {POI Name}                                                            │
│  Type: {spa / restaurant / activity / cultural / nature}                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LOCATION                                                                   │
│  Address:          {Full address}                                           │
│  GPS:              {Lat, Long}                                              │
│  Nearest Port:     {Marina/anchorage name}                                  │
│  Distance:         {X km / X min by tender/car}                             │
│  Transfer:         {Tender / Car / Walk / Helicopter}                       │
│                                                                             │
│  CONTACT                                                                    │
│  Main Contact:     {Name}                                                   │
│  Phone:            {Number}                                                 │
│  Email:            {Email}                                                  │
│  WhatsApp:         {If available}                                           │
│  VIP Contact:      {If different from main}                                 │
│                                                                             │
│  BOOKING DETAILS                                                            │
│  Lead Time:        {X days/weeks minimum}                                   │
│  Booking Method:   {Direct / Concierge service / App}                       │
│  Deposit:          {Required? Amount?}                                      │
│  Cancellation:     {Policy summary}                                         │
│  Confirmation:     {What to expect - email, call, etc.}                     │
│                                                                             │
│  PRICING                                                                    │
│  Price Range:      {€€€ / Approximate cost}                                 │
│  What's Included:  {Summary}                                                │
│  Extras:           {Common add-ons}                                         │
│  Payment:          {On-site / Pre-pay / Invoice}                            │
│                                                                             │
│  REQUIREMENTS                                                               │
│  Dress Code:       {Smart casual / Resort wear / None}                      │
│  What to Bring:    {Swimwear, walking shoes, etc.}                          │
│  Physical Level:   {Low / Moderate / High}                                  │
│  Duration:         {Typical time needed}                                    │
│  Best Time:        {Morning / Afternoon / Sunset}                           │
│                                                                             │
│  OPERATIONAL NOTES                                                          │
│  {Any specific notes for crew - access, parking, VIP treatment, etc.}       │
│                                                                             │
│  ALTERNATIVES (If Unavailable)                                              │
│  1. {Alternative POI 1}                                                     │
│  2. {Alternative POI 2}                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POI: Hotel du Cap-Eden-Roc Spa                                             │
│  Type: Spa                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LOCATION                                                                   │
│  Address:          Boulevard J.F. Kennedy, 06601 Antibes                    │
│  GPS:              43.5511, 7.1234                                          │
│  Nearest Port:     Port Gallice (Antibes)                                   │
│  Distance:         2.5 km / 8 min by car                                    │
│  Transfer:         Car (hotel can arrange)                                  │
│                                                                             │
│  CONTACT                                                                    │
│  Main Contact:     Spa Reception                                            │
│  Phone:            +33 4 93 61 39 01                                        │
│  Email:            spa@hotel-du-cap-eden-roc.com                            │
│  VIP Contact:      Marie Duval (Spa Director)                               │
│  VIP Phone:        +33 6 XX XX XX XX                                        │
│                                                                             │
│  BOOKING DETAILS                                                            │
│  Lead Time:        Minimum 2 weeks (high season: 4 weeks)                   │
│  Booking Method:   Direct call or email to VIP contact                      │
│  Deposit:          Credit card hold required                                │
│  Cancellation:     48 hours notice, full charge if less                     │
│  Confirmation:     Email confirmation within 24 hours                       │
│                                                                             │
│  PRICING                                                                    │
│  Price Range:      €€€€ (€300-800 per person)                               │
│  What's Included:  Treatment, robe, access to gardens                       │
│  Extras:           Lunch at Eden-Roc Restaurant (book separately)           │
│  Payment:          On-site or charge to room if staying                     │
│                                                                             │
│  REQUIREMENTS                                                               │
│  Dress Code:       Resort elegant                                           │
│  What to Bring:    Nothing (all provided)                                   │
│  Physical Level:   Low                                                      │
│  Duration:         3-4 hours recommended                                    │
│  Best Time:        Late morning (10:00-11:00 arrival)                       │
│                                                                             │
│  OPERATIONAL NOTES                                                          │
│  - Mention LEXA/SYCC for VIP treatment                                      │
│  - Request garden-view treatment room                                       │
│  - Can arrange private cabana post-treatment                                │
│  - Restaurant requires separate reservation                                 │
│                                                                             │
│  ALTERNATIVES (If Unavailable)                                              │
│  1. Cap Estel Spa (similar exclusivity, 20 min drive)                       │
│  2. Thermes Marins Monte-Carlo (already in itinerary)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Neo4j Query:**
```cypher
MATCH (exp:script_experience)-[:SCHEDULED_ON]->(day:script_day)
MATCH (day)-[:PART_OF]->(es:experience_script {lexa_uid: $script_id})
MATCH (exp)-[:USES_POI]->(poi:poi)
OPTIONAL MATCH (poi)-[:PROVIDED_BY]->(provider:provider)
OPTIONAL MATCH (poi)-[:LOCATED_IN]->(dest:destination)
OPTIONAL MATCH (poi)-[:ALTERNATIVE]->(alt:poi)
RETURN day.day_number AS day,
       poi.lexa_uid AS poi_id,
       poi.name AS name,
       poi.category AS type,
       poi.address AS address,
       poi.lat AS lat,
       poi.lon AS lon,
       poi.phone AS phone,
       poi.email AS email,
       poi.booking_lead_time AS lead_time,
       poi.price_range AS price_range,
       poi.dress_code AS dress_code,
       poi.duration_typical AS duration,
       poi.operational_notes AS notes,
       provider.name AS provider_name,
       provider.vip_contact AS vip_contact,
       collect(alt.name) AS alternatives
ORDER BY day, exp.sequence
```

---

### 3.4 Day-by-Day Logistics Matrix

**Purpose:** Operations overview — what needs to happen each day.

**Format:**
```
DAY-BY-DAY LOGISTICS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 1: ARRIVE
Date: {Actual date}
Phase: Welcome
Emotional Focus: Relief — First exhale

┌─────────┬────────────────────────────────┬─────────────┬────────────────┐
│  TIME   │  ACTIVITY                      │  LOCATION   │  BOOKING REQ   │
├─────────┼────────────────────────────────┼─────────────┼────────────────┤
│  14:00  │  Embarkation                   │  Port       │  —             │
│  15:00  │  Welcome ritual                │  Onboard    │  —             │
│  16:00  │  Cruise to Beaulieu-sur-Mer    │  At sea     │  —             │
│  17:30  │  Sea immersion therapy         │  Onboard    │  —             │
│  18:30  │  Fragonard Wellness Atelier    │  Èze        │  ✓ Confirmed   │
│  20:30  │  Dinner option: La Chèvre d'Or │  Èze        │  ✓ Confirmed   │
│  22:00  │  Sound healing                 │  Onboard    │  —             │
└─────────┴────────────────────────────────┴─────────────┴────────────────┘

Marina/Anchorage: Beaulieu-sur-Mer (overnight)
Weather Backup: Move dinner onboard if weather turns
Special Notes: Ensure welcome amenities in cabin before arrival

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 2: RELEASE
Date: {Actual date}
Phase: Descent
Emotional Focus: Surrender — The noise fades

┌─────────┬────────────────────────────────┬─────────────┬────────────────┐
│  TIME   │  ACTIVITY                      │  LOCATION   │  BOOKING REQ   │
├─────────┼────────────────────────────────┼─────────────┼────────────────┤
│  07:00  │  Sunrise yoga                  │  Onboard    │  —             │
│  08:00  │  Wellness breakfast            │  Onboard    │  —             │
│  09:30  │  Cruise to Monaco              │  At sea     │  —             │
│  11:00  │  Thermes Marins Monte-Carlo    │  Monaco     │  ✓ Confirmed   │
│  14:00  │  Light lunch                   │  Onboard    │  —             │
│  15:30  │  Nietzsche Path hike           │  Èze        │  —             │
│  18:00  │  IV therapy                    │  Onboard    │  —             │
│  20:00  │  Dinner                        │  Onboard    │  —             │
└─────────┴────────────────────────────────┴─────────────┴────────────────┘

Marina/Anchorage: Port Hercules, Monaco (overnight)
Weather Backup: Replace hike with extended spa time
Special Notes: Individual treatment protocols — see guest profiles

[... continues for all days ...]
```

---

### 3.5 Booking Status Tracker

**Purpose:** Track what's confirmed vs. pending.

**Format:**
```
BOOKING STATUS

┌─────────────────────────────────────┬──────────┬─────────────┬───────────┐
│  EXPERIENCE                         │  DAY     │  STATUS     │  NOTES    │
├─────────────────────────────────────┼──────────┼─────────────┼───────────┤
│  Fragonard Wellness Atelier         │  1       │  ✓ CONF     │  Ref #123 │
│  La Chèvre d'Or (dinner)            │  1       │  ✓ CONF     │  20:30    │
│  Thermes Marins Monte-Carlo         │  2       │  ✓ CONF     │  11:00    │
│  Hotel du Cap-Eden-Roc Spa          │  3       │  ⏳ PENDING │  Awaiting │
│  Lérins Monastery visit             │  4       │  ✓ CONF     │  No book  │
│  Cheval Blanc St-Tropez Spa         │  6       │  ✓ CONF     │  10:00    │
└─────────────────────────────────────┴──────────┴─────────────┴───────────┘

Legend: ✓ CONF = Confirmed | ⏳ PENDING = Awaiting confirmation | ✗ UNAVAIL = Need alternative
```

---

### 3.6 Transfer Requirements

**Purpose:** All transfers needed throughout the journey.

**Format:**
```
TRANSFER SCHEDULE

┌─────┬───────┬────────────────────┬────────────────────┬──────────┬──────────┐
│ DAY │ TIME  │ FROM               │ TO                 │ METHOD   │ DURATION │
├─────┼───────┼────────────────────┼────────────────────┼──────────┼──────────┤
│  1  │ 14:00 │ Nice Airport       │ Port St-Laurent    │ Car      │ 20 min   │
│  1  │ 18:00 │ Beaulieu Marina    │ Fragonard Èze      │ Car      │ 15 min   │
│  1  │ 20:00 │ Fragonard          │ La Chèvre d'Or     │ Walk     │ 5 min    │
│  1  │ 22:30 │ Èze                │ Marina             │ Car      │ 15 min   │
│  2  │ 10:30 │ Monaco Port        │ Thermes Marins     │ Walk     │ 10 min   │
│  2  │ 15:00 │ Monaco             │ Nietzsche Path     │ Car      │ 20 min   │
│  3  │ 10:00 │ Antibes Marina     │ Hotel du Cap       │ Car      │ 10 min   │
│  ...│       │                    │                    │          │          │
│  8  │ 10:00 │ Port St-Laurent    │ Nice Airport       │ Car      │ 20 min   │
└─────┴───────┴────────────────────┴────────────────────┴──────────┴──────────┘

Transfer Provider: {Company name}
Contact: {Phone}
Booking Reference: {If pre-booked}
```

---

### 3.7 Dietary & Wellness Requirements

**Purpose:** Consolidated dietary and wellness info for chef and crew.

**Format:**
```
DIETARY REQUIREMENTS

Guest 1: {Name}
  Allergies:        None
  Restrictions:     Pescatarian
  Preferences:      Light breakfasts, loves seafood
  Avoid:            Heavy cream sauces
  
Guest 2: {Name}
  Allergies:        Tree nuts (SEVERE)
  Restrictions:     None
  Preferences:      Mediterranean cuisine
  Avoid:            Overly spicy food

WELLNESS PROTOCOLS

Guest 1: {Name}
  IV Therapy:       NAD+ (Day 2, 5), Vitamin drip (Day 3, 7)
  Treatments:       Focus on deep tissue, avoid hot stones
  Sleep Support:    Magnesium protocol, blackout required
  
Guest 2: {Name}
  IV Therapy:       Hydration + B12 (Day 2, 4, 6)
  Treatments:       Prefers lighter pressure
  Sleep Support:    No supplements, white noise preferred
```

---

### 3.8 Emergency Contacts & Protocols

**Purpose:** Who to call if something goes wrong.

**Format:**
```
EMERGENCY CONTACTS

Vessel Emergency:       {Captain phone}
Medical Emergency:      {Local hospital / Air ambulance}
LEXA Operations:        {24/7 number}
Guest Emergency Contact: {Provided by guest}

WEATHER ALTERNATIVES

Day 2 (Nietzsche Path):
  If rain/wind: Extended spa time at Thermes Marins + onboard meditation
  
Day 4 (Lérins Island):
  If rough seas: Alternative coastal drive + wine tasting in Cannes

CANCELLATION PROTOCOLS

Less than 24 hours:
  - Spa bookings: Full charge likely — attempt to reschedule
  - Restaurants: Call personally to explain, offer future booking
  - Activities: Depends on provider — check individual policies
```

---

## Complete Stage 3 Output Structure

```typescript
interface Stage3Output {
  // Header
  booking_reference: string;
  guests: GuestProfile[];
  dates: {
    start: Date;
    end: Date;
  };
  duration_days: number;
  vessel?: string;
  generated_at: Date;
  version: number;
  
  // POI Database
  pois: {
    poi_id: string;
    day: number;
    name: string;
    type: string;
    location: {
      address: string;
      gps: { lat: number; lon: number };
      nearest_port: string;
      distance: string;
      transfer_method: string;
    };
    contact: {
      main: string;
      phone: string;
      email: string;
      vip_contact?: string;
    };
    booking: {
      lead_time: string;
      method: string;
      deposit: string;
      cancellation: string;
    };
    pricing: {
      range: string;
      includes: string;
      extras: string;
      payment: string;
    };
    requirements: {
      dress_code: string;
      bring: string;
      physical_level: string;
      duration: string;
      best_time: string;
    };
    operational_notes: string;
    alternatives: string[];
  }[];
  
  // Logistics Matrix
  daily_logistics: {
    day: number;
    date: Date;
    title: string;
    phase: string;
    emotional_focus: string;
    schedule: {
      time: string;
      activity: string;
      location: string;
      booking_status: 'confirmed' | 'pending' | 'unavailable' | 'none';
      reference?: string;
    }[];
    marina: string;
    weather_backup: string;
    special_notes: string;
  }[];
  
  // Booking Status
  booking_status: {
    experience: string;
    day: number;
    status: 'confirmed' | 'pending' | 'unavailable';
    reference?: string;
    notes?: string;
  }[];
  
  // Transfers
  transfers: {
    day: number;
    time: string;
    from: string;
    to: string;
    method: string;
    duration: string;
    provider?: string;
  }[];
  
  // Guest Requirements
  dietary: {
    guest_name: string;
    allergies: string[];
    restrictions: string[];
    preferences: string[];
    avoid: string[];
  }[];
  
  wellness: {
    guest_name: string;
    iv_protocol: { treatment: string; days: number[] }[];
    treatment_preferences: string;
    sleep_support: string;
  }[];
  
  // Emergency
  emergency_contacts: {
    type: string;
    name?: string;
    phone: string;
  }[];
  
  weather_alternatives: {
    day: number;
    activity: string;
    alternative: string;
  }[];
}
```

---

## Generation Notes

### Data Sources

| Section | Primary Source | Secondary Source |
|---------|----------------|------------------|
| Guest Profile | Booking system + Profiling questionnaire | Previous bookings |
| POI Database | Neo4j POI nodes | Manual provider database |
| Logistics Matrix | Script days + POIs | Booking confirmations |
| Transfers | Calculated from POI locations | Pre-set templates |
| Dietary/Wellness | Guest profiling | Booking notes |

### Automation Opportunities

1. **Auto-populate POI contacts** from provider database
2. **Calculate transfers** based on POI GPS + marina locations
3. **Weather backup suggestions** based on POI indoor/outdoor tags
4. **Booking status sync** with external booking systems

---

## Quality Checklist

- [ ] All POIs have complete contact information
- [ ] All bookings show current status
- [ ] Transfers cover all off-yacht activities
- [ ] Dietary requirements highlighted for chef
- [ ] Weather alternatives for all outdoor activities
- [ ] Emergency contacts are current
- [ ] Times are realistic (allow for delays)
- [ ] Distances/durations are verified
- [ ] No guest-facing language (this is operational)

---

## Files to Implement

```
/src/documents/stage3/
├── generator.ts        # Main document generation
├── sections/
│   ├── header.ts
│   ├── guest-profile.ts
│   ├── poi-database.ts
│   ├── logistics-matrix.ts
│   ├── booking-status.ts
│   ├── transfers.ts
│   ├── dietary.ts
│   └── emergency.ts
├── queries.ts          # Neo4j queries
├── calculators/
│   ├── transfers.ts    # Calculate transfer times
│   └── weather.ts      # Weather backup logic
└── types.ts
```

---

## API Endpoint

```typescript
POST /api/bookings/:booking_id/generate/stage3

Request:
{
  format: "docx" | "pdf" | "json",
  include_pending: boolean  // Include pending bookings or only confirmed
}

Response:
{
  success: boolean,
  document_url?: string,
  stage3?: Stage3Output,
  warnings?: string[]  // e.g., "3 bookings still pending"
}
```
