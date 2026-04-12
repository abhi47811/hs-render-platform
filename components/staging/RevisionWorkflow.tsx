'use client'

// ─── Sec 30: Revision Workflow ─────────────────────────────────────────────
// Displayed in the staging workspace when project.status === 'revisions'.
// Shows the client's revision brief, determines the correct starting pass,
// anchors to the CP3 render, and lets the team accept and begin the revision.
//
// Also handles Sec 41: Revision Limit Enforcement — banner when limit reached.

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Revision } from '@/types/database'

// ── Pass determination from element tags ──────────────────────────────────────
// The tag → pass mapping defines which pass is the lowest-level entry point
// for the requested change. The team starts re-generating from there.

const TAG_TO_PASS: Record<string, { passType: string; passNumber: number; label: string }> = {
  'Lighting too dark':      { passType: 'lighting',       passNumber: 5, label: 'Lighting (Pass 5)' },
  'Wrong furniture style':  { passType: 'main_furniture',  passNumber: 3, label: 'Main Furniture (Pass 3)' },
  "Color doesn't match":    { passType: 'flooring',        passNumber: 2, label: 'Flooring / Style (Pass 2)' },
  'Layout issue':           { passType: 'main_furniture',  passNumber: 3, label: 'Main Furniture (Pass 3)' },
  'Add more plants':        { passType: 'accent_pieces',   passNumber: 4, label: 'Accent Pieces (Pass 4)' },
  'Different flooring':     { passType: 'flooring',        passNumber: 2, label: 'Flooring (Pass 2)' },
  'Other':                  { passType: 'revision',        passNumber: 6, label: 'Decor / Full Re-run (Pass 6)' },
}

function determineStartingPass(tags: string[]) {
  if (!tags.length) return TAG_TO_PASS['Other']
  // Pick the lowest pass number (most upstream) from selected tags
  const candidates = tags
    .map(tag => TAG_TO_PASS[tag] ?? TAG_TO_PASS['Other'])
    .sort((a, b) => a.passNumber - b.passNumber)
  return candidates[0]
}

// ── Badge colour helpers ──────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  'Lighting too dark':     'bg-yellow-100 text-yellow-700',
  'Wrong furniture style': 'bg-blue-100 text-blue-700',
  "Color doesn't match":   'bg-purple-100 text-purple-700',
  'Layout issue':          'bg-red-100 text-red-700',
  'Add more plants':       'bg-green-100 text-green-700',
  'Different flooring':    'bg-amber-100 text-amber-700',
  'Other':                 'bg-stone-100 text-stone-600',
}

// ── RevisionWorkflow ──────────────────────────────────────────────────────────

interface RevisionWorkflowProps {
  roomId: string
  projectId: string
  revisionLimit: number           // project.revision_limit (default 2)
  cp3RenderUrl?: string | null    // CP3 approved render — becomes Reference 2
  onRevisionAccepted?: (revision: Revision, startingPassType: string) => void
}

export function RevisionWorkflow({
  roomId,
  projectId,
  revisionLimit,
  cp3RenderUrl,
  onRevisionAccepted,
}: RevisionWorkflowProps) {
  const supabase = createClient()
  const [pending, setPending] = useState<Revision | null>(null)
  const [history, setHistory] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRevisions = useCallback(async () => {
    const { data } = await supabase
      .from('revisions')
      .select('*')
      .eq('room_id', roomId)
      .order('revision_number', { ascending: false })

    const all = data ?? []
    const inProgress = all.find(r => r.status === 'in_progress') ?? null
    setPending(inProgress)
    setHistory(all.filter(r => r.status === 'completed'))
    setLoading(false)
  }, [supabase, roomId])

  useEffect(() => { fetchRevisions() }, [fetchRevisions])

  const completedCount = history.length
  const currentRevNum = pending?.revision_number ?? completedCount + 1
  const limitReached = completedCount >= revisionLimit
  const limitWarning = currentRevNum > revisionLimit

  const startingPass = pending ? determineStartingPass(pending.element_tags) : null

  const handleAccept = async () => {
    if (!pending || !startingPass) return
    setIsAccepting(true)
    setError(null)
    try {
      // Update room status back to 'staging'
      const { error: roomErr } = await supabase
        .from('rooms')
        .update({ status: 'staging', current_pass: startingPass.passNumber })
        .eq('id', roomId)
      if (roomErr) throw roomErr

      // Log activity
      supabase
        .from('activity_log')
        .insert({
          project_id: projectId,
          event_type: 'revision_started',
          event_data: {
            revision_number: pending.revision_number,
            starting_pass: startingPass.passType,
            tags: pending.element_tags,
            limit_exceeded: limitWarning,
          },
        })
        .then(({ error }) => {
          if (error) console.warn('[RevisionWorkflow] activity log failed:', error.message)
        })

      onRevisionAccepted?.(pending, startingPass.passType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start revision')
    } finally {
      setIsAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="h-3 bg-stone-100 rounded animate-pulse w-1/3 mb-3" />
        <div className="h-2 bg-stone-100 rounded animate-pulse w-2/3" />
      </div>
    )
  }

  if (!pending) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-4 flex items-center gap-3">
        <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-stone-500">
          No pending revisions — project is in revision status but no open brief.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold">
            R
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">Revision Request</h3>
            <p className="text-xs text-stone-400">Client submitted changes for this room</p>
          </div>
        </div>

        {/* Rev X of N */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          limitWarning ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
        }`}>
          Rev {currentRevNum} of {revisionLimit}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Limit exceeded warning */}
        {limitWarning && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-red-700">Revision limit reached</p>
              <p className="text-[11px] text-red-600 mt-0.5">
                This project is on revision {currentRevNum} of {revisionLimit}. Consider discussing scope with the client. You can still proceed.
              </p>
            </div>
          </div>
        )}

        {/* Client brief */}
        <div>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
            Client Brief
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-900 leading-relaxed">{pending.brief}</p>
          </div>
        </div>

        {/* Element tags */}
        <div>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
            Change Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pending.element_tags.map(tag => (
              <span
                key={tag}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${TAG_COLORS[tag] ?? 'bg-stone-100 text-stone-600'}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Starting pass recommendation */}
        {startingPass && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                Recommended Starting Pass
              </p>
              <p className="text-sm font-semibold text-stone-800">{startingPass.label}</p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                Re-generate from this pass; passes above it will cascade on approval
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {startingPass.passNumber}
            </div>
          </div>
        )}

        {/* CP3 anchor render */}
        {cp3RenderUrl && (
          <div>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              Reference 2 — CP3 Approved Render (Anchor)
            </p>
            <div className="relative w-full h-32 bg-stone-100 rounded-xl overflow-hidden">
              <Image
                src={cp3RenderUrl}
                alt="CP3 approved render — revision anchor"
                fill
                className="object-cover"
                sizes="400px"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-stone-900/70 text-white backdrop-blur-sm">
                Slot 2 · CP3 Anchor
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 px-1">{error}</p>
        )}

        {/* Action */}
        <button
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isAccepting ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Starting revision…
            </>
          ) : (
            `Accept & Begin from ${startingPass?.label ?? 'Selected Pass'}`
          )}
        </button>
      </div>

      {/* Completed revisions history */}
      {history.length > 0 && (
        <div className="border-t border-stone-100 px-5 py-3">
          <details className="group">
            <summary className="text-[10px] text-stone-400 hover:text-stone-600 cursor-pointer select-none flex items-center gap-1.5 py-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
                <path d="M9 18l6-6-6-6"/>
              </svg>
              {history.length} previous revision{history.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2">
              {history.map(rev => (
                <div key={rev.id} className="flex items-start gap-2 py-1.5">
                  <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-500 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    R{rev.revision_number}
                  </span>
                  <div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">{rev.brief.slice(0, 120)}{rev.brief.length > 120 ? '…' : ''}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {rev.element_tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
