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
