'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  full_name: string | null
  role: string | null
}

interface ProjectAssignControlProps {
  projectId: string
  currentAssigneeId: string | null
  currentAssigneeName: string | null
  members: Member[]
}

export function ProjectAssignControl({
  projectId,
  currentAssigneeId,
  currentAssigneeName,
  members,
}: ProjectAssignControlProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(memberId: string | null) {
    if (memberId === currentAssigneeId) {
      setOpen(false)
      return
    }

    setSaving(true)
    setOpen(false)
    setError(null)

    const res = await fetch(`/api/projects/${projectId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: memberId }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed')
    } else {
      router.refresh()
    }

    setSaving(false)
  }

  const initials = (currentAssigneeName ?? '')
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          opacity: saving ? 0.6 : 1,
        }}
      >
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}
        >
          {initials}
        </span>
        {saving ? 'Saving…' : currentAssigneeName ?? 'Unassigned'}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1.5 z-40 rounded-xl min-w-[180px] overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Assign to
              </p>
            </div>

            <button
              onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
              style={{
                color: !currentAssigneeId ? 'var(--brand)' : 'var(--text-secondary)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
              >
                —
              </span>
              Unassigned
              {!currentAssigneeId && (
                <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>

            {members.map((m) => {
              const mi = (m.full_name ?? '')
                .trim()
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '?'
              const isActive = m.id === currentAssigneeId

              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                  style={{
                    color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(196,145,58,0.06)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(196,145,58,0.06)' : 'transparent'
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}
                  >
                    {mi}
                  </span>
                  <span className="flex-1 text-left truncate">{m.full_name ?? 'Unnamed'}</span>
                  <span className="text-[9px] capitalize" style={{ color: 'var(--text-muted)' }}>
                    {m.role}
                  </span>
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && (
        <p className="absolute left-0 top-full mt-1 text-xs px-2 py-1 rounded z-40" style={{ background: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </p>
      )}
    </div>
  )
}
