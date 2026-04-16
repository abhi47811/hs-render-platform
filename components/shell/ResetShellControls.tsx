'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResetShellControlsProps {
  roomId: string
  /** Show "Redo Environment" — clears enhanced_shell_url */
  showRedoEnvironment?: boolean
  /** Show "Redo Enhancement" — clears photorealistic + enhanced */
  showRedoEnhancement?: boolean
}

export function ResetShellControls({
  roomId,
  showRedoEnvironment = false,
  showRedoEnhancement = false,
}: ResetShellControlsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'environment' | 'enhancement' | null>(null)
  const [confirming, setConfirming] = useState<'environment' | 'enhancement' | null>(null)

  async function handleReset(resetTo: 'environment' | 'enhancement') {
    setLoading(resetTo)
    setConfirming(null)
    try {
      const res = await fetch(`/api/rooms/${roomId}/reset-shell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetTo }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Reset failed: ${err.error}`)
        return
      }
      router.refresh()
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`)
    } finally {
      setLoading(null)
    }
  }

  if (!showRedoEnvironment && !showRedoEnhancement) return null

  return (
    <div className="flex items-center gap-2">
      {showRedoEnvironment && (
        confirming === 'environment' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700">Redo environment? This clears the current enhanced shell.</span>
            <button
              onClick={() => handleReset('environment')}
              disabled={loading !== null}
              className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'environment' ? 'Resetting…' : 'Yes, redo'}
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1.5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming('environment')}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Redo Environment
          </button>
        )
      )}

      {showRedoEnhancement && (
        confirming === 'enhancement' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-700">Redo full enhancement? Both enhanced images will be cleared.</span>
            <button
              onClick={() => handleReset('enhancement')}
              disabled={loading !== null}
              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading === 'enhancement' ? 'Resetting…' : 'Yes, redo'}
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1.5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming('enhancement')}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Redo Enhancement
          </button>
        )
      )}
    </div>
  )
}
