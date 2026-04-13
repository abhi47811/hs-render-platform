'use client'

import { useState, useEffect, useCallback } from 'react'

interface RevisionRequest {
  id: string
  request_text: string
  status: 'pending' | 'in_progress' | 'resolved'
  room_name: string | null
  created_at: string
  resolved_at: string | null
}

export function ClientRevisionTracker({ projectId }: { projectId: string }) {
  const [revisions, setRevisions] = useState<RevisionRequest[]>([])
  const [requestText, setRequestText] = useState('')
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadRevisions = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/revisions`)
      if (res.ok) {
        setRevisions(await res.json())
      }
    } catch (err) {
      console.error('Error loading revisions:', err)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadRevisions()
  }, [loadRevisions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestText.trim()) return

    setSaving(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_text: requestText.trim(),
          room_name: roomName.trim() || null,
        }),
      })

      if (res.ok) {
        setRequestText('')
        setRoomName('')
        loadRevisions()
      }
    } catch (err) {
      console.error('Error saving revision:', err)
    }

    setSaving(false)
  }

  const handleStatusUpdate = async (revisionId: string, newStatus: string) => {
    setUpdatingId(revisionId)

    try {
      const res = await fetch(`/api/projects/${projectId}/revisions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision_id: revisionId,
          status: newStatus,
        }),
      })

      if (res.ok) {
        loadRevisions()
      }
    } catch (err) {
      console.error('Error updating revision:', err)
    }

    setUpdatingId(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'var(--surface-2)', color: 'var(--text-secondary)', label: 'Pending' }
      case 'in_progress':
        return { bg: 'var(--surface-2)', color: 'var(--text-secondary)', label: 'In Progress' }
      case 'resolved':
        return { bg: 'var(--surface-2)', color: 'var(--text-secondary)', label: 'Resolved' }
      default:
        return { bg: 'var(--surface-2)', color: 'var(--text-secondary)', label: status }
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'pending':
        return '#EAB308'
      case 'in_progress':
        return '#3B82F6'
      case 'resolved':
        return '#22C55E'
      default:
        return '#9CA3AF'
    }
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3
          className="text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Client Revision Requests
        </h3>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--surface-3)',
            color: 'var(--text-muted)',
          }}
        >
          {revisions.length} request{revisions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add revision form */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="space-y-3">
          <div>
            <label
              htmlFor="request_text"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Revision Request
            </label>
            <textarea
              id="request_text"
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="What changes is the client requesting?"
              rows={3}
              maxLength={1000}
              className="w-full text-sm resize-none rounded-lg px-3 py-2.5 outline-none transition-all"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="room_name"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Room (optional)
            </label>
            <input
              id="room_name"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Living Room"
              maxLength={100}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-all"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={saving || !requestText.trim()}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)',
                color: 'white',
              }}
            >
              {saving ? 'Saving…' : 'Log Request'}
            </button>
          </div>
        </div>
      </form>

      {/* Revision list */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {loading && (
          <p
            className="px-5 py-4 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Loading…
          </p>
        )}
        {!loading && revisions.length === 0 && (
          <p
            className="px-5 py-4 text-sm text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            No revision requests yet
          </p>
        )}

        {revisions.map((rev) => {
          const date = new Date(rev.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          } as any)

          const statusInfo = getStatusColor(rev.status)
          const statusDot = getStatusDot(rev.status)

          return (
            <div key={rev.id} className="px-5 py-4">
              <div className="flex items-start gap-3 mb-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: statusDot }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {rev.request_text}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>
                    {date}
                  </span>
                  {rev.room_name && (
                    <>
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--surface-2)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {rev.room_name}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <select
                    value={rev.status}
                    onChange={(e) =>
                      handleStatusUpdate(rev.id, e.target.value)
                    }
                    disabled={updatingId === rev.id}
                    className="text-xs font-medium px-2 py-1 rounded-lg outline-none disabled:opacity-50"
                    style={{
                      background: statusInfo.bg,
                      color: statusInfo.color,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
