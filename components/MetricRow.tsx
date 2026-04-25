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
