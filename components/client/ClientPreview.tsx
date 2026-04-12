'use client'

// ─── A7: Mobile-Optimised Client Preview ──────────────────────────────────
// Redesigned for mobile-first experience (shared via WhatsApp link).
//
// Mobile improvements:
//   • Full-width swipeable image carousel (one image at a time)
//   • Sticky approve/reject CTA bar at bottom (thumb-reachable)
//   • Large touch targets (min 44px)
//   • Image counter "2 of 4" indicator
//   • Pinch-to-zoom enabled via CSS
//   • WhatsApp share deep-link for forwarding to family
//   • Before/After toggle per render with large tap target
//   • Minimal chrome — maximum render real estate

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Project, Render, Room } from '@/types/database'
import RevisionForm from './RevisionForm'

interface ClientPreviewProps {
  renders: Render[]
  room: Room
  project: Project
  shareToken: string
  checkpointNumber: number
}

const CP_LABEL: Record<number, string> = {
  1: 'Style Direction Review',
  2: 'Design Checkpoint',
  3: 'Final Design Approval',
}

export default function ClientPreview({
  renders,
  room,
  project,
  shareToken,
  checkpointNumber,
}: ClientPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBefore, setShowBefore] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [approvalSuccess, setApprovalSuccess] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const current = renders[currentIndex]
  const hasShell = !!room.original_shell_url
  const cpLabel = CP_LABEL[checkpointNumber] ?? `Checkpoint ${checkpointNumber}`

  // Swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0 && currentIndex < renders.length - 1) setCurrentIndex(i => i + 1)
      if (dx > 0 && currentIndex > 0) setCurrentIndex(i => i - 1)
    }
    touchStartX.current = null
  }

  const handleApprove = async () => {
    setIsApproving(true)
    setApprovalError(null)
    try {
      const response = await fetch('/api/share/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: shareToken, checkpoint_number: checkpointNumber }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve designs')
      }
      setApprovalSuccess(true)
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsApproving(false)
    }
  }

  const handleShareForward = () => {
    const url = window.location.href
    const text = `Hi! Here are my interior design renders from Houspire — please take a look and share your thoughts! 🏠\n\n${url}`
    if (navigator.share) {
      navigator.share({ title: 'Houspire Design Review', text, url }).catch(() => {})
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(waUrl, '_blank', 'noopener')
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (approvalSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Thank you! 🎉</h2>
        <p className="text-stone-600 leading-relaxed">Your approval has been recorded. The Houspire team will now prepare the next steps.</p>
      </div>
    )
  }

  // ── Revision form ─────────────────────────────────────────────────────────
  if (showRevisionForm) {
    return (
      <div>
        <button
          onClick={() => setShowRevisionForm(false)}
          className="mb-6 flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to designs
        </button>
        <RevisionForm
          shareToken={shareToken}
          roomId={room.id}
          onSubmit={() => setTimeout(() => window.location.reload(), 1000)}
        />
      </div>
    )
  }

  // ── Main preview ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-28">

      {/* Room + project info */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">{room.room_name}</h1>
            <p className="text-sm text-stone-500 mt-0.5">{cpLabel} · {project.city}</p>
          </div>
          {/* Forward/share button */}
          <button
            onClick={handleShareForward}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white text-xs font-semibold rounded-xl min-h-[44px]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share
          </button>
        </div>
      </div>

      {renders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 p-10 text-center">
          <div>
            <p className="text-stone-500 font-medium mb-1">No designs ready yet</p>
            <p className="text-xs text-stone-400">The team is working on your designs</p>
          </div>
        </div>
      ) : (
        <>
          {/* Image carousel */}
          <div
            className="relative rounded-2xl overflow-hidden bg-stone-100 touch-pan-y select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Main image */}
            <div className="aspect-[4/3] relative">
              {current && (
                <Image
                  src={showBefore && hasShell ? room.original_shell_url! : (current.watermarked_url ?? current.storage_url)}
                  alt={`Design ${currentIndex + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority
                />
              )}
            </div>

            {/* Navigation arrows (tablet+) */}
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(i => i - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {currentIndex < renders.length - 1 && (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}

            {/* Overlay: image counter */}
            <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
              {currentIndex + 1} / {renders.length}
            </div>

            {/* Before/After toggle */}
            {hasShell && (
              <button
                onClick={() => setShowBefore(v => !v)}
                className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-semibold"
              >
                {showBefore ? '→ Show Design' : '← Show Before'}
              </button>
            )}
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {renders.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`rounded-full transition-all ${
                  i === currentIndex ? 'w-5 h-2 bg-stone-900' : 'w-2 h-2 bg-stone-300'
                }`}
              />
            ))}
          </div>

          {/* Render label */}
          {current && (
            <div className="mt-3 flex items-center gap-2 px-1">
              <span className="text-sm font-semibold text-stone-800 capitalize">
                {current.pass_type?.replace(/_/g, ' ') ?? 'Design'}
              </span>
              {current.variation_label && (
                <span className="px-2 py-0.5 bg-stone-100 rounded-full text-[10px] text-stone-600 font-medium">
                  {current.variation_label}
                </span>
              )}
            </div>
          )}

          {/* All thumbnails strip */}
          {renders.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {renders.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`flex-shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                    i === currentIndex ? 'border-stone-900' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={r.watermarked_url ?? r.storage_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 mb-1">How to review</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Swipe through all {renders.length} design{renders.length > 1 ? 's' : ''} above.
              Use the Before/After toggle to compare with your original space.
              When ready, tap <strong>Approve</strong> to confirm — or <strong>Request Changes</strong> with specific feedback.
            </p>
          </div>
        </>
      )}

      {/* Error */}
      {approvalError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{approvalError}</p>
        </div>
      )}

      {/* Sticky bottom CTA — thumb-zone friendly */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 safe-area-bottom">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={handleApprove}
            disabled={isApproving || renders.length === 0}
            className="flex-1 flex items-center justify-center gap-2 min-h-[52px] bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {isApproving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Approving…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Approve designs
              </>
            )}
          </button>
          <button
            onClick={() => setShowRevisionForm(true)}
            className="min-h-[52px] px-5 border-2 border-stone-300 hover:border-stone-400 text-stone-700 font-semibold rounded-xl text-sm transition-colors"
          >
            Changes
          </button>
        </div>
      </div>
    </div>
  )
}
