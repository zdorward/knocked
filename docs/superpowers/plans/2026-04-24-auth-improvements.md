# Auth Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth, sign-up, forgot-password, and reset-password to the Knocked app, following standard web auth patterns.

**Architecture:** Six self-contained tasks — callback route first (everything depends on it), then middleware, then each auth page. No new dependencies needed; `@supabase/ssr` already handles OAuth exchange. Auth pages are `'use client'` components calling `lib/supabase/client.ts`, matching the existing login page pattern exactly.

**Tech Stack:** Next.js 14 App Router, `@supabase/ssr`, Supabase Auth (Google OAuth + email/password), Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/auth/callback/route.ts` | Create | Exchange OAuth/reset code for session, redirect |
| `middleware.ts` | Modify | Allow new public paths without auth |
| `app/(auth)/login/page.tsx` | Modify | Add Google button + forgot password + sign up links |
| `app/(auth)/signup/page.tsx` | Create | Google OAuth + email/password sign-up form |
| `app/(auth)/forgot-password/page.tsx` | Create | Email form that sends reset link |
| `app/(auth)/reset-password/page.tsx` | Create | New password + confirm form after reset link clicked |

---

### Task 1: Auth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

This route handles two cases: Google OAuth redirect (code → session → `/tracker`) and password reset link (code → session → `/reset-password`). It reads a `next` query param to know which case it's in.

- [ ] **Step 1: Create `app/auth/callback/route.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/tracker'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/knocked && npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: no errors from `app/auth/callback/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add auth callback route for OAuth and password reset"
```

---

### Task 2: Update middleware to allow new public paths

**Files:**
- Modify: `middleware.ts`

Currently only `/login` is public. Add `/signup`, `/forgot-password`, `/reset-password`, and `/auth/callback` so unauthenticated users can reach them.

- [ ] **Step 1: Replace the `isLoginPage` check**

Current code in `middleware.ts` (lines 32–33):
```ts
const isLoginPage = request.nextUrl.pathname.startsWith('/login')
```

Replace with two variables. `isPublicPath` allows unauthenticated access. `isRedirectOnAuthPath` is the subset where we bounce authenticated users away to `/tracker` — intentionally excludes `/reset-password` and `/auth/callback` because the password-reset flow sets a session in the callback and then immediately needs to reach `/reset-password`. Redirecting away would break that flow.

```ts
const isPublicPath =
  request.nextUrl.pathname.startsWith('/login') ||
  request.nextUrl.pathname.startsWith('/signup') ||
  request.nextUrl.pathname.startsWith('/forgot-password') ||
  request.nextUrl.pathname.startsWith('/reset-password') ||
  request.nextUrl.pathname.startsWith('/auth/callback')

const isRedirectOnAuthPath =
  request.nextUrl.pathname.startsWith('/login') ||
  request.nextUrl.pathname.startsWith('/signup') ||
  request.nextUrl.pathname.startsWith('/forgot-password')
```

- [ ] **Step 2: Update both redirect conditions**

Find:
```ts
if (!user && !isLoginPage) {
```
Replace with:
```ts
if (!user && !isPublicPath) {
```

Find:
```ts
if (user && isLoginPage) {
```
Replace with:
```ts
if (user && isRedirectOnAuthPath) {
```

After both replacements, `middleware.ts` should look like this in full:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password') ||
    request.nextUrl.pathname.startsWith('/auth/callback')

  // Only bounce authenticated users away from login/signup/forgot-password.
  // Do NOT include /reset-password or /auth/callback — the password reset flow
  // sets a session in /auth/callback and immediately redirects to /reset-password,
  // so we must let authenticated users reach that page.
  const isRedirectOnAuthPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password')

  if (!user && !isPublicPath) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  if (user && isRedirectOnAuthPath) {
    const redirectResponse = NextResponse.redirect(new URL('/tracker', request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: allow signup, forgot-password, reset-password, and auth/callback without auth"
```

---

### Task 3: Update login page

**Files:**
- Modify: `app/(auth)/login/page.tsx`

Add a "Continue with Google" button above the existing form, plus "Forgot password?" and "No account? Sign up" links below.

- [ ] **Step 1: Replace `app/(auth)/login/page.tsx` entirely**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGoogleSignIn() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/tracker')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold mb-2">Knocked</h1>
        <p className="text-slate-400 mb-8">Sign in to track your day</p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-slate-800 text-white rounded-xl px-4 py-4 text-lg font-medium border border-slate-700 mb-6 active:opacity-80"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-600 text-sm">or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white rounded-xl py-4 text-lg font-semibold disabled:opacity-50 active:opacity-80"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 mt-6">
          <Link href="/forgot-password" className="text-blue-400 text-sm">
            Forgot password?
          </Link>
          <p className="text-slate-500 text-sm">
            No account?{' '}
            <Link href="/signup" className="text-blue-400">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

Run `npm run dev`, open `http://localhost:3000/login`. You should see:
- "Continue with Google" button at the top
- Divider line with "or"
- Email + password fields
- "Sign in" button
- "Forgot password?" link below
- "No account? Sign up" link below that

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat: add Google sign-in, forgot password, and sign up links to login page"
```

---

### Task 4: Sign-up page

**Files:**
- Create: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Create `app/(auth)/signup/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGoogleSignUp() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/tracker')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold mb-2">Knocked</h1>
        <p className="text-slate-400 mb-8">Create your account</p>

        <button
          onClick={handleGoogleSignUp}
          className="w-full bg-slate-800 text-white rounded-xl px-4 py-4 text-lg font-medium border border-slate-700 mb-6 active:opacity-80"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-600 text-sm">or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 text-white rounded-xl py-4 text-lg font-semibold disabled:opacity-50 active:opacity-80"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-slate-500 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

Open `http://localhost:3000/signup`. You should see:
- "Continue with Google" button
- Divider
- Email + password fields
- Emerald "Create account" button (distinct color from login's blue)
- "Already have an account? Sign in" link

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/signup/page.tsx
git commit -m "feat: add sign-up page with Google OAuth and email/password"
```

---

### Task 5: Forgot-password page

**Files:**
- Create: `app/(auth)/forgot-password/page.tsx`

Sends a reset email via `supabase.auth.resetPasswordForEmail()`. On success, replaces the form with a confirmation message (no page navigation — standard pattern).

- [ ] **Step 1: Create `app/(auth)/forgot-password/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold mb-2">Reset password</h1>
        <p className="text-slate-400 mb-8">We'll send a reset link to your email</p>

        {sent ? (
          <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-4">
            <p className="text-emerald-400 font-semibold mb-1">Check your email</p>
            <p className="text-emerald-300 text-sm">We sent a reset link to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white rounded-xl py-4 text-lg font-semibold disabled:opacity-50 active:opacity-80"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-slate-500 text-sm text-center mt-6">
          <Link href="/login" className="text-blue-400">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

Open `http://localhost:3000/forgot-password`. You should see:
- Email field
- "Send reset link" button
- "← Back to sign in" link
- (To test the success state, submit a real email — the form should disappear and show the emerald confirmation box)

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/forgot-password/page.tsx
git commit -m "feat: add forgot-password page"
```

---

### Task 6: Reset-password page

**Files:**
- Create: `app/(auth)/reset-password/page.tsx`

Reached after the user clicks the email link → `/auth/callback?next=/reset-password` → session is established → this page. Calls `supabase.auth.updateUser({ password })` and redirects to `/tracker` on success.

- [ ] **Step 1: Create `app/(auth)/reset-password/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/tracker')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold mb-2">New password</h1>
        <p className="text-slate-400 mb-8">Choose a new password for your account</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white rounded-xl py-4 text-lg font-semibold disabled:opacity-50 active:opacity-80"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

Open `http://localhost:3000/reset-password`. You should see:
- Two password fields (new + confirm)
- "Update password" button
- Error shown inline if passwords don't match (test by entering mismatched values and submitting)

- [ ] **Step 4: Run full build to confirm no issues**

```bash
npm run build
```

Expected: ✓ Compiled successfully, all 6 auth routes appear in the route table.

- [ ] **Step 5: Commit and push**

```bash
git add app/(auth)/reset-password/page.tsx
git commit -m "feat: add reset-password page"
git push
```

---

## Manual Supabase Setup (after all tasks)

These steps are done in the Supabase dashboard — not in code:

1. Go to **Authentication → Providers → Google** → enable it → add your Google OAuth Client ID and Secret (from Google Cloud Console → APIs & Services → Credentials)
2. Go to **Authentication → URL Configuration**:
   - **Site URL:** `https://knocked.app`
   - **Redirect URLs:** add `https://knocked.app/auth/callback` and `http://localhost:3000/auth/callback`
3. Add the same two callback URLs to your Google OAuth app's **Authorized redirect URIs** in Google Cloud Console
