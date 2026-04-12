'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SlaExtendButtonProps {
  projectId: string
}

export function SlaExtendButton({ projectId }: SlaExtendButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function extend(hours: 24 | 48 | 72) {
    setSaving(true)
    setOpen(false)

    await fetch(`/api/projects/${projectId}/extend-sla`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extend_hours: hours }),
    })

    setDone(true)
    setTimeout(() => setDone(false), 3000)
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-md transition-all"
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--border)',
          color: saving ? 'var(--text-muted)' : 'var(--text-secondary)',
        }}
      >
        {saving ? '…' : done ? '✓ Extended' : '+ Extend SLA'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 z-40 rounded-xl overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Extend deadline by
              </p>
            </div>

            {([24, 48, 72] as const).map((h) => (
              <button
                key={h}
                onClick={() => extend(h)}
                className="w-full px-4 py-2.5 text-sm font-medium text-left transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                +{h} hours
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
