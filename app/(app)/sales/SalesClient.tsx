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
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yesterday = d.toLocaleDateString('en-CA')
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
  const [saveError, setSaveError] = useState<string | null>(null)

  const [expanded, setExpanded] = useState<Set<string>>(
    () => {
      const initial = groupByDay(initialSales)
      return new Set(initial[0] ? [initial[0].dateStr] : [])
    }
  )

  const groups = groupByDay(sales)

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
      setSaveError('Failed to save. Please try again.')
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-slate-400 text-sm mt-8 text-center">No sales logged yet.</p>
    )
  }

  return (
    <>
      {saveError && (
        <p className="text-red-400 text-sm text-center mb-2">{saveError}</p>
      )}
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
