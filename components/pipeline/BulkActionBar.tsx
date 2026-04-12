'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectWithRoomCount } from '@/types/database'

interface BulkActionBarProps {
  selectedIds:    Set<string>
  onClear:        () => void
  members:        { id: string; full_name: string }[]
}

const STATUS_OPTIONS = [
  { value: 'intake',        label: 'Intake' },
  { value: 'shell_ready',   label: 'Shell Ready' },
  { value: 'style_set',     label: 'Style Set' },
  { value: 'staging',       label: 'Staging' },
  { value: 'client_review', label: 'Client Review' },
  { value: 'revisions',     label: 'Revisions' },
  { value: 'delivered',     label: 'Delivered' },
]

const PRIORITY_OPTIONS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'High',   label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
]

export function BulkActionBar({ selectedIds, onClear, members }: BulkActionBarProps) {
  const router       = useRouter()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function applyAction(action: 'status' | 'priority' | 'assign', value: string) {
    if (!value || selectedIds.size === 0) return
    setLoading(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectIds: Array.from(selectedIds),
          action,
          value,
        }),
      })

      if (res.ok) {
        const { count } = await res.json()
        setFeedback(`✓ Updated ${count} project${count !== 1 ? 's' : ''}`)
        setTimeout(() => {
          setFeedback(null)
          onClear()
          router.refresh()
        }, 1500)
      } else {
        const d = await res.json().catch(() => ({}))
        setFeedback(`Error: ${d.error ?? 'Failed'}`)
      }
    } catch {
      setFeedback('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (selectedIds.size === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background:  'var(--sidebar-bg)',
        boxShadow:   '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
        border:      '1px solid rgba(255,255,255,0.08)',
        minWidth:    420,
      }}
    >
      {/* Selection count */}
      <div
        className="flex items-center gap-2 pr-3"
        style={{ borderRight: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold"
          style={{ background: 'var(--brand)', color: 'white' }}
        >
          {selectedIds.size}
        </div>
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
          selected
        </span>
      </div>

      {/* Feedback / loading state */}
      {feedback ? (
        <span
          className="text-xs font-semibold px-3"
          style={{ color: feedback.startsWith('✓') ? '#4ADE80' : '#F87171' }}
        >
          {feedback}
        </span>
      ) : loading ? (
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Updating…</span>
      ) : (
        <>
          {/* Status */}
          <BulkSelect
            placeholder="Set Status"
            options={STATUS_OPTIONS}
            onSelect={(v) => applyAction('status', v)}
            disabled={loading}
          />

          {/* Priority */}
          <BulkSelect
            placeholder="Set Priority"
            options={PRIORITY_OPTIONS}
            onSelect={(v) => applyAction('priority', v)}
            disabled={loading}
          />

          {/* Assign */}
          {members.length > 0 && (
            <BulkSelect
              placeholder="Assign To"
              options={[
                { value: 'unassigned', label: 'Unassigned' },
                ...members.map((m) => ({ value: m.id, label: m.full_name })),
              ]}
              onSelect={(v) => applyAction('assign', v)}
              disabled={loading}
            />
          )}
        </>
      )}

      {/* Clear */}
      <button
        onClick={onClear}
        disabled={loading}
        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ml-1"
        style={{
          background: 'rgba(255,255,255,0.1)',
          color:      'rgba(255,255,255,0.6)',
          border:     '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
        Clear
      </button>
    </div>
  )
}

// ─── Bulk action select ─────────────────────────────────────────

interface BulkSelectProps {
  placeholder: string
  options:     { value: string; label: string }[]
  onSelect:    (v: string) => void
  disabled:    boolean
}

function BulkSelect({ placeholder, options, onSelect, disabled }: BulkSelectProps) {
  return (
    <div className="relative">
      <select
        disabled={disabled}
        value=""
        onChange={(e) => { if (e.target.value) onSelect(e.target.value) }}
        className="appearance-none text-[11px] font-semibold pr-6 pl-3 py-1.5 rounded-lg outline-none cursor-pointer transition-all"
        style={{
          background: 'rgba(255,255,255,0.1)',
          color:      'rgba(255,255,255,0.85)',
          border:     '1px solid rgba(255,255,255,0.15)',
          opacity:    disabled ? 0.5 : 1,
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg
        width="10" height="10"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </div>
  )
}
