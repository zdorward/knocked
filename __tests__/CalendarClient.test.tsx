import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarClient } from '@/components/CalendarClient'
import { type EventRow } from '@/lib/types'

// Use var so declarations are hoisted above jest.mock factory
// eslint-disable-next-line no-var
var mockPush: jest.Mock

jest.mock('next/navigation', () => {
  mockPush = jest.fn()
  return {
    useRouter: () => ({ push: mockPush }),
  }
})

beforeEach(() => {
  mockPush.mockClear()
})

// May 2026: May 1 = Friday (firstDayOfWeek = 5), 31 days
// today = "2026-05-12" for all tests below
const MAY_EVENTS: EventRow[] = [
  { type: 'knock',        created_at: '2026-05-04T09:00:00Z' },
  { type: 'knock',        created_at: '2026-05-04T10:00:00Z' },
  { type: 'conversation', created_at: '2026-05-04T11:00:00Z' },
  { type: 'sale',         created_at: '2026-05-04T12:00:00Z' },
]

test('renders month name and year', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  expect(screen.getByText('May 2026')).toBeInTheDocument()
})

test('renders all seven day-of-week headers', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  for (const label of ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})

test('renders K/C/S chips for a day with events', () => {
  render(<CalendarClient events={MAY_EVENTS} year={2026} month={5} today="2026-05-12" />)
  expect(screen.getByText('K 2')).toBeInTheDocument()
  expect(screen.getByText('C 1')).toBeInTheDocument()
  expect(screen.getByText('S 1')).toBeInTheDocument()
})

test('renders no chips for a day with no events', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  expect(screen.queryByText(/^K /)).not.toBeInTheDocument()
  expect(screen.queryByText(/^C /)).not.toBeInTheDocument()
  expect(screen.queryByText(/^S /)).not.toBeInTheDocument()
})

test('next button is disabled on the current month', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
})

test('next button is enabled on a past month', () => {
  render(<CalendarClient events={[]} year={2026} month={4} today="2026-05-12" />)
  expect(screen.getByRole('button', { name: 'Next month' })).not.toBeDisabled()
})

test('clicking prev navigates to the previous month URL', () => {
  render(<CalendarClient events={[]} year={2026} month={5} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2026-04')
})

test('clicking next navigates to the next month URL', () => {
  render(<CalendarClient events={[]} year={2026} month={4} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2026-05')
})

test('prev navigation wraps from January to December of previous year', () => {
  render(<CalendarClient events={[]} year={2026} month={1} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2025-12')
})

test('next navigation wraps from December to January of next year', () => {
  render(<CalendarClient events={[]} year={2025} month={12} today="2026-05-12" />)
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(mockPush).toHaveBeenCalledWith('/calendar?month=2026-01')
})
