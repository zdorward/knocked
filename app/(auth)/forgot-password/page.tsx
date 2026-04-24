'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold mb-2">Reset password</h1>
        <p className="text-slate-400 mb-8">We&apos;ll send a reset link to your email</p>

        {sent ? (
          <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-4">
            <p className="text-emerald-400 font-semibold mb-1">Check your email</p>
            <p className="text-emerald-300 text-sm">We sent a reset link to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white rounded-xl py-4 text-lg font-semibold disabled:opacity-50 active:opacity-80"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-slate-500 text-sm text-center mt-6">
          <Link href="/login" className="text-blue-400">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
