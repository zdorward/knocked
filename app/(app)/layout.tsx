import { NavBar } from '@/components/NavBar'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar email={user?.email ?? ''} />
      <main className="max-w-2xl mx-auto p-6">{children}</main>
    </div>
  )
}
