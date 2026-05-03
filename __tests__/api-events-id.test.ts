/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// eslint-disable-next-line no-var
var mockUpdate: jest.Mock
// eslint-disable-next-line no-var
var mockSelectSingle: jest.Mock

jest.mock('@/lib/supabase/server', () => {
  mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  })
  mockSelectSingle = jest.fn().mockResolvedValue({
    data: { user_id: 'user-123' },
    error: null,
  })
  return {
    createClient: jest.fn().mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSelectSingle,
        update: mockUpdate,
      }),
    }),
  }
})

import { PATCH } from '@/app/api/events/[id]/route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/events/event-abc', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

test('PATCH returns 400 for missing contract_value', async () => {
  const res = await PATCH(makeRequest({}), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('contract_value must be a positive number')
})

test('PATCH returns 400 for zero contract_value', async () => {
  const res = await PATCH(makeRequest({ contract_value: 0 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('contract_value must be a positive number')
})

test('PATCH returns 400 for negative contract_value', async () => {
  const res = await PATCH(makeRequest({ contract_value: -50 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
})

test('PATCH returns 400 for string contract_value', async () => {
  const res = await PATCH(makeRequest({ contract_value: '299' }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
})

test('PATCH returns 400 on malformed JSON', async () => {
  const req = new NextRequest('http://localhost/api/events/event-abc', {
    method: 'PATCH',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await PATCH(req, { params: { id: 'event-abc' } })
  expect(res.status).toBe(400)
})

test('PATCH returns 403 when event belongs to a different user', async () => {
  mockSelectSingle.mockResolvedValueOnce({
    data: { user_id: 'other-user' },
    error: null,
  })
  const res = await PATCH(makeRequest({ contract_value: 299 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(403)
})

test('PATCH returns 404 when event does not exist', async () => {
  mockSelectSingle.mockResolvedValueOnce({ data: null, error: null })
  const res = await PATCH(makeRequest({ contract_value: 299 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(404)
})

test('PATCH updates contract_value and returns success', async () => {
  const res = await PATCH(makeRequest({ contract_value: 299 }), { params: { id: 'event-abc' } })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true })
})
