'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProjectArchiveButtonProps {
  projectId: string
  isArchived: boolean
}

export function ProjectArchiveButton({ projectId, isArchived }: ProjectArchiveButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleArchive() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !isArchived }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update archive status')
      }

      setConfirming(false)
      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      {/* Button */}
      <button
        onClick={() => setConfirming(!confirming)}
        disabled={saving}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: isArchived ? 'var(--surface-2)' : '#FEF2F2',
          color: isArchived ? 'var(--text-secondary)' : '#DC2626',
          border: `1px solid ${isArchived ? 'var(--border)' : '#FECACA'}`,
          opacity: saving ? 0.7 : 1,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
        title={isArchived ? 'Restore project from archive' : 'Archive this project'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isArchived ? (
            <>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </>
          ) : (
            <>
              <rect x="2" y="4" width="20" height="5" />
              <path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
              <path d="M9 5v4" />
              <path d="M15 5v4" />
            </>
          )}
        </svg>
        {saving ? 'Updating…' : isArchived ? 'Restore' : 'Archive'}
      </button>

      {/* Confirmation UI */}
      {confirming && (
        <div
          className="absolute left-0 top-full mt-2 z-40 rounded-xl overflow-hidden min-w-[240px]"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-stone-700 mb-3">
              {isArchived
                ? 'Restore this project to the pipeline?'
                : 'Archive this project? It will be hidden from the pipeline.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleArchive}
                disabled={saving}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex-1"
                style={{
                  background: isArchived ? 'var(--surface-2)' : '#16A34A',
                  color: isArchived ? 'var(--text-primary)' : 'white',
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Updating…' : isArchived ? 'Restore' : 'Archive'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {confirming && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setConfirming(false)}
        />
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
