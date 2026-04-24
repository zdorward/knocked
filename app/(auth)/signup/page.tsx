'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGoogleSignUp() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/tracker')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-3xl font-bold mb-2">Knocked</h1>
        <p className="text-slate-400 mb-8">Create your account</p>

        <button
          onClick={handleGoogleSignUp}
          className="w-full bg-slate-800 text-white rounded-xl px-4 py-4 text-lg font-medium border border-slate-700 mb-6 active:opacity-80"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-600 text-sm">or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-800 text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 text-white rounded-xl py-4 text-lg font-semibold disabled:opacity-50 active:opacity-80"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-slate-500 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
