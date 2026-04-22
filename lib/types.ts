export type EventType = 'knock' | 'conversation' | 'sale'

export interface EventRow {
  type: string
  created_at: string
}

export type Counts = Record<EventType, number>
