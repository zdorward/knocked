'use client'

import { useState } from 'react'
import { MetricRow } from '@/components/MetricRow'
import { SaleModal } from '@/components/SaleModal'
import { type Counts, type EventType, type AccountType } from '@/lib/types'

interface Props {
  initialCounts: Counts
  emoji: string | null
}

function getGreeting(emoji: string | null): string | null {
  const hour = new Date().getHours()
  if (hour >= 8 && hour < 12) return 'Good Morning'
  if (hour >= 12 && hour < 17) return 'Good Afternoon'
  if (hour >= 17 && hour < 21) return `Prime Time ${emoji ?? ''}`
  return null
}

export function TrackerClient({ initialCounts, emoji }: Props) {
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

  const greeting = getGreeting(emoji)

  return (
    <div className="flex flex-col gap-6 flex-1 justify-center">
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
