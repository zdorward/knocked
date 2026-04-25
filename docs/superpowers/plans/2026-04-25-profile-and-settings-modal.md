# Profile Creation & Settings Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Google OAuth users not getting a `profiles` row, and redesign the settings modal to design B (X close button, uniform inputs, full-width Save, no Cancel).

**Architecture:** Three independent changes — a DB migration for the missing RLS INSERT policy, an auth callback update to upsert a profile on every successful sign-in, and a component rewrite for `SettingsModal`. The RLS fix is what unblocks the modal's save-and-close behavior.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + Auth + RLS), React 18, TypeScript, Tailwind CSS, Jest + React Testing Library

---

### Task 1: Add INSERT RLS policy to profiles

**Files:**
- Create: `supabase/migrations/006_profiles_insert_policy.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/006_profiles_insert_policy.sql
create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);
```

- [ ] **Step 2: Push the migration**

```bash
supabase db push
```

Expected output:
```
Applying migration 006_profiles_insert_policy.sql...
Finished supabase db push.
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_profiles_insert_policy.sql
git commit -m "fix: add INSERT RLS policy to profiles table"
```

---

### Task 2: Upsert profile row in auth callback

**Files:**
- Modify: `app/auth/callback/route.ts`

This ensures every successful Google sign-in creates a profile row if one doesn't exist yet. It's a no-op for users who already have a row.

- [ ] **Step 1: Update the callback route**

Replace the entire contents of `app/auth/callback/route.ts` with:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

function isSafeRelativePath(raw: string): boolean {
  if (!raw.startsWith('/') || raw.startsWith('//')) return false
  try {
    const parsed = new URL(raw, 'http://n')
    return parsed.host === 'n'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/tracker'
  const next = isSafeRelativePath(rawNext) ? rawNext : '/tracker'

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
      // Ensure a profiles row exists — covers Google OAuth users who signed up
      // before the trigger was added, and any future sign-ins
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully` (type check passes, no errors)

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "fix: upsert profile row on every successful OAuth callback"
```

---

### Task 3: Redesign SettingsModal to layout B

**Files:**
- Modify: `components/SettingsModal.tsx`

Layout B: X button in header, both fields `h-12` with identical styling, full-width Save button, no Cancel button.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/SettingsModal.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsModal } from '@/components/SettingsModal'

const baseProps = {
  open: true,
  email: 'test@example.com',
  initialDisplayName: 'Test User',
  initialEmoji: '🎉',
  onClose: jest.fn(),
  onSave: jest.fn().mockResolvedValue(undefined),
  onSignOut: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

test('does not render when open=false', () => {
  render(<SettingsModal {...baseProps} open={false} />)
  expect(screen.queryByRole('dialog')).toHaveClass('hidden')
})

test('renders Settings heading when open', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
})

test('renders X close button', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.getByLabelText('Close settings')).toBeInTheDocument()
})

test('does not render a Cancel button', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
})

test('calls onClose when X is clicked', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByLabelText('Close settings'))
  expect(baseProps.onClose).toHaveBeenCalledTimes(1)
})

test('calls onClose when backdrop is clicked', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByRole('dialog'))
  expect(baseProps.onClose).toHaveBeenCalledTimes(1)
})

test('does not close when clicking inside the modal card', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByRole('heading', { name: 'Settings' }))
  expect(baseProps.onClose).not.toHaveBeenCalled()
})

test('calls onSave with display name and first emoji grapheme', async () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(baseProps.onSave).toHaveBeenCalledWith('Test User', '🎉')
  })
})

test('calls onSave with null emoji when field is empty', async () => {
  render(<SettingsModal {...baseProps} initialEmoji={null} />)
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(baseProps.onSave).toHaveBeenCalledWith('Test User', null)
  })
})

test('syncs state when modal re-opens with new initial values', () => {
  const { rerender } = render(<SettingsModal {...baseProps} open={false} />)
  rerender(<SettingsModal {...baseProps} open={true} initialDisplayName="New Name" initialEmoji="🔥" />)
  expect(screen.getByDisplayValue('New Name')).toBeInTheDocument()
})

test('shows email and Sign out button', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.getByText('test@example.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})

test('calls onSignOut when Sign out is clicked', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(baseProps.onSignOut).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/SettingsModal.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: multiple test failures (component doesn't match new design yet)

- [ ] **Step 3: Rewrite SettingsModal**

Replace the entire contents of `components/SettingsModal.tsx` with:

```tsx
'use client'

import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  email: string
  initialDisplayName: string
  initialEmoji: string | null
  onClose: () => void
  onSave: (displayName: string, emoji: string | null) => Promise<void>
  onSignOut: () => void
}

export function SettingsModal({
  open,
  email,
  initialDisplayName,
  initialEmoji,
  onClose,
  onSave,
  onSignOut,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [emoji, setEmoji] = useState(initialEmoji ?? '')
  const [saving, setSaving] = useState(false)

  // Sync state whenever the modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName)
      setEmoji(initialEmoji ?? '')
    }
  }, [open, initialDisplayName, initialEmoji])

  async function handleSave() {
    setSaving(true)
    const firstEmoji = emoji.trim() ? (Array.from(emoji.trim())[0] ?? null) : null
    await onSave(displayName.trim(), firstEmoji)
    setSaving(false)
  }

  const previewEmoji = emoji.trim() ? Array.from(emoji.trim())[0] : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 ${open ? '' : 'hidden'}`}
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl w-full max-w-sm border border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 id="settings-modal-title" className="text-white text-lg font-bold">
              Settings
            </h2>
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 active:opacity-70"
            >
              ✕
            </button>
          </div>

          {/* Emoji field */}
          <div className="mb-4">
            <label
              htmlFor="emoji-input"
              className="text-slate-400 text-xs uppercase tracking-widest mb-2 block"
            >
              Personal Emoji
            </label>
            <div className="h-12 bg-slate-900 border border-slate-600 rounded-xl px-4 flex items-center gap-3">
              <span className="text-xl leading-none select-none w-7 text-center">
                {previewEmoji ?? '👤'}
              </span>
              <input
                id="emoji-input"
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Tap to set your emoji"
                className="flex-1 bg-transparent text-slate-400 text-sm outline-none placeholder:text-slate-600"
                aria-label="Personal emoji"
              />
            </div>
          </div>

          {/* Display name field */}
          <div className="mb-6">
            <label
              htmlFor="display-name"
              className="text-slate-400 text-xs uppercase tracking-widest mb-2 block"
            >
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full h-12 bg-slate-900 border border-slate-600 rounded-xl px-4 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 active:opacity-80"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Sign out — separated */}
        <div className="border-t border-slate-700 px-6 py-4">
          <p className="text-slate-500 text-xs mb-3 truncate">{email}</p>
          <button
            onClick={onSignOut}
            className="w-full py-3 rounded-xl bg-slate-700 text-red-400 text-sm font-semibold active:opacity-70"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run SettingsModal tests**

```bash
npx jest __tests__/SettingsModal.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: all tests pass

- [ ] **Step 5: Update NavBar tests**

The NavBar now takes `displayName` and `emoji` props, and the avatar button has `aria-label="Open settings"` instead of `"Account menu"`. The old dropdown tests are no longer valid. Replace the contents of `__tests__/NavBar.test.tsx` with:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NavBar } from '@/components/NavBar'

// Use var so declarations are hoisted above the jest.mock factory calls
// eslint-disable-next-line no-var
var mockPush: jest.Mock
// eslint-disable-next-line no-var
var mockSignOut: jest.Mock
// eslint-disable-next-line no-var
var mockPathname: jest.Mock
// eslint-disable-next-line no-var
var mockFetch: jest.Mock

jest.mock('next/navigation', () => {
  mockPush = jest.fn()
  mockPathname = jest.fn().mockReturnValue('/tracker')
  return {
    usePathname: mockPathname,
    useRouter: () => ({ push: mockPush }),
  }
})

jest.mock('@/lib/supabase/client', () => {
  mockSignOut = jest.fn().mockResolvedValue({})
  return {
    createClient: () => ({
      auth: { signOut: mockSignOut },
    }),
  }
})

const defaultProps = {
  email: 'test@example.com',
  displayName: 'Test User',
  emoji: null as string | null,
}

beforeEach(() => {
  mockPathname.mockReturnValue('/tracker')
  mockSignOut.mockClear()
  mockSignOut.mockResolvedValue({})
  mockPush.mockClear()
  mockFetch = jest.fn().mockResolvedValue({ ok: true })
  global.fetch = mockFetch
})

test('renders brand and all tabs', () => {
  render(<NavBar {...defaultProps} />)
  expect(screen.getByText('Knocked')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tracker' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument()
})

test('active tab (Tracker) has blue class when on /tracker', () => {
  mockPathname.mockReturnValue('/tracker')
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Tracker' })).toHaveClass('text-blue-400')
})

test('active tab (Stats) has blue class when on /stats', () => {
  mockPathname.mockReturnValue('/stats')
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Stats' })).toHaveClass('text-blue-400')
})

test('active tab (Calendar) has blue class when on /calendar', () => {
  mockPathname.mockReturnValue('/calendar')
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Calendar' })).toHaveClass('text-blue-400')
})

test('shows email initial in avatar when no emoji set', () => {
  render(<NavBar {...defaultProps} emoji={null} />)
  const avatar = screen.getByLabelText('Open settings')
  expect(avatar).toHaveTextContent('T')
})

test('shows emoji in avatar when emoji is set', () => {
  render(<NavBar {...defaultProps} emoji="🎉" />)
  const avatar = screen.getByLabelText('Open settings')
  expect(avatar).toHaveTextContent('🎉')
})

test('settings modal is hidden by default', () => {
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('dialog')).toHaveClass('hidden')
})

test('settings modal opens when avatar is clicked', () => {
  render(<NavBar {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  expect(screen.getByRole('dialog')).not.toHaveClass('hidden')
})

test('settings modal closes when X is clicked', () => {
  render(<NavBar {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  fireEvent.click(screen.getByLabelText('Close settings'))
  expect(screen.getByRole('dialog')).toHaveClass('hidden')
})

test('sign out calls supabase signOut and redirects to /login', async () => {
  render(<NavBar {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => {
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})

test('avatar updates immediately after save', async () => {
  render(<NavBar {...defaultProps} emoji={null} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PATCH' }))
  })
})
```

- [ ] **Step 6: Run all tests**

```bash
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: all test suites pass

- [ ] **Step 7: Commit**

```bash
git add components/SettingsModal.tsx __tests__/SettingsModal.test.tsx __tests__/NavBar.test.tsx
git commit -m "feat: redesign SettingsModal to layout B (X close, uniform inputs, full-width save)"
```

---

### Task 4: Push to remote and verify

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Manual verification**

Sign in with Google at the deployed URL (or localhost). Then:
1. Open the Supabase dashboard → Table Editor → `profiles` — confirm a row exists for your user
2. Open settings modal — confirm both input fields are the same height
3. Set a display name and emoji, tap Save — confirm modal closes
4. Reopen settings modal — confirm the saved values are shown
5. Tap the ✕ button — confirm modal closes without saving
6. Tap outside the modal — confirm modal closes
