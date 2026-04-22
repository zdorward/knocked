import { render, screen, fireEvent } from '@testing-library/react'
import { MetricRow } from '@/components/MetricRow'

const defaultProps = {
  label: 'Doors Knocked',
  count: 5,
  type: 'knock' as const,
  color: 'bg-blue-500',
  onIncrement: jest.fn(),
  onUndo: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

test('renders label and count', () => {
  render(<MetricRow {...defaultProps} />)
  expect(screen.getByText('Doors Knocked')).toBeInTheDocument()
  expect(screen.getByText('5')).toBeInTheDocument()
})

test('calls onIncrement with type when + is tapped', () => {
  render(<MetricRow {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Add Doors Knocked'))
  expect(defaultProps.onIncrement).toHaveBeenCalledWith('knock')
  expect(defaultProps.onIncrement).toHaveBeenCalledTimes(1)
})

test('calls onUndo with type when undo is tapped', () => {
  render(<MetricRow {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Undo last Doors Knocked'))
  expect(defaultProps.onUndo).toHaveBeenCalledWith('knock')
  expect(defaultProps.onUndo).toHaveBeenCalledTimes(1)
})

test('displays updated count when prop changes', () => {
  const { rerender } = render(<MetricRow {...defaultProps} count={5} />)
  expect(screen.getByText('5')).toBeInTheDocument()
  rerender(<MetricRow {...defaultProps} count={6} />)
  expect(screen.getByText('6')).toBeInTheDocument()
})
