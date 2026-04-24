# Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc page-level nav links with a persistent `NavBar` component shared across all protected routes, with tab-based routing and an overflow menu containing logout.

**Architecture:** A new `NavBar` client component reads the active route via `usePathname()` and renders brand, tabs, and a `⋯` dropdown. The `(app)` layout becomes a server component that fetches the current user and passes their email to `NavBar`. Pages shed their own padding/max-width wrappers since the layout now owns the page shell.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase client (`@/lib/supabase/client`), Jest + React Testing Library

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/NavBar.tsx` | Brand, tabs, overflow menu, sign-out |
| Create | `__tests__/NavBar.test.tsx` | Unit tests for NavBar |
| Modify | `app/(app)/layout.tsx` | Server component: fetch user, render NavBar + page shell |
| Modify | `app/(app)/tracker/TrackerClient.tsx` | Remove Stats link, email display, and outer padding wrapper |
| Modify | `app/(app)/stats/page.tsx` | Remove Tracker link and outer padding wrapper |

---

### Task 1: NavBar component + tests

**Files:**
- Create: `components/NavBar.tsx`
- Create: `__tests__/NavBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/NavBar.test.tsx`:

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

beforeEach(() => {
  mockPathname.mockReturnValue('/tracker')
  mockSignOut.mockResolvedValue({})
  mockPush.mockClear()
})

test('renders brand and both tabs', () => {
  render(<NavBar email="test@example.com" />)
  expect(screen.getByText('Knocked')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tracker' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument()
})

test('active tab (Tracker) has blue class when on /tracker', () => {
  mockPathname.mockReturnValue('/tracker')
  render(<NavBar email="test@example.com" />)
  const trackerLink = screen.getByRole('link', { name: 'Tracker' })
  expect(trackerLink).toHaveClass('text-blue-400')
})

test('active tab (Stats) has blue class when on /stats', () => {
  mockPathname.mockReturnValue('/stats')
  render(<NavBar email="test@example.com" />)
  const statsLink = screen.getByRole('link', { name: 'Stats' })
  expect(statsLink).toHaveClass('text-blue-400')
})

test('dropdown is hidden by default', () => {
  render(<NavBar email="test@example.com" />)
  expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
})

test('dropdown opens when ⋯ is clicked', () => {
  render(<NavBar email="test@example.com" />)
  fireEvent.click(screen.getByRole('button', { name: '⋯' }))
  expect(screen.getByText('test@example.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})

test('sign out calls supabase signOut and redirects to /login', async () => {
  render(<NavBar email="test@example.com" />)
  fireEvent.click(screen.getByRole('button', { name: '⋯' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => {
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/NavBar.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/NavBar'"

- [ ] **Step 3: Create the NavBar component**

Create `components/NavBar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
}

const tabs = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Stats', href: '/stats' },
]

export function NavBar({ email }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-2xl mx-auto px-6 flex items-center h-12">
        <span className="text-white font-bold mr-6">Knocked</span>
        <div className="flex flex-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 h-12 flex items-center text-sm font-medium border-b-2 ${
                pathname === tab.href
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm leading-none"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 bg-slate-800 border border-slate-600 rounded-xl min-w-44 shadow-xl overflow-hidden z-10">
              <p className="px-4 py-2.5 text-xs text-slate-500 border-b border-slate-700 truncate">
                {email}
              </p>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-3 text-sm text-red-400 active:opacity-70"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/NavBar.test.tsx
```

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/NavBar.tsx __tests__/NavBar.test.tsx
git commit -m "feat: add NavBar component with tabs and overflow logout menu"
```

---

### Task 2: Wire NavBar into the app layout

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Replace the layout**

Open `app/(app)/layout.tsx` and replace its entire contents with:

```tsx
import { NavBar } from '@/components/NavBar'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar email={user?.email ?? ''} />
      <main className="max-w-2xl mx-auto p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing is broken**

```bash
npm test
```

Expected: All tests PASS (NavBar tests + existing tests)

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat: wire NavBar into app layout, layout now owns page shell"
```

---

### Task 3: Clean up TrackerClient

**Files:**
- Modify: `app/(app)/tracker/TrackerClient.tsx`

The outer `<div>` currently owns `min-h-screen bg-slate-900 p-6 flex flex-col gap-6 max-w-2xl mx-auto` — the layout now handles everything except `flex flex-col gap-6`. The `Stats →` link in the header and the email `<p>` at the bottom are also replaced by the NavBar.

- [ ] **Step 1: Update TrackerClient**

In `app/(app)/tracker/TrackerClient.tsx`:

1. Remove the `Link` import (no longer used)
2. Remove `userName` from the `Props` interface and the function signature
3. Replace the outer `<div className="min-h-screen bg-slate-900 p-6 flex flex-col gap-6 max-w-2xl mx-auto">` with `<div className="flex flex-col gap-6">`
4. Replace the entire header block (the `<div className="flex justify-between items-start pt-2">` and its children) with just the date display:

```tsx
<div className="pt-2">
  <p className="text-slate-400 text-sm">{today}</p>
</div>
```

5. Remove the `<p className="text-slate-600 text-xs text-center pb-2">{userName}</p>` at the bottom

The resulting component should look like:

```tsx
'use client'

import { useState } from 'react'
import { MetricRow } from '@/components/MetricRow'
import { type Counts, type EventType } from '@/lib/types'

interface Props {
  initialCounts: Counts
}

export function TrackerClient({ initialCounts }: Props) {
  const [counts, setCounts] = useState<Counts>(initialCounts)

  async function handleIncrement(type: EventType) {
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (!res.ok) {
      setCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }))
    }
  }

  async function handleUndo(type: EventType) {
    if (counts[type] === 0) return
    setCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }))
    const res = await fetch('/api/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (!res.ok) {
      setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="pt-2">
        <p className="text-slate-400 text-sm">{today}</p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <MetricRow
          label="Doors Knocked"
          count={counts.knock}
          type="knock"
          color="bg-blue-500"
          onIncrement={handleIncrement}
          onUndo={handleUndo}
        />
        <MetricRow
          label="Conversations"
          count={counts.conversation}
          type="conversation"
          color="bg-violet-500"
          onIncrement={handleIncrement}
          onUndo={handleUndo}
        />
        <MetricRow
          label="Sales"
          count={counts.sale}
          type="sale"
          color="bg-emerald-500"
          onIncrement={handleIncrement}
          onUndo={handleUndo}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update TrackerPage to match the new Props**

In `app/(app)/tracker/page.tsx`, the `TrackerClient` call currently passes `userName`. Remove that prop:

```tsx
return <TrackerClient initialCounts={counts} />
```

Also remove `userName={user!.email ?? ''}` — the full line becomes just the above.

- [ ] **Step 3: Run the test suite**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/tracker/TrackerClient.tsx app/\(app\)/tracker/page.tsx
git commit -m "feat: remove inline nav from TrackerClient, layout now owns shell"
```

---

### Task 4: Clean up StatsPage

**Files:**
- Modify: `app/(app)/stats/page.tsx`

The outer `<div>` currently owns `min-h-screen bg-slate-900 p-6 max-w-2xl mx-auto` and the header contains a `← Tracker` link. Both are replaced by the shared layout and NavBar.

- [ ] **Step 1: Update StatsPage**

In `app/(app)/stats/page.tsx`:

1. Remove the `Link` import
2. Replace the outer wrapper and its header with a plain fragment. The full return becomes:

```tsx
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Knock → Sale" value={`${rates.knockToSale}%`} />
        <StatCard label="Convo → Sale" value={`${rates.convoToSale}%`} />
      </div>

      <div className="flex flex-col gap-5">
        <SalesByDayChart data={byDay} />
        <SalesByHourChart data={byHour} />
        <SalesByDowChart data={byDow} />
        <ConversionTrendChart data={byWeek} />
      </div>
    </>
  )
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/stats/page.tsx
git commit -m "feat: remove inline nav from StatsPage, layout now owns shell"
```
