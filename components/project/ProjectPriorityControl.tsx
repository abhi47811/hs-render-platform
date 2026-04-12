'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Priority = 'Normal' | 'High' | 'Urgent'

const PRIORITIES: {
  value: Priority
  label: string
  color: string
  bg: string
  dot: string
}[] = [
  { value: 'Normal', label: 'Normal', color: '#78716C', bg: '#F5F5F4', dot: '#A8A29E' },
  { value: 'High', label: 'High', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { value: 'Urgent', label: 'Urgent', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
]

interface ProjectPriorityControlProps {
  projectId: string
  currentPriority: Priority
}

export function ProjectPriorityControl({ projectId, currentPriority }: ProjectPriorityControlProps) {
  const router = useRouter()
  const [priority, setPriority] = useState<Priority>(currentPriority)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[0]

  async function handleSelect(next: Priority) {
    if (next === priority) {
      setOpen(false)
      return
    }

    setSaving(true)
    setOpen(false)
    const prev = priority
    setPriority(next)

    const res = await fetch(`/api/projects/${projectId}/priority`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: next }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      setPriority(prev)
    }

    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.color}33`,
        }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: current.dot }} />
        {saving ? 'Saving…' : current.label}
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
            className="absolute left-0 top-full mt-1.5 z-40 rounded-xl min-w-[140px] overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Set priority
              </p>
            </div>

            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => handleSelect(p.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                style={{
                  color: p.value === priority ? p.color : 'var(--text-secondary)',
                  background: p.value === priority ? `${p.color}0F` : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (p.value !== priority) e.currentTarget.style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  if (p.value !== priority) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                {p.label}
                {p.value === priority && (
                  <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
