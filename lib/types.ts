export type EventType = 'knock' | 'conversation' | 'sale'

export interface EventRow {
  type: EventType
  created_at: string
}

export type Counts = Record<EventType, number>
