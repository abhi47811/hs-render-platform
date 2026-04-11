'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface CheckpointPanelProps {
  checkpoint: {
    id: string
    checkpoint_number: number
    status: 'pending' | 'shared' | 'approved'
    client_notes: string | null
    team_notes: string | null
  } | null
  roomId: string
  checkpointNumber: 1 | 2 | 3
  onStatusChange: () => void
}

const CHECKPOINT_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Shell Approval',
  2: 'Style Set',
  3: 'Staging Complete',
}

const CHECKPOINT_DESCRIPTIONS: Record<1 | 2 | 3, string> = {
  1: 'Internal team reviews shell quality before styling',
  2: 'Style direction and color palette approved',
  3: 'Final staging renders approved',
}

export function CheckpointPanel({
  checkpoint,
  roomId,
  checkpointNumber,
  onStatusChange,
}: CheckpointPanelProps) {
  const [teamNotes, setTeamNotes] = useState(checkpoint?.team_notes || '')
  const [notesEditing, setNotesEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const currentStatus = checkpoint?.status || 'pending'

  const handleMarkReady = async () => {
    if (!checkpoint) return
    setIsLoading(true)
    try {
      // Update checkpoint
      const { error: cpError } = await supabase
        .from('checkpoints')
        .update({ status: 'shared', shared_at: new Date().toISOString() })
        .eq('id', checkpoint.id)

      if (cpError) throw cpError

      // Get room data to update project status
      const { data: roomData } = await supabase
        .from('rooms')
        .select('project_id')
        .eq('id', roomId)
        .single()

      if (roomData) {
        const { error: projError } = await supabase
          .from('projects')
          .update({ status: 'shell_ready' })
          .eq('id', roomData.project_id)

        if (projError) throw projError
      }

      onStatusChange()
    } catch (err) {
      console.error('Failed to mark shell ready:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!checkpoint) return
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', checkpoint.id)

      if (error) throw error
      onStatusChange()
    } catch (err) {
      console.error('Failed to approve shell:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!checkpoint) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ team_notes: teamNotes })
        .eq('id', checkpoint.id)

      if (error) throw error
      setNotesEditing(false)
      onStatusChange()
    } catch (err) {
      console.error('Failed to save notes:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'shared':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return '✓ Approved'
      case 'shared':
        return '→ Shared with Client'
      default:
        return '◯ Pending'
    }
  }

  return (
    <div className="w-full rounded-lg border border-stone-200 bg-white p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-stone-900 mb-1">
          CP{checkpointNumber}: {CHECKPOINT_LABELS[checkpointNumber]}
        </h3>
        <p className="text-sm text-stone-600">{CHECKPOINT_DESCRIPTIONS[checkpointNumber]}</p>
      </div>

      {/* Status Badge */}
      <div className="mb-5">
        <div
          className={cn(
            'inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium',
            getStatusBadgeColor(currentStatus)
          )}
        >
          {getStatusLabel(currentStatus)}
        </div>
      </div>

      {/* Action Buttons */}
      {currentStatus === 'pending' && (
        <button
          onClick={handleMarkReady}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-4"
        >
          {isLoading ? 'Marking...' : 'Mark Shell Ready'}
        </button>
      )}

      {currentStatus === 'shared' && (
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-4"
        >
          {isLoading ? 'Approving...' : 'Approve Shell'}
        </button>
      )}

      {currentStatus === 'approved' && (
        <div className="w-full py-2 px-4 rounded-lg bg-green-50 border border-green-200 text-center text-sm font-medium text-green-700 mb-4">
          ✓ Shell Approved
        </div>
      )}

      {/* Team Notes */}
      <div className="mt-6 pt-6 border-t border-stone-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-stone-700">Team Notes</label>
          {!notesEditing && (
            <button
              onClick={() => setNotesEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Edit
            </button>
          )}
        </div>

        {notesEditing ? (
          <div className="space-y-3">
            <textarea
              value={teamNotes}
              onChange={(e) => setTeamNotes(e.target.value)}
              placeholder="Add internal team notes, observations, or flags..."
              className="w-full h-24 p-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setNotesEditing(false)
                  setTeamNotes(checkpoint?.team_notes || '')
                }}
                disabled={isSaving}
                className="flex-1 border border-stone-300 hover:bg-stone-50 disabled:bg-stone-100 text-stone-700 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 min-h-20">
            {teamNotes ? (
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{teamNotes}</p>
            ) : (
              <p className="text-sm text-stone-500 italic">No notes yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
