'use client'

// ─── Sec 37: Project Duplication ────────────────────────────────────────────
// 3 duplication modes:
//   shell_only   — Copy shell images only; all renders/checkpoints/style cleared
//   shell_style  — Copy shell + approved style seed; continue from Pass 2
//   full_copy    — Copy everything; useful for variation projects
//
// Client details (client_name, client_email, client_phone) always reset.
// New SLA deadline is set based on project type's standard turnaround.
// New activity log is created; all checkpoints reset to 'pending'.
// Primarily for B2B builder clients with identical units.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type DuplicationMode = 'shell_only' | 'shell_style' | 'full_copy'

interface DuplicateProjectModalProps {
  projectId: string
  projectName: string
  onClose: () => void
}

const MODE_OPTIONS: {
  mode: DuplicationMode
  label: string
  description: string
  icon: string
  note: string
}[] = [
  {
    mode: 'shell_only',
    label: 'Shell Only',
    description: 'Copy shell images, start fresh from Pass 1',
    icon: '🏗',
    note: 'Best for: identical units needing a completely different look',
  },
  {
    mode: 'shell_style',
    label: 'Shell + Style',
    description: 'Copy shell + approved style seed, continue from Pass 2',
    icon: '🎨',
    note: 'Best for: identical units, same aesthetic, different finishes',
  },
  {
    mode: 'full_copy',
    label: 'Full Copy',
    description: 'Copy everything including all renders and checkpoints',
    icon: '📋',
    note: 'Best for: variation project, backup before major revision',
  },
]

export function DuplicateProjectModal({
  projectId,
  projectName,
  onClose,
}: DuplicateProjectModalProps) {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<DuplicationMode>('shell_only')
  const [newClientName, setNewClientName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDuplicate = async () => {
    if (!newClientName.trim()) {
      setError('New client name is required')
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/projects/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_project_id: projectId,
          duplication_mode: selectedMode,
          new_client_name: newClientName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Duplication failed')
      }
      onClose()
      router.push(`/projects/${data.new_project_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplication failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Duplicate Project</h2>
            <p className="text-xs text-stone-500 mt-0.5 truncate max-w-xs">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors text-stone-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Mode selector */}
        <div className="px-6 py-4 space-y-2.5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Copy Mode</p>
          {MODE_OPTIONS.map(opt => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setSelectedMode(opt.mode)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                selectedMode === opt.mode
                  ? 'border-stone-900 bg-stone-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-stone-900">{opt.label}</p>
                    {selectedMode === opt.mode && (
                      <span className="text-[9px] font-bold bg-stone-900 text-white px-1.5 py-0.5 rounded-full">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{opt.description}</p>
                  <p className="text-[10px] text-stone-400 mt-1 italic">{opt.note}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* New client name */}
        <div className="px-6 pb-4 space-y-1.5">
          <label className="text-xs font-semibold text-stone-700">New Client Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            placeholder="e.g. Flat 2B — Tower A"
            className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-white"
          />
          <p className="text-[10px] text-stone-400">Client email/phone will be cleared — fill in after duplication</p>
        </div>

        {/* Info box */}
        <div className="mx-6 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <span className="font-semibold">SLA resets</span> to today. All checkpoints will be reset to pending.
            {selectedMode === 'full_copy' && ' Renders are linked, not copied — changes to originals may affect this project.'}
          </p>
        </div>

        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={isLoading || !newClientName.trim()}
            className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Duplicating…
              </>
            ) : (
              'Duplicate Project'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
