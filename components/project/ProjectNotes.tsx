'use client'

import { useState, useEffect, useCallback } from 'react'

interface Note {
  id: string
  note_text: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null; role: string | null } | null
}

export function ProjectNotes({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/notes`)
    if (res.ok) setNotes(await res.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setSaving(true)

    const res = await fetch(`/api/projects/${projectId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_text: text.trim() }),
    })

    if (res.ok) {
      setText('')
      loadNotes()
    }

    setSaving(false)
  }

  return (
    <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
          Internal Notes
        </h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an internal note… (client preferences, team context, reminders)"
          rows={3}
          maxLength={2000}
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

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {text.length}/2000
          </span>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)',
              color: 'white',
            }}
          >
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      </form>

      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {loading && <p className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>}
        {!loading && notes.length === 0 && <p className="px-5 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No notes yet</p>}
        {notes.map((n) => {
          const initials = (n.profiles?.full_name ?? '')
            .trim()
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '?'
          const date = new Date(n.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          } as any)

          return (
            <div key={n.id} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}
                >
                  {initials}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {n.profiles?.full_name ?? 'Team'}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {date}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {n.note_text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
