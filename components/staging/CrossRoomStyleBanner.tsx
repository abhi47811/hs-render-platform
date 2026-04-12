'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Cross-Room Style Consistency (Sec 21) ─────────────────────────────────
// Shows when a project-level style anchor exists (from another room's approved
// seed). Lets the current room "inherit" that seed as its own style_seed_url.

interface CrossRoomStyleBannerProps {
  projectId: string
  currentRoomId: string
  currentRoomHasSeed: boolean     // if this room already has its own seed, show differently
  projectStyleSeedUrl: string     // the project-level locked seed thumbnail
  projectStyleSeedRoom: string    // name of the room that owns the anchor
  onInheritSeed: (url: string) => void
}

export function CrossRoomStyleBanner({
  projectId,
  currentRoomId,
  currentRoomHasSeed,
  projectStyleSeedUrl,
  projectStyleSeedRoom,
  onInheritSeed,
}: CrossRoomStyleBannerProps) {
  const supabase = createClient()
  const [inheriting, setInheriting] = useState(false)
  const [inherited, setInherited] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleInherit = async () => {
    setInheriting(true)
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          style_seed_url: projectStyleSeedUrl,
          style_inherited: true,            // marks that this seed came from another room
          style_inherited_from: projectId,  // project-level anchor
        })
        .eq('id', currentRoomId)

      if (error) throw error
      setInherited(true)
      onInheritSeed(projectStyleSeedUrl)
    } catch (err) {
      console.error('[CrossRoomStyleBanner] inherit failed:', err)
    } finally {
      setInheriting(false)
    }
  }

  // ── Room already has its own seed locked — show as confirmation ───────────
  if (currentRoomHasSeed) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border border-stone-200">
          <img src={projectStyleSeedUrl} alt="Style anchor" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-stone-700">Project Style Anchor Active</p>
          <p className="text-[10px] text-stone-400 truncate">Locked from {projectStyleSeedRoom} · consistent across all rooms</p>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
      </div>
    )
  }

  // ── Room has no seed yet — offer to inherit ────────────────────────────────
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-blue-200 cursor-pointer" onClick={() => setExpanded(v => !v)}>
          <img src={projectStyleSeedUrl} alt="Project style anchor" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-800">Style Anchor from {projectStyleSeedRoom}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">
            {inherited
              ? 'Style seed inherited ✓ — this room will use the same direction'
              : 'Use this style seed to keep all rooms visually consistent'}
          </p>
        </div>
        {!inherited && (
          <button
            onClick={handleInherit}
            disabled={inheriting}
            className="flex-shrink-0 min-h-[32px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {inheriting ? 'Applying…' : 'Use Seed'}
          </button>
        )}
        {inherited && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}
      </div>

      {/* Expandable seed preview */}
      {expanded && (
        <div className="px-4 pb-3">
          <img
            src={projectStyleSeedUrl}
            alt="Project style anchor preview"
            className="w-full rounded-lg object-cover max-h-40 border border-blue-200"
          />
          <p className="text-[9px] text-blue-500 mt-1 text-center">Style anchor — locked from {projectStyleSeedRoom}</p>
        </div>
      )}
    </div>
  )
}
