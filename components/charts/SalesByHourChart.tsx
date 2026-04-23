'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { hour: number; sales: number }[]
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

export function SalesByHourChart({ data }: Props) {
  const formatted = data.map((d) => ({ ...d, label: formatHour(d.hour) }))

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Sales by Hour of Day</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: 8 }}
          />
          <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
