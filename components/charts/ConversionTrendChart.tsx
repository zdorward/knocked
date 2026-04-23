'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { week: string; knockToSale: number; convoToSale: number }[]
}

export function ConversionTrendChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.week + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Conversion Rates by Week</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: 8 }}
            formatter={(value) => (value != null ? `${value}%` : '')}
          />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="knockToSale"
            name="Knock→Sale"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="convoToSale"
            name="Convo→Sale"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
