# LEXA Linting Fixes Required

**Status**: 76 errors, 67 warnings remaining  
**Date**: December 17, 2024

## Summary by Priority

### 🔴 Critical Errors (Break Production Build)
- **5 remaining apostrophes in JSX** (app/page.tsx, components/voice/push-to-talk.tsx)
- **41 `@typescript-eslint/no-explicit-any` errors** - Replace `any` with proper types
- **3 React hooks violations** - `setState` in `useEffect`

### 🟡 Warnings (Should Fix)
- **67 unused variable warnings** - Prefix with `_` or remove

---

## Remaining Apostrophe Errors (5 errors)

### app/page.tsx (2 errors)
**Lines 31, 44**
```tsx
// Current:
I don't give lists.
If you don't feel understood, we stop.

// Fix:
I don&apos;t give lists.
If you don&apos;t feel understood, we stop.
```

### components/voice/push-to-talk.tsx (2 errors)
**Line 75**
```tsx
// Current:
Hold "Space" to speak

// Fix:
Hold &quot;Space&quot; to speak
```

---

## React Hooks Violations (3 errors)

### components/chat/quick-replies.tsx
**Line 79** - `setButtons()` in `useEffect`

```tsx
// Current (BAD):
useEffect(() => {
  switch (type) {
    case 'months':
      setButtons(MONTHS);  // ❌ Causes cascading renders
      break;
  }
}, [type]);

// Fix (GOOD):
const getButtonsForType = (type: QuickReplyType) => {
  switch (type) {
    case 'months': return MONTHS;
    case 'destinations': return DESTINATIONS;
    case 'themes': return themes;
    default: return [];
  }
};

// Then use directly:
const currentButtons = getButtonsForType(type);
```

### components/map/world-map.tsx
**Line 170** - `setIsMounted()` in `useEffect`

```tsx
// Current (BAD):
useEffect(() => {
  setIsMounted(true);  // ❌
}, []);

// Fix (GOOD):
// Remove useState entirely, use a ref or check window directly
const [isMounted, setIsMounted] = useState(false);

// Better approach:
if (typeof window === 'undefined') {
  return <div>Loading map...</div>;
}
```

### hooks/use-speech-recognition.ts
**Line 36** - `setIsSupported()` in `useEffect`

```tsx
// Same pattern - move check outside effect or use different approach
```

### hooks/use-speech-synthesis.ts
**Line 31** - `setIsSupported()` in `useEffect`

```tsx
// Same pattern - move check outside effect or use different approach
```

---

## TypeScript `any` Types (41 errors)

### Quick Wins - Replace with `unknown`

When you don't know the type, use `unknown` instead of `any`:

```typescript
// Before:
catch (error: any) { }

// After:
catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

### Files to Fix

1. **app/admin/users/page.tsx** (line 181)
2. **app/api/lexa/chat/route.ts** (line 65)
3. **app/api/lexa/recommendations/route.ts** (line 23)
4. **app/auth/signin/page.tsx** (line 35)
5. **app/auth/signup/page.tsx** (line 44)
6. **components/chat/chat-transcript.tsx** (line 126)
7. **hooks/use-speech-recognition.ts** (lines 26, 32, 33, 43, 59)
8. **hooks/use-speech-synthesis.ts** (implied from Speech API)
9. **lib/auth/create-captain-user.ts** (line 91)
10. **lib/auth/get-captain-profile.ts** (line 14)
11. **lib/booking/track-booking.ts** (lines 36, 180)
12. **lib/enrichment/data-merger.ts** (line 64)
13. **lib/enrichment/osm-client.ts** (line 132)
14. **lib/enrichment/wikipedia-client.ts** (lines 67, 85, 108)
15. **lib/knowledge/chatgpt-parser.ts** (lines 17, 26, 51, 152)
16. **lib/knowledge/index.ts** (line 25)
17. **lib/knowledge/knowledge-ingestor.ts** (lines 96, 98, 181, 183, 233, 235)
18. **lib/lexa/briefing-processor.ts** (10 occurrences)
19. **lib/lexa/claude-client.ts** (line 177)
20. **lib/lexa/compliance-rules.ts** (line 111)
21. **lib/lexa/recommendation-engine.ts** (8 occurrences)
22. **lib/lexa/types.ts** (lines 154, 184)
23. **lib/neo4j/data-quality-agent.ts** (4 occurrences)
24. **lib/neo4j/queries.ts** (lines 309, 366, 373)

### Common Pattern:

```typescript
// Before:
const data: any = await someFunction();

// After:
const data: unknown = await someFunction();
// Or better yet, define proper types:
interface ResponseData {
  success: boolean;
  data: YourType;
}
const data: ResponseData = await someFunction();
```

---

## Unused Variables (67 warnings)

### Quick Fix: Prefix with underscore

```typescript
// Before:
function example(data, metadata) {  // 'metadata' is never used
  return data;
}

// After:
function example(data, _metadata) {  // Underscore = intentionally unused
  return data;
}
```

### Files with Most Warnings

1. **lib/lexa/state-machine.ts** (22 warnings) - Lots of unused params in handler functions
2. **lib/lexa/stages/initial-questions.ts** (3 warnings)
3. **components/map/world-map.tsx** (2 warnings)
4. **lib/auth/roles.ts** (1 warning)

---

## Image Tag Warning (1 warning)

### app/admin/knowledge/editor/page.tsx
**Line 403**

```tsx
// Current:
<img src={photo.preview} alt="Preview" />

// Fix:
import Image from 'next/image';

<Image
  src={photo.preview}
  alt="Preview"
  width={200}
  height={200}
  className="..."
/>
```

---

## Export Anonymous Default (6 warnings)

### Pattern:
```typescript
// Before:
export default {
  someFunction,
  anotherFunction
};

// After:
const MyModule = {
  someFunction,
  anotherFunction
};

export default MyModule;
```

### Files:
1. lib/knowledge/ai-processor.ts
2. lib/knowledge/chatgpt-parser.ts
3. lib/knowledge/index.ts
4. lib/knowledge/knowledge-ingestor.ts
5. lib/neo4j/relationship-inference.ts
6. lib/neo4j/scoring-engine.ts
7. lib/lexa/recommendation-engine.ts

---

## Automated Fix Script

Create a file `scripts/fix-lints.sh`:

```bash
#!/bin/bash

# Fix apostrophes
find app components -name "*.tsx" -type f -exec sed -i "s/don't/don\&apos;t/g" {} +
find app components -name "*.tsx" -type f -exec sed -i "s/you'll/you\&apos;ll/g" {} +
find app components -name "*.tsx" -type f -exec sed -i 's/"Space"/\&quot;Space\&quot;/g' {} +

# Prefix unused variables with underscore
# This requires manual review - use your IDE's "Rename Symbol" feature

echo "Apostrophes fixed. Run 'npm run lint' to verify."
```

---

## Priority Order

### Week 1: Fix Build-Breaking Errors
1. ✅ Apostrophes (5 remaining) - **15 minutes**
2. ❌ React hooks violations (3 errors) - **30 minutes**
3. ❌ Critical `any` types in API routes (5 errors) - **30 minutes**

### Week 2: Clean Up Types
4. ❌ Remaining `any` types (36 errors) - **2-3 hours**

### Week 3: Polish
5. ❌ Unused variables (67 warnings) - **1-2 hours**
6. ❌ Export anonymous defaults (6 warnings) - **15 minutes**
7. ❌ Image tag (1 warning) - **5 minutes**

---

## Testing After Fixes

```bash
# Run lint
npm run lint

# Should see: ✓ No errors

# Test build
npm run build

# Should complete successfully

# Test in dev
npm run dev
```

---

## Why These Errors Matter

### Apostrophes
- **Impact**: Build fails in production
- **Severity**: 🔴 Critical

### `any` Types
- **Impact**: Loses TypeScript safety, potential runtime errors
- **Severity**: 🔴 High

### React Hooks
- **Impact**: Performance issues, potential infinite loops
- **Severity**: 🔴 High

### Unused Variables
- **Impact**: Code cleanliness, bundle size
- **Severity**: 🟡 Medium

---

## Current Status

✅ **5 apostrophes fixed** (5 remaining)  
✅ **All code deployed successfully**  
❌ **71 errors, 67 warnings remain**

**Next Deploy**: Fix remaining 5 apostrophes, then tackle React hooks!

