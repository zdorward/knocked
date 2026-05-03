import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  let body: { contract_value?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { contract_value } = body
  if (typeof contract_value !== 'number' || contract_value <= 0) {
    return NextResponse.json(
      { error: 'contract_value must be a positive number' },
      { status: 400 }
    )
  }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (event.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('events')
    .update({ contract_value })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
