# Sale Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When logging a sale, capture contract value and account type (Gen Pest / Mosquito) via a modal, and surface average contract value and $ per door in Stats.

**Architecture:** Two nullable columns (`contract_value`, `account_type`) are added to the `events` table. The sale + button opens a `SaleModal` instead of logging immediately. The API validates and stores the extra fields for sale events. A new `contractStats()` query powers two new StatCards on the Stats page.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase (Postgres), Jest + React Testing Library

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Run manually** | Supabase SQL editor | Add `contract_value` + `account_type` columns |
| Modify | `lib/types.ts` | Add `AccountType`, update `EventRow` |
| Modify | `app/api/events/route.ts` | Validate + insert sale metadata |
| Modify | `__tests__/api-events.test.ts` | Tests for new sale validation |
| Modify | `lib/queries.ts` | Add `contractStats()` |
| Modify | `__tests__/queries.test.ts` | Tests for `contractStats()` |
| Create | `components/SaleModal.tsx` | Sale logging modal UI |
| Create | `__tests__/SaleModal.test.tsx` | Modal behavior tests |
| Modify | `components/MetricRow.tsx` | Add optional `onIncrementSale` prop |
| Modify | `app/(app)/tracker/TrackerClient.tsx` | Wire modal into sale row |
| Modify | `app/(app)/stats/page.tsx` | Fetch `contract_value`, show new StatCards |

---

## Prerequisites — Run the database migration

Before writing any code, apply the migration in the **Supabase Dashboard → SQL Editor**:

```sql
ALTER TABLE events ADD COLUMN contract_value numeric;
ALTER TABLE events ADD COLUMN account_type text;
```

This is a non-destructive additive migration. Existing rows will have `NULL` for both columns.

---

### Task 1: Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Update `lib/types.ts`**

Replace the entire file with:

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

export type Counts = Record<EventType, number>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors (pre-existing type errors in test files are acceptable)

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npm test
```

Expected: all 24 tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add AccountType and contract_value/account_type to EventRow"
```

---

### Task 2: API validation for sale metadata

**Files:**
- Modify: `app/api/events/route.ts`
- Modify: `__tests__/api-events.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests to the bottom of `__tests__/api-events.test.ts`:

```ts
test('POST sale without contract_value returns 400', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'sale', account_type: 'gen_pest' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('contract_value must be a positive number')
})

test('POST sale with invalid account_type returns 400', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'sale', contract_value: 299, account_type: 'bad' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('Invalid account_type')
})

test('POST sale with valid contract_value and account_type returns 200', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'sale', contract_value: 299, account_type: 'gen_pest' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true })
})

test('POST knock without sale fields returns 200', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'knock' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/api-events.test.ts
```

Expected: the 3 new sale tests fail (validation not yet implemented)

- [ ] **Step 3: Update the POST handler**

Replace `app/api/events/route.ts` with:

```ts
import { createClient } from '@/lib/supabase/server'
import { VALID_TYPES, VALID_ACCOUNT_TYPES, type EventType, type AccountType } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { type?: unknown; contract_value?: unknown; account_type?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { type, contract_value, account_type } = body

  if (!VALID_TYPES.includes(type as EventType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const insertData: Record<string, unknown> = { user_id: user.id, type }

  if (type === 'sale') {
    if (typeof contract_value !== 'number' || contract_value <= 0) {
      return NextResponse.json(
        { error: 'contract_value must be a positive number' },
        { status: 400 }
      )
    }
    if (!VALID_ACCOUNT_TYPES.includes(account_type as AccountType)) {
      return NextResponse.json({ error: 'Invalid account_type' }, { status: 400 })
    }
    insertData.contract_value = contract_value
    insertData.account_type = account_type
  }

  const { error } = await supabase.from('events').insert(insertData)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

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

  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', type)
    .gte('created_at', `${today}T00:00:00`)
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

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npm test
```

Expected: all 28 tests pass (24 existing + 4 new)

- [ ] **Step 5: Commit**

```bash
git add app/api/events/route.ts __tests__/api-events.test.ts
git commit -m "feat: validate and store contract_value + account_type for sale events"
```

---

### Task 3: contractStats query

**Files:**
- Modify: `lib/queries.ts`
- Modify: `__tests__/queries.test.ts`

- [ ] **Step 1: Write the failing tests**

First, add `contractStats` to the existing import at the top of `__tests__/queries.test.ts`:

```ts
import {
  salesByDay,
  salesByHour,
  salesByDow,
  conversionRatesByWeek,
  lifetimeConversionRates,
  contractStats,
} from '@/lib/queries'
```

Then append these tests at the bottom of the same file:

```ts
test('contractStats: returns 0 for both when no events', () => {
  const result = contractStats([])
  expect(result.avgContractValue).toBe(0)
  expect(result.revenuePerDoor).toBe(0)
})

test('contractStats: returns 0 when there are knocks but no sales with values', () => {
  const events = [
    { type: 'knock', created_at: '2026-06-02T09:00:00Z' },
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: null },
  ] as any
  const result = contractStats(events)
  expect(result.avgContractValue).toBe(0)
  expect(result.revenuePerDoor).toBe(0)
})

test('contractStats: calculates avgContractValue correctly', () => {
  const events = [
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 200 },
    { type: 'sale', created_at: '2026-06-02T11:00:00Z', contract_value: 400 },
  ] as any
  const result = contractStats(events)
  expect(result.avgContractValue).toBe(300)
})

test('contractStats: calculates revenuePerDoor correctly', () => {
  const events = [
    { type: 'knock', created_at: '2026-06-02T09:00:00Z' },
    { type: 'knock', created_at: '2026-06-02T09:30:00Z' },
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 200 },
  ] as any
  const result = contractStats(events)
  // $200 total / 2 knocks = $100
  expect(result.revenuePerDoor).toBe(100)
})

test('contractStats: revenuePerDoor is 0 when no knocks', () => {
  const events = [
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 300 },
  ] as any
  const result = contractStats(events)
  expect(result.revenuePerDoor).toBe(0)
})

test('contractStats: excludes null contract_value from avgContractValue', () => {
  const events = [
    { type: 'knock', created_at: '2026-06-02T09:00:00Z' },
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 300 },
    { type: 'sale', created_at: '2026-06-02T11:00:00Z', contract_value: null },
  ] as any
  const result = contractStats(events)
  // Only the $300 sale counts for avg (null excluded)
  expect(result.avgContractValue).toBe(300)
  // But revenuePerDoor uses total value of valued sales / knocks: $300 / 1 knock = $300
  expect(result.revenuePerDoor).toBe(300)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/queries.test.ts
```

Expected: FAIL — "contractStats is not a function"

- [ ] **Step 3: Add `contractStats` to `lib/queries.ts`**

Add this function at the end of `lib/queries.ts`:

```ts
export function contractStats(events: EventRow[]): {
  avgContractValue: number
  revenuePerDoor: number
} {
  const valuedSales = events.filter(
    (e) => e.type === 'sale' && e.contract_value != null
  )
  const knocks = events.filter((e) => e.type === 'knock').length
  const totalValue = valuedSales.reduce((sum, e) => sum + (e.contract_value ?? 0), 0)

  const avgContractValue =
    valuedSales.length > 0
      ? Math.round((totalValue / valuedSales.length) * 100) / 100
      : 0

  const revenuePerDoor =
    knocks > 0 ? Math.round((totalValue / knocks) * 100) / 100 : 0

  return { avgContractValue, revenuePerDoor }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/queries.test.ts
```

Expected: all query tests pass (existing 7 + new 6 = 13 total)

- [ ] **Step 5: Commit**

```bash
git add lib/queries.ts __tests__/queries.test.ts
git commit -m "feat: add contractStats query for avg contract value and revenue per door"
```

---

### Task 4: SaleModal component

**Files:**
- Create: `components/SaleModal.tsx`
- Create: `__tests__/SaleModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/SaleModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { SaleModal } from '@/components/SaleModal'

const mockOnClose = jest.fn()
const mockOnConfirm = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

test('does not render when open=false', () => {
  render(<SaleModal open={false} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  expect(screen.queryByText('Log Sale')).not.toBeInTheDocument()
})

test('renders when open=true', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  expect(screen.getByText('Log Sale')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gen Pest' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Mosquito' })).toBeInTheDocument()
})

test('Log Sale button is disabled when no value entered', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  const logBtn = screen.getByRole('button', { name: /log sale/i })
  expect(logBtn).toBeDisabled()
})

test('Log Sale button is enabled after entering a positive value', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '299' } })
  expect(screen.getByRole('button', { name: /log sale/i })).not.toBeDisabled()
})

test('Gen Pest is selected by default', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  const genPestBtn = screen.getByRole('button', { name: 'Gen Pest' })
  expect(genPestBtn).toHaveClass('bg-blue-700')
})

test('clicking Mosquito selects it', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.click(screen.getByRole('button', { name: 'Mosquito' }))
  expect(screen.getByRole('button', { name: 'Mosquito' })).toHaveClass('bg-blue-700')
  expect(screen.getByRole('button', { name: 'Gen Pest' })).not.toHaveClass('bg-blue-700')
})

test('Cancel calls onClose', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(mockOnClose).toHaveBeenCalledTimes(1)
  expect(mockOnConfirm).not.toHaveBeenCalled()
})

test('Log Sale calls onConfirm with value and account type', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '349' } })
  fireEvent.click(screen.getByRole('button', { name: 'Mosquito' }))
  fireEvent.click(screen.getByRole('button', { name: /log sale/i }))
  expect(mockOnConfirm).toHaveBeenCalledWith(349, 'mosquito')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/SaleModal.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/SaleModal'"

- [ ] **Step 3: Create `components/SaleModal.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { type AccountType } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (contractValue: number, accountType: AccountType) => void
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'gen_pest', label: 'Gen Pest' },
  { value: 'mosquito', label: 'Mosquito' },
]

export function SaleModal({ open, onClose, onConfirm }: Props) {
  const [contractValue, setContractValue] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('gen_pest')

  if (!open) return null

  const parsedValue = parseFloat(contractValue)
  const isValid = !isNaN(parsedValue) && parsedValue > 0

  function handleClose() {
    setContractValue('')
    setAccountType('gen_pest')
    onClose()
  }

  function handleConfirm() {
    if (!isValid) return
    onConfirm(parsedValue, accountType)
    setContractValue('')
    setAccountType('gen_pest')
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
        <h2 className="text-white text-lg font-bold mb-5">Log Sale</h2>

        <div className="mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">
            Contract Value
          </p>
          <div className="flex items-center bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 gap-2">
            <span className="text-slate-500 font-semibold">$</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              className="bg-transparent text-white text-lg flex-1 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">
            Account Type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAccountType(value)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 ${
                  accountType === value
                    ? 'bg-blue-700 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-600 text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
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
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-[2] py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 active:opacity-80"
          >
            Log Sale
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/SaleModal.test.tsx
```

Expected: all 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add components/SaleModal.tsx __tests__/SaleModal.test.tsx
git commit -m "feat: add SaleModal component for capturing contract value and account type"
```

---

### Task 5: Wire SaleModal into MetricRow and TrackerClient

**Files:**
- Modify: `components/MetricRow.tsx`
- Modify: `app/(app)/tracker/TrackerClient.tsx`

- [ ] **Step 1: Update `components/MetricRow.tsx`**

Replace the entire file with:

```tsx
'use client'

import { type EventType } from '@/lib/types'

interface MetricRowProps {
  label: string
  count: number
  type: EventType
  color: string
  onIncrement: (type: EventType) => void
  onUndo: (type: EventType) => void
  onIncrementSale?: () => void
}

export function MetricRow({
  label,
  count,
  type,
  color,
  onIncrement,
  onUndo,
  onIncrementSale,
}: MetricRowProps) {
  return (
    <div className="flex items-center justify-between bg-slate-800 rounded-2xl px-6 py-5">
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{label}</p>
        <p className="text-white text-6xl font-extrabold leading-none">{count}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUndo(type)}
          className="text-slate-500 text-sm px-3 py-2 rounded-xl hover:text-slate-300 active:text-slate-200"
          aria-label={`Undo last ${label}`}
        >
          undo
        </button>
        <button
          onClick={() => (onIncrementSale ? onIncrementSale() : onIncrement(type))}
          className={`${color} text-white text-4xl font-bold w-20 h-20 rounded-2xl flex items-center justify-center active:opacity-80`}
          aria-label={`Add ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `app/(app)/tracker/TrackerClient.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useState } from 'react'
import { MetricRow } from '@/components/MetricRow'
import { SaleModal } from '@/components/SaleModal'
import { type Counts, type EventType, type AccountType } from '@/lib/types'

interface Props {
  initialCounts: Counts
}

export function TrackerClient({ initialCounts }: Props) {
  const [counts, setCounts] = useState<Counts>(initialCounts)
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

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add components/MetricRow.tsx app/\(app\)/tracker/TrackerClient.tsx
git commit -m "feat: open SaleModal on sale + button, wire handleSaleConfirm"
```

---

### Task 6: Stats page — contract stats

**Files:**
- Modify: `app/(app)/stats/page.tsx`

- [ ] **Step 1: Update `app/(app)/stats/page.tsx`**

Replace the entire file with:

```tsx
import { redirect } from 'next/navigation'
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

  const { data: events } = await supabase
    .from('events')
    .select('type, created_at, contract_value')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const allEvents = events ?? []

  const rates = lifetimeConversionRates(allEvents)
  const { avgContractValue, revenuePerDoor } = contractStats(allEvents)
  const byDay = salesByDay(allEvents)
  const byHour = salesByHour(allEvents)
  const byDow = salesByDow(allEvents)
  const byWeek = conversionRatesByWeek(allEvents)

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

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/stats/page.tsx
git commit -m "feat: add Avg Contract and $ / Door StatCards to Stats page"
```
