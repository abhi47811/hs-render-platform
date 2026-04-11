'use client'

import { PromptTemplate } from '@/types/database'
import { useState } from 'react'

interface TemplateCardProps {
  template: PromptTemplate
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(template.instruction)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine success rate color
  let successRateColor = 'text-red-700 bg-red-50'
  if (template.success_rate > 0.8) {
    successRateColor = 'text-green-700 bg-green-50'
  } else if (template.success_rate > 0.6) {
    successRateColor = 'text-amber-700 bg-amber-50'
  }

  const successPercentage = Math.round(template.success_rate * 100)

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="font-semibold text-stone-900 text-lg mb-2">
            {template.name}
          </h3>

          {/* Meta Info */}
          <div className="flex gap-3 mb-3 flex-wrap items-center">
            {/* Room Type Badge */}
            <span className="inline-block px-2.5 py-1 bg-stone-100 text-stone-700 text-xs rounded-full font-medium">
              {template.room_type}
            </span>

            {/* Style Badge */}
            <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
              {template.style}
            </span>

            {/* Pass Number Badge */}
            <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
              Pass {template.pass_number}
            </span>

            {/* Success Rate */}
            <span
              className={`inline-block px-2.5 py-1 text-xs rounded-full font-medium ${successRateColor}`}
            >
              {successPercentage}% success
            </span>
          </div>

          {/* Instruction Text */}
          <p className="text-stone-600 text-sm line-clamp-2 mb-2">
            {template.instruction}
          </p>

          {/* Usage Count */}
          <p className="text-xs text-stone-500">
            Used <span className="font-semibold">{template.usage_count}x</span>{' '}
            | {template.zero_revision_count} zero-revision completions
          </p>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopyPrompt}
          className="flex-shrink-0 px-3 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors rounded-lg text-sm font-medium whitespace-nowrap"
        >
          {copied ? '✓ Copied' : 'Copy Prompt'}
        </button>
      </div>
    </div>
  )
}
