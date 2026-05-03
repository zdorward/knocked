import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SalesClient } from './SalesClient'
import { type SaleRow } from '@/lib/types'

export default async function SalesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sales } = await supabase
    .from('events')
    .select('id, created_at, contract_value, account_type')
    .eq('user_id', user.id)
    .eq('type', 'sale')
    .order('created_at', { ascending: false })

  return <SalesClient initialSales={(sales ?? []) as SaleRow[]} />
}
