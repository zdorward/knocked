import { NavBar } from '@/components/NavBar'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('display_name, emoji')
        .eq('id', user.id)
        .single()
    : { data: null }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <NavBar
        email={user?.email ?? ''}
        displayName={profile?.display_name ?? ''}
        emoji={profile?.emoji ?? null}
      />
      <main className="max-w-2xl w-full mx-auto p-6 flex-1 flex flex-col">{children}</main>
    </div>
  )
}
