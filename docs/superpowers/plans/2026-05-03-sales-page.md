# Sales Page & Timezone Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a /sales page showing all-time sale history grouped by day with collapsible sections and inline contract-value editing via modal; fix all UTC-vs-local timezone bugs throughout the app.

**Architecture:** A `TimezoneSync` client component sets a `user-tz` cookie (IANA string) on mount; server components read that cookie and pass it into query functions. The tracker page switches from a UTC-midnight boundary to fetching the past 36 hours and filtering to local-today client-side. The sales page is a Server Component that fetches all sale rows and hands them to `SalesClient` for local-TZ grouping and editing.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase, Tailwind CSS, Jest + React Testing Library, `Intl.DateTimeFormat` for timezone-aware date formatting.

---

## File Map

| File | Status | Purpose |
|---|---|---|
| `lib/types.ts` | modify | Add `SaleRow` interface |
| `lib/queries.ts` | modify | Add `timeZone` param to 5 functions |
| `components/TimezoneSync.tsx` | create | Sets `user-tz` cookie on mount |
| `app/(app)/layout.tsx` | modify | Render `<TimezoneSync />` |
| `app/(app)/stats/page.tsx` | modify | Read `user-tz` cookie, pass to queries |
| `app/(app)/tracker/page.tsx` | modify | Fetch past 36h; pass raw events |
| `app/(app)/tracker/TrackerClient.tsx` | modify | Accept raw events, derive today counts client-side |
| `app/api/events/route.ts` | modify | DELETE: use 24h window instead of UTC midnight |
| `app/(app)/calendar/page.tsx` | modify | Use local TZ for default month |
| `components/CalendarClient.tsx` | modify | Pass browser TZ to `eventsByDay`; fix today highlight |
| `components/NavBar.tsx` | modify | Add Sales tab |
| `app/api/events/[id]/route.ts` | create | PATCH contract_value |
| `components/EditContractModal.tsx` | create | Edit contract value modal |
| `app/(app)/sales/page.tsx` | create | Server Component: fetch all sales |
| `app/(app)/sales/SalesClient.tsx` | create | Client Component: grouped list + edit |
| `__tests__/queries.test.ts` | modify | Add timezone-aware assertions |
| `__tests__/api-events-id.test.ts` | create | Tests for PATCH /api/events/[id] |
| `__tests__/EditContractModal.test.tsx` | create | Component tests |

---

## Task 1: Add `SaleRow` type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `SaleRow` interface after the existing types**

Open `lib/types.ts` and add after the `EventRow` interface:

```ts
export interface SaleRow {
  id: string
  created_at: string
  contract_value: number | null
  account_type: AccountType | null
}
```

Final file content:

```ts
export const VALID_TYPES = ['knock', 'conversation', 'sale'] as const
export type EventType = typeof VALID_TYPES[number]

export type AccountType = 'gen_pest' | 'mosquito'
export const VALID_ACCOUNT_TYPES: readonly AccountType[] = ['gen_pest', 'mosquito']

export interface EventRow {
  type: EventType
  created_at: string
  contract_value?: number | null
  account_type?: AccountType | null
}

export interface SaleRow {
  id: string
  created_at: string
  contract_value: number | null
  account_type: AccountType | null
}

export type Counts = Record<EventType, number>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add SaleRow type"
```

---

## Task 2: Timezone support in query functions

**Files:**
- Modify: `lib/queries.ts`
- Modify: `__tests__/queries.test.ts`

The five functions `salesByDay`, `salesByHour`, `salesByDow`, `conversionRatesByWeek`, and `eventsByDay` all use UTC date extraction. Add an optional `timeZone: string` parameter (defaulting to `'UTC'`) and switch to `Intl.DateTimeFormat` so that any IANA timezone can be used.

- [ ] **Step 1: Add timezone-aware tests to `__tests__/queries.test.ts`**

Append these tests after the existing ones. June 2, 2026 is a Tuesday. A sale at `2026-06-02T02:00:00Z` is Monday June 1 at 22:00 in `America/New_York` (UTC-4 during DST).

```ts
// Timezone-aware tests
// 2026-06-02T02:00:00Z = Monday June 1 at 22:00 EDT (America/New_York is UTC-4 in June)
const tzSale = [
  { type: 'sale', created_at: '2026-06-02T02:00:00Z' },
] as const

test('salesByDay: uses local date when timeZone is provided', () => {
  const result = salesByDay(tzSale as any, 'America/New_York')
  expect(result).toEqual([{ day: '2026-06-01', sales: 1 }])
})

test('salesByDay: uses UTC date by default', () => {
  const result = salesByDay(tzSale as any)
  expect(result).toEqual([{ day: '2026-06-02', sales: 1 }])
})

test('salesByHour: uses local hour when timeZone is provided', () => {
  const result = salesByHour(tzSale as any, 'America/New_York')
  // 02:00 UTC = 22:00 EDT
  expect(result).toContainEqual({ hour: 22, sales: 1 })
})

test('salesByHour: uses UTC hour by default', () => {
  const result = salesByHour(tzSale as any)
  expect(result).toContainEqual({ hour: 2, sales: 1 })
})

test('salesByDow: uses local day-of-week when timeZone is provided', () => {
  const result = salesByDow(tzSale as any, 'America/New_York')
  // 02:00 UTC on Tuesday June 2 = 22:00 Monday June 1 in EDT
  const mon = result.find((r) => r.label === 'Mon')!
  const tue = result.find((r) => r.label === 'Tue')!
  expect(mon.sales).toBe(1)
  expect(tue.sales).toBe(0)
})

test('salesByDow: uses UTC day-of-week by default', () => {
  const result = salesByDow(tzSale as any)
  const tue = result.find((r) => r.label === 'Tue')!
  expect(tue.sales).toBe(1)
})

test('eventsByDay: uses local date when timeZone is provided', () => {
  const events = [
    { type: 'knock', created_at: '2026-06-02T02:00:00Z' },
  ] as any
  const result = eventsByDay(events, 'America/New_York')
  // Local date is June 1 in EDT
  expect(result['2026-06-01']).toEqual({ knock: 1, conversation: 0, sale: 0 })
  expect(result['2026-06-02']).toBeUndefined()
})
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx jest __tests__/queries.test.ts --testNamePattern="timezone" -t "timezone"
```

Expected: FAIL — functions don't accept a `timeZone` param yet.

- [ ] **Step 3: Update `lib/queries.ts` with timezone-aware implementations**

Replace the entire contents of `lib/queries.ts`:

```ts
import { type Counts, type EventRow } from '@/lib/types'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localDate(isoString: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(isoString))
}

function localHour(isoString: string, timeZone: string): number {
  const h = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(
      new Date(isoString)
    ),
    10
  )
  return h % 24 // guard against "24" returned by some Intl implementations at midnight
}

function localDow(isoString: string, timeZone: string): number {
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(
    new Date(isoString)
  )
  return DOW_LABELS.indexOf(dayName)
}

export function salesByDay(
  events: EventRow[],
  timeZone = 'UTC'
): { day: string; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<string, number>()
  for (const e of sales) {
    const day = localDate(e.created_at, timeZone)
    map.set(day, (map.get(day) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([day, sales]) => ({ day, sales }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

export function salesByHour(
  events: EventRow[],
  timeZone = 'UTC'
): { hour: number; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<number, number>()
  for (const e of sales) {
    const hour = localHour(e.created_at, timeZone)
    map.set(hour, (map.get(hour) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([hour, sales]) => ({ hour, sales }))
    .sort((a, b) => a.hour - b.hour)
}

export function salesByDow(
  events: EventRow[],
  timeZone = 'UTC'
): { dow: number; label: string; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<number, number>()
  for (const e of sales) {
    const dow = localDow(e.created_at, timeZone)
    if (dow !== -1) map.set(dow, (map.get(dow) ?? 0) + 1)
  }
  return DOW_LABELS.map((label, dow) => ({ dow, label, sales: map.get(dow) ?? 0 }))
}

export function conversionRatesByWeek(
  events: EventRow[],
  timeZone = 'UTC'
): { week: string; knockToSale: number; convoToSale: number }[] {
  const map = new Map<string, { knocks: number; convos: number; sales: number }>()

  for (const e of events) {
    const d = localDate(e.created_at, timeZone) // 'YYYY-MM-DD' in local time
    const [year, month, day] = d.split('-').map(Number)
    // Use UTC Date for day-of-week arithmetic on the local date
    const dateUtc = new Date(Date.UTC(year, month - 1, day))
    const dow = dateUtc.getUTCDay()
    const diff = dow === 0 ? -6 : 1 - dow // shift so Monday = start of week
    dateUtc.setUTCDate(dateUtc.getUTCDate() + diff)
    const week = dateUtc.toISOString().split('T')[0]

    if (!map.has(week)) map.set(week, { knocks: 0, convos: 0, sales: 0 })
    const entry = map.get(week)!
    if (e.type === 'knock') entry.knocks++
    if (e.type === 'conversation') entry.convos++
    if (e.type === 'sale') entry.sales++
  }

  return Array.from(map.entries())
    .map(([week, { knocks, convos, sales }]) => ({
      week,
      knockToSale: knocks > 0 ? Math.round((sales / knocks) * 100) : 0,
      convoToSale: convos > 0 ? Math.round((sales / convos) * 100) : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

export function lifetimeConversionRates(events: EventRow[]): {
  knockToSale: number
  convoToSale: number
} {
  const knocks = events.filter((e) => e.type === 'knock').length
  const convos = events.filter((e) => e.type === 'conversation').length
  const sales = events.filter((e) => e.type === 'sale').length
  return {
    knockToSale: knocks > 0 ? Math.round((sales / knocks) * 100) : 0,
    convoToSale: convos > 0 ? Math.round((sales / convos) * 100) : 0,
  }
}

export function contractStats(events: EventRow[]): {
  avgContractValue: number
  revenuePerDoor: number
} {
  const valuedSales = events.filter((e) => e.type === 'sale' && e.contract_value != null)
  const knocks = events.filter((e) => e.type === 'knock').length
  const totalValue = valuedSales.reduce((sum, e) => sum + (e.contract_value as number), 0)

  const avgContractValue =
    valuedSales.length > 0
      ? Math.round((totalValue / valuedSales.length) * 100) / 100
      : 0

  const revenuePerDoor =
    knocks > 0 ? Math.round((totalValue / knocks) * 100) / 100 : 0

  return { avgContractValue, revenuePerDoor }
}

export function eventsByDay(events: EventRow[], timeZone = 'UTC'): Record<string, Counts> {
  const result: Record<string, Counts> = {}
  for (const e of events) {
    const day = localDate(e.created_at, timeZone)
    if (!result[day]) result[day] = { knock: 0, conversation: 0, sale: 0 }
    result[day][e.type]++
  }
  return result
}
```

- [ ] **Step 4: Run the full query test suite**

```bash
npx jest __tests__/queries.test.ts
```

Expected: all tests PASS (existing UTC tests still pass because default is `'UTC'`; new timezone tests pass with the new implementation).

- [ ] **Step 5: Commit**

```bash
git add lib/queries.ts __tests__/queries.test.ts
git commit -m "feat: add timezone support to query functions"
```

---

## Task 3: TimezoneSync component

**Files:**
- Create: `components/TimezoneSync.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create `components/TimezoneSync.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `user-tz=${tz};path=/;max-age=31536000;samesite=lax`
  }, [])
  return null
}
```

- [ ] **Step 2: Render it in `app/(app)/layout.tsx`**

```tsx
import { NavBar } from '@/components/NavBar'
import { TimezoneSync } from '@/components/TimezoneSync'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('display_name, emoji')
        .eq('id', user.id)
        .single()
    : { data: null }

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col">
      <TimezoneSync />
      <NavBar
        email={user?.email ?? ''}
        displayName={profile?.display_name ?? ''}
        emoji={profile?.emoji ?? null}
      />
      <main className="max-w-2xl w-full mx-auto p-6 flex-1 flex flex-col">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/TimezoneSync.tsx app/(app)/layout.tsx
git commit -m "feat: add TimezoneSync to detect and persist browser timezone"
```

---

## Task 4: Fix stats page timezone

**Files:**
- Modify: `app/(app)/stats/page.tsx`

- [ ] **Step 1: Update `app/(app)/stats/page.tsx` to read the timezone cookie**

```tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  salesByDay,
  salesByHour,
  salesByDow,
  conversionRatesByWeek,
  lifetimeConversionRates,
  contractStats,
} from '@/lib/queries'
import { StatCard } from '@/components/StatCard'
import { SalesByDayChart } from '@/components/charts/SalesByDayChart'
import { SalesByHourChart } from '@/components/charts/SalesByHourChart'
import { SalesByDowChart } from '@/components/charts/SalesByDowChart'
import { ConversionTrendChart } from '@/components/charts/ConversionTrendChart'

export default async function StatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const timeZone = cookies().get('user-tz')?.value ?? 'UTC'

  const { data: events } = await supabase
    .from('events')
    .select('type, created_at, contract_value')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const allEvents = events ?? []

  const rates = lifetimeConversionRates(allEvents)
  const { avgContractValue, revenuePerDoor } = contractStats(allEvents)
  const byDay = salesByDay(allEvents, timeZone)
  const byHour = salesByHour(allEvents, timeZone)
  const byDow = salesByDow(allEvents, timeZone)
  const byWeek = conversionRatesByWeek(allEvents, timeZone)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Avg Contract" value={`$${Math.round(avgContractValue)}`} />
        <StatCard label="$ / Door" value={`$${revenuePerDoor.toFixed(2)}`} />
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
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/stats/page.tsx
git commit -m "fix: pass user timezone to stats query functions"
```

---

## Task 5: Fix tracker page and TrackerClient

**Files:**
- Modify: `app/(app)/tracker/page.tsx`
- Modify: `app/(app)/tracker/TrackerClient.tsx`

The tracker currently fetches events since UTC midnight. This is wrong for users in timezones behind UTC — the tracker resets prematurely. Fix: fetch the past 36 hours, let `TrackerClient` filter to "today" using the browser's local timezone.

- [ ] **Step 1: Update `app/(app)/tracker/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrackerClient } from './TrackerClient'
import { type EventType } from '@/lib/types'

export default async function TrackerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch past 36h — wide enough to cover any timezone offset.
  // TrackerClient filters to local-today in the browser.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('events')
    .select('type, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)

  const { data: profile } = await supabase
    .from('profiles')
    .select('emoji')
    .eq('id', user.id)
    .single()

  return (
    <TrackerClient
      initialEvents={(events ?? []) as { type: EventType; created_at: string }[]}
      emoji={profile?.emoji ?? null}
    />
  )
}
```

- [ ] **Step 2: Update `app/(app)/tracker/TrackerClient.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { MetricRow } from '@/components/MetricRow'
import { SaleModal } from '@/components/SaleModal'
import { type Counts, type EventType, type AccountType } from '@/lib/types'

interface Props {
  initialEvents: { type: EventType; created_at: string }[]
  emoji: string | null
}

function getGreeting(emoji: string | null): string | null {
  const hour = new Date().getHours()
  if (hour >= 8 && hour < 12) return 'Good Morning'
  if (hour >= 12 && hour < 17) return 'Good Afternoon'
  if (hour >= 17 && hour < 21) return `Prime Time ${emoji ?? ''}`
  return null
}

function todayCounts(events: { type: EventType; created_at: string }[]): Counts {
  const today = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD' in browser TZ
  const todayEvents = events.filter(
    (e) => new Date(e.created_at).toLocaleDateString('en-CA') === today
  )
  return {
    knock: todayEvents.filter((e) => e.type === 'knock').length,
    conversation: todayEvents.filter((e) => e.type === 'conversation').length,
    sale: todayEvents.filter((e) => e.type === 'sale').length,
  }
}

export function TrackerClient({ initialEvents, emoji }: Props) {
  const [counts, setCounts] = useState<Counts>(() => todayCounts(initialEvents))
  const [saleModalOpen, setSaleModalOpen] = useState(false)

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

  async function handleSaleConfirm(contractValue: number, accountType: AccountType) {
    setSaleModalOpen(false)
    setCounts((prev) => ({ ...prev, sale: prev.sale + 1 }))
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sale', contract_value: contractValue, account_type: accountType }),
    })
    if (!res.ok) {
      setCounts((prev) => ({ ...prev, sale: prev.sale - 1 }))
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const greeting = getGreeting(emoji)

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        {greeting && (
          <p className="text-white text-2xl font-bold mb-1">{greeting}</p>
        )}
        <p className="text-slate-400 text-sm">{today}</p>
      </div>

      <div className="flex flex-col gap-4">
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
          onIncrementSale={() => setSaleModalOpen(true)}
        />
      </div>

      <SaleModal
        open={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onConfirm={handleSaleConfirm}
      />
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests PASS. (No TrackerClient test file exists; existing tests are unaffected.)

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/tracker/page.tsx app/\(app\)/tracker/TrackerClient.tsx
git commit -m "fix: use 36h event window so tracker resets at local midnight not UTC midnight"
```

---

## Task 6: Fix DELETE handler timezone (undo boundary)

**Files:**
- Modify: `app/api/events/route.ts`

The DELETE handler also uses UTC midnight as the "today" boundary. Replace it with a 24-hour rolling window — the undo picks the most recent matching event in the past 24 hours, which is always the event just logged.

- [ ] **Step 1: Update the DELETE handler in `app/api/events/route.ts`**

Replace only the DELETE function (POST is unchanged):

```ts
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { type?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { type } = body

  if (!VALID_TYPES.includes(type as EventType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Use a 24-hour window instead of UTC midnight so undo works correctly
  // regardless of the user's timezone.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', type)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'No events to undo' }, { status: 404 })
  }

  const { error } = await supabase.from('events').delete().eq('id', events[0].id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Run the events API tests**

```bash
npx jest __tests__/api-events.test.ts
```

Expected: all tests PASS. (The mock resolves regardless of the `.gte()` argument, so the behavior change is transparent to the test.)

- [ ] **Step 3: Commit**

```bash
git add app/api/events/route.ts
git commit -m "fix: undo uses 24h window instead of UTC midnight boundary"
```

---

## Task 7: Fix calendar page and CalendarClient timezone

**Files:**
- Modify: `app/(app)/calendar/page.tsx`
- Modify: `components/CalendarClient.tsx`

- [ ] **Step 1: Update `app/(app)/calendar/page.tsx` to use local timezone for default month**

```tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { CalendarClient } from '@/components/CalendarClient'

interface Props {
  searchParams: { month?: string }
}

export default async function CalendarPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const timeZone = cookies().get('user-tz')?.value ?? 'UTC'

  // Compute current local year/month using the user's timezone
  const now = new Date()
  const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
  const [defaultYear, defaultMonth] = localDateStr.split('-').map(Number)

  let year = defaultYear
  let month = defaultMonth // 1–12

  const param = searchParams.month
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number)
    if (y >= 2020 && y <= 2100 && m >= 1 && m <= 12) {
      year = y
      month = m
    }
  }

  const mm = String(month).padStart(2, '0')
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMm = String(nextMonth).padStart(2, '0')

  const { data: events } = await supabase
    .from('events')
    .select('type, created_at')
    .eq('user_id', user.id)
    .gte('created_at', `${year}-${mm}-01T00:00:00.000Z`)
    .lt('created_at', `${nextYear}-${nextMm}-01T00:00:00.000Z`)
    .order('created_at', { ascending: true })

  return <CalendarClient events={events ?? []} year={year} month={month} />
}
```

- [ ] **Step 2: Update `components/CalendarClient.tsx` to use local timezone for `eventsByDay` and today highlight**

Replace these two lines in the component (they appear near the top of `CalendarClient`):

```ts
// Old:
const byDay = eventsByDay(events)
const todayStr = todayProp ?? new Date().toISOString().split('T')[0]

// New:
const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
const byDay = eventsByDay(events, browserTz)
const todayStr = todayProp ?? new Date().toLocaleDateString('en-CA')
```

Full updated `CalendarClient.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { eventsByDay } from '@/lib/queries'
import { type EventRow } from '@/lib/types'

interface Props {
  events: EventRow[]
  year: number
  month: number  // 1–12
  today?: string // ISO date string "YYYY-MM-DD", defaults to current local date
}

const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CalendarClient({ events, year, month, today: todayProp }: Props) {
  const router = useRouter()
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const byDay = eventsByDay(events, browserTz)

  const todayStr = todayProp ?? new Date().toLocaleDateString('en-CA')
  const todayYear = parseInt(todayStr.split('-')[0])
  const todayMonth = parseInt(todayStr.split('-')[1]) // 1–12
  const isCurrentMonth = year === todayYear && month === todayMonth

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month, 0).getDate()

  function navigate(dir: -1 | 1) {
    let y = year
    let m = month + dir
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/calendar?month=${y}-${String(m).padStart(2, '0')}`)
  }

  const prevMonth = month === 1 ? 12 : month - 1
  const nextMonth = month === 12 ? 1 : month + 1

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          aria-label="Previous month"
          className="bg-slate-800 text-slate-400 rounded-xl px-4 py-2 text-sm font-semibold active:opacity-70"
        >
          ← {MONTH_NAMES[prevMonth - 1].slice(0, 3)}
        </button>
        <span className="text-white font-bold text-lg">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={() => navigate(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="bg-slate-800 text-slate-400 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 active:opacity-70"
        >
          {MONTH_NAMES[nextMonth - 1].slice(0, 3)} →
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-xs text-slate-500 font-semibold">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const counts = byDay[dateStr]
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr

          return (
            <div
              key={dateStr}
              className={`bg-slate-800 rounded-lg p-1.5 h-24 ${
                isToday ? 'border border-blue-500' : ''
              } ${isFuture ? 'opacity-40' : ''}`}
            >
              <div className={`text-xs mb-1 ${isToday ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                {day}
              </div>
              {counts && !isFuture && (
                <div className="flex flex-col gap-0.5">
                  {counts.knock > 0 && (
                    <div className="bg-blue-700 rounded text-blue-300 text-[9px] font-semibold px-1 py-0.5">
                      K {counts.knock}
                    </div>
                  )}
                  {counts.conversation > 0 && (
                    <div className="bg-violet-800 rounded text-violet-300 text-[9px] font-semibold px-1 py-0.5">
                      C {counts.conversation}
                    </div>
                  )}
                  {counts.sale > 0 && (
                    <div className="bg-emerald-900 rounded text-emerald-300 text-[9px] font-semibold px-1 py-0.5">
                      S {counts.sale}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-700 rounded" />
          <span className="text-slate-400 text-xs">Knocks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-violet-800 rounded" />
          <span className="text-slate-400 text-xs">Conversations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-900 rounded" />
          <span className="text-slate-400 text-xs">Sales</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run CalendarClient tests**

```bash
npx jest __tests__/CalendarClient.test.tsx
```

Expected: all tests PASS. (All tests pass `today` prop directly; jsdom's `Intl` resolves to UTC which matches prior behavior.)

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/calendar/page.tsx components/CalendarClient.tsx
git commit -m "fix: use local timezone for calendar default month and day grouping"
```

---

## Task 8: Add Sales tab to NavBar

**Files:**
- Modify: `components/NavBar.tsx`
- Modify: `__tests__/NavBar.test.tsx`

- [ ] **Step 1: Add the Sales tab to the `tabs` array in `components/NavBar.tsx`**

```ts
const tabs = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Stats', href: '/stats' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Sales', href: '/sales' },
]
```

- [ ] **Step 2: Add a test for the Sales tab in `__tests__/NavBar.test.tsx`**

Add after the existing "renders brand and all tabs" test:

```ts
test('renders Sales tab', () => {
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Sales' })).toBeInTheDocument()
})

test('active tab (Sales) has blue class when on /sales', () => {
  mockPathname.mockReturnValue('/sales')
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Sales' })).toHaveClass('text-blue-400')
})
```

- [ ] **Step 3: Run the NavBar tests**

```bash
npx jest __tests__/NavBar.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add components/NavBar.tsx __tests__/NavBar.test.tsx
git commit -m "feat: add Sales tab to NavBar"
```

---

## Task 9: PATCH /api/events/[id] endpoint

**Files:**
- Create: `app/api/events/[id]/route.ts`
- Create: `__tests__/api-events-id.test.ts`

- [ ] **Step 1: Write the failing tests in `__tests__/api-events-id.test.ts`**

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// eslint-disable-next-line no-var
var mockUpdate: jest.Mock
// eslint-disable-next-line no-var
var mockSelectSingle: jest.Mock

jest.mock('@/lib/supabase/server', () => {
  mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  })
  mockSelectSingle = jest.fn().mockResolvedValue({
    data: { user_id: 'user-123' },
    error: null,
  })
  return {
    createClient: jest.fn().mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSelectSingle,
        update: mockUpdate,
      }),
    }),
  }
})

import { PATCH } from '@/app/api/events/[id]/route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/events/event-abc', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

test('PATCH returns 400 for missing contract_value', async () => {
  const res = await PATCH(makeRequest({}), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('contract_value must be a positive number')
})

test('PATCH returns 400 for zero contract_value', async () => {
  const res = await PATCH(makeRequest({ contract_value: 0 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('contract_value must be a positive number')
})

test('PATCH returns 400 for negative contract_value', async () => {
  const res = await PATCH(makeRequest({ contract_value: -50 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
})

test('PATCH returns 400 for string contract_value', async () => {
  const res = await PATCH(makeRequest({ contract_value: '299' }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
})

test('PATCH returns 400 on malformed JSON', async () => {
  const req = new NextRequest('http://localhost/api/events/event-abc', {
    method: 'PATCH',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
})

test('PATCH returns 403 when event belongs to a different user', async () => {
  mockSelectSingle.mockResolvedValueOnce({
    data: { user_id: 'other-user' },
    error: null,
  })
  const res = await PATCH(makeRequest({ contract_value: 299 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(403)
})

test('PATCH returns 404 when event does not exist', async () => {
  mockSelectSingle.mockResolvedValueOnce({ data: null, error: null })
  const res = await PATCH(makeRequest({ contract_value: 299 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(404)
})

test('PATCH updates contract_value and returns success', async () => {
  const res = await PATCH(makeRequest({ contract_value: 299 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx jest __tests__/api-events-id.test.ts
```

Expected: FAIL — module not found for `@/app/api/events/[id]/route`.

- [ ] **Step 3: Create `app/api/events/[id]/route.ts`**

```ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  let body: { contract_value?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { contract_value } = body
  if (typeof contract_value !== 'number' || contract_value <= 0) {
    return NextResponse.json(
      { error: 'contract_value must be a positive number' },
      { status: 400 }
    )
  }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (event.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('events')
    .update({ contract_value })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx jest __tests__/api-events-id.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/events/\[id\]/route.ts __tests__/api-events-id.test.ts
git commit -m "feat: add PATCH /api/events/[id] to update contract value"
```

---

## Task 10: EditContractModal component

**Files:**
- Create: `components/EditContractModal.tsx`
- Create: `__tests__/EditContractModal.test.tsx`

- [ ] **Step 1: Write failing tests in `__tests__/EditContractModal.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { EditContractModal } from '@/components/EditContractModal'
import { type SaleRow } from '@/lib/types'

const mockOnClose = jest.fn()
const mockOnSave = jest.fn()

const sale: SaleRow = {
  id: 'sale-1',
  created_at: '2026-05-03T14:00:00Z',
  contract_value: 349,
  account_type: 'gen_pest',
}

beforeEach(() => {
  jest.clearAllMocks()
})

test('does not render when sale is null', () => {
  render(<EditContractModal sale={null} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.queryByText('Edit Sale')).not.toBeInTheDocument()
})

test('renders when sale is provided', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByRole('heading', { name: 'Edit Sale' })).toBeInTheDocument()
})

test('pre-fills contract value from sale', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  const input = screen.getByRole('spinbutton')
  expect(input).toHaveValue(349)
})

test('shows account type as read-only text', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByText('Gen Pest')).toBeInTheDocument()
})

test('shows Mosquito for mosquito account type', () => {
  const mosquitoSale = { ...sale, account_type: 'mosquito' as const }
  render(<EditContractModal sale={mosquitoSale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByText('Mosquito')).toBeInTheDocument()
})

test('Save is disabled when value is unchanged', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save is disabled when value is empty', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save is disabled when value is zero', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } })
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save is enabled after changing to a positive value', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '299' } })
  expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
})

test('Save calls onSave with id and new contract value', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '299' } })
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(mockOnSave).toHaveBeenCalledWith('sale-1', 299)
})

test('Cancel calls onClose', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(mockOnClose).toHaveBeenCalledTimes(1)
  expect(mockOnSave).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/EditContractModal.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/EditContractModal.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { type SaleRow } from '@/lib/types'

interface Props {
  sale: SaleRow | null
  onClose: () => void
  onSave: (id: string, contractValue: number) => void
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  gen_pest: 'Gen Pest',
  mosquito: 'Mosquito',
}

export function EditContractModal({ sale, onClose, onSave }: Props) {
  const [contractValue, setContractValue] = useState('')

  useEffect(() => {
    if (sale) {
      setContractValue(sale.contract_value != null ? String(sale.contract_value) : '')
    }
  }, [sale])

  if (!sale) return null

  const parsedValue = parseFloat(contractValue)
  const isValid = !isNaN(parsedValue) && parsedValue > 0
  const isUnchanged = parsedValue === sale.contract_value

  function handleClose() {
    setContractValue('')
    onClose()
  }

  function handleSave() {
    if (!isValid || isUnchanged) return
    onSave(sale!.id, parsedValue)
    setContractValue('')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-contract-modal-title"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
        <h2 id="edit-contract-modal-title" className="text-white text-lg font-bold mb-5">
          Edit Sale
        </h2>

        <div className="mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Account Type</p>
          <div className="bg-slate-900 rounded-xl px-4 py-3 text-slate-300 text-sm font-semibold">
            {ACCOUNT_TYPE_LABELS[sale.account_type ?? ''] ?? sale.account_type}
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="edit-contract-value"
            className="text-slate-400 text-xs uppercase tracking-widest mb-2 block"
          >
            Contract Value
          </label>
          <div className="flex items-center bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 gap-2">
            <span className="text-slate-500 font-semibold" aria-hidden="true">$</span>
            <input
              id="edit-contract-value"
              type="number"
              inputMode="decimal"
              min="0.01"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              className="bg-transparent text-white text-lg flex-1 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isUnchanged}
            className="flex-[2] py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 active:opacity-80"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx jest __tests__/EditContractModal.test.tsx
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/EditContractModal.tsx __tests__/EditContractModal.test.tsx
git commit -m "feat: add EditContractModal component"
```

---

## Task 11: Sales page (server component + SalesClient)

**Files:**
- Create: `app/(app)/sales/page.tsx`
- Create: `app/(app)/sales/SalesClient.tsx`

- [ ] **Step 1: Create `app/(app)/sales/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SalesClient } from './SalesClient'
import { type SaleRow } from '@/lib/types'

export default async function SalesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sales } = await supabase
    .from('events')
    .select('id, created_at, contract_value, account_type')
    .eq('user_id', user.id)
    .eq('type', 'sale')
    .order('created_at', { ascending: false })

  return <SalesClient initialSales={(sales ?? []) as SaleRow[]} />
}
```

- [ ] **Step 2: Create `app/(app)/sales/SalesClient.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { type SaleRow } from '@/lib/types'
import { EditContractModal } from '@/components/EditContractModal'

interface SaleGroup {
  dateStr: string
  label: string
  totalValue: number
  rows: SaleRow[]
}

function formatDayLabel(dateStr: string): string {
  const today = new Date().toLocaleDateString('en-CA')
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function groupByDay(sales: SaleRow[]): SaleGroup[] {
  const map = new Map<string, SaleRow[]>()
  for (const sale of sales) {
    const dateStr = new Date(sale.created_at).toLocaleDateString('en-CA')
    if (!map.has(dateStr)) map.set(dateStr, [])
    map.get(dateStr)!.push(sale)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([dateStr, rows]) => ({
      dateStr,
      label: formatDayLabel(dateStr),
      totalValue: rows.reduce((sum, r) => sum + (r.contract_value ?? 0), 0),
      rows,
    }))
}

interface Props {
  initialSales: SaleRow[]
}

export function SalesClient({ initialSales }: Props) {
  const [sales, setSales] = useState<SaleRow[]>(initialSales)
  const [editingSale, setEditingSale] = useState<SaleRow | null>(null)

  const groups = groupByDay(sales)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups[0] ? [groups[0].dateStr] : [])
  )

  function toggleGroup(dateStr: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  async function handleSave(id: string, contractValue: number) {
    const originalSale = sales.find((s) => s.id === id)
    setSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, contract_value: contractValue } : s))
    )
    setEditingSale(null)

    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_value: contractValue }),
    })

    if (!res.ok && originalSale) {
      setSales((prev) => prev.map((s) => (s.id === id ? originalSale : s)))
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-slate-400 text-sm mt-8 text-center">No sales logged yet.</p>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 pt-4">
        {groups.map((group) => {
          const isOpen = expanded.has(group.dateStr)
          return (
            <div key={group.dateStr}>
              <button
                onClick={() => toggleGroup(group.dateStr)}
                className="w-full flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 active:opacity-70"
              >
                <span className="text-white font-semibold text-sm">{group.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-semibold text-sm">
                    ${group.totalValue.toLocaleString()}
                  </span>
                  {!isOpen && (
                    <span className="text-slate-400 text-xs">
                      {group.rows.length} {group.rows.length === 1 ? 'sale' : 'sales'}
                    </span>
                  )}
                  <span className="text-slate-500 text-xs">{isOpen ? '▼' : '▶'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-2 mt-2 pl-2">
                  {group.rows.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => setEditingSale(sale)}
                      className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 w-full active:opacity-70"
                    >
                      <div className="text-left">
                        <div className="text-white text-sm font-semibold">
                          {sale.account_type === 'gen_pest' ? 'Gen Pest' : 'Mosquito'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {new Date(sale.created_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-emerald-400 text-base font-bold">
                        {sale.contract_value != null
                          ? `$${sale.contract_value.toLocaleString()}`
                          : '—'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <EditContractModal
        sale={editingSale}
        onClose={() => setEditingSale(null)}
        onSave={handleSave}
      />
    </>
  )
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/sales/page.tsx app/\(app\)/sales/SalesClient.tsx
git commit -m "feat: add Sales page with collapsible day groups and contract value editing"
```

---

## Task 12: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

Open `.gitignore` and add:

```
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm artifacts"
```
