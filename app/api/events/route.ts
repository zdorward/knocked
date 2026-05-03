import { createClient } from '@/lib/supabase/server'
import { VALID_TYPES, VALID_ACCOUNT_TYPES, type EventType, type AccountType } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { type?: unknown; contract_value?: unknown; account_type?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { type, contract_value, account_type } = body

  if (!VALID_TYPES.includes(type as EventType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const insertData: Record<string, unknown> = { user_id: user.id, type }

  if (type === 'sale') {
    if (typeof contract_value !== 'number' || contract_value <= 0) {
      return NextResponse.json(
        { error: 'contract_value must be a positive number' },
        { status: 400 }
      )
    }
    if (!VALID_ACCOUNT_TYPES.includes(account_type as AccountType)) {
      return NextResponse.json({ error: 'Invalid account_type' }, { status: 400 })
    }
    insertData.contract_value = contract_value
    insertData.account_type = account_type
  }

  const { error } = await supabase.from('events').insert(insertData)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { type?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { type } = body

  if (!VALID_TYPES.includes(type as EventType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Use a 24-hour window instead of UTC midnight so undo works correctly
  // regardless of the user's timezone.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', type)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'No events to undo' }, { status: 404 })
  }

  const { error } = await supabase.from('events').delete().eq('id', events[0].id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
