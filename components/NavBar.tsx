'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SettingsModal } from '@/components/SettingsModal'

interface Props {
  email: string
  displayName: string
  emoji: string | null
}

const tabs = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Stats', href: '/stats' },
  { label: 'Calendar', href: '/calendar' },
]

export function NavBar({ email, displayName, emoji }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentEmoji, setCurrentEmoji] = useState(emoji)
  const [currentDisplayName, setCurrentDisplayName] = useState(displayName)


  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleSave(newDisplayName: string, newEmoji: string | null) {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: newDisplayName, emoji: newEmoji }),
    })
    if (res.ok) {
      setCurrentDisplayName(newDisplayName)
      setCurrentEmoji(newEmoji)
      setSettingsOpen(false)
    }
    // On failure, modal stays open — SettingsModal shows the error via the thrown rejection
  }

  return (
    <>
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-2xl mx-auto px-6 flex items-center h-12">
          <span className="text-white font-bold mr-6">Knocked</span>
          <div className="flex flex-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 h-12 flex items-center text-sm font-medium border-b-2 ${
                  pathname === tab.href
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Avatar button */}
          <button
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
            className="w-11 h-11 rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold text-sm active:opacity-70 shrink-0"
          >
            <span>{email[0]?.toUpperCase() || '?'}</span>
          </button>
        </div>
      </nav>

      <SettingsModal
        open={settingsOpen}
        email={email}
        initialDisplayName={currentDisplayName}
        initialEmoji={currentEmoji}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSave}
        onSignOut={handleSignOut}
      />
    </>
  )
}
