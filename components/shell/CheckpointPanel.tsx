'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { QualityChecklist, CheckpointType } from '@/components/staging/QualityChecklist'
import { ShareLinkPanel } from '@/components/staging/ShareLinkPanel'
import { WhatsAppCheckpointButton } from '@/components/staging/WhatsAppCheckpointButton'

interface CheckpointRecord {
  id: string
  checkpoint_number: number
  status: 'pending' | 'shared' | 'approved'
  client_notes: string | null
  team_notes: string | null
  shared_at: string | null
}

interface CheckpointPanelProps {
  checkpoint: CheckpointRecord | null
  roomId: string
  projectId?: string
  checkpointNumber: 1 | 2 | 3
  // Sec 26: style seed URL to lock into room + project on CP2 approval
  styleSeedUrl?: string | null
  onStatusChange?: () => void
  onStyleLocked?: () => void
  // Sec 35: metadata for auto-save to style_vault on CP2 approval
  vaultMeta?: {
    styleName: string      // e.g. project.primary_style + ' — ' + room.room_name
    roomType: string
    city: string | null
    budgetBracket: string | null
    sourceProjectId: string
  } | null
  // A3: WhatsApp one-click — client + room identity for message templates
  clientName?: string | null
  roomName?: string | null
}

const CP_META: Record<1 | 2 | 3, { title: string; desc: string; readyAction: string; approveAction: string }> = {
  1: {
    title: 'Shell Approval',
    desc: 'Confirm the shell photo quality before styling and generation begin.',
    readyAction: 'Mark Shell Ready',
    approveAction: 'Approve Shell',
  },
  2: {
    title: 'Style Set',
    desc: 'Style configuration is locked in and generation can begin.',
    readyAction: 'Lock Style',
    approveAction: 'Approve Style',
  },
  3: {
    title: 'Final Sign-off',
    desc: 'Staging renders are complete and ready for client delivery.',
    readyAction: 'Send to Client',
    approveAction: 'Mark Delivered',
  },
}

const PROJECT_STATUS_MAP: Record<1 | 2 | 3, { ready: string; approved: string }> = {
  1: { ready: 'shell_ready',    approved: 'style_set' },
  2: { ready: 'staging',        approved: 'client_review' },
  3: { ready: 'client_review',  approved: 'delivered' },
}

export function CheckpointPanel({
  checkpoint,
  roomId,
  projectId,
  checkpointNumber,
  styleSeedUrl,
  onStatusChange,
  onStyleLocked,
  vaultMeta,
  clientName,
  roomName,
}: CheckpointPanelProps) {
  const router = useRouter()
  const supabase = createClient()
  const meta = CP_META[checkpointNumber]

  const [cp, setCp] = useState<CheckpointRecord | null>(checkpoint)
  const [teamNotes, setTeamNotes] = useState(checkpoint?.team_notes ?? '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  // Section 24: Quality checklist gate
  const [checklistAllDone, setChecklistAllDone] = useState(false)

  const status = cp?.status ?? 'pending'

  // Ensure checkpoint exists (create lazily if trigger missed it)
  const ensureCheckpoint = async (): Promise<CheckpointRecord> => {
    if (cp) return cp
    const { data, error } = await supabase
      .from('checkpoints')
      .insert({ room_id: roomId, checkpoint_number: checkpointNumber, status: 'pending' })
      .select()
      .single()
    if (error || !data) throw new Error('Could not create checkpoint')
    setCp(data)
    return data
  }

  const getProjectId = async () => {
    const { data } = await supabase.from('rooms').select('project_id').eq('id', roomId).single()
    return data?.project_id ?? null
  }

  const handleMarkReady = async () => {
    setIsWorking(true)
    try {
      const record = await ensureCheckpoint()
      await supabase.from('checkpoints')
        .update({ status: 'shared', shared_at: new Date().toISOString() })
        .eq('id', record.id)

      const projectId = await getProjectId()
      if (projectId) {
        await supabase.from('projects')
          .update({ status: PROJECT_STATUS_MAP[checkpointNumber].ready })
          .eq('id', projectId)
      }

      setCp({ ...record, status: 'shared' })
      onStatusChange?.()
      router.refresh()
    } catch (err) {
      console.error('[CheckpointPanel] mark ready failed:', err)
    } finally {
      setIsWorking(false)
    }
  }

  const handleApprove = async () => {
    setIsWorking(true)
    try {
      const record = await ensureCheckpoint()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('checkpoints')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id ?? null })
        .eq('id', record.id)

      const projectId = await getProjectId()
      if (projectId) {
        await supabase.from('projects')
          .update({ status: PROJECT_STATUS_MAP[checkpointNumber].approved })
          .eq('id', projectId)
      }

      // Sec 26: CP2 approval → lock style on room + propagate seed to project
      if (checkpointNumber === 2) {
        const roomUpdate: Record<string, unknown> = {
          style_locked: true,
          style_locked_at: new Date().toISOString(),
        }
        if (styleSeedUrl) {
          roomUpdate.style_seed_url = styleSeedUrl
        }
        await supabase.from('rooms').update(roomUpdate).eq('id', roomId)

        // Propagate style seed to project level for cross-room inheritance (Sec 21)
        if (projectId && styleSeedUrl) {
          await supabase.from('projects')
            .update({ style_seed_url: styleSeedUrl })
            .eq('id', projectId)
        }

        // Sec 35: Auto-save approved seed to Style Vault (fire-and-forget)
        if (styleSeedUrl && vaultMeta) {
          const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
          supabase
            .from('style_vault')
            .insert({
              image_url: styleSeedUrl,
              style_name: vaultMeta.styleName,
              room_type: vaultMeta.roomType,
              city: vaultMeta.city,
              budget_bracket: vaultMeta.budgetBracket,
              source_project_id: vaultMeta.sourceProjectId,
              created_by: user?.id ?? null,
              usage_count: 0,
              tags: [],
            })
            .then(({ error }) => {
              if (error) console.warn('[CheckpointPanel] vault auto-save failed:', error.message)
            })
        }

        onStyleLocked?.()
      }

      setCp({ ...record, status: 'approved' })
      onStatusChange?.()
      router.refresh()
    } catch (err) {
      console.error('[CheckpointPanel] approve failed:', err)
    } finally {
      setIsWorking(false)
    }
  }

  const handleSaveNotes = async () => {
    const record = cp
    if (!record) return
    setIsSavingNotes(true)
    try {
      await supabase.from('checkpoints').update({ team_notes: teamNotes }).eq('id', record.id)
      setEditingNotes(false)
    } catch (err) {
      console.error('[CheckpointPanel] save notes failed:', err)
    } finally {
      setIsSavingNotes(false)
    }
  }

  const statusConfig = {
    pending:  { dot: 'bg-stone-300',  label: 'Pending',          labelColor: 'text-stone-500' },
    shared:   { dot: 'bg-blue-500',   label: 'Shared with Client', labelColor: 'text-blue-600' },
    approved: { dot: 'bg-green-500',  label: 'Approved',         labelColor: 'text-green-600' },
  }[status]

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
            status === 'approved' ? 'bg-green-100 text-green-700' :
            status === 'shared'   ? 'bg-blue-100 text-blue-700' :
            'bg-stone-100 text-stone-500'
          )}>
            {status === 'approved' ? '✓' : checkpointNumber}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">CP{checkpointNumber}: {meta.title}</h3>
            <p className="text-xs text-stone-400">{meta.desc}</p>
          </div>
        </div>

        {/* Status indicator + A3: WhatsApp button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            <span className={`text-xs font-medium ${statusConfig.labelColor}`}>{statusConfig.label}</span>
          </div>

          {/* A3: WhatsApp one-click — shown when client name + project ID are available */}
          {clientName && projectId && (
            <WhatsAppCheckpointButton
              checkpointNumber={checkpointNumber}
              clientName={clientName}
              roomName={roomName ?? 'Room'}
              projectId={projectId}
              roomId={roomId}
            />
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Section 24: Quality checklist gate — shown only when pending */}
        {status === 'pending' && (
          <QualityChecklist
            checkpointType={checkpointNumber as CheckpointType}
            onAllChecked={setChecklistAllDone}
          />
        )}

        {/* Action button */}
        {status === 'pending' && (
          <button
            onClick={handleMarkReady}
            disabled={isWorking || !checklistAllDone}
            title={!checklistAllDone ? 'Complete the quality checklist above to unlock this action' : undefined}
            className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-colors cursor-pointer"
          >
            {isWorking ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Working…
              </span>
            ) : meta.readyAction}
          </button>
        )}

        {status === 'shared' && (
          <div className="space-y-3">
            {/* Share link management (Sec 25) */}
            {projectId && (
              <ShareLinkPanel
                projectId={projectId}
                roomId={roomId}
                checkpointNumber={checkpointNumber}
              />
            )}

            {!projectId && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 text-center flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                Shared with client — awaiting approval
              </div>
            )}

            <button
              onClick={handleApprove}
              disabled={isWorking}
              className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-colors cursor-pointer"
            >
              {isWorking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Working…
                </span>
              ) : meta.approveAction}
            </button>
          </div>
        )}

        {status === 'approved' && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-xs font-semibold text-green-700">{meta.title} Approved</span>
          </div>
        )}

        {/* Client Notes — audit trail of what the client requested (Sec 23) */}
        {cp?.client_notes && (
          <div className="pt-1 border-t border-stone-100">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs font-semibold text-stone-600">Client Feedback</p>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                Audit Trail
              </span>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">
                {cp.client_notes}
              </p>
              {cp?.shared_at && (
                <p className="text-[9px] text-amber-500 mt-1.5">
                  Submitted {new Date(cp.shared_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Team notes */}
        <div className="pt-1 border-t border-stone-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-stone-600">Internal Notes</p>
            {!editingNotes && cp && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs text-stone-400 hover:text-stone-700 transition-colors min-h-[32px] px-2 cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={teamNotes}
                onChange={(e) => setTeamNotes(e.target.value)}
                placeholder="Internal notes, flags, or observations…"
                rows={3}
                className="w-full px-3 py-2.5 text-xs bg-white border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-400 transition-colors text-stone-800 placeholder:text-stone-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="flex-1 min-h-[40px] bg-stone-900 hover:bg-stone-700 disabled:bg-stone-200 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {isSavingNotes ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingNotes(false); setTeamNotes(cp?.team_notes ?? '') }}
                  className="flex-1 min-h-[40px] border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[48px] rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5 cursor-pointer hover:bg-stone-100 transition-colors"
              onClick={() => cp && setEditingNotes(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && cp && setEditingNotes(true)}
              aria-label="Edit internal notes"
            >
              {teamNotes ? (
                <p className="text-xs text-stone-600 whitespace-pre-wrap">{teamNotes}</p>
              ) : (
                <p className="text-xs text-stone-300 italic">No notes — tap to add</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
