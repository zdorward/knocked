import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NavBar } from '@/components/NavBar'

// Use var so declarations are hoisted above the jest.mock factory calls
// eslint-disable-next-line no-var
var mockPush: jest.Mock
// eslint-disable-next-line no-var
var mockSignOut: jest.Mock
// eslint-disable-next-line no-var
var mockPathname: jest.Mock

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

beforeEach(() => {
  mockPathname.mockReturnValue('/tracker')
  mockSignOut.mockClear()
  mockSignOut.mockResolvedValue({})
  mockPush.mockClear()
})

test('renders brand and both tabs', () => {
  render(<NavBar email="test@example.com" />)
  expect(screen.getByText('Knocked')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tracker' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument()
})

test('active tab (Tracker) has blue class when on /tracker', () => {
  mockPathname.mockReturnValue('/tracker')
  render(<NavBar email="test@example.com" />)
  const trackerLink = screen.getByRole('link', { name: 'Tracker' })
  expect(trackerLink).toHaveClass('text-blue-400')
})

test('active tab (Stats) has blue class when on /stats', () => {
  mockPathname.mockReturnValue('/stats')
  render(<NavBar email="test@example.com" />)
  const statsLink = screen.getByRole('link', { name: 'Stats' })
  expect(statsLink).toHaveClass('text-blue-400')
})

test('dropdown is hidden by default', () => {
  render(<NavBar email="test@example.com" />)
  expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
})

test('dropdown opens when ⋯ is clicked', () => {
  render(<NavBar email="test@example.com" />)
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
  expect(screen.getByText('test@example.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})

test('sign out calls supabase signOut and redirects to /login', async () => {
  render(<NavBar email="test@example.com" />)
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => {
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})
