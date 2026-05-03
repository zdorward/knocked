'use client'

import { useRouter } from 'next/navigation'
import { eventsByDay } from '@/lib/queries'
import { type EventRow } from '@/lib/types'

interface Props {
  events: EventRow[]
  year: number
  month: number  // 1–12
  today?: string // ISO date string "YYYY-MM-DD", defaults to current local date
}

const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CalendarClient({ events, year, month, today: todayProp }: Props) {
  const router = useRouter()
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const byDay = eventsByDay(events, browserTz)

  const todayStr = todayProp ?? new Date().toLocaleDateString('en-CA')
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
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex justify-between items-center">
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
              className={`bg-slate-800 rounded-lg p-1.5 h-24 ${
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
      <div className="flex gap-4 justify-center">
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
