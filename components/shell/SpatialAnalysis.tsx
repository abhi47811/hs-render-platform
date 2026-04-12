'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SpatialConstraintJSON {
  vanishing_point: { x_pct: number; y_pct: number }
  depth_planes: { foreground: string; mid: string; background: string }
  doors: Array<{ location: string; approximate_position: string; notes: string }>
  windows: Array<{ location: string; approximate_position: string; light_direction: string; notes: string }>
  forbidden_zones: Array<{ reason: string; location: string; approximate_pct: string }>
  furniture_zones: Array<{ zone_name: string; location: string; approximate_pct: string; notes: string }>
  ceiling_height_estimate: string
  floor_area_estimate: string
  structural_features: string[]
  lighting_conditions: string
  analysis_confidence: 'high' | 'medium' | 'low'
  analyst_notes: string
}

interface SpatialAnalysisProps {
  roomId: string
  projectId: string
  shellUrl: string // photorealistic_shell_url
  existingAnalysis: SpatialConstraintJSON | null
}

type Step = 'idle' | 'analysing' | 'review' | 'confirmed' | 'error'

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

const CONFIDENCE_STYLES = {
  high: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-red-700 bg-red-50 border-red-200',
}

function AnalysisSummary({ data, editable, onChange }: {
  data: SpatialConstraintJSON
  editable: boolean
  onChange?: (updated: SpatialConstraintJSON) => void
}) {
  const update = (key: keyof SpatialConstraintJSON, value: unknown) => {
    onChange?.({ ...data, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Confidence + Quick Stats */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_STYLES[data.analysis_confidence]}`}>
          {data.analysis_confidence.charAt(0).toUpperCase() + data.analysis_confidence.slice(1)} confidence
        </span>
        <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
          {data.doors?.length ?? 0} door{(data.doors?.length ?? 0) !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
          {data.windows?.length ?? 0} window{(data.windows?.length ?? 0) !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
          {data.forbidden_zones?.length ?? 0} forbidden zone{(data.forbidden_zones?.length ?? 0) !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          {data.furniture_zones?.length ?? 0} furniture zone{(data.furniture_zones?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Vanishing point + Room estimates */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
          <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Vanishing Point</p>
          <p className="text-xs font-medium text-stone-700">
            {data.vanishing_point?.x_pct ?? '—'}% × {data.vanishing_point?.y_pct ?? '—'}%
          </p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
          <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Ceiling Height</p>
          <p className="text-xs font-medium text-stone-700">{data.ceiling_height_estimate || '—'}</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
          <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Floor Area</p>
          <p className="text-xs font-medium text-stone-700">{data.floor_area_estimate || '—'}</p>
        </div>
      </div>

      {/* Lighting */}
      <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
        <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Lighting Conditions</p>
        <p className="text-xs text-stone-600">{data.lighting_conditions || '—'}</p>
      </div>

      {/* Forbidden Zones */}
      {data.forbidden_zones?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">Forbidden Zones</p>
          <div className="space-y-1.5">
            {data.forbidden_zones.map((zone, i) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-xs font-medium text-red-700">{zone.reason}</p>
                  <p className="text-[10px] text-red-500">{zone.location} — {zone.approximate_pct}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Furniture Zones */}
      {data.furniture_zones?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">Furniture Zones</p>
          <div className="space-y-1.5">
            {data.furniture_zones.map((zone, i) => (
              <div key={i} className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-xs font-medium text-emerald-800">{zone.zone_name}</p>
                  <p className="text-[10px] text-emerald-600">{zone.location} — {zone.approximate_pct}</p>
                  {zone.notes && <p className="text-[10px] text-emerald-500 mt-0.5">{zone.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structural features */}
      {data.structural_features?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.structural_features.map((feat, i) => (
            <span key={i} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
              {feat}
            </span>
          ))}
        </div>
      )}

      {/* Analyst notes */}
      {data.analyst_notes && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
          <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Analyst Notes</p>
          {editable ? (
            <textarea
              value={data.analyst_notes}
              onChange={(e) => update('analyst_notes', e.target.value)}
              rows={3}
              className="w-full text-xs text-stone-700 bg-white border border-stone-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          ) : (
            <p className="text-xs text-stone-600">{data.analyst_notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function SpatialAnalysis({
  roomId,
  projectId,
  shellUrl,
  existingAnalysis,
}: SpatialAnalysisProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(existingAnalysis ? 'confirmed' : 'idle')
  const [analysis, setAnalysis] = useState<SpatialConstraintJSON | null>(existingAnalysis)
  const [editedAnalysis, setEditedAnalysis] = useState<SpatialConstraintJSON | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLocking, setIsLocking] = useState(false)

  const handleAnalyse = async () => {
    setStep('analysing')
    setError(null)

    try {
      const res = await fetch('/api/shell/analyse-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          project_id: projectId,
          shell_url: shellUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setAnalysis(data.spatial_analysis)
      setEditedAnalysis(data.spatial_analysis)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  const handleConfirm = async () => {
    if (!editedAnalysis) return
    setIsLocking(true)

    try {
      // Save potentially edited analysis back to DB
      const { error: dbError } = await supabase
        .from('rooms')
        .update({ spatial_analysis: editedAnalysis })
        .eq('id', roomId)

      if (dbError) throw new Error(dbError.message)

      setAnalysis(editedAnalysis)
      setStep('confirmed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock analysis')
    } finally {
      setIsLocking(false)
    }
  }

  const handleReanalyse = () => {
    setStep('idle')
    setAnalysis(null)
    setEditedAnalysis(null)
    setError(null)
  }

  // ── Analysing ─────────────────────────────────────────────────
  if (step === 'analysing') {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-8">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-stone-200 animate-ping opacity-30" />
            <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Analysing spatial constraints</p>
            <p className="text-xs text-stone-400 mt-1">Gemini is detecting doors, windows, forbidden zones, and optimal furniture placement</p>
            <p className="text-xs text-stone-300 mt-2">This takes 10–20 seconds</p>
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
          <p className="text-sm font-semibold text-red-800 mb-1">Analysis failed</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
        <button
          onClick={handleAnalyse}
          className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Review — team can correct before locking ──────────────────
  if (step === 'review' && editedAnalysis) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs text-amber-700 font-medium">Review and correct before locking — corrections persist forever</p>
        </div>

        <AnalysisSummary
          data={editedAnalysis}
          editable={true}
          onChange={setEditedAnalysis}
        />

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={isLocking}
            className="flex-1 min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 disabled:bg-stone-300 disabled:text-stone-500 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {isLocking ? <SpinnerIcon /> : <CheckIcon />}
            {isLocking ? 'Locking…' : 'Lock Spatial Analysis'}
          </button>
          <button
            onClick={handleReanalyse}
            className="px-5 min-h-[48px] rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Re-analyse
          </button>
        </div>
        <p className="text-[10px] text-stone-400 text-center">
          Locking stores this JSON in rooms.spatial_analysis — the prompt architecture Block 1 reads it on every generation
        </p>
      </div>
    )
  }

  // ── Confirmed / existing ──────────────────────────────────────
  if (step === 'confirmed' && analysis) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckIcon size={14} />
            <p className="text-xs font-semibold">Spatial analysis locked</p>
          </div>
          <button
            onClick={handleReanalyse}
            className="text-[10px] text-stone-400 hover:text-stone-600 underline underline-offset-2 cursor-pointer"
          >
            Re-analyse
          </button>
        </div>

        <AnalysisSummary data={analysis} editable={false} />
      </div>
    )
  }

  // ── Idle — show CTA ───────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Shell preview */}
      <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
        <img
          src={shellUrl}
          alt="Enhanced shell"
          className="w-full max-h-[280px] object-contain block"
        />
        <div className="px-4 py-2 border-t border-stone-100 bg-white">
          <p className="text-[10px] text-stone-400">Photorealistic shell — ready for spatial analysis</p>
        </div>
      </div>

      {/* What will be detected */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3">Will Detect</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Doors & clearances', color: 'bg-stone-100 text-stone-600' },
            { label: 'Windows & light', color: 'bg-stone-100 text-stone-600' },
            { label: 'Forbidden zones', color: 'bg-red-50 text-red-600' },
            { label: 'Furniture zones', color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Vanishing point', color: 'bg-stone-100 text-stone-600' },
            { label: 'Structural features', color: 'bg-stone-100 text-stone-600' },
          ].map(({ label, color }) => (
            <div key={label} className={`${color} rounded-lg px-3 py-2 text-xs font-medium`}>
              {label}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleAnalyse}
        className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        Run Spatial Analysis
      </button>
    </div>
  )
}
