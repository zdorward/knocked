export const VALID_TYPES = ['knock', 'conversation', 'sale'] as const
export type EventType = typeof VALID_TYPES[number]

export interface EventRow {
  type: EventType
  created_at: string
}

export type Counts = Record<EventType, number>
