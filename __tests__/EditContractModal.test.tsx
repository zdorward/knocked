import { render, screen, fireEvent } from '@testing-library/react'
import { EditContractModal } from '@/components/EditContractModal'
import { type SaleRow } from '@/lib/types'

const mockOnClose = jest.fn()
const mockOnSave = jest.fn()

const sale: SaleRow = {
  id: 'sale-1',
  created_at: '2026-05-03T14:00:00Z',
  contract_value: 349,
  account_type: 'gen_pest',
}

beforeEach(() => {
  jest.clearAllMocks()
})

test('does not render when sale is null', () => {
  render(<EditContractModal sale={null} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.queryByText('Edit Sale')).not.toBeInTheDocument()
})

test('renders when sale is provided', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByRole('heading', { name: 'Edit Sale' })).toBeInTheDocument()
})

test('pre-fills contract value from sale', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  const input = screen.getByRole('spinbutton')
  expect(input).toHaveValue(349)
})

test('shows account type as read-only text', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByText('Gen Pest')).toBeInTheDocument()
})

test('shows Mosquito for mosquito account type', () => {
  const mosquitoSale = { ...sale, account_type: 'mosquito' as const }
  render(<EditContractModal sale={mosquitoSale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByText('Mosquito')).toBeInTheDocument()
})

test('Save is disabled when value is unchanged', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save is disabled when value is empty', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save is disabled when value is zero', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } })
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save is enabled after changing to a positive value', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '299' } })
  expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
})

test('Save calls onSave with id and new contract value', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '299' } })
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(mockOnSave).toHaveBeenCalledWith('sale-1', 299)
})

test('Cancel calls onClose', () => {
  render(<EditContractModal sale={sale} onClose={mockOnClose} onSave={mockOnSave} />)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(mockOnClose).toHaveBeenCalledTimes(1)
  expect(mockOnSave).not.toHaveBeenCalled()
})
