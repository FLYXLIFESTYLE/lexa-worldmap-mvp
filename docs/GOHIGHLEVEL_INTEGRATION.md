# GoHighLevel CRM Integration Guide
**Purpose**: Connect LEXA with GoHighLevel for affiliate tracking and commission management  
**Status**: Planning Phase  
**Created**: January 5, 2026

---

## Can Cursor Connect LEXA with GoHighLevel?

**Answer**: Yes! GoHighLevel has a comprehensive REST API that can be integrated with LEXA.

---

## GoHighLevel API Overview

### Authentication
- **API Key**: Required for all requests
- **Location**: GoHighLevel Settings → API → Generate API Key
- **Storage**: Store in environment variables (`GOHIGHLEVEL_API_KEY`)

### Base URL
```
https://services.leadconnectorhq.com
```

### API Endpoints (Relevant for LEXA)
- **Contacts**: Create/update contacts (affiliates, users)
- **Opportunities**: Track conversions (tier upgrades)
- **Custom Fields**: Store affiliate data, commission info
- **Webhooks**: Receive events from GoHighLevel
- **Pipelines**: Track user journey through tiers

---

## Integration Plan for LEXA

### 1. Affiliate Tracking

**When**: User signs up via affiliate link

**What Happens**:
1. Extract affiliate ID from UTM parameter (`?affiliate=abc123`)
2. Create contact in GoHighLevel with:
   - Email, name
   - Custom field: `affiliate_id` = affiliate ID
   - Custom field: `source` = "LEXA Marketplace" or "Affiliate Link"
   - Tag: "LEXA User"
3. Add contact to "LEXA Users" pipeline
4. Store GoHighLevel contact ID in LEXA database

**Code Example**:
```typescript
// lib/affiliate/gohighlevel.ts
export async function createAffiliateContact(
  email: string,
  name: string,
  affiliateId: string
) {
  const response = await fetch('https://services.leadconnectorhq.com/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      name,
      customFields: [
        { field: 'affiliate_id', value: affiliateId },
        { field: 'source', value: 'LEXA Marketplace' },
      ],
      tags: ['LEXA User'],
    }),
  });
  return response.json();
}
```

---

### 2. Conversion Tracking

**When**: User upgrades tier (Free → Explorer, Explorer → Creator, etc.)

**What Happens**:
1. Update contact in GoHighLevel:
   - Custom field: `current_tier` = new tier name
   - Custom field: `upgrade_date` = timestamp
   - Custom field: `lifetime_value` = total spent
2. Create opportunity in GoHighLevel:
   - Title: "LEXA Tier Upgrade: [Tier Name]"
   - Value: upgrade amount
   - Stage: "Converted"
   - Assign to affiliate (if applicable)
3. Update pipeline stage (move contact to "Paying Customer")
4. Trigger commission calculation (if affiliate exists)

**Code Example**:
```typescript
export async function trackTierUpgrade(
  gohighlevelContactId: string,
  newTier: string,
  upgradeAmount: number,
  affiliateId?: string
) {
  // Update contact
  await fetch(`https://services.leadconnectorhq.com/contacts/${gohighlevelContactId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customFields: [
        { field: 'current_tier', value: newTier },
        { field: 'upgrade_date', value: new Date().toISOString() },
      ],
    }),
  });

  // Create opportunity
  await fetch('https://services.leadconnectorhq.com/opportunities', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `LEXA Tier Upgrade: ${newTier}`,
      value: upgradeAmount,
      contactId: gohighlevelContactId,
      pipelineId: process.env.GOHIGHLEVEL_PIPELINE_ID,
      stageId: process.env.GOHIGHLEVEL_CONVERTED_STAGE_ID,
      assignedTo: affiliateId ? await getAffiliateUserId(affiliateId) : null,
    }),
  });
}
```

---

### 3. Commission Tracking

**When**: Affiliate referral converts (user upgrades tier)

**What Happens**:
1. Calculate commission (e.g., 20% of upgrade amount)
2. Create commission record in GoHighLevel:
   - Custom field: `commission_amount` = calculated amount
   - Custom field: `commission_status` = "Pending" or "Paid"
   - Link to affiliate contact
3. Update affiliate's total commissions
4. Send notification to affiliate (via GoHighLevel automation)

**Code Example**:
```typescript
export async function recordCommission(
  affiliateId: string,
  conversionAmount: number,
  commissionRate: number = 0.20
) {
  const commissionAmount = conversionAmount * commissionRate;
  
  const affiliateContact = await getAffiliateContact(affiliateId);
  
  await fetch('https://services.leadconnectorhq.com/contacts', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: affiliateContact.id,
      customFields: [
        { field: 'total_commissions', value: affiliateContact.totalCommissions + commissionAmount },
        { field: 'pending_commissions', value: affiliateContact.pendingCommissions + commissionAmount },
      ],
    }),
  });
}
```

---

### 4. Affiliate Dashboard Integration

**What**: Show GoHighLevel data in LEXA affiliate dashboard

**Endpoints Needed**:
- `/api/affiliate/dashboard` - Get affiliate stats from GoHighLevel
- `/api/affiliate/commissions` - Get commission history
- `/api/affiliate/referrals` - Get referral list

**Code Example**:
```typescript
// app/api/affiliate/dashboard/route.ts
export async function GET(request: NextRequest) {
  const affiliateId = request.headers.get('affiliate-id');
  
  const contact = await fetch(
    `https://services.leadconnectorhq.com/contacts/${affiliateId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
      },
    }
  ).then(r => r.json());
  
  return NextResponse.json({
    totalReferrals: contact.customFields?.total_referrals || 0,
    totalCommissions: contact.customFields?.total_commissions || 0,
    pendingCommissions: contact.customFields?.pending_commissions || 0,
    conversionRate: contact.customFields?.conversion_rate || 0,
  });
}
```

---

## Implementation Steps

### Step 1: Setup GoHighLevel Account
1. Create GoHighLevel account (if not exists)
2. Generate API key
3. Create custom fields:
   - `affiliate_id` (Text)
   - `current_tier` (Text)
   - `upgrade_date` (Date)
   - `lifetime_value` (Number)
   - `total_commissions` (Number)
   - `pending_commissions` (Number)
4. Create pipeline: "LEXA Users"
5. Create stages: "Lead", "Paying Customer", "Converted"

### Step 2: Environment Variables
```env
GOHIGHLEVEL_API_KEY=your_api_key_here
GOHIGHLEVEL_PIPELINE_ID=your_pipeline_id
GOHIGHLEVEL_CONVERTED_STAGE_ID=your_stage_id
```

### Step 3: Create API Client
- File: `lib/affiliate/gohighlevel.ts`
- Functions:
  - `createAffiliateContact()`
  - `trackTierUpgrade()`
  - `recordCommission()`
  - `getAffiliateStats()`

### Step 4: Integrate with LEXA
- Update signup flow to track affiliates
- Update tier upgrade flow to track conversions
- Create affiliate dashboard page
- Add webhook handler for GoHighLevel events

---

## Webhook Integration (Optional)

**Purpose**: Receive events from GoHighLevel (contact updates, opportunity changes)

**Endpoint**: `/api/affiliate/gohighlevel/webhook`

**Events to Handle**:
- Contact created
- Contact updated
- Opportunity created
- Opportunity updated

---

## Testing

1. **Test Affiliate Tracking**:
   - Sign up with affiliate link
   - Verify contact created in GoHighLevel
   - Check custom fields populated

2. **Test Conversion Tracking**:
   - Upgrade tier
   - Verify opportunity created
   - Check commission calculated

3. **Test Affiliate Dashboard**:
   - View affiliate stats
   - Verify commission history
   - Check referral list

---

## Resources

- **GoHighLevel API Docs**: https://highlevel.stoplight.io/docs/integrations
- **API Authentication**: https://highlevel.stoplight.io/docs/integrations/authentication
- **Contacts API**: https://highlevel.stoplight.io/docs/integrations/contacts
- **Opportunities API**: https://highlevel.stoplight.io/docs/integrations/opportunities

---

## Notes

- GoHighLevel API has rate limits (check documentation)
- Custom fields must be created in GoHighLevel UI first
- Webhooks require HTTPS endpoint (use Vercel/Render)
- Commission calculations can be automated via GoHighLevel workflows

---

**Status**: Ready for implementation in Phase 3 (Tiers & Upsells + Marketplace)  
**Estimated Effort**: 1-2 days for basic integration, 2-3 days for full affiliate dashboard
