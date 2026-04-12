'use client'

// ─── Sec 31: Generation Failure Recovery ─────────────────────────────────────
// Shown in place of the GenerateButton error banner when a generation fails.
// 5 failure types with specific recovery actions:
//
//  rate_limit (429)  → "Queued for retry" — auto-queues with 90s delay
//  safety_refusal    → Prompt adjustment panel with suggested rewrites
//  timeout           → 1 auto-retry then escalate alert
//  geometry_error    → Re-enhance shell suggestion
//  empty_response    → Retry with reduced variation count
//  unknown           → Generic retry + contact support

import { useState, useEffect, useCallback } from 'react'

export type FailureType =
  | 'rate_limit'
  | 'safety_refusal'
  | 'timeout'
  | 'geometry_error'
  | 'empty_response'
  | 'unknown'

interface FailureRecoveryPanelProps {
  failureType: FailureType
  errorMessage: string
  /** Original prompt that caused the failure */
  originalPrompt: string
  /** Called when user picks a rephrased prompt */
  onPromptSuggestionAccepted?: (newPrompt: string) => void
  /** Called to trigger a retry */
  onRetry: () => void
  /** Called to queue with delay (rate_limit recovery) */
  onQueue?: () => void
  /** Called to dismiss the panel */
  onDismiss: () => void
  /** Auto-retry count — after 1 retry for timeout, we show escalate option */
  retryCount?: number
}

// ── Failure type metadata ─────────────────────────────────────────────────────
const FAILURE_CONFIG: Record<FailureType, {
  title: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  rate_limit: {
    title: 'Rate Limit Reached',
    icon: '⏱',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Gemini API rate limit hit. Request will be queued and retried automatically in ~90 seconds.',
  },
  safety_refusal: {
    title: 'Safety Refusal',
    icon: '🛡',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Gemini blocked this prompt due to safety filters. Try rephrasing with less specific material descriptions.',
  },
  timeout: {
    title: 'Generation Timeout',
    icon: '⌛',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'The generation request timed out. This is usually a temporary issue with the API.',
  },
  geometry_error: {
    title: 'Geometry Hallucination',
    icon: '🏗',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    description: 'AI produced distorted geometry. This often means the shell needs better enhancement before generation.',
  },
  empty_response: {
    title: 'Empty Response',
    icon: '◻',
    color: 'text-stone-700',
    bgColor: 'bg-stone-50',
    borderColor: 'border-stone-200',
    description: 'Gemini returned no image. Try reducing variation count to 1 and retry.',
  },
  unknown: {
    title: 'Generation Failed',
    icon: '✕',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'An unexpected error occurred during generation.',
  },
}

// ── Safety refusal suggestions ────────────────────────────────────────────────
function generateSafetySuggestions(prompt: string): string[] {
  // Simple heuristic rewrites to remove potential trigger words
  const suggestions = [
    prompt
      .replace(/\b(naked|bare|exposed)\b/gi, 'clean')
      .replace(/\b(flesh|skin)\b/gi, 'natural material')
      .replace(/\b(blood|stain)\b/gi, 'accent'),
    `Interior design render of a ${prompt.split('.')[0]?.trim() ?? 'room'}. Professional photography style, architectural visualization.`,
    `${prompt} — focus on furniture arrangement, materials, and lighting only. Architectural visualization.`,
  ].filter((s, i, arr) => s !== prompt && arr.indexOf(s) === i)

  return suggestions.length > 0 ? suggestions : [
    `Professional interior design render. ${prompt.slice(0, 100)}. Clean, architectural visualization style.`,
  ]
}

// ── Countdown component ───────────────────────────────────────────────────────
function CountdownTimer({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) { onComplete(); return }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining, onComplete])

  const pct = ((seconds - remaining) / seconds) * 100

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-mono font-bold text-amber-700 tabular-nums w-8 text-right">
        {remaining}s
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function FailureRecoveryPanel({
  failureType,
  errorMessage,
  originalPrompt,
  onPromptSuggestionAccepted,
  onRetry,
  onQueue,
  onDismiss,
  retryCount = 0,
}: FailureRecoveryPanelProps) {
  const cfg = FAILURE_CONFIG[failureType]
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [autoRetrying, setAutoRetrying] = useState(false)
  const [autoQueueing, setAutoQueueing] = useState(failureType === 'rate_limit')

  const safetySuggestions = failureType === 'safety_refusal'
    ? generateSafetySuggestions(originalPrompt)
    : []

  const handleAcceptSuggestion = useCallback((suggestion: string) => {
    setSelectedSuggestion(suggestion)
    onPromptSuggestionAccepted?.(suggestion)
  }, [onPromptSuggestionAccepted])

  const handleAutoRetryComplete = useCallback(() => {
    setAutoRetrying(false)
    onRetry()
  }, [onRetry])

  const handleQueueComplete = useCallback(() => {
    setAutoQueueing(false)
    onQueue?.()
  }, [onQueue])

  // Auto-retry once on timeout (only on first failure)
  useEffect(() => {
    if (failureType === 'timeout' && retryCount === 0) {
      setAutoRetrying(true)
    }
  }, [failureType, retryCount])

  return (
    <div className={`rounded-xl border-2 ${cfg.bgColor} ${cfg.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-start gap-3 border-b ${cfg.borderColor}`}>
        <span className="text-xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${cfg.color}`}>{cfg.title}</p>
          <p className={`text-xs mt-0.5 ${cfg.color} opacity-80`}>{cfg.description}</p>
          {errorMessage && (
            <p className="text-[10px] text-stone-500 mt-1 font-mono bg-white/60 px-2 py-1 rounded truncate">
              {errorMessage}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-stone-400 hover:text-stone-600 p-0.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Recovery actions */}
      <div className="px-4 py-3 space-y-3">

        {/* Rate limit: auto-queue countdown */}
        {failureType === 'rate_limit' && autoQueueing && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-700">Auto-queuing in:</p>
            <CountdownTimer seconds={90} onComplete={handleQueueComplete} />
            <div className="flex gap-2">
              <button
                onClick={() => { setAutoQueueing(false); onQueue?.() }}
                className="flex-1 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Queue Now
              </button>
              <button
                onClick={() => { setAutoQueueing(false); onDismiss() }}
                className="px-3 py-2 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Safety refusal: prompt suggestions */}
        {failureType === 'safety_refusal' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-orange-700">Suggested rewrites:</p>
            {safetySuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleAcceptSuggestion(suggestion)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                  selectedSuggestion === suggestion
                    ? 'bg-orange-100 border-orange-400 text-orange-800'
                    : 'bg-white border-orange-200 text-stone-700 hover:border-orange-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  {selectedSuggestion === suggestion ? (
                    <span className="flex-shrink-0 text-orange-600 font-bold mt-0.5">✓</span>
                  ) : (
                    <span className="flex-shrink-0 text-orange-400 font-bold mt-0.5">{idx + 1}.</span>
                  )}
                  <span className="line-clamp-3">{suggestion}</span>
                </div>
              </button>
            ))}
            {selectedSuggestion && (
              <p className="text-[10px] text-orange-600">
                ✓ Prompt updated in Block 2. Click Generate to retry.
              </p>
            )}
          </div>
        )}

        {/* Timeout: auto-retry indicator */}
        {failureType === 'timeout' && autoRetrying && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Auto-retrying once…
            </div>
          </div>
        )}

        {/* Geometry error: re-enhance shell suggestion */}
        {failureType === 'geometry_error' && (
          <div className="p-3 bg-white/70 rounded-lg border border-violet-200">
            <p className="text-xs text-violet-800 font-medium mb-1">Suggested fix:</p>
            <p className="text-[11px] text-violet-700 leading-relaxed">
              Re-enhance the shell image (higher quality photorealistic pass) before retrying generation.
              Geometry hallucinations usually stem from a low-quality or warped shell.
            </p>
          </div>
        )}

        {/* Empty response: retry with 1 variation */}
        {failureType === 'empty_response' && (
          <div className="p-3 bg-white/70 rounded-lg border border-stone-200">
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Retry with <span className="font-semibold">1 variation</span> — the API may have returned empty due to the load of generating multiple images simultaneously.
            </p>
          </div>
        )}

        {/* Timeout second failure: escalate */}
        {failureType === 'timeout' && !autoRetrying && retryCount >= 1 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-[11px] text-blue-700 font-medium">Auto-retry failed</p>
            <p className="text-[10px] text-blue-600 mt-0.5">The API may be experiencing high load. Try again in a few minutes.</p>
          </div>
        )}

        {/* Generic actions */}
        <div className="flex gap-2 pt-1">
          {failureType !== 'rate_limit' && !autoRetrying && (
            <button
              onClick={onRetry}
              className="flex-1 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-8.51L1 10"/>
              </svg>
              {failureType === 'safety_refusal' && selectedSuggestion ? 'Retry with New Prompt' : 'Retry'}
            </button>
          )}
          {failureType !== 'rate_limit' && onQueue && (
            <button
              onClick={onQueue}
              className="px-3 py-2 border border-stone-300 text-stone-700 text-xs font-medium rounded-lg hover:bg-stone-50 transition-colors"
            >
              Queue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper: detect failure type from error message string ─────────────────────
export function detectFailureType(errorMessage: string): FailureType {
  const msg = errorMessage.toLowerCase()
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota'))
    return 'rate_limit'
  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('refusal') || msg.includes('policy'))
    return 'safety_refusal'
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline'))
    return 'timeout'
  if (msg.includes('geometry') || msg.includes('distort') || msg.includes('hallucin'))
    return 'geometry_error'
  if (msg.includes('empty') || msg.includes('no image') || msg.includes('null response'))
    return 'empty_response'
  return 'unknown'
}
