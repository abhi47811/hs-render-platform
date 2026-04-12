'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ShellEnhancementProps {
  roomId: string
  projectId: string
  shellUrl: string
  // When provided, enables combined enhancement + staging in one Gemini call
  projectStyle?: string | null
  roomType?: string | null
  palette?: string | null
  customPrompt?: string | null
}

type Step = 'ready' | 'enhancing' | 'staging' | 'done' | 'error'

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

const ENHANCEMENTS = [
  {
    label: 'Ambient Occlusion',
    description: 'Soft depth shadows at wall joints and corners',
  },
  {
    label: 'Surface Texture',
    description: 'Realistic plaster, tile, and floor grain detail',
  },
  {
    label: 'Light Physics',
    description: 'Natural scatter, soft shadows, window caustics',
  },
  {
    label: 'Atmospheric Depth',
    description: 'Wide-angle lens depth cues and perspective fall-off',
  },
]

export function ShellEnhancement({ roomId, projectId, shellUrl, projectStyle, roomType, palette, customPrompt }: ShellEnhancementProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('ready')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [isCombined, setIsCombined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const hasStyleData = !!(projectStyle && roomType)

  const handleEnhance = async (combined = false) => {
    setStep(combined ? 'staging' : 'enhancing')
    setIsCombined(combined)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        room_id: roomId,
        project_id: projectId,
        shell_url: shellUrl,
      }

      if (combined && projectStyle && roomType) {
        body.environment = {
          style: projectStyle,
          room_type: roomType,
          palette: palette ?? 'Warm Neutrals',
          custom_prompt: customPrompt ?? undefined,
          resolution_tier: '2K',
        }
      }

      const res = await fetch('/api/shell/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enhancement failed')

      setResultUrl(data.staged_url ?? data.photorealistic_url)
      setStep('done')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  const handleApproveAndContinue = async () => {
    // Enhancement is already saved to DB by the Edge Function.
    // Just refresh so the room page advances to the next step.
    router.refresh()
  }

  const handleRetry = async () => {
    setStep('ready')
    setError(null)
    setResultUrl(null)
    setShowComparison(false)
  }

  // ── Enhancing / Staging loading state ────────────────────────
  if (step === 'enhancing' || step === 'staging') {
    const isStaging = step === 'staging'
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-8">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-stone-200 animate-ping opacity-30" />
              <div className="absolute inset-1 rounded-full border-2 border-stone-300 animate-ping opacity-20" style={{ animationDelay: '0.3s' }} />
              <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center text-white">
                <SparkleIcon />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">
                {isStaging ? 'Generating styled preview' : 'Enhancing to photorealistic'}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {isStaging
                  ? `Gemini is applying ${projectStyle} styling with photorealistic quality`
                  : 'Gemini is processing ambient occlusion, textures, and light physics'}
              </p>
              <p className="text-xs text-stone-300 mt-2 tabular-nums">
                {isStaging ? 'This takes 40–60 seconds' : 'This takes 20–40 seconds'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3">Applying</p>
          <div className="space-y-2.5">
            {(isStaging
              ? [
                  { label: 'Photorealism', description: 'Ambient occlusion, textures, light physics' },
                  { label: `${projectStyle} Styling`, description: `Furniture, lighting, and decor for ${roomType}` },
                  { label: palette ?? 'Warm Neutrals', description: 'Colour palette applied to all surfaces and textiles' },
                ]
              : ENHANCEMENTS
            ).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <SpinnerIcon />
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-700">{item.label}</p>
                  <p className="text-[10px] text-stone-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────
  if (step === 'done' && resultUrl) {
    return (
      <div className="space-y-4">

        {/* Comparison toggle */}
        {showComparison ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider text-center">Original Coohom</p>
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <img
                  src={shellUrl}
                  alt="Original Coohom render"
                  className="w-full aspect-video object-cover block"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-stone-900 uppercase tracking-wider text-center">Enhanced</p>
              <div className="rounded-xl overflow-hidden border-2 border-stone-900 bg-stone-100">
                <img
                  src={resultUrl}
                  alt="Photorealistic shell"
                  className="w-full aspect-video object-cover block"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
            <img
              src={resultUrl}
              alt="Photorealistic shell"
              className="w-full max-h-[420px] object-contain block"
            />
          </div>
        )}

        {/* Compare toggle */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full py-2 text-xs font-medium text-stone-500 hover:text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
        >
          {showComparison ? 'Hide comparison' : 'Compare with original'}
        </button>

        {/* Enhancement summary */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3">Applied</p>
          <div className="space-y-2">
            {ENHANCEMENTS.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <CheckIcon />
                </div>
                <p className="text-xs text-stone-600">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-stone-400"> — {item.description}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApproveAndContinue}
            className="flex-1 min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckIcon />
            Approve Enhancement
          </button>
          <button
            onClick={handleRetry}
            className="px-5 min-h-[48px] rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>

        <p className="text-[10px] text-stone-400 text-center">
          Approving locks this shell and advances to environment setup
        </p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800 mb-1">Enhancement failed</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEnhance}
            className="flex-1 min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 transition-colors cursor-pointer"
          >
            Try again
          </button>
          <button
            onClick={async () => {
              // Skip: mark photorealistic_shell_url = original to advance flow
              await supabase
                .from('rooms')
                .update({ photorealistic_shell_url: shellUrl })
                .eq('id', roomId)
              router.refresh()
            }}
            className="px-5 min-h-[48px] rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  // ── Ready — main UI ──────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Shell preview */}
      <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
        <img
          src={shellUrl}
          alt="Coohom render"
          className="w-full max-h-[300px] object-contain block"
        />
        <div className="px-4 py-2 border-t border-stone-100 bg-white">
          <p className="text-[10px] text-stone-400">Raw Coohom 3D render — ready to enhance</p>
        </div>
      </div>

      {/* What will be applied */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3">Will Apply</p>
        <div className="space-y-2.5">
          {ENHANCEMENTS.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-stone-500">{i + 1}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-700">{item.label}</p>
                <p className="text-[10px] text-stone-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked prompt notice */}
      <div className="flex items-start gap-2.5 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
        <span className="text-stone-400 flex-shrink-0 mt-0.5">
          <InfoIcon />
        </span>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          Enhancement uses a <span className="font-semibold text-stone-700">locked prompt</span> — structural geometry is preserved exactly. No furniture, no styling. Only photorealism applied.
        </p>
      </div>

      {/* CTA */}
      {hasStyleData ? (
        <div className="space-y-2">
          <button
            onClick={() => handleEnhance(true)}
            className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <SparkleIcon />
            Generate Styled Preview
          </button>
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[10px] text-stone-400">or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>
          <button
            onClick={() => handleEnhance(false)}
            className="w-full min-h-[44px] rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <SparkleIcon />
            Shell Enhancement Only
          </button>
          <p className="text-[10px] text-stone-400 text-center px-2">
            <span className="font-medium text-stone-500">Styled Preview</span> applies {projectStyle} design in one step — recommended
          </p>
        </div>
      ) : (
        <button
          onClick={() => handleEnhance(false)}
          className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <SparkleIcon />
          Run Shell Enhancement
        </button>
      )}

      <button
        onClick={async () => {
          await supabase
            .from('rooms')
            .update({ photorealistic_shell_url: shellUrl })
            .eq('id', roomId)
          router.refresh()
        }}
        className="w-full py-2 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
      >
        Skip enhancement (use Coohom render as-is)
      </button>
    </div>
  )
}
