import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsModal } from '@/components/SettingsModal'

const baseProps = {
  open: true,
  email: 'test@example.com',
  initialDisplayName: 'Test User',
  initialEmoji: '🎉',
  onClose: jest.fn(),
  onSave: jest.fn().mockResolvedValue(undefined),
  onSignOut: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

test('does not render when open=false', () => {
  render(<SettingsModal {...baseProps} open={false} />)
  expect(screen.queryByRole('dialog')).toHaveClass('hidden')
})

test('renders Settings heading when open', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
})

test('renders X close button', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.getByLabelText('Close settings')).toBeInTheDocument()
})

test('does not render a Cancel button', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
})

test('calls onClose when X is clicked', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByLabelText('Close settings'))
  expect(baseProps.onClose).toHaveBeenCalledTimes(1)
})

test('calls onClose when backdrop is clicked', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByRole('dialog'))
  expect(baseProps.onClose).toHaveBeenCalledTimes(1)
})

test('does not close when clicking inside the modal card', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByRole('heading', { name: 'Settings' }))
  expect(baseProps.onClose).not.toHaveBeenCalled()
})

test('calls onSave with display name and first emoji grapheme', async () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(baseProps.onSave).toHaveBeenCalledWith('Test User', '🎉')
  })
})

test('calls onSave with null emoji when field is empty', async () => {
  render(<SettingsModal {...baseProps} initialEmoji={null} />)
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(baseProps.onSave).toHaveBeenCalledWith('Test User', null)
  })
})

test('syncs state when modal re-opens with new initial values', () => {
  const { rerender } = render(<SettingsModal {...baseProps} open={false} />)
  rerender(<SettingsModal {...baseProps} open={true} initialDisplayName="New Name" initialEmoji="🔥" />)
  expect(screen.getByDisplayValue('New Name')).toBeInTheDocument()
})

test('shows email and Sign out button', () => {
  render(<SettingsModal {...baseProps} />)
  expect(screen.getByText('test@example.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})

test('calls onSignOut when Sign out is clicked', () => {
  render(<SettingsModal {...baseProps} />)
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(baseProps.onSignOut).toHaveBeenCalledTimes(1)
})
