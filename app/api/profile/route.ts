import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, emoji')
    .eq('id', user.id)
    .single()

  return NextResponse.json(profile ?? { display_name: '', emoji: null })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { display_name?: unknown; emoji?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (typeof body.display_name === 'string') {
    update.display_name = body.display_name.trim().slice(0, 50)
  }
  if (body.emoji === null || typeof body.emoji === 'string') {
    // Store only the first grapheme cluster (one emoji)
    const emoji = typeof body.emoji === 'string' ? (Array.from(body.emoji)[0] ?? null) : null
    update.emoji = emoji
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('profiles').upsert({ id: user.id, ...update })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
