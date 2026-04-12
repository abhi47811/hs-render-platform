'use client'

// ─── Sec 42: Final Export Formats ──────────────────────────────────────────
// Available after CP3 is approved.
// Three export modes:
//   WhatsApp JPEG — compressed 1280×720 JPEG (85% quality, ~200KB) — quick share
//   High-res PNG  — full resolution PNG with no compression
//   Project ZIP   — all approved renders for this room bundled as a .zip
//
// Downloads are proxied through /api/staging/export to handle CORS and signing.

import { useState } from 'react'

interface ApprovedRender {
  storage_url: string
  watermarked_url?: string | null
  pass_number: number
}

interface ExportPanelProps {
  roomId: string
  projectId: string
  roomName: string
  approvedRenders: ApprovedRender[]
}

type ExportFormat = 'whatsapp' | 'highres' | 'zip'
type ExportStatus = 'idle' | 'loading' | 'done' | 'error'

interface ExportState {
  status: ExportStatus
  error?: string
}

const FORMAT_CONFIG: Record<ExportFormat, {
  label: string
  description: string
  icon: string
  badge: string
  badgeColor: string
}> = {
  whatsapp: {
    label: 'WhatsApp JPEG',
    description: '1280px · 85% quality · ~200KB',
    icon: '💬',
    badge: 'Latest render',
    badgeColor: 'bg-green-100 text-green-700',
  },
  highres: {
    label: 'High-Res PNG',
    description: 'Full resolution · lossless · ideal for print',
    icon: '🖼',
    badge: 'Latest render',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  zip: {
    label: 'Full Room ZIP',
    description: 'All approved renders bundled · includes all passes',
    icon: '📦',
    badge: 'All renders',
    badgeColor: 'bg-violet-100 text-violet-700',
  },
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

export function ExportPanel({
  roomId,
  projectId,
  roomName,
  approvedRenders,
}: ExportPanelProps) {
  const [exportStates, setExportStates] = useState<Record<ExportFormat, ExportState>>({
    whatsapp: { status: 'idle' },
    highres:  { status: 'idle' },
    zip:      { status: 'idle' },
  })

  // Latest approved render (highest pass)
  const latestRender = approvedRenders.length
    ? [...approvedRenders].sort((a, b) => b.pass_number - a.pass_number)[0]
    : null

  const setFormatState = (fmt: ExportFormat, state: ExportState) => {
    setExportStates(prev => ({ ...prev, [fmt]: state }))
  }

  const handleExport = async (format: ExportFormat) => {
    if (!latestRender && format !== 'zip') return
    setFormatState(format, { status: 'loading' })

    try {
      // For ZIP, call API route to bundle all renders server-side
      if (format === 'zip') {
        const res = await fetch('/api/staging/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: roomId,
            project_id: projectId,
            format: 'zip',
            render_urls: approvedRenders.map(r => r.storage_url),
            room_name: roomName,
          }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error ?? 'Export failed')
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${roomName.replace(/\s+/g, '-')}-renders.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // For image exports, proxy through API to handle CORS + conversion
        const imageUrl = latestRender!.storage_url
        const res = await fetch('/api/staging/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: roomId,
            project_id: projectId,
            format,
            render_url: imageUrl,
            room_name: roomName,
          }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error ?? 'Export failed')
        }
        const blob = await res.blob()
        const ext = format === 'whatsapp' ? 'jpg' : 'png'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${roomName.replace(/\s+/g, '-')}-${format}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      setFormatState(format, { status: 'done' })
      // Reset after 3 seconds
      setTimeout(() => setFormatState(format, { status: 'idle' }), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setFormatState(format, { status: 'error', error: msg })
      setTimeout(() => setFormatState(format, { status: 'idle' }), 4000)
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
        <span className="text-xl">📤</span>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Export Renders</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {approvedRenders.length} approved render{approvedRenders.length !== 1 ? 's' : ''} · {roomName}
          </p>
        </div>
      </div>

      {approvedRenders.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-stone-400">No approved renders yet.</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Approve renders in the gallery to enable export.</p>
        </div>
      ) : (
        <div className="p-5 space-y-2.5">
          {(Object.entries(FORMAT_CONFIG) as [ExportFormat, typeof FORMAT_CONFIG[ExportFormat]][]).map(([format, config]) => {
            const state = exportStates[format]
            const isLoading = state.status === 'loading'
            const isDone = state.status === 'done'
            const isError = state.status === 'error'
            const disabled = isLoading || (format !== 'zip' && !latestRender)

            return (
              <div
                key={format}
                className="flex items-center gap-4 p-3.5 rounded-xl border border-stone-100 bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                {/* Icon */}
                <span className="text-2xl flex-shrink-0">{config.icon}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-stone-900">{config.label}</p>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${config.badgeColor}`}>
                      {config.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">{config.description}</p>
                  {isError && state.error && (
                    <p className="text-[10px] text-red-600 mt-0.5">{state.error}</p>
                  )}
                </div>

                {/* Download button */}
                <button
                  onClick={() => handleExport(format)}
                  disabled={disabled}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all min-w-[90px] justify-center ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isError
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : isLoading
                          ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                          : disabled
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {isLoading ? (
                    <><SpinnerIcon />Preparing…</>
                  ) : isDone ? (
                    <><CheckIcon />Downloaded</>
                  ) : isError ? (
                    'Retry'
                  ) : (
                    <><DownloadIcon />Download</>
                  )}
                </button>
              </div>
            )
          })}

          <p className="text-[10px] text-stone-400 text-center pt-1">
            Downloads are processed server-side and saved to your browser.
          </p>
        </div>
      )}
    </div>
  )
}
