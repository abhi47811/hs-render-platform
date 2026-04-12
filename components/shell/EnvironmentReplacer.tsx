'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { EnvironmentPreset } from '@/app/api/shell/replace-environment/route'

interface EnvironmentReplacerProps {
  roomId: string
  projectId: string
  shellUrl: string
  city: string
  projectType: string
}

interface Detection {
  has_outdoor_view: boolean
  confidence: 'high' | 'medium' | 'low'
  description: string
}

type Step = 'detecting' | 'ready' | 'generating' | 'done' | 'error'

const PRESETS: { id: EnvironmentPreset; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'city',
    label: 'City View',
    description: 'Auto-matched to your city',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    id: 'garden',
    label: 'Garden',
    description: 'Lush green landscaping',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8C8 10 5.9 16.17 3.82 19.1c0 0 3.34-2.36 7.18-3.1"/><path d="M2 19c3-3 9-2 11.5-.5"/>
        <path d="M22 3c-4 8-8 12-19 13"/>
      </svg>
    ),
  },
  {
    id: 'pool',
    label: 'Pool View',
    description: 'Infinity pool & poolside',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20M2 17c2.5-2 5-2 7.5 0S14.5 19 17 17s4.5-2 5-2"/>
        <path d="M7 12V5a3 3 0 0 1 6 0v7"/><path d="M17 12V7"/>
      </svg>
    ),
  },
  {
    id: 'sea',
    label: 'Sea / Ocean',
    description: 'Open water horizon',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      </svg>
    ),
  },
  {
    id: 'hills',
    label: 'Hills & Nature',
    description: 'Rolling green hills',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l4-8 4 4 3-6 5 10H3z"/>
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Describe your own view',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
]

export function EnvironmentReplacer({
  roomId,
  projectId,
  shellUrl,
  city,
  projectType,
}: EnvironmentReplacerProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('detecting')
  const [detection, setDetection] = useState<Detection | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<EnvironmentPreset>('city')
  const [customPrompt, setCustomPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  // Auto-detect on mount
  useEffect(() => {
    async function detect() {
      try {
        const res = await fetch('/api/shell/detect-environment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shell_url: shellUrl }),
        })
        const data = await res.json() as Detection
        setDetection(data)
        setStep('ready')
      } catch {
        // Detection failed — still show the UI, let user decide
        setDetection({ has_outdoor_view: false, confidence: 'low', description: 'Detection unavailable' })
        setStep('ready')
      }
    }
    detect()
  }, [shellUrl])

  const handleApply = useCallback(async () => {
    if (selectedPreset === 'custom' && !customPrompt.trim()) return
    setStep('generating')
    setError(null)

    try {
      const res = await fetch('/api/shell/replace-environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          project_id: projectId,
          shell_url: shellUrl,
          preset: selectedPreset,
          custom_prompt: customPrompt.trim() || undefined,
          city,
          project_type: projectType,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Environment replacement failed')

      setResultUrl(data.enhanced_url)
      setStep('done')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }, [roomId, projectId, shellUrl, selectedPreset, customPrompt, city, projectType, router])

  const handleSkip = useCallback(async () => {
    // Copy original → enhanced so the flow moves forward
    setStep('generating')
    try {
      await supabase
        .from('rooms')
        .update({ enhanced_shell_url: shellUrl })
        .eq('id', roomId)
      router.refresh()
    } catch {
      router.refresh()
    }
  }, [supabase, roomId, shellUrl, router])

  // ── Detecting ────────────────────────────────────────────────
  if (step === 'detecting') {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 animate-pulse">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>
        <p className="text-sm font-semibold text-stone-700">Analysing room photo</p>
        <p className="text-xs text-stone-400 mt-1">Claude is checking for outdoor views…</p>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────
  if (step === 'done' && resultUrl) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center">
          <img src={resultUrl} alt="Enhanced shell" className="w-full max-h-[420px] object-contain block" />
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-green-800">Environment applied — page refreshing</p>
        </div>
      </div>
    )
  }

  // ── Generating ───────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
        <div className="flex justify-center mb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-stone-400 animate-bounce mx-0.5"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-stone-700">Replacing environment</p>
        <p className="text-xs text-stone-400 mt-1">Gemini is generating the new view — this takes 15–30 seconds</p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-800 mb-1">Environment replacement failed</p>
        <p className="text-xs text-red-600 mb-4">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setStep('ready')}
            className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
          >
            Try again
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
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

      {/* Detection result banner */}
      {detection && (
        <div className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-xl border text-xs',
          detection.has_outdoor_view
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-stone-50 border-stone-200 text-stone-600'
        )}>
          <div className={cn(
            'w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center',
            detection.has_outdoor_view ? 'bg-blue-500' : 'bg-stone-300'
          )}>
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {detection.has_outdoor_view
                ? <><path d="M1 6c.6.5 1.2 1 2.5 1C6 7 6 5 8.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M1 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></>
                : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
              }
            </svg>
          </div>
          <div>
            <p className="font-semibold">
              {detection.has_outdoor_view
                ? `Outdoor view detected (${detection.confidence} confidence)`
                : 'No outdoor view detected'}
            </p>
            <p className="mt-0.5 opacity-80">{detection.description}</p>
          </div>
        </div>
      )}

      {/* Original shell preview — small */}
      <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
        <img
          src={shellUrl}
          alt="Original shell"
          className="w-full max-h-[240px] object-contain block"
        />
      </div>

      {/* Section label */}
      <div>
        <p className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">Choose Environment</p>
        <p className="text-xs text-stone-400">
          {detection?.has_outdoor_view
            ? 'The outdoor view visible through your windows will be replaced'
            : 'No outdoor view detected — you can still apply an environment or skip this step'}
        </p>
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id
          // Show city name in label for city preset
          const label = preset.id === 'city' ? city : preset.label
          return (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer text-center min-h-[80px]',
                isSelected
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white hover:border-stone-400 text-stone-600'
              )}
            >
              <span className={isSelected ? 'text-white' : 'text-stone-400'}>{preset.icon}</span>
              <div>
                <p className="text-[11px] font-semibold leading-tight">{label}</p>
                <p className={cn('text-[9px] leading-tight mt-0.5', isSelected ? 'text-stone-300' : 'text-stone-400')}>
                  {preset.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom prompt field */}
      {selectedPreset === 'custom' && (
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Describe what you want to see outside
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. A rooftop terrace with a pool, surrounded by palm trees and city lights at dusk…"
            rows={3}
            className="w-full px-3 py-2.5 text-sm text-stone-800 bg-white border border-stone-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-900 placeholder:text-stone-300"
          />
        </div>
      )}

      {/* City context note for 'city' preset */}
      {selectedPreset === 'city' && (
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-[11px] text-stone-500">Will show the <span className="font-semibold text-stone-700">{city}</span> skyline — matched to your project city</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleApply}
          disabled={selectedPreset === 'custom' && !customPrompt.trim()}
          className={cn(
            'flex-1 min-h-[48px] rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2',
            selectedPreset === 'custom' && !customPrompt.trim()
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : 'bg-stone-900 text-white hover:bg-stone-700 active:scale-[0.98]'
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Apply Environment
        </button>
        <button
          onClick={handleSkip}
          className="px-5 min-h-[48px] rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
