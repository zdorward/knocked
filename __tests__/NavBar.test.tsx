import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NavBar } from '@/components/NavBar'

// Use var so declarations are hoisted above the jest.mock factory calls
// eslint-disable-next-line no-var
var mockPush: jest.Mock
// eslint-disable-next-line no-var
var mockSignOut: jest.Mock
// eslint-disable-next-line no-var
var mockPathname: jest.Mock
// eslint-disable-next-line no-var
var mockFetch: jest.Mock

jest.mock('next/navigation', () => {
  mockPush = jest.fn()
  mockPathname = jest.fn().mockReturnValue('/tracker')
  return {
    usePathname: mockPathname,
    useRouter: () => ({ push: mockPush }),
  }
})

jest.mock('@/lib/supabase/client', () => {
  mockSignOut = jest.fn().mockResolvedValue({})
  return {
    createClient: () => ({
      auth: { signOut: mockSignOut },
    }),
  }
})

const defaultProps = {
  email: 'test@example.com',
  displayName: 'Test User',
  emoji: null as string | null,
}

beforeEach(() => {
  mockPathname.mockReturnValue('/tracker')
  mockSignOut.mockClear()
  mockSignOut.mockResolvedValue({})
  mockPush.mockClear()
  mockFetch = jest.fn().mockResolvedValue({ ok: true })
  global.fetch = mockFetch
})

test('renders brand and all tabs', () => {
  render(<NavBar {...defaultProps} />)
  expect(screen.getByText('Knocked')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tracker' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument()
})

test('active tab (Tracker) has blue class when on /tracker', () => {
  mockPathname.mockReturnValue('/tracker')
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Tracker' })).toHaveClass('text-blue-400')
})

test('active tab (Stats) has blue class when on /stats', () => {
  mockPathname.mockReturnValue('/stats')
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Stats' })).toHaveClass('text-blue-400')
})

test('active tab (Calendar) has blue class when on /calendar', () => {
  mockPathname.mockReturnValue('/calendar')
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('link', { name: 'Calendar' })).toHaveClass('text-blue-400')
})

test('shows email initial in avatar when no emoji set', () => {
  render(<NavBar {...defaultProps} emoji={null} />)
  const avatar = screen.getByLabelText('Open settings')
  expect(avatar).toHaveTextContent('T')
})

test('shows emoji in avatar when emoji is set', () => {
  render(<NavBar {...defaultProps} emoji="🎉" />)
  const avatar = screen.getByLabelText('Open settings')
  expect(avatar).toHaveTextContent('🎉')
})

test('settings modal is hidden by default', () => {
  render(<NavBar {...defaultProps} />)
  expect(screen.getByRole('dialog')).toHaveClass('hidden')
})

test('settings modal opens when avatar is clicked', () => {
  render(<NavBar {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  expect(screen.getByRole('dialog')).not.toHaveClass('hidden')
})

test('settings modal closes when X is clicked', () => {
  render(<NavBar {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  fireEvent.click(screen.getByLabelText('Close settings'))
  expect(screen.getByRole('dialog')).toHaveClass('hidden')
})

test('sign out calls supabase signOut and redirects to /login', async () => {
  render(<NavBar {...defaultProps} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => {
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})

test('avatar updates immediately after save', async () => {
  render(<NavBar {...defaultProps} emoji={null} />)
  fireEvent.click(screen.getByLabelText('Open settings'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PATCH' }))
  })
})
