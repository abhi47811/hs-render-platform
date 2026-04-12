'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const fieldClass = `
    w-full px-3.5 py-3 min-h-[48px] text-sm bg-white text-stone-900
    border border-stone-200 rounded-xl
    placeholder:text-stone-300
    focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400
    transition-colors
  `

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

      {/* Brand header — dark panel */}
      <div className="bg-stone-900 px-8 py-8 text-center">
        {/* Logo mark */}
        <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <h1 className="text-white font-bold text-xl tracking-tight">Houspire</h1>
        <p className="text-stone-400 text-sm mt-1 font-medium">Staging Operations</p>
      </div>

      {/* Form body */}
      <div className="px-8 py-8">
        <p className="text-xs text-stone-400 text-center mb-6 font-medium uppercase tracking-wider">
          Team access only
        </p>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@houspire.ai"
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={fieldClass}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[52px] bg-stone-900 text-white text-sm font-bold rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p className="text-[11px] text-stone-300 text-center mt-6">
          Houspire Internal · v1.0
        </p>
      </div>
    </div>
  )
}
