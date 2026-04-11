'use client'

import { useState } from 'react'

interface RevisionFormProps {
  shareToken: string
  roomId: string
  onSubmit: () => void
}

// Common revision tags
const REVISION_TAGS = [
  'Lighting too dark',
  'Wrong furniture style',
  'Color doesn\'t match',
  'Layout issue',
  'Add more plants',
  'Different flooring',
  'Other',
]

/**
 * Client revision request form
 * Textarea for description + checkboxes for common tags
 */
export default function RevisionForm({ shareToken, roomId, onSubmit }: RevisionFormProps) {
  const [brief, setBrief] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const briefLength = brief.trim().length
  const isValid = briefLength >= 20 && selectedTags.length > 0

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid) {
      setError('Please describe your changes and select at least one tag')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/share/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: shareToken,
          brief: brief.trim(),
          element_tags: selectedTags,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit revision request')
      }

      setSuccess(true)
      setTimeout(() => {
        onSubmit()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-stone-900 mb-1">Revision request sent</h3>
          <p className="text-sm text-stone-600">
            The team will review your feedback and get back to you soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="brief" className="block text-sm font-medium text-stone-900 mb-2">
          Describe the changes you'd like
        </label>
        <textarea
          id="brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Tell us what you'd like to change about the design..."
          rows={5}
          className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className={`mt-2 text-xs ${briefLength >= 20 ? 'text-green-600' : 'text-stone-500'}`}>
          {briefLength} / 20 characters minimum
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-900 mb-3">
          What would you like to change? (select at least one)
        </label>
        <div className="space-y-2">
          {REVISION_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={() => handleTagToggle(tag)}
                className="w-4 h-4 text-blue-600 border-stone-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-stone-700">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white font-medium rounded-lg transition"
      >
        {isSubmitting ? 'Sending...' : 'Send Revision Request'}
      </button>
    </form>
  )
}
