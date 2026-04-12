'use client'

// ─── A1: Full-Screen Render Lightbox ─────────────────────────────────────
// Triggered by double-clicking any render thumbnail in the gallery.
// Features:
//   • Full-screen overlay with dark backdrop
//   • Pinch-to-zoom / scroll-to-zoom (mouse wheel) up to 4×
//   • Pan when zoomed (drag)
//   • Previous / Next navigation between gallery renders
//   • Keyboard: ← → (navigate) · +/- (zoom) · Esc (close) · R (reset zoom)
//   • Metadata overlay: pass type, status, created date, cost
//   • Download button (calls /api/staging/export)

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LightboxRender {
  id: string
  storage_url: string
  pass_type: string
  pass_number: number
  status: string
  created_at: string
  cost?: number | null
}

interface RenderLightboxProps {
  renders: LightboxRender[]
  initialIndex: number
  onClose: () => void
  roomName?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PASS_LABELS: Record<string, string> = {
  style_seed:     'Style Direction',
  flooring:       'Flooring',
  main_furniture: 'Main Furniture',
  accent_pieces:  'Accent Pieces',
  lighting:       'Lighting',
  decor:          'Final Decor',
  day_to_dusk:    'Day-to-Dusk Variant',
  surface_swap:   'Material Variant',
  revision:       'Revised Design',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:        { label: 'Pending',          color: 'text-stone-400' },
  team_approved:  { label: 'Team Approved',    color: 'text-emerald-400' },
  client_approved:{ label: 'Client Approved',  color: 'text-green-400' },
  approved:       { label: 'Approved',         color: 'text-green-400' },
  rejected:       { label: 'Rejected',         color: 'text-red-400' },
}

// ── Component ──────────────────────────────────────────────────────────────

export function RenderLightbox({ renders, initialIndex, onClose, roomName }: RenderLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isDownloading, setIsDownloading] = useState(false)
  const [showMeta, setShowMeta] = useState(true)
  const imgRef = useRef<HTMLDivElement>(null)

  const current = renders[currentIndex]

  // Reset zoom + pan when navigating
  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const navigate = useCallback((dir: 1 | -1) => {
    setCurrentIndex(i => {
      const next = i + dir
      if (next < 0 || next >= renders.length) return i
      return next
    })
    resetView()
  }, [renders.length, resetView])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':          onClose(); break
        case 'ArrowLeft':       navigate(-1); break
        case 'ArrowRight':      navigate(1); break
        case '+': case '=':     setZoom(z => Math.min(z + 0.5, 4)); break
        case '-':               setZoom(z => Math.max(z - 0.5, 1)); break
        case 'r': case 'R':     resetView(); break
        case 'm': case 'M':     setShowMeta(v => !v); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate, onClose, resetView])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.2 : 0.2
    setZoom(z => Math.min(Math.max(z + delta, 1), 4))
    if (zoom <= 1) setPan({ x: 0, y: 0 })
  }, [zoom])

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [zoom, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Download
  const handleDownload = async () => {
    if (!current) return
    setIsDownloading(true)
    try {
      const res = await fetch('/api/staging/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: 'lightbox',
          project_id: 'lightbox',
          format: 'highres',
          render_url: current.storage_url,
          room_name: roomName ?? 'render',
        }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${roomName ?? 'render'}-pass${current.pass_number}-highres.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(current.storage_url, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!current) return null

  const statusCfg = STATUS_CONFIG[current.status] ?? STATUS_CONFIG.pending
  const passLabel = PASS_LABELS[current.pass_type] ?? current.pass_type

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{roomName}</span>
          <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full">{passLabel}</span>
          <span className={`text-[10px] font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-stone-800 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(z - 0.5, 1))} className="text-stone-300 hover:text-white w-6 h-6 flex items-center justify-center text-lg font-light">−</button>
            <span className="text-xs text-stone-400 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.5, 4))} className="text-stone-300 hover:text-white w-6 h-6 flex items-center justify-center text-lg font-light">+</button>
          </div>
          {zoom > 1 && (
            <button onClick={resetView} className="text-[10px] text-stone-400 hover:text-white transition-colors">Reset</button>
          )}
          {/* Meta toggle */}
          <button
            onClick={() => setShowMeta(v => !v)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${showMeta ? 'text-stone-200 bg-stone-700' : 'text-stone-500 hover:text-stone-300'}`}
          >
            Info
          </button>
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isDownloading ? (
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            Download
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        className={`flex-1 overflow-hidden flex items-center justify-center relative select-none ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={imgRef}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease',
          }}
          className="relative max-w-[90vw] max-h-[80vh]"
        >
          <img
            src={current.storage_url}
            alt={passLabel}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
            draggable={false}
          />
        </div>

        {/* Prev / Next arrows */}
        {currentIndex > 0 && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        {currentIndex < renders.length - 1 && (
          <button
            onClick={() => navigate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}
      </div>

      {/* Bottom: metadata + thumbnail strip */}
      <div className="flex-shrink-0 bg-black/40 backdrop-blur-sm">
        {/* Metadata row */}
        {showMeta && (
          <div className="flex items-center gap-6 px-5 py-2.5 border-t border-stone-800">
            <div className="text-[10px] text-stone-500">
              <span className="text-stone-400 font-medium">Pass</span> {current.pass_number} · {passLabel}
            </div>
            <div className="text-[10px] text-stone-500">
              <span className="text-stone-400 font-medium">Date</span>{' '}
              {new Date(current.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {current.cost != null && (
              <div className="text-[10px] text-stone-500">
                <span className="text-stone-400 font-medium">Cost</span> ₹{Number(current.cost).toFixed(2)}
              </div>
            )}
            <div className="ml-auto text-[10px] text-stone-600">
              {currentIndex + 1} / {renders.length} · Press ? for shortcuts
            </div>
          </div>
        )}

        {/* Thumbnail strip */}
        {renders.length > 1 && (
          <div className="flex items-center gap-2 px-5 py-2.5 overflow-x-auto">
            {renders.map((r, i) => (
              <button
                key={r.id}
                onClick={() => { setCurrentIndex(i); resetView() }}
                className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all ${
                  i === currentIndex ? 'border-white opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
                }`}
              >
                <img src={r.storage_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
