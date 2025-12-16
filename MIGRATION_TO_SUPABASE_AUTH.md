# Migrating LEXA from Clerk to Supabase Auth

Since you've changed `user_id` to UUID in the database, here's how to migrate from Clerk to Supabase Auth:

## Step 1: Install Supabase Auth Helpers

```bash
npm uninstall @clerk/nextjs
npm install @supabase/ssr @supabase/auth-helpers-nextjs
```

## Step 2: Update Environment Variables

Replace Clerk keys with Supabase keys in `.env.local`:

```bash
# Remove these:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=

# Keep these:
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 3: Replace Middleware

Replace `middleware.ts` with:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /app routes
  if (request.nextUrl.pathname.startsWith('/app') && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Step 4: Update Root Layout

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LEXA - Luxury Experience Agent",
  description: "I don't give lists. I design the feeling behind the decision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

## Step 5: Update Landing Page

Replace `app/page.tsx` with Supabase Auth components:

```typescript
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/app');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4">
      <main className="mx-auto max-w-4xl text-center">
        <h1 className="mb-6 text-6xl font-bold tracking-tight text-white md:text-8xl">
          LEXA
        </h1>
        
        <p className="mb-4 text-2xl font-light text-zinc-300 md:text-3xl">
          I don't give lists.
        </p>
        <p className="mb-12 text-2xl font-light text-zinc-300 md:text-3xl">
          I design the feeling behind the decision.
        </p>
        
        <p className="mx-auto mb-12 max-w-2xl text-lg text-zinc-400">
          Give me 90 seconds and three questions.
          <br />
          If you don't feel understood, we stop.
        </p>
        
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-zinc-900 transition-all hover:scale-105 hover:bg-zinc-100"
          >
            Start Your Experience
          </Link>
          
          <Link
            href="/auth/signin"
            className="rounded-full border-2 border-zinc-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:border-white hover:bg-white/10"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
```

## Step 6: Update API Routes

Replace authentication in API routes. Example for `app/api/lexa/chat/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const userId = user.id; // This is now a UUID! ✅
  
  // Rest of your code...
}
```

## Step 7: Create Supabase Client Helpers

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

Create `lib/supabase/client.ts` for client components:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## Step 8: Create Auth Pages

Create sign-in and sign-up pages using Supabase Auth UI or custom forms.

---

## Benefits of Supabase Auth

✅ Native UUID support (matches your database)  
✅ Integrated with Supabase RLS  
✅ No third-party service needed  
✅ Built-in social auth providers  
✅ Free tier is generous  

---

Would you like me to implement this migration?

