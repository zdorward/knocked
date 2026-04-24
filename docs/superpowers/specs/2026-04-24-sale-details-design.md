# Sale Details Design

**Date:** 2026-04-24  
**Status:** Approved

## Summary

When a salesperson logs a sale, they need to capture two extra fields: contract value (dollar amount) and account type (Gen Pest or Mosquito). Average contract value and dollars-per-door are surfaced in Stats.

## Data Model

### Migration

Add two nullable columns to the existing `events` table:

```sql
ALTER TABLE events ADD COLUMN contract_value numeric;
ALTER TABLE events ADD COLUMN account_type text;
```

`contract_value` and `account_type` are `NULL` for knock and conversation events. For sale events, both are always set (required in the UI before logging).

### Type changes (`lib/types.ts`)

```ts
export type AccountType = 'gen_pest' | 'mosquito'

export interface EventRow {
  type: EventType
  created_at: string
  contract_value?: number | null
  account_type?: AccountType | null
}
```

## API (`app/api/events/route.ts`)

### POST

Accepts two new optional fields in the request body when `type === 'sale'`:

| Field | Type | Validation |
|---|---|---|
| `contract_value` | number | positive, required when type is 'sale' |
| `account_type` | string | `'gen_pest'` or `'mosquito'`, required when type is 'sale' |

Non-sale events ignore both fields. The validated values are passed to `supabase.from('events').insert(...)` alongside `user_id` and `type`.

### DELETE

Unchanged — undo deletes the most recent sale event by ID with no metadata handling.

## UI

### `SaleModal` component (new — `components/SaleModal.tsx`)

A client component rendered in `TrackerClient`. Shown when the user taps **+** on the Sales row.

**Props:**
```ts
interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (contractValue: number, accountType: AccountType) => void
}
```

**Layout:**
- Title: "Log Sale"
- Contract value: `$` prefix + number input
- Account type toggle: two buttons — **Gen Pest** (left, default selected) | **Mosquito**
- Footer: Cancel button + Log Sale button (disabled until contract value > 0)

**Behavior:**
- Account type defaults to `'gen_pest'` each time the modal opens
- Contract value clears to empty each time the modal opens
- Cancel: closes modal, nothing logged
- Log Sale: calls `onConfirm(contractValue, accountType)`, closes modal

### `MetricRow` changes (`components/MetricRow.tsx`)

Add an optional `onIncrementSale` prop:

```ts
onIncrementSale?: () => void
```

When provided, the + button calls `onIncrementSale` instead of `onIncrement`. The sale row in `TrackerClient` passes this prop; knock and conversation rows are unchanged.

### `TrackerClient` changes (`app/(app)/tracker/TrackerClient.tsx`)

- New state: `saleModalOpen: boolean`
- Pass `onIncrementSale={() => setSaleModalOpen(true)}` to the sale `MetricRow`
- Render `<SaleModal>` with:
  - `open={saleModalOpen}`
  - `onClose={() => setSaleModalOpen(false)}`
  - `onConfirm={handleSaleConfirm}`
- `handleSaleConfirm(contractValue, accountType)`:
  1. Optimistically increment sale count
  2. Close modal
  3. POST to `/api/events` with `{ type: 'sale', contract_value: contractValue, account_type: accountType }`
  4. Roll back count on error

## Stats

### New query (`lib/queries.ts`)

```ts
export function contractStats(events: EventRow[]): {
  avgContractValue: number
  revenuePerDoor: number
} 
```

- `avgContractValue`: average `contract_value` across sales that have a non-null value (0 if none)
- `revenuePerDoor`: sum of all `contract_value` ÷ total knocks (0 if no knocks)
- Both values rounded to two decimal places

### Stats page changes (`app/(app)/stats/page.tsx`)

- Add `contract_value` to the Supabase `select()` call
- Call `contractStats(allEvents)` 
- Add two new `StatCard`s at the top of the page:
  - **Avg Contract** — formatted as `$X` (whole dollars, no cents needed for display)
  - **$ / Door** — formatted as `$X.XX`

The existing four stat cards remain unchanged.

## Out of Scope

- Breakdown of stats by account type (Mosquito vs Gen Pest)
- Editing a previously logged sale
- Displaying account type on the tracker count
