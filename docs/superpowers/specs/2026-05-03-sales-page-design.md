# Sales Page & Timezone Fix — Design Spec

**Date:** 2026-05-03  
**Status:** Approved

---

## Overview

Two related changes:

1. **Sales page** (`/sales`) — a new nav tab showing all-time sales history, grouped by day with collapsible sections. Tapping a row opens a modal to edit the contract value.
2. **Timezone fix** — the app currently uses UTC for all date operations. This causes wrong "today" counts in the tracker and wrong hour/day-of-week buckets in stats charts. The fix detects the user's browser timezone and threads it through all date-sensitive logic.

---

## 1. Route & Navigation

- New route: `app/(app)/sales/page.tsx` — Server Component.
- Add `{ label: 'Sales', href: '/sales' }` to the `tabs` array in `components/NavBar.tsx`, after Calendar.

---

## 2. Timezone Fix

### Root cause

Server components and query functions use UTC date operations (`getUTCHours()`, `getUTCDay()`, `.toISOString().split('T')[0]`). The server has no knowledge of the user's timezone.

### Fix

**Step 1 — Detect and persist timezone client-side.**  
Add a `TimezoneSync` component (`components/TimezoneSync.tsx`) — a `'use client'` component with no visible UI. On mount it sets a `user-tz` cookie to `Intl.DateTimeFormat().resolvedOptions().timeZone` (e.g. `"America/New_York"`). Render it once in `app/(app)/layout.tsx`.

**Step 2 — Read the cookie in server components.**  
Server components that need timezone-aware date logic read the `user-tz` cookie via `next/headers` cookies(). They fall back to `"UTC"` if the cookie is absent (first load before mount).

**Step 3 — Thread timezone into query functions.**  
All date-bucketing query functions in `lib/queries.ts` accept an optional `timeZone: string` parameter (default `"UTC"`). They use `new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(ts))` to extract local date strings (YYYY-MM-DD), and `new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(...)` for local hour. Affected functions:

- `salesByDay` — groups by local date
- `salesByHour` — buckets by local hour (replaces `getUTCHours()`)
- `salesByDow` — buckets by local day-of-week (replaces `getUTCDay()`)
- `conversionRatesByWeek` — week boundaries use local date
- `eventsByDay` — groups by local date (used by Calendar)

**Step 4 — Fix tracker "today" boundary.**  
`tracker/page.tsx` fetches events from the past 36 hours (a window wide enough to cover any timezone offset) and passes them as raw rows to `TrackerClient`. `TrackerClient` filters to today using `new Date(created_at).toLocaleDateString('en-CA')` — which runs in the browser and uses the correct local timezone automatically. This avoids server-side timezone offset arithmetic entirely. `TrackerClient`'s props change from `initialCounts: Counts` to `initialEvents: Pick<EventRow, 'type' | 'created_at'>[]`; counts are derived client-side on mount.

**Step 5 — Fix calendar default month.**  
`calendar/page.tsx` reads the `user-tz` cookie and uses `Intl.DateTimeFormat` to get the current local year/month instead of `getUTCFullYear()` / `getUTCMonth()`.

---

## 3. Data Layer (Sales Page)

### `lib/types.ts`

Add a new `SaleRow` interface — separate from `EventRow` to avoid forcing `id` onto queries that don't select it (stats, tracker, calendar):

```ts
export interface SaleRow {
  id: string
  created_at: string
  contract_value: number | null
  account_type: AccountType | null
}
```

`EventRow` is unchanged.

### `lib/queries.ts`

The sales history fetch is not a pure data transform, so it lives in the page file rather than `lib/queries.ts`. The page fetches:

```ts
supabase
  .from('events')
  .select('id, created_at, contract_value, account_type')
  .eq('user_id', user.id)
  .eq('type', 'sale')
  .order('created_at', { ascending: false })
```

Returns a flat array of sale rows passed as props to `SalesClient`.

### API — `app/api/events/[id]/route.ts`

New `PATCH` endpoint. Accepts `{ contract_value: number }`. 

- Validates the user owns the event (fetches the row and checks `user_id`).
- Validates `contract_value` is a positive number.
- Updates the row.
- Returns `{ success: true }` or an error.

The existing `app/api/events/route.ts` (POST/DELETE) is unchanged.

---

## 4. Components

### `app/(app)/sales/SalesClient.tsx`

`'use client'` component. Props: `initialSales: SaleRow[]` (the `SaleRow` type from `lib/types.ts`).

**Grouping:** Groups the flat array by local calendar day using `new Date(created_at).toLocaleDateString('en-CA')` (runs in browser — always uses browser timezone, no cookie needed). Produces an ordered array of `{ dateStr, label, totalValue, rows }` groups.

**Collapse state:** `Map<string, boolean>` keyed by `dateStr`. Default: most recent group is `true` (expanded), all others `false` (collapsed). Toggled by tapping the group header.

**Group header shows:** Day label (e.g. "Today", "Yesterday", or "Tuesday, Apr 29"), total contract value for the day, sale count, and a chevron indicating open/closed state. When collapsed, count and total are visible in the header.

**Sale row shows:** Account type label ("Gen Pest" / "Mosquito"), time formatted with `toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })`, and contract value. Tapping the row sets `editingSale` state and opens the edit modal.

**Optimistic update:** On save, immediately update the local sale in state, then call `PATCH /api/events/[id]`. On failure, revert and surface the error.

### `components/EditContractModal.tsx`

Same visual style as `SaleModal`. Props: `sale: SaleRow | null`, `onClose: () => void`, `onSave: (id: string, contractValue: number) => void`.

- Shows account type as a read-only label (not editable per spec).
- Single contract value input with `$` prefix, pre-filled with current value.
- Cancel and Save buttons. Save disabled if value is not a positive number or unchanged.
- Reuses the same input pattern (`inputMode="decimal"`, `autoFocus`).

---

## 5. File Checklist

| File | Change |
|---|---|
| `components/TimezoneSync.tsx` | New — sets `user-tz` cookie on mount |
| `app/(app)/layout.tsx` | Render `<TimezoneSync />` |
| `lib/types.ts` | Add new `SaleRow` interface |
| `lib/queries.ts` | Add `timeZone` param to 5 functions; use local time methods |
| `app/(app)/tracker/page.tsx` | Fetch past 36h events; pass raw rows to TrackerClient |
| `app/(app)/tracker/TrackerClient.tsx` | Accept raw events instead of counts; derive counts client-side by local date |
| `app/(app)/stats/page.tsx` | Read `user-tz` cookie; pass to query functions |
| `app/(app)/calendar/page.tsx` | Read `user-tz` cookie; use local year/month |
| `components/NavBar.tsx` | Add Sales tab |
| `app/(app)/sales/page.tsx` | New — fetches sale rows, passes to SalesClient |
| `app/api/events/[id]/route.ts` | New — PATCH endpoint for contract value update |
| `app/(app)/sales/SalesClient.tsx` | New — collapsible day-grouped list with edit |
| `components/EditContractModal.tsx` | New — contract value edit modal |

---

## 6. Testing

- **API tests** for `PATCH /api/events/[id]`: valid update, unauthorized (wrong user), invalid value (negative, non-number, missing).
- **Query function tests** for timezone-sensitive functions: verify that a UTC timestamp near midnight is bucketed to the correct local day/hour with a given timezone offset.
- **Component tests** for `EditContractModal`: renders current value, Save disabled when unchanged, calls `onSave` with correct args.
- No new tests needed for `TimezoneSync` (trivial DOM effect).
