import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  salesByDay,
  salesByHour,
  salesByDow,
  conversionRatesByWeek,
  lifetimeConversionRates,
  contractStats,
} from '@/lib/queries'
import { StatCard } from '@/components/StatCard'
import { SalesByDayChart } from '@/components/charts/SalesByDayChart'
import { SalesByHourChart } from '@/components/charts/SalesByHourChart'
import { SalesByDowChart } from '@/components/charts/SalesByDowChart'
import { ConversionTrendChart } from '@/components/charts/ConversionTrendChart'

export default async function StatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const timeZone = cookies().get('user-tz')?.value ?? 'UTC'

  const { data: events } = await supabase
    .from('events')
    .select('type, created_at, contract_value')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const allEvents = events ?? []

  const rates = lifetimeConversionRates(allEvents)
  const { avgContractValue, revenuePerDoor } = contractStats(allEvents)
  const byDay = salesByDay(allEvents, timeZone)
  const byHour = salesByHour(allEvents, timeZone)
  const byDow = salesByDow(allEvents, timeZone)
  const byWeek = conversionRatesByWeek(allEvents, timeZone)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Avg Contract" value={`$${Math.round(avgContractValue)}`} />
        <StatCard label="$ / Door" value={`$${revenuePerDoor.toFixed(2)}`} />
        <StatCard label="Knock → Sale" value={`${rates.knockToSale}%`} />
        <StatCard label="Convo → Sale" value={`${rates.convoToSale}%`} />
      </div>

      <div className="flex flex-col gap-5">
        <SalesByDayChart data={byDay} />
        <SalesByHourChart data={byHour} />
        <SalesByDowChart data={byDow} />
        <ConversionTrendChart data={byWeek} />
      </div>
    </>
  )
}
