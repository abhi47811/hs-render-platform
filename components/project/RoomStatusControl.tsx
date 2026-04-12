'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RoomStatus = 'not_started' | 'shell_uploaded' | 'in_progress' | 'client_review' | 'delivered'

const STATUSES: { value: RoomStatus; label: string; color: string; bg: string }[] = [
  { value: 'not_started', label: 'Not Started', color: '#78716C', bg: '#F5F5F4' },
  { value: 'shell_uploaded', label: 'Shell Ready', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'in_progress', label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
  { value: 'client_review', label: 'Client Review', color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'delivered', label: 'Delivered', color: '#16A34A', bg: '#F0FDF4' },
]

interface RoomStatusControlProps {
  roomId: string
  currentStatus: RoomStatus
}

export function RoomStatusControl({ roomId, currentStatus }: RoomStatusControlProps) {
  const router = useRouter()
  const [status, setStatus] = useState<RoomStatus>(currentStatus)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = STATUSES.find(s => s.value === status) ?? STATUSES[0]

  async function handleSelect(next: RoomStatus) {
    if (next === status) {
      setOpen(false)
      return
    }

    setSaving(true)
    setOpen(false)

    const prev = status
    setStatus(next)

    const res = await fetch(`/api/rooms/${roomId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      setStatus(prev)
    }

    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.color}33`,
        }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: current.color }} />
        {saving ? 'Updating…' : current.label}
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
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1.5 z-40 rounded-xl min-w-[160px] overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Set room status
              </p>
            </div>

            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => handleSelect(s.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                style={{
                  color: s.value === status ? s.color : 'var(--text-secondary)',
                  background: s.value === status ? `${s.color}0F` : 'transparent',
                }}
                onMouseEnter={e => {
                  if (s.value !== status) {
                    e.currentTarget.style.background = 'var(--surface-2)'
                  }
                }}
                onMouseLeave={e => {
                  if (s.value !== status) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
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
    </div>
  )
}
