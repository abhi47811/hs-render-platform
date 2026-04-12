'use client'
import { useState } from 'react'

const ROLE_OPTIONS = ['admin', 'designer', 'reviewer', 'ops']
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin:    { bg: '#FDF4E7', color: '#92400E' },
  designer: { bg: '#EDE9FE', color: '#5B21B6' },
  reviewer: { bg: '#F0FDF4', color: '#14532D' },
  ops:      { bg: '#EFF6FF', color: '#1E3A8A' },
}

interface Member {
  id: string
  full_name: string | null
  role: string | null
  created_at: string | null
}

interface TeamMembersPanelProps {
  members: Member[]
  currentUserId: string
  isAdmin: boolean
}

export function TeamMembersPanel({ members, currentUserId, isAdmin }: TeamMembersPanelProps) {
  const [rows, setRows]     = useState(members)
  const [saving, setSaving] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function updateRole(memberId: string, role: string) {
    setSaving(memberId)
    setErrors(e => { const next = { ...e }; delete next[memberId]; return next })

    const res = await fetch(`/api/settings/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    if (res.ok) {
      setRows(r => r.map(m => m.id === memberId ? { ...m, role } : m))
    } else {
      const d = await res.json().catch(() => ({}))
      setErrors(e => ({ ...e, [memberId]: d.error ?? 'Failed' }))
    }
    setSaving(null)
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
        No team members found
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div
        className="grid grid-cols-3 pb-2 mb-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>Joined</span>
      </div>

      {/* Member rows */}
      {rows.map((member) => {
        const initials = (member.full_name ?? '')
          .trim()
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || '?'

        const roleStyle = member.role
          ? (ROLE_COLORS[member.role] ?? { bg: 'var(--surface-3)', color: 'var(--text-secondary)' })
          : { bg: 'var(--surface-3)', color: 'var(--text-muted)' }

        const joinedDate = member.created_at
          ? new Date(member.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'

        const isSelf    = member.id === currentUserId
        const isSaving  = saving === member.id
        const rowError  = errors[member.id]

        return (
          <div key={member.id}>
            <div
              className="grid grid-cols-3 items-center py-3"
              style={{ borderBottom: rowError ? 'none' : '1px solid var(--border)' }}
            >
              {/* Name + avatar */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}
                >
                  {initials}
                </div>
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {member.full_name ?? 'Unnamed'}
                </span>
                {isSelf && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                  >
                    you
                  </span>
                )}
              </div>

              {/* Role */}
              <div>
                {isAdmin && !isSelf ? (
                  <select
                    value={member.role ?? ''}
                    disabled={isSaving}
                    onChange={(e) => updateRole(member.id, e.target.value)}
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full outline-none transition-all"
                    style={{
                      ...roleStyle,
                      border: 'none',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.5 : 1,
                    }}
                  >
                    <option value="">No role</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={roleStyle}
                  >
                    {member.role ?? 'No role'}
                  </span>
                )}
              </div>

              {/* Joined */}
              <span className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                {joinedDate}
              </span>
            </div>
            {rowError && (
              <p className="text-xs px-2 py-1 mb-1" style={{ color: '#DC2626' }}>
                {rowError}
              </p>
            )}
          </div>
        )
      })}

      {isAdmin && (
        <p className="text-[10px] pt-3" style={{ color: 'var(--text-muted)' }}>
          As admin, you can change team member roles by clicking the role badge.
        </p>
      )}
    </div>
  )
}
