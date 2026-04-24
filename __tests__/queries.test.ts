import {
  salesByDay,
  salesByHour,
  salesByDow,
  conversionRatesByWeek,
  lifetimeConversionRates,
  contractStats,
} from '@/lib/queries'

// All timestamps in UTC. June 2 2026 is a Tuesday (dow=2). June 3 is a Wednesday (dow=3).
const mockEvents = [
  { type: 'knock',        created_at: '2026-06-02T09:00:00Z' },
  { type: 'knock',        created_at: '2026-06-02T09:30:00Z' },
  { type: 'conversation', created_at: '2026-06-02T09:15:00Z' },
  { type: 'sale',         created_at: '2026-06-02T10:00:00Z' },
  { type: 'knock',        created_at: '2026-06-03T14:00:00Z' },
  { type: 'conversation', created_at: '2026-06-03T14:10:00Z' },
  { type: 'sale',         created_at: '2026-06-03T14:30:00Z' },
] as const

test('salesByDay: groups sales by calendar date', () => {
  const result = salesByDay(mockEvents as any)
  expect(result).toEqual([
    { day: '2026-06-02', sales: 1 },
    { day: '2026-06-03', sales: 1 },
  ])
})

test('salesByDay: returns empty array for no sales', () => {
  expect(salesByDay([])).toEqual([])
})

test('salesByHour: groups sales by UTC hour', () => {
  const result = salesByHour(mockEvents as any)
  // Both sales are at 10:00 and 14:30 UTC
  expect(result).toContainEqual({ hour: 10, sales: 1 })
  expect(result).toContainEqual({ hour: 14, sales: 1 })
  expect(result).toHaveLength(2)
})

test('salesByDow: returns all 7 days in order Sun–Sat', () => {
  const result = salesByDow(mockEvents as any)
  expect(result).toHaveLength(7)
  expect(result.map((r) => r.label)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
})

test('salesByDow: counts sales on correct day of week', () => {
  const result = salesByDow(mockEvents as any)
  const tue = result.find((r) => r.label === 'Tue')!
  const wed = result.find((r) => r.label === 'Wed')!
  expect(tue.sales).toBe(1)
  expect(wed.sales).toBe(1)
})

test('lifetimeConversionRates: calculates knock→sale and convo→sale rates', () => {
  const result = lifetimeConversionRates(mockEvents as any)
  // 2 sales / 3 knocks = 67%
  expect(result.knockToSale).toBe(67)
  // 2 sales / 2 convos = 100%
  expect(result.convoToSale).toBe(100)
})

test('lifetimeConversionRates: returns 0 when no knocks or convos', () => {
  const result = lifetimeConversionRates([])
  expect(result.knockToSale).toBe(0)
  expect(result.convoToSale).toBe(0)
})

test('conversionRatesByWeek: returns one entry per week', () => {
  const result = conversionRatesByWeek(mockEvents as any)
  // Both days are in the same week (week of 2026-06-01, Monday)
  expect(result).toHaveLength(1)
  expect(result[0].knockToSale).toBe(67)  // 2/3
  expect(result[0].convoToSale).toBe(100) // 2/2
})

test('contractStats: returns 0 for both when no events', () => {
  const result = contractStats([])
  expect(result.avgContractValue).toBe(0)
  expect(result.revenuePerDoor).toBe(0)
})

test('contractStats: returns 0 when there are knocks but no sales with values', () => {
  const events = [
    { type: 'knock', created_at: '2026-06-02T09:00:00Z' },
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: null },
  ] as any
  const result = contractStats(events)
  expect(result.avgContractValue).toBe(0)
  expect(result.revenuePerDoor).toBe(0)
})

test('contractStats: calculates avgContractValue correctly', () => {
  const events = [
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 200 },
    { type: 'sale', created_at: '2026-06-02T11:00:00Z', contract_value: 400 },
  ] as any
  const result = contractStats(events)
  expect(result.avgContractValue).toBe(300)
})

test('contractStats: calculates revenuePerDoor correctly', () => {
  const events = [
    { type: 'knock', created_at: '2026-06-02T09:00:00Z' },
    { type: 'knock', created_at: '2026-06-02T09:30:00Z' },
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 200 },
  ] as any
  const result = contractStats(events)
  // $200 total / 2 knocks = $100
  expect(result.revenuePerDoor).toBe(100)
})

test('contractStats: revenuePerDoor is 0 when no knocks', () => {
  const events = [
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 300 },
  ] as any
  const result = contractStats(events)
  expect(result.revenuePerDoor).toBe(0)
})

test('contractStats: excludes null contract_value from avgContractValue', () => {
  const events = [
    { type: 'knock', created_at: '2026-06-02T09:00:00Z' },
    { type: 'sale', created_at: '2026-06-02T10:00:00Z', contract_value: 300 },
    { type: 'sale', created_at: '2026-06-02T11:00:00Z', contract_value: null },
  ] as any
  const result = contractStats(events)
  // Only the $300 sale counts for avg (null excluded)
  expect(result.avgContractValue).toBe(300)
  // revenuePerDoor uses total value of valued sales / knocks: $300 / 1 knock = $300
  expect(result.revenuePerDoor).toBe(300)
})
