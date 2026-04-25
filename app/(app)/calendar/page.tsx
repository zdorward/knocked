import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarClient } from '@/components/CalendarClient'

interface Props {
  searchParams: { month?: string }
}

export default async function CalendarPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parse ?month=YYYY-MM, fall back to current UTC month
  const now = new Date()
  let year = now.getUTCFullYear()
  let month = now.getUTCMonth() + 1 // 1–12

  const param = searchParams.month
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number)
    if (y >= 2020 && y <= 2100 && m >= 1 && m <= 12) {
      year = y
      month = m
    }
  }

  const mm = String(month).padStart(2, '0')
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMm = String(nextMonth).padStart(2, '0')

  const { data: events } = await supabase
    .from('events')
    .select('type, created_at')
    .eq('user_id', user.id)
    .gte('created_at', `${year}-${mm}-01T00:00:00.000Z`)
    .lt('created_at', `${nextYear}-${nextMm}-01T00:00:00.000Z`)
    .order('created_at', { ascending: true })

  return <CalendarClient events={events ?? []} year={year} month={month} />
}
