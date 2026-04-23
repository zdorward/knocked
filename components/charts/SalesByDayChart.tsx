'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { day: string; sales: number }[]
}

export function SalesByDayChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.day + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Sales This Summer</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: 8 }}
          />
          <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
