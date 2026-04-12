'use client'

// ─── Sec 43: Auto-Generated Client Presentation PDF ───────────────────────
// Generates a polished PDF deck for the client with:
//   • Cover: Houspire logo + project name + city + date
//   • Room pages: each approved render with pass label + metadata
//   • Style summary: primary style, budget bracket, key preferences
//   • Footer: "Prepared by Houspire | houspire.ai"
//
// PDF is generated server-side via /api/staging/presentation using Puppeteer.
// Falls back to a browser print-dialog method if Puppeteer is unavailable.

import { useState } from 'react'

interface PresentationExportProps {
  projectId: string
  projectName: string
  city: string
  primaryStyle: string
}

type GenerationStatus = 'idle' | 'loading' | 'done' | 'error'

function PdfIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

const INCLUDE_OPTIONS = [
  { id: 'cover',      label: 'Cover page',          default: true  },
  { id: 'renders',    label: 'All approved renders', default: true  },
  { id: 'style_card', label: 'Style summary card',   default: true  },
  { id: 'budget',     label: 'Budget estimate page', default: false },
  { id: 'before_after',label: 'Before/after pages',  default: false },
]

export function PresentationExport({
  projectId,
  projectName,
  city,
  primaryStyle,
}: PresentationExportProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [includeOptions, setIncludeOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(INCLUDE_OPTIONS.map(o => [o.id, o.default]))
  )
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [brandingStyle, setBrandingStyle] = useState<'minimal' | 'full'>('full')

  const toggleOption = (id: string) => {
    setIncludeOptions(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleGenerate = async () => {
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch('/api/staging/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id:     projectId,
          include:        includeOptions,
          orientation,
          branding_style: brandingStyle,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Server error ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName.replace(/\s+/g, '-')}-presentation.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatus('done')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setError(msg)
      setStatus('error')
      setTimeout(() => { setStatus('idle'); setError(null) }, 5000)
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
        <span className="text-stone-700"><PdfIcon /></span>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Client Presentation PDF</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Auto-generated deck · {projectName} · {city}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Project meta */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider w-20">Client</span>
            <span className="text-xs text-stone-700 font-medium">{projectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider w-20">City</span>
            <span className="text-xs text-stone-700">{city}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider w-20">Style</span>
            <span className="text-xs text-stone-700">{primaryStyle}</span>
          </div>
        </div>

        {/* Include options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-700">Include in PDF</p>
          <div className="space-y-1.5">
            {INCLUDE_OPTIONS.map(option => (
              <label key={option.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => toggleOption(option.id)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    includeOptions[option.id]
                      ? 'bg-stone-900 border-stone-900'
                      : 'border-stone-300 group-hover:border-stone-500'
                  }`}
                >
                  {includeOptions[option.id] && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-stone-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-700">Page orientation</p>
          <div className="flex gap-2">
            {(['landscape', 'portrait'] as const).map(o => (
              <button
                key={o}
                onClick={() => setOrientation(o)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                  orientation === o
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {/* Mini page preview */}
                <div className={`border-2 rounded bg-current opacity-40 ${o === 'landscape' ? 'w-8 h-5' : 'w-5 h-7'} ${orientation === o ? 'border-white' : 'border-stone-400'}`} />
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-700">Branding style</p>
          <div className="flex gap-2">
            {([
              { id: 'full',    label: 'Full brand', description: 'Logo, colours, footer' },
              { id: 'minimal', label: 'Minimal',    description: 'Clean, white, text only' },
            ] as const).map(b => (
              <button
                key={b.id}
                onClick={() => setBrandingStyle(b.id)}
                className={`flex-1 text-left p-3 rounded-xl border text-xs transition-all ${
                  brandingStyle === b.id
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                <p className="font-semibold">{b.label}</p>
                <p className={`text-[10px] mt-0.5 ${brandingStyle === b.id ? 'text-stone-300' : 'text-stone-400'}`}>
                  {b.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700"><span className="font-semibold">Error:</span> {error}</p>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={status === 'loading'}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 min-h-[48px] ${
            status === 'loading'
              ? 'bg-stone-700 text-white cursor-not-allowed'
              : status === 'done'
                ? 'bg-emerald-600 text-white'
                : status === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          {status === 'loading' ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating PDF…
            </>
          ) : status === 'done' ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              PDF Downloaded!
            </>
          ) : (
            <>
              <PdfIcon />
              Generate Presentation PDF
            </>
          )}
        </button>

        <p className="text-[10px] text-stone-400 text-center">
          PDF includes all approved renders · Generated in ~10–15 seconds
        </p>
      </div>
    </div>
  )
}
