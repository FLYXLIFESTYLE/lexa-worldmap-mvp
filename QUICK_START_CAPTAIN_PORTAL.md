# Captain's Knowledge Portal - Quick Start

## What You've Built

A streamlined knowledge capture system with commission tracking for yacht captains and travel experts.

---

## Setup Steps

### 1. Database Setup (Supabase)

Run the migration to create tables:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/create_captain_profiles.sql
```

This creates:
- `captain_profiles` table
- `content_bookings` table  
- RLS policies
- Indexes

### 2. Environment Variables

Ensure these are set in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Neo4j
NEO4J_URI=your_neo4j_uri
NEO4J_USER=your_neo4j_user
NEO4J_PASSWORD=your_neo4j_password

# Anthropic (for AI extraction)
ANTHROPIC_API_KEY=your_anthropic_key

# Site URL (for password reset emails)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Supabase Storage Setup

Create a public bucket for photos:

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `public`
3. Make it public
4. No size limit needed (10MB enforced in code)

---

## Quick Access

### Main Routes

**Captain Portal:**
- `/admin/knowledge` - Main dashboard
- `/admin/knowledge/upload` - Upload files
- `/admin/knowledge/editor` - Write knowledge manually

**Admin:**
- `/admin/users` - User management
- `/admin/data-quality` - Data quality dashboard

**Auth:**
- `/auth/signin` - Sign in
- `/auth/signup` - Sign up (can be disabled for captain-only access)
- `/auth/set-password` - First-time password setup

### API Endpoints

**Captain:**
- `GET /api/captain/profile` - Get profile
- `PATCH /api/captain/profile` - Update profile

**Knowledge:**
- `POST /api/knowledge/upload` - Upload files
- `POST /api/knowledge/create` - Create manual entry
- `POST /api/knowledge/scrape-url` - Scrape URL content
- `POST /api/knowledge/upload-photo` - Upload photo

**Admin:**
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `DELETE /api/admin/users` - Deactivate user

---

## First Steps

### 1. Create Your First Captain User

```bash
# Start the dev server
npm run dev
```

Navigate to `/admin/users` and create a user:
- Email: test@example.com
- Display Name: Test Captain
- Role: Internal
- Commission Rate: 0

The user will receive a password setup email.

### 2. Test File Upload

1. Go to `/admin/knowledge/upload`
2. Upload a sample text file with travel content
3. Watch it process
4. Check Neo4j for new Knowledge nodes

### 3. Test Manual Entry

1. Go to `/admin/knowledge/editor`
2. Fill in the form with all new fields:
   - Title, content, topic
   - URL (try scraping)
   - Coordinates
   - Photos
   - Unique requests
   - Never thought possible
   - Best practices
3. Save and verify in Neo4j

---

## Testing Commission Tracking

### 1. Create External Captain

```bash
# Go to /admin/users
# Create user with:
# - Role: External Captain
# - Commission Rate: 5.00
```

### 2. Contribute Knowledge

Sign in as that captain and add knowledge via upload or manual entry.

### 3. Simulate Booking

```typescript
// In your booking system, call:
import { recordBooking } from '@/lib/booking/track-booking';

await recordBooking({
  userId: 'user-uuid',
  bookingId: 'booking-123',
  poiIds: ['poi-from-captain'],
  knowledgeIds: ['knowledge-from-captain'],
  totalValue: 10000, // $10,000 booking
});

// This will create commission records automatically
```

### 4. Check Commission Records

```sql
-- In Supabase SQL Editor:
SELECT * FROM content_bookings WHERE commission_paid = false;
```

---

## Key Features Implemented

### ✅ Phase 1: Commission Foundation
- Supabase tables for profiles and commissions
- Attribution tracking on all content
- API endpoints for profile management

### ✅ Phase 2: Upload Enhancement
- Files processed in memory (not stored)
- Multi-format support (transcripts, PDFs, etc.)
- AI extraction with Claude
- Attribution tracking on uploads

### ✅ Phase 3: Enhanced Write Form
- URL scraping with auto-extraction
- Location coordinates input
- Photo upload with camera capture
- Unique guest requests field
- Never thought possible field
- 4 best practices sections (toys, activities, concierge, agents)

### ✅ Phase 4: Info Tooltips
- Reusable InfoTooltip component
- Added to all fields
- Helpful examples and guidance

### ✅ Phase 5: Admin User Management
- User creation form
- User list with roles and commission rates
- Deactivate users
- Password setup flow

### ✅ Phase 6: Neo4j Schema
- Extended Knowledge nodes with new fields
- Attribution properties
- Coordinates as POINT type
- Photo URLs as array
- Best practices as separate properties

### ✅ Phase 7: Commission Tracking
- Track recommendations
- Calculate commissions on bookings
- Store commission records
- Query unpaid commissions

### ✅ Phase 8: Documentation
- Complete Captain's Portal Guide
- API documentation
- Troubleshooting guide
- This Quick Start

---

## Common Tasks

### Add New Captain User

```
1. Go to /admin/users
2. Click "Create New Captain"
3. Fill form and submit
4. User receives email with password setup link
```

### Upload Knowledge

```
1. Go to /admin/knowledge/upload
2. Drag & drop files
3. Click "Process Files"
4. View extracted data stats
```

### Manually Add Knowledge

```
1. Go to /admin/knowledge/editor
2. Fill in all fields (try scraping a URL first)
3. Add photos
4. Add best practices
5. Save
```

### View Commission Records

```sql
-- All commissions
SELECT * FROM content_bookings;

-- Unpaid commissions
SELECT * FROM content_bookings WHERE commission_paid = false;

-- By captain
SELECT cb.*, cp.display_name
FROM content_bookings cb
JOIN captain_profiles cp ON cp.user_id = (
  -- Need to join via Neo4j contributed_by field
  -- This query is simplified
);
```

---

## Development

### File Structure

```
lib/
  auth/
    get-captain-profile.ts       # Profile management
    create-captain-user.ts        # User creation
  knowledge/
    track-contribution.ts         # Attribution tracking
    track-recommendation.ts       # Recommendation tracking
    photo-uploader.ts             # Photo handling
    knowledge-ingestor.ts         # Neo4j ingestion (updated)
  booking/
    track-booking.ts              # Commission calculation

app/
  admin/
    knowledge/
      page.tsx                    # Dashboard
      upload/page.tsx             # Upload form (with tooltips)
      editor/page.tsx             # Manual entry (enhanced)
    users/page.tsx                # User management (NEW)
  auth/
    set-password/page.tsx         # Password setup (NEW)
  api/
    captain/profile/route.ts      # Profile API
    knowledge/
      upload/route.ts             # Upload API (updated)
      create/route.ts             # Create API (updated)
      scrape-url/route.ts         # URL scraping (NEW)
      upload-photo/route.ts       # Photo upload (NEW)
    admin/
      users/route.ts              # User management API (NEW)

components/
  knowledge/
    info-tooltip.tsx              # Tooltip component (NEW)

supabase/
  migrations/
    create_captain_profiles.sql   # Database schema (NEW)

docs/
  CAPTAIN_PORTAL_GUIDE.md         # Complete guide (NEW)
```

### Testing Checklist

- [ ] Create captain user
- [ ] Set password via email link
- [ ] Sign in as captain
- [ ] Upload transcript file
- [ ] Manual knowledge entry with all fields
- [ ] URL scraping
- [ ] Photo upload
- [ ] Verify attribution in Neo4j
- [ ] Simulate booking
- [ ] Check commission calculation
- [ ] View commission in Supabase
- [ ] Deactivate user

---

## Next Steps

### Immediate
1. Run Supabase migration
2. Test user creation
3. Test file upload
4. Test manual entry
5. Verify Neo4j attribution

### Phase 2 (Future)
1. Commission payout dashboard
2. Knowledge analytics
3. Mobile-optimized upload
4. Voice recording support
5. Collaborative editing
6. Advanced search

---

## Troubleshooting

**Service Role Key Issues:**
- User creation requires `SUPABASE_SERVICE_ROLE_KEY`
- Don't commit this to Git
- Use environment variables

**Photo Upload Fails:**
- Ensure Supabase Storage bucket exists
- Make bucket public
- Check file size (10MB limit)

**Neo4j Attribution Not Working:**
- Verify `contributed_by` field is set
- Check knowledge-ingestor.ts received metadata
- Query Neo4j: `MATCH (k:Knowledge) RETURN k.contributed_by LIMIT 10`

**Email Not Sending:**
- Check Supabase email configuration
- Verify `NEXT_PUBLIC_SITE_URL` is set
- Check spam folder

---

## Support

For issues or questions:
1. Check `docs/CAPTAIN_PORTAL_GUIDE.md`
2. Review this Quick Start
3. Check terminal logs
4. Verify environment variables
5. Test with simple data first

---

**Status:** ✅ All 8 todos completed  
**Ready for:** Testing and production deployment

