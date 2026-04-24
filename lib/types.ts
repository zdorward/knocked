export const VALID_TYPES = ['knock', 'conversation', 'sale'] as const
export type EventType = typeof VALID_TYPES[number]

export type AccountType = 'gen_pest' | 'mosquito'
export const VALID_ACCOUNT_TYPES: readonly AccountType[] = ['gen_pest', 'mosquito']

export interface EventRow {
  type: EventType
  created_at: string
  contract_value?: number | null
  account_type?: AccountType | null
}

export type Counts = Record<EventType, number>
