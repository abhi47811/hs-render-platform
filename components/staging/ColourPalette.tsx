'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ColourSwatch {
  role: string
  hex: string
  name: string
  pantone_approx?: string
  usage: string
}

interface ColourPaletteJSON {
  swatches: ColourSwatch[]
  dominant_temperature: 'warm' | 'cool' | 'neutral'
  saturation_level: 'muted' | 'moderate' | 'vibrant'
  overall_mood: string
  extraction_confidence: 'high' | 'medium' | 'low'
  notes: string
}

interface ColourPaletteProps {
  roomId: string
  projectId: string
  styleSeedUrl: string | null // the approved style seed render
  existingPalette: ColourPaletteJSON | null
}

type Step = 'idle' | 'extracting' | 'review' | 'locked' | 'error'

function SpinnerIcon() {
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

const ROLE_LABELS: Record<string, string> = {
  wall: 'Wall',
  floor: 'Floor',
  primary_furniture: 'Primary Furniture',
  accent_1: 'Accent 1',
  accent_2: 'Accent 2',
  metal_finish: 'Metal Finish',
}

const CONFIDENCE_STYLES = {
  high: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-red-700 bg-red-50 border-red-200',
}

function SwatchGrid({ swatches, editable, onSwatchChange }: {
  swatches: ColourSwatch[]
  editable: boolean
  onSwatchChange?: (index: number, updated: ColourSwatch) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {swatches.map((swatch, i) => (
        <div key={swatch.role ?? i} className="space-y-1.5">
          {/* Colour block */}
          <div className="relative">
            <div
              className="w-full h-16 rounded-xl border border-stone-200 shadow-sm"
              style={{ backgroundColor: swatch.hex }}
            />
            {editable && (
              <input
                type="color"
                value={swatch.hex}
                onChange={(e) => onSwatchChange?.(i, { ...swatch, hex: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-xl"
                title="Click to adjust colour"
              />
            )}
          </div>
          {/* Label */}
          <div>
            <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">
              {ROLE_LABELS[swatch.role] ?? swatch.role}
            </p>
            {editable ? (
              <input
                type="text"
                value={swatch.name}
                onChange={(e) => onSwatchChange?.(i, { ...swatch, name: e.target.value })}
                className="text-xs font-medium text-stone-700 w-full bg-transparent border-b border-stone-200 focus:outline-none focus:border-stone-900 py-0.5"
              />
            ) : (
              <p className="text-xs font-medium text-stone-700 truncate">{swatch.name}</p>
            )}
            <p className="text-[9px] text-stone-400 font-mono mt-0.5">{swatch.hex.toUpperCase()}</p>
            {swatch.pantone_approx && (
              <p className="text-[9px] text-stone-300">{swatch.pantone_approx}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaletteDisplay({ palette, editable, onChange }: {
  palette: ColourPaletteJSON
  editable: boolean
  onChange?: (updated: ColourPaletteJSON) => void
}) {
  const updateSwatch = (index: number, updated: ColourSwatch) => {
    const newSwatches = [...palette.swatches]
    newSwatches[index] = updated
    onChange?.({ ...palette, swatches: newSwatches })
  }

  return (
    <div className="space-y-4">
      {/* Mood summary */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_STYLES[palette.extraction_confidence]}`}>
          {palette.extraction_confidence.charAt(0).toUpperCase() + palette.extraction_confidence.slice(1)} confidence
        </span>
        <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
          {palette.dominant_temperature.charAt(0).toUpperCase() + palette.dominant_temperature.slice(1)} tones
        </span>
        <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
          {palette.saturation_level.charAt(0).toUpperCase() + palette.saturation_level.slice(1)}
        </span>
      </div>

      {/* Overall mood */}
      <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
        <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Mood</p>
        <p className="text-xs text-stone-700">{palette.overall_mood}</p>
      </div>

      {/* Swatches */}
      <SwatchGrid
        swatches={palette.swatches}
        editable={editable}
        onSwatchChange={updateSwatch}
      />

      {/* Usage details */}
      <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <tbody>
            {palette.swatches.map((s, i) => (
              <tr key={i} className="border-b border-stone-50 last:border-0">
                <td className="px-3 py-2 w-8">
                  <div className="w-4 h-4 rounded border border-stone-200" style={{ backgroundColor: s.hex }} />
                </td>
                <td className="py-2 font-medium text-stone-700 w-28">
                  {ROLE_LABELS[s.role] ?? s.role}
                </td>
                <td className="py-2 text-stone-400">{s.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {palette.notes && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
          <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-xs text-stone-600">{palette.notes}</p>
        </div>
      )}
    </div>
  )
}

export function ColourPalette({
  roomId,
  projectId,
  styleSeedUrl,
  existingPalette,
}: ColourPaletteProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(existingPalette ? 'locked' : 'idle')
  const [palette, setPalette] = useState<ColourPaletteJSON | null>(existingPalette)
  const [editedPalette, setEditedPalette] = useState<ColourPaletteJSON | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLocking, setIsLocking] = useState(false)

  const handleExtract = async () => {
    if (!styleSeedUrl) return
    setStep('extracting')
    setError(null)

    try {
      const res = await fetch('/api/style/extract-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          project_id: projectId,
          style_seed_url: styleSeedUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')

      setPalette(data.colour_palette)
      setEditedPalette(data.colour_palette)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  const handleLock = async () => {
    if (!editedPalette) return
    setIsLocking(true)

    try {
      const { error: dbError } = await supabase
        .from('rooms')
        .update({ colour_palette: editedPalette })
        .eq('id', roomId)

      if (dbError) throw new Error(dbError.message)

      setPalette(editedPalette)
      setStep('locked')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock palette')
    } finally {
      setIsLocking(false)
    }
  }

  const handleReextract = () => {
    setStep('idle')
    setPalette(null)
    setEditedPalette(null)
    setError(null)
  }

  // ── Extracting ────────────────────────────────────────────────
  if (step === 'extracting') {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-stone-200 animate-ping opacity-30" />
            <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Extracting colour palette</p>
            <p className="text-xs text-stone-400 mt-1">Gemini is identifying 6 colour roles from your style seed</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800 mb-1">Extraction failed</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
        <button
          onClick={handleExtract}
          className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Review — team can adjust hex values before locking ────────
  if (step === 'review' && editedPalette) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs text-amber-700 font-medium">Click any swatch to adjust the colour — then lock to commit</p>
        </div>

        <PaletteDisplay
          palette={editedPalette}
          editable={true}
          onChange={setEditedPalette}
        />

        <div className="flex gap-2">
          <button
            onClick={handleLock}
            disabled={isLocking}
            className="flex-1 min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 disabled:bg-stone-300 disabled:text-stone-500 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {isLocking ? <SpinnerIcon /> : <LockIcon />}
            {isLocking ? 'Locking…' : 'Lock Colour Palette'}
          </button>
          <button
            onClick={handleReextract}
            className="px-5 min-h-[48px] rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Re-extract
          </button>
        </div>
        <p className="text-[10px] text-stone-400 text-center">
          Locking stores this palette in rooms.colour_palette — referenced in every subsequent pass
        </p>
      </div>
    )
  }

  // ── Locked — show read-only ───────────────────────────────────
  if (step === 'locked' && palette) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckIcon size={14} />
            <p className="text-xs font-semibold">Colour palette locked</p>
          </div>
          <button
            onClick={handleReextract}
            className="text-[10px] text-stone-400 hover:text-stone-600 underline underline-offset-2 cursor-pointer"
          >
            Re-extract
          </button>
        </div>
        <PaletteDisplay palette={palette} editable={false} />
      </div>
    )
  }

  // ── Idle ──────────────────────────────────────────────────────
  if (!styleSeedUrl) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center">
        <p className="text-xs font-semibold text-stone-500 mb-1">No style seed yet</p>
        <p className="text-[10px] text-stone-400">Palette extraction runs automatically after CP2 is approved</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Style seed preview */}
      <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
        <img
          src={styleSeedUrl}
          alt="Style seed render"
          className="w-full max-h-[200px] object-contain block"
        />
        <div className="px-4 py-2 border-t border-stone-100 bg-white">
          <p className="text-[10px] text-stone-400">CP2 approved style seed — palette will be extracted from this</p>
        </div>
      </div>

      {/* What will be extracted */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3">6 Colour Roles</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(ROLE_LABELS).map((label) => (
            <div key={label} className="text-xs text-stone-600 bg-stone-50 rounded-lg px-2.5 py-1.5">
              {label}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleExtract}
        className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>
        Extract Colour Palette
      </button>
    </div>
  )
}
