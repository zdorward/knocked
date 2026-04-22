/**
 * @jest-environment node
 */
// These are integration-style smoke tests for the route logic.
// We test the input validation only — DB calls require a live Supabase.

import { NextRequest } from 'next/server'

// Mock the server client so DB calls don't fire
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [{ id: 'event-1' }] }),
      delete: jest.fn().mockReturnThis(),
    }),
  }),
}))

import { POST, DELETE } from '@/app/api/events/route'

test('POST rejects invalid event type', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'invalid' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('Invalid type')
})

test('POST accepts valid event type', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'knock' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
})

test('DELETE rejects invalid event type', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'DELETE',
    body: JSON.stringify({ type: 'bad' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await DELETE(req)
  expect(res.status).toBe(400)
})
