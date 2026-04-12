'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProjectStatus =
  | 'intake'
  | 'shell_ready'
  | 'style_set'
  | 'staging'
  | 'client_review'
  | 'revisions'
  | 'delivered'

const STATUSES: { value: ProjectStatus; label: string; color: string; bg: string }[] = [
  { value: 'intake',        label: 'Intake',         color: '#78716C', bg: '#F5F5F4' },
  { value: 'shell_ready',   label: 'Shell Ready',    color: '#2563EB', bg: '#EFF6FF' },
  { value: 'style_set',     label: 'Style Set',      color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'staging',       label: 'Staging',        color: '#D97706', bg: '#FFFBEB' },
  { value: 'client_review', label: 'Client Review',  color: '#0891B2', bg: '#ECFEFF' },
  { value: 'revisions',     label: 'Revisions',      color: '#EA580C', bg: '#FFF7ED' },
  { value: 'delivered',     label: 'Delivered',      color: '#16A34A', bg: '#F0FDF4' },
]

interface ProjectStatusControlProps {
  projectId: string
  currentStatus: ProjectStatus
}

export function ProjectStatusControl({ projectId, currentStatus }: ProjectStatusControlProps) {
  const router = useRouter()
  const [status, setStatus]   = useState<ProjectStatus>(currentStatus)
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0]

  async function handleSelect(next: ProjectStatus) {
    if (next === status) { setOpen(false); return }
    setSaving(true)
    setError(null)
    setOpen(false)

    const prev = status
    setStatus(next) // optimistic

    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update status')
      }
      router.refresh()
    } catch (err: unknown) {
      setStatus(prev) // revert
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.color}33`,
          opacity: saving ? 0.7 : 1,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: current.color }}
        />
        {saving ? 'Updating…' : current.label}
        {/* Chevron */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-full mt-1.5 z-40 rounded-xl overflow-hidden min-w-[170px]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              className="px-3 py-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Move to stage
              </p>
            </div>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSelect(s.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium transition-colors"
                style={{
                  color: s.value === status ? s.color : 'var(--text-secondary)',
                  background: s.value === status ? `${s.color}0F` : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (s.value !== status) e.currentTarget.style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  if (s.value !== status) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: s.color }}
                />
                {s.label}
                {s.value === status && (
                  <svg
                    className="ml-auto"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Error toast */}
      {error && (
        <div
          className="absolute left-0 top-full mt-1.5 z-40 text-xs px-3 py-2 rounded-lg whitespace-nowrap"
          style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
