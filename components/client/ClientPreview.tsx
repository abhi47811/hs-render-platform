'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Project, Render, Room } from '@/types/database'
import RevisionForm from './RevisionForm'

interface ClientPreviewProps {
  renders: Render[]
  room: Room
  project: Project
  shareToken: string
  checkpointNumber: number
}

/**
 * Client-facing preview component
 * Displays renders in a gallery grid with action buttons
 */
export default function ClientPreview({
  renders,
  room,
  project,
  shareToken,
  checkpointNumber,
}: ClientPreviewProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [approvalSuccess, setApprovalSuccess] = useState(false)

  const handleApprove = async () => {
    setIsApproving(true)
    setApprovalError(null)

    try {
      const response = await fetch('/api/share/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: shareToken,
          checkpoint_number: checkpointNumber,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve designs')
      }

      setApprovalSuccess(true)

      // Show success message then reload after a delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsApproving(false)
    }
  }

  if (approvalSuccess) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Thank you!</h2>
          <p className="text-stone-600">Your approval has been recorded.</p>
        </div>
      </div>
    )
  }

  if (showRevisionForm) {
    return (
      <div>
        <button
          onClick={() => setShowRevisionForm(false)}
          className="mb-6 text-sm text-stone-600 hover:text-stone-900 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to designs
        </button>
        <RevisionForm
          shareToken={shareToken}
          roomId={room.id}
          onSubmit={() => {
            // Show success and reload
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          }}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">{room.room_name}</h1>
        <p className="text-stone-600">
          Project in {project.city} • Client: {project.client_name}
        </p>
      </div>

      {/* Gallery grid */}
      {renders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {renders.map((render) => (
            <div key={render.id} className="flex flex-col">
              <div className="relative aspect-video bg-stone-100 rounded-lg overflow-hidden mb-3">
                <Image
                  src={render.watermarked_url || render.storage_url}
                  alt={`${room.room_name} - ${render.variation_label}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-900">
                  {render.pass_type.replace(/_/g, ' ')}
                </span>
                {render.variation_label && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-200 text-stone-800">
                    {render.variation_label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-8 text-center mb-8">
          <p className="text-stone-600">No designs ready to review yet</p>
        </div>
      )}

      {/* Error message */}
      {approvalError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{approvalError}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleApprove}
          disabled={isApproving || renders.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white font-medium rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {isApproving ? 'Approving...' : 'Approve these designs'}
        </button>
        <button
          onClick={() => setShowRevisionForm(true)}
          className="flex-1 px-6 py-3 border border-stone-300 hover:border-stone-400 text-stone-900 font-medium rounded-lg transition"
        >
          Request Changes
        </button>
      </div>
    </div>
  )
}
