/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// eslint-disable-next-line no-var
var mockDelete: jest.Mock

jest.mock('@/lib/supabase/server', () => {
  mockDelete = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  })
  return {
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
        delete: mockDelete,
      }),
    }),
  }
})

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

test('POST accepts valid event type and returns success', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'knock' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true })
})

test('POST returns 400 on malformed JSON', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: 'not-json',
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
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

test('DELETE accepts valid event type and returns success', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'DELETE',
    body: JSON.stringify({ type: 'sale' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await DELETE(req)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true })
})

test('POST sale without contract_value returns 400', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'sale', account_type: 'gen_pest' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('contract_value must be a positive number')
})

test('POST sale with invalid account_type returns 400', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'sale', contract_value: 299, account_type: 'bad' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.error).toBe('Invalid account_type')
})

test('POST sale with valid contract_value and account_type returns 200', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'sale', contract_value: 299, account_type: 'gen_pest' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true })
})

test('POST knock without sale fields returns 200', async () => {
  const req = new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'knock' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
})
