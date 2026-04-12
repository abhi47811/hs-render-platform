'use client'

// ─── A2: Gemini Prompt Preview Modal ──────────────────────────────────────
// Shows the fully assembled Gemini prompt + reference slot summary
// BEFORE the user clicks Generate. Triggered by the "Preview prompt" button
// adjacent to the Generate button.
//
// Displays:
//   • Assembled prompt text (word-wrapped, copyable)
//   • Reference slots list (slot number, label, URL preview)
//   • Token count estimate (1 token ≈ 4 chars)
//   • Model parameters: resolution, variation count, pass type
//   • Estimated cost

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface ReferenceSlot {
  slot: number
  label: string
  url: string
}

interface PromptPreviewModalProps {
  prompt: string
  passNumber: number
  passType: string
  resolutionTier: '1K' | '2K' | '4K'
  variationCount: 1 | 2 | 3
  referenceSlots: ReferenceSlot[]
  onClose: () => void
  onGenerate: () => void
}

const COST_PER_IMAGE: Record<string, number> = {
  '1K': 2.5,
  '2K': 6.0,
  '4K': 15.0,
}

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

// ── Component ──────────────────────────────────────────────────────────────

export function PromptPreviewModal({
  prompt,
  passNumber,
  passType,
  resolutionTier,
  variationCount,
  referenceSlots,
  onClose,
  onGenerate,
}: PromptPreviewModalProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'prompt' | 'references' | 'params'>('prompt')

  // Estimate token count (rough: 1 token ≈ 4 chars)
  const estimatedTokens = Math.ceil(prompt.length / 4)
  const estimatedCost = COST_PER_IMAGE[resolutionTier] * variationCount

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        onClose()
        onGenerate()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onGenerate])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Gemini Prompt Preview</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Pass {passNumber} · {PASS_LABELS[passType] ?? passType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-stone-100">
          {(['prompt', 'references', 'params'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors -mb-px ${
                activeTab === tab
                  ? 'bg-white text-stone-900 border-b-2 border-stone-900'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab === 'prompt' ? `Prompt (${estimatedTokens} tokens)` : tab === 'references' ? `References (${referenceSlots.length})` : 'Parameters'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Prompt tab */}
          {activeTab === 'prompt' && (
            <div className="p-5 space-y-3">
              <div className="relative">
                <pre className="text-[11px] text-stone-700 font-mono leading-relaxed whitespace-pre-wrap bg-stone-50 rounded-xl p-4 border border-stone-200 min-h-[200px]">
                  {prompt || <span className="text-stone-400 italic">No prompt entered yet</span>}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex items-center gap-4 px-1">
                <span className="text-[10px] text-stone-400">~{estimatedTokens} tokens</span>
                <span className="text-[10px] text-stone-400">{prompt.length} characters</span>
                <span className="text-[10px] text-stone-400">{prompt.split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>
          )}

          {/* References tab */}
          {activeTab === 'references' && (
            <div className="p-5 space-y-2">
              {referenceSlots.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-8">No reference images allocated for this pass.</p>
              ) : (
                referenceSlots.map(slot => (
                  <div key={slot.slot} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="w-8 h-8 bg-stone-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-stone-500">S{slot.slot}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-700">{slot.label}</p>
                      <p className="text-[10px] text-stone-400 font-mono truncate mt-0.5">{slot.url}</p>
                    </div>
                    <div className="w-12 h-8 rounded overflow-hidden bg-stone-200 flex-shrink-0">
                      {slot.url && (
                        <img src={slot.url} alt={slot.label} className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Parameters tab */}
          {activeTab === 'params' && (
            <div className="p-5 space-y-3">
              {[
                { label: 'Pass Number',     value: `Pass ${passNumber}` },
                { label: 'Pass Type',        value: PASS_LABELS[passType] ?? passType },
                { label: 'Resolution',       value: `${resolutionTier} (${resolutionTier === '1K' ? '1024px' : resolutionTier === '2K' ? '2048px' : '4096px'})` },
                { label: 'Variations',       value: `${variationCount} image${variationCount > 1 ? 's' : ''}` },
                { label: 'Reference Slots',  value: `${referenceSlots.length} / 14` },
                { label: 'Estimated Cost',   value: `₹${estimatedCost.toFixed(2)}` },
                { label: 'Geometry Lock',    value: passType === 'day_to_dusk' || passType === 'surface_swap' ? 'Active' : 'Not applied' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
                  <span className="text-xs text-stone-500">{label}</span>
                  <span className="text-xs font-semibold text-stone-800">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-stone-100 bg-stone-50">
          <div className="flex-1">
            <p className="text-[10px] text-stone-500">
              Estimated cost: <span className="font-semibold text-stone-700">₹{estimatedCost.toFixed(2)}</span>
              {' · '}Press <kbd className="px-1 py-0.5 bg-stone-200 rounded text-[9px]">⌘Enter</kbd> to generate
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => { onClose(); onGenerate() }}
            disabled={!prompt.trim()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              prompt.trim()
                ? 'bg-stone-900 text-white hover:bg-stone-800'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Generate Now
          </button>
        </div>
      </div>
    </div>
  )
}
