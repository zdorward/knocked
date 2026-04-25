# Calendar Tab Design

**Date:** 2026-04-24
**Status:** Approved

## Summary

A new Calendar tab shows a monthly grid of past activity. Each day cell displays colored chips for knocks (K), conversations (C), and sales (S). The user can navigate between months with prev/next buttons.

## Navigation

Add a third tab to `NavBar`:

```ts
const tabs = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Stats', href: '/stats' },
  { label: 'Calendar', href: '/calendar' },
]
```

No other NavBar changes.

## Data Model

No schema changes. The existing `events` table is sufficient.

### New query (`lib/queries.ts`)

```ts
export function eventsByDay(
  events: EventRow[]
): Record<string, { knock: number; conversation: number; sale: number }>
```

Groups events by ISO date string (`"2026-05-14"`). Returns an object keyed by date, values are counts per event type. Days with no events are absent from the result (not present with zero counts).

## Route (`app/(app)/calendar/page.tsx`)

Server Component. Reads `searchParams.month` (format: `"YYYY-MM"`). Defaults to the current UTC month if absent or malformed.

Fetches only the selected month's events:

```ts
const { data: events } = await supabase
  .from('events')
  .select('type, created_at')
  .eq('user_id', user.id)
  .gte('created_at', `${year}-${mm}-01T00:00:00.000Z`)
  .lt('created_at', `${nextYear}-${nextMm}-01T00:00:00.000Z`)
  .order('created_at', { ascending: true })
```

Passes `events`, `year`, and `month` (1-indexed) as props to `CalendarClient`.

## UI (`components/CalendarClient.tsx`)

Client Component. Props:

```ts
interface Props {
  events: EventRow[]
  year: number
  month: number  // 1–12
}
```

### Layout

- **Month header**: `← PrevMonth` | `Month YYYY` | `NextMonth →`
- **Day-of-week row**: SUN MON TUE WED THU FRI SAT (abbreviated, uppercase)
- **Grid**: 7-column grid, leading empty cells to align day 1 to the correct column
- **Legend**: at bottom — colored squares for Knocks / Conversations / Sales

### Day cells

Each cell shows the day number and up to three colored chips:

| Chip | Background | Text color | Label format |
|------|-----------|------------|--------------|
| Knock | `bg-blue-700` | `text-blue-300` | `K 14` |
| Conversation | `bg-violet-800` | `text-violet-300` | `C 7` |
| Sale | `bg-emerald-900` | `text-emerald-300` | `S 2` |

Chips only render when count > 0. Days with no activity show just the date number.

**Today**: blue border (`border-blue-500 border`) + blue date number.

**Future days in current month**: rendered with reduced opacity (`opacity-40`) and no chips.

**Days in other months** (leading/trailing empty slots): empty `<div>` cells, no background.

### Navigation

Prev/next buttons compute the adjacent month and call `router.push('/calendar?month=YYYY-MM')`. The route re-renders server-side with the correct month's data. The "next" button is disabled when the current month is the present calendar month (cannot navigate into the future).

## Out of Scope

- Tapping a day to see event detail
- Week view
- Displaying contract value on calendar days
