import { type Counts, type EventRow } from '@/lib/types'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localDate(isoString: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(isoString))
}

function localHour(isoString: string, timeZone: string): number {
  const h = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(
      new Date(isoString)
    ),
    10
  )
  return h % 24 // guard against "24" returned by some Intl implementations at midnight
}

function localDow(isoString: string, timeZone: string): number {
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(
    new Date(isoString)
  )
  return DOW_LABELS.indexOf(dayName)
}

export function salesByDay(
  events: EventRow[],
  timeZone = 'UTC'
): { day: string; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<string, number>()
  for (const e of sales) {
    const day = localDate(e.created_at, timeZone)
    map.set(day, (map.get(day) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([day, sales]) => ({ day, sales }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

export function salesByHour(
  events: EventRow[],
  timeZone = 'UTC'
): { hour: number; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<number, number>()
  for (const e of sales) {
    const hour = localHour(e.created_at, timeZone)
    map.set(hour, (map.get(hour) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([hour, sales]) => ({ hour, sales }))
    .sort((a, b) => a.hour - b.hour)
}

export function salesByDow(
  events: EventRow[],
  timeZone = 'UTC'
): { dow: number; label: string; sales: number }[] {
  const sales = events.filter((e) => e.type === 'sale')
  const map = new Map<number, number>()
  for (const e of sales) {
    const dow = localDow(e.created_at, timeZone)
    if (dow !== -1) map.set(dow, (map.get(dow) ?? 0) + 1)
  }
  return DOW_LABELS.map((label, dow) => ({ dow, label, sales: map.get(dow) ?? 0 }))
}

export function conversionRatesByWeek(
  events: EventRow[],
  timeZone = 'UTC'
): { week: string; knockToSale: number; convoToSale: number }[] {
  const map = new Map<string, { knocks: number; convos: number; sales: number }>()

  for (const e of events) {
    const d = localDate(e.created_at, timeZone) // 'YYYY-MM-DD' in local time
    const [year, month, day] = d.split('-').map(Number)
    // Use UTC Date for day-of-week arithmetic on the local date
    const dateUtc = new Date(Date.UTC(year, month - 1, day))
    const dow = dateUtc.getUTCDay()
    const diff = dow === 0 ? -6 : 1 - dow // shift so Monday = start of week
    dateUtc.setUTCDate(dateUtc.getUTCDate() + diff)
    const week = dateUtc.toISOString().split('T')[0]

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
  const valuedSales = events.filter((e) => e.type === 'sale' && e.contract_value != null)
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

export function eventsByDay(events: EventRow[], timeZone = 'UTC'): Record<string, Counts> {
  const result: Record<string, Counts> = {}
  for (const e of events) {
    const day = localDate(e.created_at, timeZone)
    if (!result[day]) result[day] = { knock: 0, conversation: 0, sale: 0 }
    result[day][e.type]++
  }
  return result
}
