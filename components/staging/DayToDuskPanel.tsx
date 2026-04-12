'use client'

// ─── Sec 28: Day-to-Dusk Lighting Variants ───────────────────────────────────
// Available ONLY after CP3 is approved.
// Generates 3 lighting variants from the CP3 render:
//   Morning (6–9am) · Afternoon (12–3pm) · Evening (6–9pm)
// Each is a separate Gemini generation using CP3 render as the locked base.
// All 3 stored as renders with pass_type = 'day_to_dusk'.
// Uses geometry-lock directive: "Do NOT change furniture, layout, or materials".

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────

export type LightingVariant = 'morning' | 'afternoon' | 'evening'

interface LightingVariantConfig {
  id: LightingVariant
  label: string
  emoji: string
  time: string
  prompt: string
  skyColor: string
  dotColor: string
}

const VARIANTS: LightingVariantConfig[] = [
  {
    id: 'morning',
    label: 'Morning',
    emoji: '🌅',
    time: '6–9 AM',
    prompt: 'Morning light variant. Soft warm golden sunrise light streaming through windows at a low angle. Long gentle shadows. Warm amber tones on surfaces. Peaceful morning atmosphere. Do NOT change any furniture, layout, materials, or room configuration.',
    skyColor: 'from-amber-50 to-orange-50',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    emoji: '☀️',
    time: '12–3 PM',
    prompt: 'Bright midday light variant. Crisp neutral daylight flooding the space. High contrast, clean whites and natural colours. No dramatic shadows. Lively and fresh daytime atmosphere. Do NOT change any furniture, layout, materials, or room configuration.',
    skyColor: 'from-sky-50 to-blue-50',
    dotColor: 'bg-sky-400',
  },
  {
    id: 'evening',
    label: 'Evening',
    emoji: '🌆',
    time: '6–9 PM',
    prompt: 'Evening ambient light variant. Warm interior lighting dominant — pendant lights, floor lamps, wall sconces all glowing. Deep blue-purple twilight visible through windows. Cosy and inviting atmosphere. Do NOT change any furniture, layout, materials, or room configuration.',
    skyColor: 'from-violet-50 to-indigo-50',
    dotColor: 'bg-violet-500',
  },
]

interface DuskRender {
  id: string
  storage_url: string
  variant: LightingVariant
  created_at: string
}

interface DayToDuskPanelProps {
  roomId: string
  projectId: string
  cp3RenderUrl: string
  cp3RenderPrompt?: string | null
  /** Called when any variant has been generated */
  onVariantGenerated?: () => void
}

export function DayToDuskPanel({
  roomId,
  projectId,
  cp3RenderUrl,
  cp3RenderPrompt,
  onVariantGenerated,
}: DayToDuskPanelProps) {
  const supabase = createClient()
  const [generatingVariant, setGeneratingVariant] = useState<LightingVariant | null>(null)
  const [duskRenders, setDuskRenders] = useState<DuskRender[]>([])
  const [errors, setErrors] = useState<Partial<Record<LightingVariant, string>>>({})

  // Load existing dusk renders
  const loadDuskRenders = useCallback(async () => {
    const { data } = await supabase
      .from('renders')
      .select('id, storage_url, metadata, created_at')
      .eq('room_id', roomId)
      .eq('pass_type', 'day_to_dusk')
      .order('created_at', { ascending: false })

    const mapped: DuskRender[] = (data ?? []).map(r => ({
      id: r.id,
      storage_url: r.storage_url,
      variant: (r.metadata as any)?.lighting_variant ?? 'evening',
      created_at: r.created_at,
    }))
    setDuskRenders(mapped)
  }, [supabase, roomId])

  // Initial load
  useState(() => { loadDuskRenders() })

  const generateVariant = async (variant: LightingVariantConfig) => {
    if (generatingVariant) return
    setGeneratingVariant(variant.id)
    setErrors(prev => ({ ...prev, [variant.id]: undefined }))

    try {
      const geometryLockPrompt = [
        cp3RenderPrompt ? `Based on CP3 render: ${cp3RenderPrompt.slice(0, 200)}` : '',
        `LIGHTING VARIANT: ${variant.label} (${variant.time})`,
        variant.prompt,
        'GEOMETRY LOCK: Do NOT change any furniture, layout, materials, finishes, or room configuration. Only adjust lighting and atmosphere.',
      ].filter(Boolean).join('\n\n')

      const response = await fetch('/api/staging/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id:          roomId,
          project_id:       projectId,
          pass_number:      7,   // Pass 7 = day_to_dusk
          pass_type:        'day_to_dusk',
          prompt:           geometryLockPrompt,
          reference_urls:   [cp3RenderUrl],
          resolution_tier:  '2K',
          variation_count:  1,
          metadata: { lighting_variant: variant.id },
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Generation failed')
      }

      await loadDuskRenders()
      onVariantGenerated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setErrors(prev => ({ ...prev, [variant.id]: msg }))
    } finally {
      setGeneratingVariant(null)
    }
  }

  const getRenderForVariant = (v: LightingVariant) =>
    duskRenders.find(r => r.variant === v) ?? null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🌗</span>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Day-to-Dusk Variants</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            3 lighting variants from CP3 render · Geometry locked
          </p>
        </div>
      </div>

      {/* CP3 anchor preview */}
      <div className="rounded-xl overflow-hidden border border-stone-200">
        <div className="relative aspect-video bg-stone-100">
          <Image src={cp3RenderUrl} alt="CP3 approved render" fill className="object-cover" sizes="400px" />
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 bg-black/60 text-white text-[10px] font-semibold rounded-full">
              CP3 — Base render
            </span>
          </div>
        </div>
      </div>

      {/* 3 variant cards */}
      <div className="grid grid-cols-1 gap-3">
        {VARIANTS.map(variant => {
          const existing = getRenderForVariant(variant.id)
          const isGenerating = generatingVariant === variant.id
          const error = errors[variant.id]

          return (
            <div
              key={variant.id}
              className={`rounded-xl border overflow-hidden bg-gradient-to-r ${variant.skyColor} border-stone-200`}
            >
              <div className="flex items-stretch gap-0">
                {/* Preview or placeholder */}
                <div className="w-32 flex-shrink-0 relative bg-stone-100">
                  {existing ? (
                    <div className="relative w-full h-full min-h-[80px]">
                      <Image
                        src={existing.storage_url}
                        alt={`${variant.label} variant`}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full min-h-[80px] flex items-center justify-center">
                      <span className="text-3xl opacity-30">{variant.emoji}</span>
                    </div>
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info + actions */}
                <div className="flex-1 px-3 py-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-2 h-2 rounded-full ${variant.dotColor}`} />
                      <p className="text-sm font-semibold text-stone-900">{variant.emoji} {variant.label}</p>
                      <span className="text-[10px] text-stone-400">{variant.time}</span>
                    </div>
                    <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">
                      {variant.prompt.split('.')[0]}
                    </p>
                    {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => generateVariant(variant)}
                      disabled={!!generatingVariant}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isGenerating
                          ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                          : existing
                            ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Generating…
                        </>
                      ) : existing ? (
                        '↺ Regenerate'
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                          </svg>
                          Generate
                        </>
                      )}
                    </button>
                    {existing && (
                      <span className="text-[9px] text-stone-400">
                        {new Date(existing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
