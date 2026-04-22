'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MetricRow } from '@/components/MetricRow'
import { type Counts, type EventType } from '@/lib/types'

interface Props {
  initialCounts: Counts
  userName: string
}

export function TrackerClient({ initialCounts, userName }: Props) {
  const [counts, setCounts] = useState<Counts>(initialCounts)

  async function handleIncrement(type: EventType) {
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
  }

  async function handleUndo(type: EventType) {
    if (counts[type] === 0) return
    setCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }))
    await fetch('/api/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-start pt-2">
        <div>
          <h1 className="text-white text-2xl font-bold">Knocked</h1>
          <p className="text-slate-400 text-sm mt-0.5">{today}</p>
        </div>
        <Link href="/stats" className="text-slate-400 text-sm hover:text-white mt-1">
          Stats →
        </Link>
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

      <p className="text-slate-600 text-xs text-center pb-2">{userName}</p>
    </div>
  )
}
