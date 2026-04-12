'use client'

// ─── A8: Keyboard Shortcuts ────────────────────────────────────────────────
// Global keyboard shortcut system + help modal (? key).
//
// Active shortcuts:
//   ?          — toggle this help modal
//   Cmd+K      — command palette (handled by CommandPalette)
//   G+P        — Go to Pipeline (dashboard home)
//   G+A        — Go to Analytics
//   G+L        — Go to Library
//   R          — Refresh current page data (fires custom event)
//
// Chord shortcuts (G+_) work by capturing 'g' keydown then waiting 800ms
// for the second key. If no second key arrives, chord is abandoned.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── Shortcut definitions ───────────────────────────────────────────────────

interface Shortcut {
  keys: string
  description: string
  category: string
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: 'G then P',   description: 'Go to Pipeline',             category: 'Navigation' },
  { keys: 'G then A',   description: 'Go to Analytics',            category: 'Navigation' },
  { keys: 'G then L',   description: 'Go to Asset Library',        category: 'Navigation' },
  { keys: '⌘K',         description: 'Open project search',        category: 'Navigation' },
  // Staging
  { keys: '1–6',        description: 'Jump to pass 1–6',           category: 'Staging' },
  { keys: 'Esc',        description: 'Close modals / lightbox',     category: 'Staging' },
  { keys: 'R',          description: 'Refresh render gallery',      category: 'Staging' },
  { keys: '⌘Enter',     description: 'Generate (from prompt)',      category: 'Staging' },
  // Lightbox
  { keys: '← →',        description: 'Navigate renders in lightbox', category: 'Lightbox' },
  { keys: '+ −',        description: 'Zoom in / out',              category: 'Lightbox' },
  { keys: 'R',          description: 'Reset zoom',                  category: 'Lightbox' },
  { keys: 'M',          description: 'Toggle metadata overlay',     category: 'Lightbox' },
  // General
  { keys: '?',          description: 'Show keyboard shortcuts',     category: 'General' },
]

// ── Component ──────────────────────────────────────────────────────────────

export function KeyboardShortcuts() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const gPressedRef = useRef(false)
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleKey = useCallback((e: KeyboardEvent) => {
    // Don't intercept if typing in an input/textarea
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // ? key → toggle shortcuts modal
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      setShowModal(v => !v)
      return
    }

    // Chord: G then P / A / L
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      gPressedRef.current = true
      if (gTimerRef.current) clearTimeout(gTimerRef.current)
      gTimerRef.current = setTimeout(() => { gPressedRef.current = false }, 800)
      return
    }

    if (gPressedRef.current) {
      gPressedRef.current = false
      if (gTimerRef.current) clearTimeout(gTimerRef.current)

      if (e.key === 'p') { e.preventDefault(); router.push('/'); return }
      if (e.key === 'a') { e.preventDefault(); router.push('/analytics'); return }
      if (e.key === 'l') { e.preventDefault(); router.push('/library/vault'); return }
    }

    // Number keys 1–6 → navigate passes (fires custom event)
    if (/^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      window.dispatchEvent(new CustomEvent('houspire:selectPass', { detail: { pass: parseInt(e.key) } }))
      return
    }
  }, [router])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Register selectPass listener in staging page via custom event
  // (staging-client.tsx listens via useEffect — see below)

  if (!showModal) return null

  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)))

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Keyboard Shortcuts</h2>
            <p className="text-xs text-stone-500 mt-0.5">Press ? to toggle this panel</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-5">
          {categories.map(category => (
            <div key={category}>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">{category}</p>
              <div className="space-y-1">
                {SHORTCUTS.filter(s => s.category === category).map(shortcut => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-stone-700">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.split(' ').map((k, i) => (
                        k === 'then' ? (
                          <span key={i} className="text-[10px] text-stone-400 mx-0.5">then</span>
                        ) : (
                          <kbd key={i} className="px-2 py-0.5 bg-stone-100 border border-stone-200 rounded text-[10px] font-mono font-semibold text-stone-700 shadow-sm">
                            {k}
                          </kbd>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4 text-center">
          <p className="text-[10px] text-stone-400">Shortcuts are disabled when typing in text fields</p>
        </div>
      </div>
    </div>
  )
}
