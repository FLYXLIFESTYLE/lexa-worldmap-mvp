# LEXA Account Navigation Guide

## URL Structure

### Primary Account URL
**Main Account Dashboard:** `/account`

This is the central hub where users can:
- View membership tier and usage limits
- See stats (total scripts, conversations, favorites)
- Access recent conversations
- Browse experience scripts
- Start new conversations with LEXA

## User Navigation Flows

### Flow 1: First-Time User
```
1. Land on homepage (/)
2. Click "Enter LEXA" 
3. Sign up at /auth/signup (invite-only)
4. Verify email
5. Sign in at /auth/signin
6. → Automatically redirected to /account (dashboard)
7. From dashboard: Click "Start Conversation" or "Create Script"
8. → Goes to /experience (builder) or /experience/chat
```

### Flow 2: Returning User (Welcome Back)
```
1. Land on homepage (/)
2. Click "Welcome Back" button
   → Now redirects to /account (not /auth/signin)
3. If not signed in: Redirected to /auth/signin
4. After sign-in → /account (dashboard)
5. See:
   - Recent conversations (with "Continue" buttons)
   - Recent scripts (with "View" buttons)
   - Stats and membership info
```

### Flow 3: In-Chat Navigation
```
While chatting at /experience/chat or /app:
1. Click on username/email in header
2. → Goes to /account (dashboard)
3. From dashboard: Browse conversations or scripts
4. Click "Continue" on any conversation
5. → Returns to that specific chat session
```

## Account Dashboard Features

### What Users See at `/account`:

**Top Section:**
- Membership tier badge (Free, Explorer, Creator, Concierge)
- Usage progress bars:
  - Scripts created this month (X/3 for Free tier)
  - Conversations this month (X/10 for Free tier)
- "Upgrade Membership" button

**Stats Grid:**
- Total Scripts created
- Total Conversations
- Favorite Scripts count
- Shared Scripts count

**Recent Conversations:**
- Last 3 conversations with LEXA
- Shows theme, date, Experience DNA
- "Continue" button for incomplete conversations
- "View Details" button for all
- "View All" link → `/account/conversations` (future)

**Experience Scripts:**
- Last 4 created scripts
- Shows title, theme, tags, stats
- Heart icon to favorite/unfavorite
- "View" button to see full script
- "View All" link → `/account/scripts` (future)

## Navigation Access Points

### From Homepage (`/`):
- "Enter LEXA" → `/experience` (builder)
- "Welcome Back" → `/account` (dashboard)

### From Sign-In (`/auth/signin`):
- After successful login → `/account`

### From Any Chat Interface:
- Click username/email → `/account`
- "Sign Out" button stays as-is

### From Account Dashboard (`/account`):
- "Start Conversation" → `/experience`
- "Continue" on conversation → `/experience/chat?session=XXX` (resume)
- "Create Script" → `/experience`
- "Settings" button → `/account/profile` (future)
- "View All" conversations → `/account/conversations` (future)
- "View All" scripts → `/account/scripts` (future)

## Implementation Details

### Key Changes Made:

1. **Sign-In Default Redirect**
   - Changed from `/app` to `/account`
   - File: `app/auth/signin/page.tsx`
   - Line: `const redirectTo = searchParams.get('redirectTo') || '/account';`

2. **Landing Page Welcome Back Button**
   - Changed from `/auth/signin` to `/account`
   - File: `app/page.tsx`
   - Now goes directly to account (will prompt for auth if needed)

3. **Clickable Username in Chat Header**
   - File: `app/app/page.tsx`
   - Made email clickable with `onClick={() => router.push('/account')}`
   - Added hover effect and cursor pointer
   - Same pattern can be applied to other chat interfaces

4. **Clickable Username in Experience Chat**
   - File: `app/experience/chat/page.tsx`
   - Changed "In conversation" text to "View account"
   - Made entire div clickable to navigate to account

## Future Enhancements (Optional)

### Additional Pages (can be built when needed):
- `/account/profile` - Edit profile and preferences
- `/account/conversations` - Full conversation history with filters
- `/account/scripts` - Full script library with grid/list view
- `/account/membership` - Tier comparison and upgrade flow
- `/account/settings` - Account settings and preferences

### Session Resumption:
When clicking "Continue" on a conversation card, pass the session ID:
```typescript
router.push(`/experience/chat?session=${sessionId}`)
```

The chat page should check for `session` query param and load that conversation instead of starting new.

## Testing Checklist

- [ ] Homepage → "Welcome Back" → Goes to /account
- [ ] Sign in → Redirects to /account
- [ ] Account dashboard loads correctly
- [ ] Click username in chat → Goes to /account
- [ ] "Start Conversation" from account → Goes to /experience
- [ ] "Continue" on conversation → Resumes that chat
- [ ] Stats display correctly (scripts, conversations)
- [ ] Membership tier and limits show correctly
- [ ] Progress bars update in real-time

## Summary

**Primary Account URL:** `/account`

**How to Access:**
1. Click "Welcome Back" on homepage
2. Sign in (auto-redirects to account)
3. Click your email/name in any chat interface

**What's Available:**
- Membership overview
- Usage tracking
- Recent conversations (can continue)
- Experience scripts (can view/favorite)
- Quick access to start new chat

All navigation flows now lead to and from the account dashboard as the central hub for LEXA users! 🎉
