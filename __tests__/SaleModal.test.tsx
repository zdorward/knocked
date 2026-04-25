import { render, screen, fireEvent } from '@testing-library/react'
import { SaleModal } from '@/components/SaleModal'

const mockOnClose = jest.fn()
const mockOnConfirm = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

test('does not render when open=false', () => {
  render(<SaleModal open={false} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  expect(screen.queryByText('Log Sale')).not.toBeInTheDocument()
})

test('renders when open=true', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  expect(screen.getByRole('heading', { name: 'Log Sale' })).toBeInTheDocument()
  expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gen Pest' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Mosquito' })).toBeInTheDocument()
})

test('Confirm button is disabled when no value entered', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  const logBtn = screen.getByRole('button', { name: /confirm/i })
  expect(logBtn).toBeDisabled()
})

test('Confirm button is enabled after entering a positive value', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '299' } })
  expect(screen.getByRole('button', { name: /confirm/i })).not.toBeDisabled()
})

test('Gen Pest is selected by default', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  const genPestBtn = screen.getByRole('button', { name: 'Gen Pest' })
  expect(genPestBtn).toHaveClass('bg-blue-700')
})

test('clicking Mosquito selects it', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.click(screen.getByRole('button', { name: 'Mosquito' }))
  expect(screen.getByRole('button', { name: 'Mosquito' })).toHaveClass('bg-blue-700')
  expect(screen.getByRole('button', { name: 'Gen Pest' })).not.toHaveClass('bg-blue-700')
})

test('Cancel calls onClose', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(mockOnClose).toHaveBeenCalledTimes(1)
  expect(mockOnConfirm).not.toHaveBeenCalled()
})

test('Confirm calls onConfirm with value and account type', () => {
  render(<SaleModal open={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />)
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '349' } })
  fireEvent.click(screen.getByRole('button', { name: 'Mosquito' }))
  fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
  expect(mockOnConfirm).toHaveBeenCalledWith(349, 'mosquito')
})
