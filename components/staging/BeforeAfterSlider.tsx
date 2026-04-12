'use client'

// ─── Sec 26: Before/After Comparison Slider ───────────────────────────────
// Three display modes:
//   drag       — draggable vertical divider (default workspace + client view)
//   split      — side-by-side panels with fixed 50/50 split
//   fade       — single image with click/tap to toggle (presentation mode)
//
// Usage:
//   <BeforeAfterSlider
//     beforeUrl={room.original_shell_url}
//     afterUrl={render.storage_url}
//   />

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'

export type CompareMode = 'drag' | 'split' | 'fade'

interface BeforeAfterSliderProps {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
  /** Which mode to start in */
  defaultMode?: CompareMode
  /** Whether to show the mode-toggle toolbar above the image */
  showModeToggle?: boolean
  className?: string
}

// ── Chevron icon ─────────────────────────────────────────────────────────────
function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      {direction === 'left'
        ? <path d="M7 1L3 5l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      }
    </svg>
  )
}

// ── Drag-mode slider ──────────────────────────────────────────────────────────
function DragSlider({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}: {
  beforeUrl: string
  afterUrl: string
  beforeLabel: string
  afterLabel: string
}) {
  const [position, setPosition] = useState(50) // 0–100 %
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const getPositionFromEvent = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition(Math.round((x / rect.width) * 100))
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    isDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    getPositionFromEvent(e.clientX)
  }, [getPositionFromEvent])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Allow clicking anywhere on the container to re-position
  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) return
    getPositionFromEvent(e.clientX)
  }, [getPositionFromEvent])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-stone-100 rounded-xl overflow-hidden cursor-col-resize select-none"
      onClick={onContainerClick}
    >
      {/* After image (full width, underneath) */}
      <Image
        src={afterUrl}
        alt={afterLabel}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        draggable={false}
      />

      {/* Before image (clipped by slider position) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <div className="relative w-full h-full" style={{ width: `${10000 / position}%`, maxWidth: 'none' }}>
          <Image
            src={beforeUrl}
            alt={beforeLabel}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            draggable={false}
          />
        </div>
      </div>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-stone-200 cursor-col-resize touch-none"
        style={{ left: `${position}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="flex items-center gap-0.5 text-stone-500">
          <ChevronIcon direction="left" />
          <ChevronIcon direction="right" />
        </span>
      </div>

      {/* Labels */}
      <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[11px] font-semibold text-stone-700 bg-white/80 backdrop-blur-sm select-none pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[11px] font-semibold text-white bg-stone-900/60 backdrop-blur-sm select-none pointer-events-none">
        {afterLabel}
      </span>
    </div>
  )
}

// ── Split mode ────────────────────────────────────────────────────────────────
function SplitView({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}: {
  beforeUrl: string
  afterUrl: string
  beforeLabel: string
  afterLabel: string
}) {
  return (
    <div className="grid grid-cols-2 gap-1 w-full rounded-xl overflow-hidden">
      <div className="relative aspect-video bg-stone-100">
        <Image src={beforeUrl} alt={beforeLabel} fill className="object-cover" sizes="25vw" />
        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[11px] font-semibold text-stone-700 bg-white/80 backdrop-blur-sm">
          {beforeLabel}
        </span>
      </div>
      <div className="relative aspect-video bg-stone-100">
        <Image src={afterUrl} alt={afterLabel} fill className="object-cover" sizes="25vw" />
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[11px] font-semibold text-white bg-stone-900/60 backdrop-blur-sm">
          {afterLabel}
        </span>
      </div>
    </div>
  )
}

// ── Fade mode ─────────────────────────────────────────────────────────────────
function FadeView({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}: {
  beforeUrl: string
  afterUrl: string
  beforeLabel: string
  afterLabel: string
}) {
  const [showAfter, setShowAfter] = useState(true)

  return (
    <div
      className="relative w-full aspect-video bg-stone-100 rounded-xl overflow-hidden cursor-pointer select-none"
      onClick={() => setShowAfter((v) => !v)}
      title={`Click to see ${showAfter ? beforeLabel : afterLabel}`}
    >
      {/* Before always rendered */}
      <Image src={beforeUrl} alt={beforeLabel} fill className="object-cover" sizes="50vw" />

      {/* After fades in/out */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: showAfter ? 1 : 0 }}
      >
        <Image src={afterUrl} alt={afterLabel} fill className="object-cover" sizes="50vw" />
      </div>

      {/* Label */}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold text-white bg-stone-900/60 backdrop-blur-sm pointer-events-none">
        {showAfter ? afterLabel : beforeLabel} · tap to switch
      </span>
    </div>
  )
}

// ── Mode toggle toolbar ───────────────────────────────────────────────────────
const MODE_OPTIONS: { mode: CompareMode; icon: string; label: string }[] = [
  { mode: 'drag',  icon: '↔', label: 'Drag' },
  { mode: 'split', icon: '⧉', label: 'Split' },
  { mode: 'fade',  icon: '◑', label: 'Fade' },
]

// ── Main export ───────────────────────────────────────────────────────────────
export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before',
  afterLabel = 'After',
  defaultMode = 'drag',
  showModeToggle = true,
  className = '',
}: BeforeAfterSliderProps) {
  const [mode, setMode] = useState<CompareMode>(defaultMode)

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showModeToggle && (
        <div className="flex items-center gap-1 self-end">
          {MODE_OPTIONS.map(({ mode: m, icon, label }) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={label}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                mode === m
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span className="mr-1">{icon}</span>{label}
            </button>
          ))}
        </div>
      )}

      {mode === 'drag' && (
        <DragSlider
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
        />
      )}
      {mode === 'split' && (
        <SplitView
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
        />
      )}
      {mode === 'fade' && (
        <FadeView
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
        />
      )}
    </div>
  )
}
