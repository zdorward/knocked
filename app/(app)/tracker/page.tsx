import { createClient } from '@/lib/supabase/server'
import { TrackerClient } from './TrackerClient'
import { type Counts } from '@/lib/types'

export default async function TrackerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('type')
    .eq('user_id', user!.id)
    .gte('created_at', `${today}T00:00:00.000Z`)

  const counts: Counts = {
    knock: events?.filter((e) => e.type === 'knock').length ?? 0,
    conversation: events?.filter((e) => e.type === 'conversation').length ?? 0,
    sale: events?.filter((e) => e.type === 'sale').length ?? 0,
  }

  return <TrackerClient initialCounts={counts} userName={user!.email ?? ''} />
}
