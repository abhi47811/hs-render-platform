'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SeedRender {
  id: string
  storage_url: string
  pass_number: number
  pass_type: string
  status: string  // 'pending' | 'approved' | 'rejected'
  variation_label?: string | null
  created_at: string
}

interface StyleSeedPanelProps {
  roomId: string
  currentPassNumber: number
  seedRender: SeedRender | null       // the already-approved seed render, if any
  pendingSeedRenders: SeedRender[]    // pass_type='style_seed' renders awaiting approval
  styleLocked: boolean
  onSeedApproved: (render: SeedRender) => void
}

export function StyleSeedPanel({
  roomId,
  currentPassNumber,
  seedRender,
  pendingSeedRenders,
  styleLocked,
  onSeedApproved,
}: StyleSeedPanelProps) {
  const supabase = createClient()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [expandSeed, setExpandSeed] = useState(false)

  // ── State A: Style locked — show seed thumbnail + lock badge ──────────────
  if (styleLocked && seedRender) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-800">Style Direction Locked</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Approved style seed · used as reference in all subsequent passes</p>
          </div>
          <button
            onClick={() => setExpandSeed(v => !v)}
            className="flex-shrink-0 text-[10px] text-emerald-600 hover:text-emerald-800 transition-colors font-medium cursor-pointer"
          >
            {expandSeed ? 'Hide' : 'View'}
          </button>
        </div>
        {expandSeed && (
          <div className="border-t border-emerald-200 p-3">
            <img
              src={seedRender.storage_url}
              alt="Approved style seed"
              className="w-full rounded-lg object-cover max-h-48"
            />
            <p className="text-[10px] text-emerald-600 mt-1.5 text-center">
              Pass 1 · {seedRender.variation_label ?? 'Variation A'} · Approved
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── State B: Seed approved but style not yet locked (CP2 pending) ──────────
  if (!styleLocked && seedRender) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">Style Seed Approved — Awaiting CP2 Lock</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Complete CP2 (Style Set) to lock the direction and enable further passes</p>
          </div>
          <button
            onClick={() => setExpandSeed(v => !v)}
            className="flex-shrink-0 text-[10px] text-amber-600 hover:text-amber-800 transition-colors font-medium cursor-pointer"
          >
            {expandSeed ? 'Hide' : 'View'}
          </button>
        </div>
        {expandSeed && (
          <div className="border-t border-amber-200 p-3">
            <img
              src={seedRender.storage_url}
              alt="Approved style seed"
              className="w-full rounded-lg object-cover max-h-48"
            />
          </div>
        )}
      </div>
    )
  }

  // ── State C: Pass 1 renders exist but no approved seed yet ────────────────
  if (pendingSeedRenders.length > 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
              Style Seed — Select &amp; Approve
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Pick the render that best captures the design direction</p>
          </div>
          <span className="text-[9px] font-semibold bg-stone-100 text-stone-500 px-2 py-1 rounded-full">
            {pendingSeedRenders.length} render{pendingSeedRenders.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pendingSeedRenders.map((render) => (
            <SeedRenderCard
              key={render.id}
              render={render}
              isApproving={approvingId === render.id}
              onApprove={async () => {
                setApprovingId(render.id)
                try {
                  // 1. Mark render as approved
                  const { error: renderErr } = await supabase
                    .from('renders')
                    .update({ status: 'approved', approved_at: new Date().toISOString() })
                    .eq('id', render.id)
                  if (renderErr) throw renderErr

                  // 2. Write style_seed_url to room
                  const { error: roomErr } = await supabase
                    .from('rooms')
                    .update({ style_seed_url: render.storage_url })
                    .eq('id', roomId)
                  if (roomErr) throw roomErr

                  onSeedApproved(render)
                } catch (err) {
                  console.error('[StyleSeedPanel] approve seed failed:', err)
                } finally {
                  setApprovingId(null)
                }
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── State D: No pass 1 renders at all — prompt to generate seed first ──────
  if (currentPassNumber !== 1) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 flex-shrink-0">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-xs text-stone-500">
          <span className="font-semibold text-stone-700">No style seed yet.</span>{' '}
          Switch to Pass 1 and generate at least one render to set the style direction.
        </p>
      </div>
    )
  }

  // Pass 1 is selected but no renders yet — nothing to show (generate button handles this)
  return null
}

// ── Sub-component: individual seed render card ─────────────────────────────
function SeedRenderCard({
  render,
  isApproving,
  onApprove,
}: {
  render: SeedRender
  isApproving: boolean
  onApprove: () => void
}) {
  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50">
      <div className="relative">
        <img
          src={render.storage_url}
          alt={`Style seed variation ${render.variation_label ?? ''}`}
          className="w-full aspect-[4/3] object-cover"
        />
        {/* Variation label overlay */}
        <span className="absolute top-1.5 left-1.5 text-[8px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-full">
          {render.variation_label ?? 'A'}
        </span>
      </div>
      <div className="p-2">
        <button
          onClick={onApprove}
          disabled={isApproving}
          className="w-full py-1.5 min-h-[32px] rounded-lg bg-stone-900 hover:bg-stone-700 disabled:bg-stone-300 text-white text-[10px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          {isApproving ? (
            <>
              <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Approving…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Approve as Seed
            </>
          )}
        </button>
      </div>
    </div>
  )
}
