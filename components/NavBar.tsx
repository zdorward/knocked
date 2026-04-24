'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
}

const tabs = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Stats', href: '/stats' },
]

export function NavBar({ email }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [menuOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
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
        <div className="relative" ref={menuRef}>
          <button
            aria-label="Account menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm leading-none"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 bg-slate-800 border border-slate-600 rounded-xl min-w-44 shadow-xl overflow-hidden z-10">
              <p className="px-4 py-2.5 text-xs text-slate-500 border-b border-slate-700 truncate">
                {email}
              </p>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-3 text-sm text-red-400 active:opacity-70"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
