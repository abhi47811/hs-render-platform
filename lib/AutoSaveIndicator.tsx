'use client'

// ── A6: Auto-save status indicator ──────────────────────────────────────────
// Rendered in staging-client next to the prompt builder toolbar.
// Separated from useAutoSavePrompt.ts because JSX requires a .tsx extension.

import type { AutoSaveState } from './useAutoSavePrompt'

export function AutoSaveIndicator({ saveState }: { saveState: AutoSaveState }) {
  if (saveState.status === 'idle') return null

  return (
    <span className="flex items-center gap-1 text-[10px] text-stone-400">
      {saveState.status === 'saving' && (
        <>
          <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Saving…
        </>
      )}
      {saveState.status === 'saved' && (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span className="text-stone-400">
            Saved{saveState.lastSavedAt
              ? ` ${saveState.lastSavedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </span>
        </>
      )}
      {saveState.status === 'error' && (
        <span className="text-red-400">Save failed</span>
      )}
    </span>
  )
}
