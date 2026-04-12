'use client'

import { useState } from 'react'

interface ProfileFormProps {
  userId: string
  email: string
  initialFullName: string
  initialRole: string
}

const ROLE_OPTIONS = [
  { value: 'admin',    label: 'Admin' },
  { value: 'designer', label: 'Designer' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'ops',      label: 'Ops' },
]

export function ProfileForm({ userId, email, initialFullName, initialRole }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [role, setRole]         = useState(initialRole)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const initials = fullName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="space-y-5">
      {/* Avatar row */}
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}
        >
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fullName || 'Unnamed User'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{email}</p>
        </div>
      </div>

      {/* Full name */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-all"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full text-sm px-3 py-2 rounded-lg cursor-not-allowed"
          style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Email is managed by your auth provider
        </p>
      </div>

      {/* Role */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-all"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <option value="">Select role…</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
          {error}
        </p>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-60"
          style={{
            background: saving
              ? 'var(--surface-3)'
              : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)',
            color: saving ? 'var(--text-muted)' : 'white',
            boxShadow: saving ? 'none' : '0 2px 8px rgba(196,145,58,0.3)',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-xs font-semibold" style={{ color: '#16A34A' }}>
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  )
}
