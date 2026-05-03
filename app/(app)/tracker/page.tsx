import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrackerClient } from './TrackerClient'
import { type EventType } from '@/lib/types'

export default async function TrackerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch past 36h — wide enough to cover any timezone offset.
  // TrackerClient filters to local-today in the browser.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('events')
    .select('type, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)

  const { data: profile } = await supabase
    .from('profiles')
    .select('emoji')
    .eq('id', user.id)
    .single()

  return (
    <TrackerClient
      initialEvents={(events ?? []) as { type: EventType; created_at: string }[]}
      emoji={profile?.emoji ?? null}
    />
  )
}
