'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { dow: number; label: string; sales: number }[]
}

export function SalesByDowChart({ data }: Props) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Sales by Day of Week</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: 8 }}
          />
          <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
