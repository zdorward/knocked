# Calendar Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Calendar tab that shows a monthly grid of knocks, conversations, and sales per day, with prev/next month navigation.

**Architecture:** A new Server Component page at `/calendar` reads a `?month=YYYY-MM` search param, fetches only that month's events from Supabase, and passes them to a `CalendarClient` component that renders the grid and handles navigation by pushing URL updates. A new `eventsByDay` pure function groups events by date.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase (Postgres), Jest + React Testing Library

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/queries.ts` | Add `eventsByDay` function |
| Modify | `__tests__/queries.test.ts` | Tests for `eventsByDay` |
| Modify | `components/NavBar.tsx` | Add Calendar tab to `tabs` array |
| Modify | `__tests__/NavBar.test.tsx` | Assert Calendar link renders |
| Create | `components/CalendarClient.tsx` | Calendar grid, month navigation |
| Create | `__tests__/CalendarClient.test.tsx` | CalendarClient behavior tests |
| Create | `app/(app)/calendar/page.tsx` | Server Component — fetch month, render CalendarClient |

---

### Task 1: `eventsByDay` query

**Files:**
- Modify: `lib/queries.ts`
- Modify: `__tests__/queries.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests at the bottom of `__tests__/queries.test.ts`. First, add `eventsByDay` to the existing import at the top of the file:

```ts
import {
  salesByDay,
  salesByHour,
  salesByDow,
  conversionRatesByWeek,
  lifetimeConversionRates,
  contractStats,
  eventsByDay,
} from '@/lib/queries'
```

Then append these tests at the end of the file:

```ts
test('eventsByDay: returns empty object for no events', () => {
  expect(eventsByDay([])).toEqual({})
})

test('eventsByDay: groups counts by UTC date', () => {
  const events: EventRow[] = [
    { type: 'knock',        created_at: '2026-05-14T09:00:00Z' },
    { type: 'knock',        created_at: '2026-05-14T10:00:00Z' },
    { type: 'conversation', created_at: '2026-05-14T11:00:00Z' },
    { type: 'sale',         created_at: '2026-05-15T09:00:00Z' },
  ]
  const result = eventsByDay(events)
  expect(result['2026-05-14']).toEqual({ knock: 2, conversation: 1, sale: 0 })
  expect(result['2026-05-15']).toEqual({ knock: 0, conversation: 0, sale: 1 })
})

test('eventsByDay: omits dates with no events', () => {
  const events: EventRow[] = [
    { type: 'knock', created_at: '2026-05-14T09:00:00Z' },
  ]
  const result = eventsByDay(events)
  expect(Object.keys(result)).toHaveLength(1)
  expect(result['2026-05-13']).toBeUndefined()
})
```

Note: `EventRow` is already imported via the existing import block at the top of `__tests__/queries.test.ts` — no change needed there, it comes transitively through the query imports. If it isn't imported, add:
```ts
import { type EventRow } from '@/lib/types'
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/queries.test.ts
```

Expected: FAIL — "eventsByDay is not a function"

- [ ] **Step 3: Add `eventsByDay` to `lib/queries.ts`**

Append at the end of `lib/queries.ts`:

```ts
export function eventsByDay(
  events: EventRow[]
): Record<string, { knock: number; conversation: number; sale: number }> {
  const result: Record<string, { knock: number; conversation: number; sale: number }> = {}
  for (const e of events) {
    const day = e.created_at.split('T')[0]
    if (!result[day]) result[day] = { knock: 0, conversation: 0, sale: 0 }
    result[day][e.type]++
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/queries.test.ts
```

Expected: all query tests pass (existing 15 + new 3 = 18 total)

- [ ] **Step 5: Commit**

```bash
git add lib/queries.ts __tests__/queries.test.ts
git commit -m "feat: add eventsByDay query for calendar grouping"
```

---

### Task 2: Calendar tab in NavBar

**Files:**
- Modify: `__tests__/NavBar.test.tsx`
- Modify: `components/NavBar.tsx`

- [ ] **Step 1: Write the failing test**

In `__tests__/NavBar.test.tsx`, update the first test from `'renders brand and both tabs'` to `'renders brand and all tabs'` and add the Calendar assertion:

```ts
test('renders brand and all tabs', () => {
  render(<NavBar email="test@example.com" />)
  expect(screen.getByText('Knocked')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tracker' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument()
})
```

Also add an active-tab test for Calendar:

```ts
test('active tab (Calendar) has blue class when on /calendar', () => {
  mockPathname.mockReturnValue('/calendar')
  render(<NavBar email="test@example.com" />)
  const calendarLink = screen.getByRole('link', { name: 'Calendar' })
  expect(calendarLink).toHaveClass('text-blue-400')
})
```

- [ ] **Step 2: Run tests to verify the new tests fail**

```bash
npx jest __tests__/NavBar.test.tsx
```

Expected: FAIL — "Unable to find role='link' with name 'Calendar'"

- [ ] **Step 3: Add Calendar tab to `components/NavBar.tsx`**

Find the `tabs` constant and add the Calendar entry:

```ts
const tabs = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Stats', href: '/stats' },
  { label: 'Calendar', href: '/calendar' },
]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/NavBar.test.tsx
```

Expected: all 8 tests pass (7 original + 1 new Calendar active-tab test; the "both tabs" test was renamed in place)

- [ ] **Step 5: Commit**

```bash
git add components/NavBar.tsx __tests__/NavBar.test.tsx
git commit -m "feat: add Calendar tab to NavBar"
```

---

### Task 3: CalendarClient component

**Files:**
- Create: `__tests__/CalendarClient.test.tsx`
- Create: `components/CalendarClient.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/CalendarClient.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarClient } from '@/components/CalendarClient'
import { type EventRow } from '@/lib/types'

// Use var so declarations are hoisted above jest.mock factory
// eslint-disable-next-line no-var
var mockPush: jest.Mock

jest.mock('next/navigation', () => {
  mockPush = jest.fn()
  return {
    useRouter: () => ({ push: mockPush }),
  }
})

beforeEach(() => {
  mockPush.mockClear()
})

// May 2026: May 1 = Friday (firstDayOfWeek = 5), 31 days
// today = "2026-05-12" for all tests below
const MAY_EVENTS: EventRow[] = [
  { type: 'knock',        created_at: '2026-05-04T09:00:00Z' },
  { type: 'knock',        created_at: '2026-05-04T10:00:00Z' },
  { type: 'conversation', created_at: '2026-05-04T11:00:00Z' },
  { type: 'sale',         created_at: '2026-05-04T12:00:00Z' },
]

test('renders month name and year', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  expect(screen.getByText('May 2026')).toBeInTheDocument()
})

test('renders all seven day-of-week headers', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  for (const label of ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})

test('renders K/C/S chips for a day with events', () => {
  render(<CalendarClient events={MAY_EVENTS} year={2026} month={5} today="2026-05-12" />)
  expect(screen.getByText('K 2')).toBeInTheDocument()
  expect(screen.getByText('C 1')).toBeInTheDocument()
  expect(screen.getByText('S 1')).toBeInTheDocument()
})

test('renders no chips for a day with no events', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  expect(screen.queryByText(/^K /)).not.toBeInTheDocument()
  expect(screen.queryByText(/^C /)).not.toBeInTheDocument()
  expect(screen.queryByText(/^S /)).not.toBeInTheDocument()
})

test('next button is disabled on the current month', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
})

test('next button is enabled on a past month', () => {
  render(<CalendarClient events={[]} year={2026} month={4} today="2026-05-12" />)
  expect(screen.getByRole('button', { name: 'Next month' })).not.toBeDisabled()
})

test('clicking prev navigates to the previous month URL', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2026-04')
})

test('clicking next navigates to the next month URL', () => {
  render(<CalendarClient events={[]} year={2026} month={4} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2026-05')
})

test('prev navigation wraps from January to December of previous year', () => {
  render(<CalendarClient events={[]} year={2026} month={1} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2025-12')
})

test('next navigation wraps from December to January of next year', () => {
  render(<CalendarClient events={[]} year={2025} month={12} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2026-01')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/CalendarClient.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/CalendarClient'"

- [ ] **Step 3: Create `components/CalendarClient.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { eventsByDay } from '@/lib/queries'
import { type EventRow } from '@/lib/types'

interface Props {
  events: EventRow[]
  year: number
  month: number  // 1–12
  today?: string // ISO date string "YYYY-MM-DD", defaults to current UTC date
}

const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CalendarClient({ events, year, month, today: todayProp }: Props) {
  const router = useRouter()
  const byDay = eventsByDay(events)

  const todayStr = todayProp ?? new Date().toISOString().split('T')[0]
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
    <div>
      {/* Month navigation */}
      <div className="flex justify-between items-center mb-4">
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
              className={`bg-slate-800 rounded-lg p-1.5 min-h-16 ${
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
      <div className="flex gap-4 mt-4 justify-center">
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/CalendarClient.test.tsx
```

Expected: all 10 tests pass

- [ ] **Step 5: Run the full suite to catch regressions**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add components/CalendarClient.tsx __tests__/CalendarClient.test.tsx
git commit -m "feat: add CalendarClient component with monthly grid and navigation"
```

---

### Task 4: Calendar page

**Files:**
- Create: `app/(app)/calendar/page.tsx`

No unit tests — this is a thin Server Component wrapper whose behavior is covered by CalendarClient tests and Supabase mocking is already established for other pages.

- [ ] **Step 1: Create `app/(app)/calendar/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
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

  // Parse ?month=YYYY-MM, fall back to current UTC month
  const now = new Date()
  let year = now.getUTCFullYear()
  let month = now.getUTCMonth() + 1 // 1–12

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

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/calendar/page.tsx"
git commit -m "feat: add /calendar page with month-scoped event fetching"
```
