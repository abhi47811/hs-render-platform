'use client'

// ─── Sec 37: Duplicate Project button ────────────────────────────────────────
// Client component rendered inside the server project page.
// Opens DuplicateProjectModal on click.

import { useState } from 'react'
import { DuplicateProjectModal } from './DuplicateProjectModal'

interface DuplicateButtonProps {
  projectId: string
  projectName: string
}

export function DuplicateButton({ projectId, projectName }: DuplicateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-400 transition-colors"
        title="Duplicate this project"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Duplicate
      </button>
      {open && (
        <DuplicateProjectModal
          projectId={projectId}
          projectName={projectName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
