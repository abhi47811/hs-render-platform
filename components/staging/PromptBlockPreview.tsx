'use client'

import { useState } from 'react'
import type { PromptBlock, AssembledPrompt } from '@/lib/prompt/assembler'

interface PromptBlockPreviewProps {
  assembledPrompt: AssembledPrompt
  onClose: () => void
}

const BLOCK_COLOURS: Record<number, { dot: string; bg: string; border: string; label: string }> = {
  1: { dot: 'bg-red-400',     bg: 'bg-red-50',     border: 'border-red-200',    label: 'Spatial' },
  2: { dot: 'bg-stone-900',   bg: 'bg-stone-900',  border: 'border-stone-900',  label: 'Pass Instruction' },
  3: { dot: 'bg-amber-400',   bg: 'bg-amber-50',   border: 'border-amber-200',  label: 'Style' },
  4: { dot: 'bg-blue-400',    bg: 'bg-blue-50',    border: 'border-blue-200',   label: 'Geometry' },
  5: { dot: 'bg-purple-400',  bg: 'bg-purple-50',  border: 'border-purple-200', label: 'Client Prefs' },
  6: { dot: 'bg-pink-400',    bg: 'bg-pink-50',    border: 'border-pink-200',   label: 'Moodboard' },
  7: { dot: 'bg-teal-400',    bg: 'bg-teal-50',    border: 'border-teal-200',   label: 'Furniture Refs' },
  8: { dot: 'bg-emerald-400', bg: 'bg-emerald-50', border: 'border-emerald-200',label: 'Quality' },
  9: { dot: 'bg-orange-400',  bg: 'bg-orange-50',  border: 'border-orange-200', label: 'Vastu' },
}

export function PromptBlockPreview({ assembledPrompt, onClose }: PromptBlockPreviewProps) {
  const [activeBlock, setActiveBlock] = useState<number | null>(null)
  const [copyDone, setCopyDone] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(assembledPrompt.final_prompt).then(() => {
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
    })
  }

  const activeBlocks = assembledPrompt.blocks.filter(b => b.is_active)
  const inactiveBlocks = assembledPrompt.blocks.filter(b => !b.is_active)

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-stone-900">Full Prompt Preview</h2>
            <p className="text-xs text-stone-400 mt-0.5 tabular-nums">
              {assembledPrompt.block_count} active blocks · {assembledPrompt.char_count.toLocaleString()} characters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                copyDone
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              {copyDone ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy prompt
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Left — Block navigator */}
          <div className="w-52 flex-shrink-0 border-r border-stone-100 overflow-y-auto p-3">
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest px-2 mb-2">Active Blocks</p>
            <div className="space-y-0.5">
              {activeBlocks.map((block) => {
                const colours = BLOCK_COLOURS[block.block_number]
                const isSelected = activeBlock === block.block_number
                return (
                  <button
                    key={block.block_number}
                    onClick={() => setActiveBlock(isSelected ? null : block.block_number)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${colours.bg} ${colours.border} border`
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colours.dot}`} />
                    <div>
                      <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">Block {block.block_number}</p>
                      <p className="text-xs font-medium text-stone-700 leading-tight">{block.label}</p>
                    </div>
                    {block.is_editable && (
                      <span className="ml-auto text-[8px] bg-stone-900 text-white px-1.5 py-0.5 rounded-full font-bold">EDIT</span>
                    )}
                  </button>
                )
              })}
            </div>

            {inactiveBlocks.length > 0 && (
              <>
                <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest px-2 mb-2 mt-4">Inactive</p>
                <div className="space-y-0.5">
                  {inactiveBlocks.map((block) => (
                    <div key={block.block_number} className="flex items-center gap-2.5 px-2.5 py-2 opacity-40">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-stone-300" />
                      <div>
                        <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">Block {block.block_number}</p>
                        <p className="text-xs font-medium text-stone-500 leading-tight">{block.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right — Content area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeBlock !== null ? (
              // Show single selected block
              (() => {
                const block = assembledPrompt.blocks.find(b => b.block_number === activeBlock)
                if (!block) return null
                const colours = BLOCK_COLOURS[block.block_number]
                return (
                  <div>
                    <div className={`flex items-center gap-2 mb-3`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${colours.dot}`} />
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Block {block.block_number} — {block.label}</span>
                      {block.is_editable && (
                        <span className="text-[9px] bg-stone-900 text-white px-1.5 py-0.5 rounded-full font-bold">EDITABLE</span>
                      )}
                    </div>
                    <div className={`p-4 rounded-xl border ${colours.bg} ${colours.border}`}>
                      <pre className="text-xs text-stone-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {block.content}
                      </pre>
                    </div>
                    <button
                      onClick={() => setActiveBlock(null)}
                      className="mt-3 text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 cursor-pointer"
                    >
                      ← Show full assembled prompt
                    </button>
                  </div>
                )
              })()
            ) : (
              // Show full assembled prompt with block colour highlights
              <div>
                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-3">Assembled Prompt</p>
                <div className="space-y-3">
                  {activeBlocks.map((block) => {
                    const colours = BLOCK_COLOURS[block.block_number]
                    return (
                      <div
                        key={block.block_number}
                        className={`p-3 rounded-xl border ${colours.bg} ${colours.border} cursor-pointer hover:shadow-sm transition-shadow`}
                        onClick={() => setActiveBlock(block.block_number)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colours.dot}`} />
                          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                            {block.block_number}. {block.label}
                          </span>
                          {block.is_editable && (
                            <span className="text-[8px] bg-stone-900 text-white px-1.5 py-0.5 rounded-full font-bold ml-auto">EDIT</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                          {block.content}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
