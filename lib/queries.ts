import { type EventRow } from '@/lib/types'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function salesByDay(events: EventRow[]): { day: string; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<string, number>()
  for (const e of sales) {
    const day = e.created_at.split('T')[0]
    map.set(day, (map.get(day) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([day, sales]) => ({ day, sales }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

export function salesByHour(events: EventRow[]): { hour: number; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<number, number>()
  for (const e of sales) {
    const hour = new Date(e.created_at).getUTCHours()
    map.set(hour, (map.get(hour) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([hour, sales]) => ({ hour, sales }))
    .sort((a, b) => a.hour - b.hour)
}

export function salesByDow(
  events: EventRow[]
): { dow: number; label: string; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<number, number>()
  for (const e of sales) {
    const dow = new Date(e.created_at).getUTCDay()
    map.set(dow, (map.get(dow) ?? 0) + 1)
  }
  return DOW_LABELS.map((label, dow) => ({ dow, label, sales: map.get(dow) ?? 0 }))
}

export function conversionRatesByWeek(
  events: EventRow[]
): { week: string; knockToSale: number; convoToSale: number }[] {
  const map = new Map<string, { knocks: number; convos: number; sales: number }>()

  for (const e of events) {
    const date = new Date(e.created_at)
    const dow = date.getUTCDay()
    const diff = dow === 0 ? -6 : 1 - dow // Shift so Monday = start of week
    const monday = new Date(date)
    monday.setUTCDate(date.getUTCDate() + diff)
    const week = monday.toISOString().split('T')[0]

    if (!map.has(week)) map.set(week, { knocks: 0, convos: 0, sales: 0 })
    const entry = map.get(week)!
    if (e.type === 'knock') entry.knocks++
    if (e.type === 'conversation') entry.convos++
    if (e.type === 'sale') entry.sales++
  }

  return Array.from(map.entries())
    .map(([week, { knocks, convos, sales }]) => ({
      week,
      knockToSale: knocks > 0 ? Math.round((sales / knocks) * 100) : 0,
      convoToSale: convos > 0 ? Math.round((sales / convos) * 100) : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

export function lifetimeConversionRates(events: EventRow[]): {
  knockToSale: number
  convoToSale: number
} {
  const knocks = events.filter((e) => e.type === 'knock').length
  const convos = events.filter((e) => e.type === 'conversation').length
  const sales = events.filter((e) => e.type === 'sale').length
  return {
    knockToSale: knocks > 0 ? Math.round((sales / knocks) * 100) : 0,
    convoToSale: convos > 0 ? Math.round((sales / convos) * 100) : 0,
  }
}

export function contractStats(events: EventRow[]): {
  avgContractValue: number
  revenuePerDoor: number
} {
  const valuedSales = events.filter(
    (e) => e.type === 'sale' && e.contract_value != null
  )
  const knocks = events.filter((e) => e.type === 'knock').length
  const totalValue = valuedSales.reduce((sum, e) => sum + (e.contract_value as number), 0)

  const avgContractValue =
    valuedSales.length > 0
      ? Math.round((totalValue / valuedSales.length) * 100) / 100
      : 0

  const revenuePerDoor =
    knocks > 0 ? Math.round((totalValue / knocks) * 100) / 100 : 0

  return { avgContractValue, revenuePerDoor }
}

export function eventsByDay(
  events: EventRow[]
): Record<string, { knock: number; conversation: number; sale: number }> {
  const result: Record<string, { knock: number; conversation: number; sale: number }> = {}
  for (const e of events) {
    const day = e.created_at.split('T')[0]
    if (!result[day]) result[day] = { knock: 0, conversation: 0, sale: 0 }
    result[day][e.type]++
  }
  return result
}
