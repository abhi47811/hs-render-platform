'use client'

import { PromptTemplate } from '@/types/database'
import { useState } from 'react'

interface TemplateCardProps {
  template: PromptTemplate
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(template.instruction)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine success rate color
  let successRateColor = 'text-red-700 bg-red-50 border-red-200'
  if (template.success_rate > 0.8) {
    successRateColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'
  } else if (template.success_rate > 0.6) {
    successRateColor = 'text-amber-700 bg-amber-50 border-amber-200'
  }

  const successPercentage = Math.round(template.success_rate * 100)

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="font-semibold text-stone-900 text-sm mb-2">
            {template.name}
          </h3>

          {/* Meta Info */}
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            {/* Room Type Badge */}
            <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full font-medium">
              {template.room_type}
            </span>

            {/* Style Badge */}
            <span className="inline-block px-2 py-0.5 bg-stone-800 text-white text-xs rounded-full font-medium">
              {template.style}
            </span>

            {/* Pass Number Badge */}
            <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full font-medium">
              Pass {template.pass_number}
            </span>

            {/* Success Rate */}
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${successRateColor}`}
            >
              {successPercentage}% success
            </span>
          </div>

          {/* Instruction Text */}
          <p className="text-stone-500 text-xs line-clamp-2 mb-2 leading-relaxed">
            {template.instruction}
          </p>

          {/* Usage Count */}
          <p className="text-xs text-stone-400 tabular-nums">
            Used <span className="font-semibold text-stone-600">{template.usage_count}×</span>
            {' '}· {template.zero_revision_count} zero-revision
          </p>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopyPrompt}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-transparent'
          }`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
