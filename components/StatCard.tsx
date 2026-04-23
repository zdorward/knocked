interface Props {
  label: string
  value: string
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5 text-center">
      <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className="text-white text-4xl font-extrabold">{value}</p>
    </div>
  )
}
