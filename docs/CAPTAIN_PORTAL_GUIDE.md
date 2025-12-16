# Captain's Knowledge Portal Guide

## Overview

The Captain's Knowledge Portal is a streamlined system for capturing, processing, and utilizing travel expertise from yacht captains, crew members, and travel experts. Knowledge contributions are tracked for commission attribution when content leads to bookings.

---

## For Captains

### Getting Started

1. **Account Setup**
   - Admins will create your account manually
   - You'll receive an email with a "Set Password" link
   - Click the link and create your secure password
   - You'll be redirected to the Knowledge Portal

2. **Your Profile**
   - View your profile at `/api/captain/profile`
   - Your contribution history is automatically tracked
   - Commission calculations are handled automatically

### Uploading Knowledge

**Supported Formats:**
- Zoom transcripts (.vtt, .srt)
- PDF documents (.pdf)
- Word documents (.docx)
- Text files (.txt, .md)
- ChatGPT JSON exports (.json)

**Process:**
1. Go to **Upload Knowledge** section
2. Drag & drop files or click to browse
3. Files are processed immediately with AI
4. Structured knowledge is extracted and added to LEXA
5. **Files are NOT stored** - only the extracted data is saved

**What Happens:**
- AI analyzes your content
- Extracts POIs, relationships, and insights
- Adds luxury scoring automatically
- Links knowledge to destinations
- Attributes all content to you for commission tracking

### Writing Knowledge Manually

Use the **Write Knowledge** editor for direct input:

#### Basic Fields

**Title**
- Clear, descriptive title
- Example: "Ultimate Guide to Yacht Provisioning in Montenegro"

**Content**
- Detailed insights and recommendations
- Be specific with examples
- Include practical details

**Topic**
- Select the category that fits best
- Helps LEXA find information at the right time

#### New Enhanced Fields

**Source URL** (Optional)
- Paste URLs from articles, blogs, or guides
- Click "Extract Content" to auto-populate fields
- We'll scrape and process the content for you

**Location Coordinates** (Optional)
- Enter exact latitude and longitude
- Example: 43.7384, 7.4246 (Monaco)
- Helps LEXA recommend precise locations

**Photos** (Optional)
- Upload multiple photos
- Take photos directly with camera (mobile)
- Visual context improves recommendations
- Photos are stored and linked to knowledge

**Unique Guest Requests**
- Share extraordinary requests you've fulfilled
- Include how you made it happen
- Example: "Private dinner in underwater cave (organized through local dive operator)"

**Things Never Thought Possible**
- Experiences that exceeded expectations
- Stories of impossible-made-possible
- These become LEXA's 'wow factor' recommendations
- Example: "Swimming with bioluminescent plankton at midnight in hidden bay near Hvar"

**Best Practices**

Four specialized sections:

1. **Water Toys & Equipment**
   - Operational tips for SeaBobs, e-foils, jet skis
   - Timing and conditions
   - Example: "Always inflate SeaBobs 30min before guests wake"

2. **Onboard Activities**
   - Timing recommendations
   - Setup requirements
   - Example: "Sunset yoga on foredeck works best before dinner (7pm)"

3. **Concierge Services & Reservations**
   - Booking lead times
   - Trusted contacts
   - Example: "Book Nobu Ibiza 2 weeks ahead minimum"

4. **Trusted Local Agents & Contacts**
   - Key contacts with specialties
   - Phone numbers and notes
   - Example: "Maria at Porto Montenegro marina (fastest berth allocation, +382 xxx)"

**Tags**
- Add keywords for categorization
- Press Enter after each tag
- Helps search and filtering

**Applies To**
- Link to specific destinations or POIs
- Helps LEXA recommend at right locations
- Example: "Dubrovnik", "French Riviera"

**Confidence Level**
- 80-100%: Firsthand experience
- 60-79%: Reliable secondhand info
- Below 60%: Needs verification

### Commission System

**How It Works:**
1. You contribute knowledge (upload or manual)
2. LEXA recommends your content to travelers
3. When your content is used in a booking, you earn commission
4. Commission rate is set by admins (typically 3-10% for external contributors)
5. Internal team members have 0% commission rate

**Tracking:**
- Every contribution is automatically attributed to you
- When LEXA uses your POI or knowledge in a recommendation, it's tracked
- If that recommendation leads to a booking, commission is calculated
- View your commission earnings in your profile

**Payment:**
- Commissions are recorded automatically
- Admins handle payment processing
- You can update bank info in your profile

---

## For Admins

### Creating Users

1. Navigate to `/admin/users`
2. Click **"Create New Captain"**
3. Fill in the form:
   - **Email Address** (required)
   - **Display Name** (required)
   - **Role**: Internal Team, External Captain, Yacht Crew, or Travel Expert
   - **Commission Rate**: Percentage (0-100)
     - Set to 0 for internal team
     - Typical rates for external: 3-10%

4. Click **"Create User"**
5. User receives automated "Set Password" email
6. User completes setup and accesses portal

### Managing Users

**View All Users**
- See all captain profiles
- View role and commission rate
- Sort by creation date

**Deactivate Users**
- Click "Deactivate" next to any user
- Removes access immediately
- Profile is deleted (cascades properly)

### Commission Management

**Current System:**
- All contributions automatically tracked
- Commissions calculated on booking completion
- Stored in `content_bookings` table

**Future Enhancements:**
- Commission payout dashboard
- Export commission reports
- Manual commission adjustments
- Payment batch processing

### Data Quality

**Automatic Features:**
- Luxury scoring applied to all POIs
- Confidence scoring on relationships
- Attribution tracking on all content
- Duplicate detection and merging

**Manual Review:**
- Browse knowledge at `/admin/knowledge`
- View contribution stats
- Monitor data quality agent results

### Security Considerations

**Authentication:**
- Uses Supabase Auth
- Row Level Security (RLS) enabled
- Captains can only see their own data
- Admins need service role for user creation

**Admin Functions:**
- User creation requires service role key
- Password resets send secure tokens
- RLS policies protect sensitive data

---

## Technical Details

### Database Schema

**Supabase Tables:**

```sql
captain_profiles (
  id UUID,
  user_id UUID -> auth.users,
  display_name TEXT,
  role TEXT,
  commission_rate DECIMAL(5,2),
  bank_info JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

content_bookings (
  id UUID,
  knowledge_id TEXT,  -- Neo4j knowledge node id
  poi_id TEXT,        -- Neo4j POI node id
  booking_id TEXT,
  booking_value DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  commission_paid BOOLEAN,
  created_at TIMESTAMP,
  paid_at TIMESTAMP
)
```

**Neo4j Schema:**

```cypher
(:Knowledge {
  knowledge_id: UUID,
  title: STRING,
  content: STRING,
  topic: STRING,
  confidence: FLOAT,
  tags: [STRING],
  
  // Attribution
  contributed_by: UUID,
  contributor_name: STRING,
  contribution_type: STRING,
  contributed_at: DATETIME,
  
  // New fields
  source_url: STRING,
  coordinates: POINT,
  photo_urls: [STRING],
  unique_requests: STRING,
  never_thought_possible: STRING,
  bp_toys: STRING,
  bp_activities: STRING,
  bp_concierge: STRING,
  bp_agents: STRING
})
```

### File Processing

**Upload Flow:**
1. File uploaded via FormData
2. Read into memory (not saved to disk)
3. Parsed based on file type
4. AI extraction with Claude
5. Structured data ingested to Neo4j
6. File discarded (garbage collected)

**No Storage:**
- Files are never saved to disk or cloud storage
- Only extracted structured data is retained
- Reduces storage costs and privacy concerns

### Photo Storage

**Process:**
1. Photos uploaded to Supabase Storage (public bucket)
2. Unique filename generated
3. URL stored in Neo4j Knowledge node
4. Accessible via public URL

**Bucket Structure:**
```
public/
  knowledge-photos/
    {timestamp}-{random}.{ext}
```

### API Endpoints

**Captain Endpoints:**
- `GET /api/captain/profile` - Get current user's profile
- `PATCH /api/captain/profile` - Update profile

**Knowledge Endpoints:**
- `POST /api/knowledge/upload` - Upload and process files
- `POST /api/knowledge/create` - Create manual knowledge entry
- `POST /api/knowledge/scrape-url` - Extract content from URL
- `POST /api/knowledge/upload-photo` - Upload single photo

**Admin Endpoints:**
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `DELETE /api/admin/users?userId={id}` - Deactivate user

---

## Best Practices

### For Captains

**Writing Quality Content:**
- Be specific and detailed
- Include examples and stories
- Add photos when possible
- Use coordinates for precise locations
- Share operational details in best practices
- Set appropriate confidence levels

**Topics to Cover:**
- Hidden anchorages and berths
- Restaurant reservations and timing
- Local contacts and agents
- Equipment best practices
- Guest service insights
- Regional customs and tips

**What Makes Great Contributions:**
- Firsthand experiences
- Unique insights not found elsewhere
- Practical operational details
- Specific names, numbers, and contacts
- Stories of extraordinary experiences
- Visual documentation with photos

### For Admins

**User Management:**
- Set commission rates fairly (3-10% typical)
- Internal team = 0% commission
- Verify email addresses before creating accounts
- Monitor contribution quality

**Data Quality:**
- Run quality checks regularly
- Review new contributions
- Ensure proper attribution
- Monitor commission calculations

**Security:**
- Keep service role keys secure
- Use environment variables for secrets
- Monitor authentication logs
- Review RLS policies periodically

---

## Troubleshooting

### Common Issues

**Can't Upload Files:**
- Check file format (supported types only)
- Max file size: 10MB for photos
- Ensure stable internet connection

**URL Scraping Fails:**
- Some sites block scraping
- Try copying content manually instead
- Check URL is valid and accessible

**Photos Won't Upload:**
- Check file is image type
- Reduce file size if over 10MB
- Ensure Supabase Storage is configured

**Password Setup Email Not Received:**
- Check spam folder
- Verify email address is correct
- Contact admin to resend

### Getting Help

**For Captains:**
- Contact your admin for account issues
- Review this guide for usage questions
- Check `/admin/knowledge` for examples

**For Admins:**
- Review error logs in terminal
- Check Supabase dashboard for auth issues
- Verify Neo4j connection
- Ensure environment variables are set

---

## Future Enhancements

### Phase 2 (Planned)

- Commission payout dashboard
- Advanced knowledge search
- Contribution analytics
- Collaborative knowledge editing
- Knowledge quality voting
- Photo galleries by destination
- Mobile app for field contributions
- Voice recording transcription
- Real-time collaboration features

### Feedback

We're constantly improving the Captain's Portal. Share your feedback and feature requests with the development team.

---

**Version:** 1.0  
**Last Updated:** December 2025  
**Contact:** LEXA Development Team

