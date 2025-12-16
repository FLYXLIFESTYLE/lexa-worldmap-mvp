# Option 2: Keep Clerk with UUID Database

If you want to keep using Clerk but have UUID user_id in the database, you need a mapping layer.

## The Challenge

- **Clerk provides:** TEXT user IDs like `"user_2abc123xyz"`
- **Database expects:** UUID like `550e8400-e29b-41d4-a716-446655440000`

## Solution: Deterministic UUID Generation

Convert Clerk's TEXT ID to a deterministic UUID using a hash function.

### Step 1: Install UUID Generation Library

```bash
npm install uuid
```

### Step 2: Create User ID Converter

Create `lib/clerk/user-id-converter.ts`:

```typescript
import { v5 as uuidv5 } from 'uuid';

// Namespace UUID for LEXA (generated once, keep consistent)
const LEXA_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Converts Clerk's TEXT user ID to a deterministic UUID
 * Same Clerk ID will always produce the same UUID
 */
export function clerkIdToUuid(clerkUserId: string): string {
  return uuidv5(clerkUserId, LEXA_NAMESPACE);
}

/**
 * Example:
 * clerkIdToUuid('user_2abc123xyz') 
 * => '550e8400-e29b-41d4-a716-446655440000' (always the same)
 */
```

### Step 3: Update API Routes

Modify all API routes to convert Clerk ID to UUID:

```typescript
// app/api/lexa/chat/route.ts
import { auth } from '@clerk/nextjs/server';
import { clerkIdToUuid } from '@/lib/clerk/user-id-converter';

export async function POST(request: NextRequest) {
  // Get Clerk user ID (TEXT)
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Convert to UUID for database
  const userId = clerkIdToUuid(clerkUserId);
  
  // Now use userId (UUID) in all database operations
  const { data: session } = await supabaseAdmin
    .from('lexa_sessions')
    .select('*')
    .eq('user_id', userId)  // UUID ✅
    .single();
  
  // Rest of code...
}
```

### Step 4: Update All API Routes

You need to update:
- ✅ `app/api/lexa/chat/route.ts`
- ✅ `app/api/lexa/preferences/route.ts`
- ✅ `app/api/lexa/session/[id]/route.ts`
- ✅ `app/api/lexa/brief/[sessionId]/route.ts`

Pattern for all routes:

```typescript
const { userId: clerkUserId } = await auth();
if (!clerkUserId) return 401;

const userId = clerkIdToUuid(clerkUserId);
// Use userId for database operations
```

### Step 5: Update RLS Policies (if needed)

Since you're using service role key (bypasses RLS), you don't need to change RLS policies. But if you want RLS to work with Clerk:

```sql
-- This won't work because Clerk doesn't set auth.uid()
-- You'd need to disable RLS and rely on API-level security
```

**Recommendation:** Keep RLS disabled and rely on API authentication (which you're already doing).

---

## Pros and Cons

### Pros ✅
- Keep Clerk's superior auth UI and features
- Database uses UUID (works with RLS if needed)
- Deterministic conversion (same Clerk ID = same UUID)

### Cons ❌
- Extra conversion step in every API call
- RLS policies with `auth.uid()` won't work (must use service role)
- More complex architecture
- Need to document the mapping for future devs

---

## Comparison

| Approach | Complexity | RLS Support | Best For |
|----------|-----------|-------------|----------|
| **Switch to Supabase Auth** | Medium | ✅ Full | Simple architecture |
| **Keep Clerk + UUID mapping** | High | ❌ No | Clerk features needed |
| **Revert to TEXT user_id** | Low | ❌ No | Quick fix |

---

Would you like me to implement the Clerk UUID mapping approach?

