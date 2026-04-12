'use client'

// ─── Sec 32: Queue Indicator ─────────────────────────────────────────────────
// TopBar component. Polls generation_queue for pending+processing items
// belonging to the current user. Shows count + a dismissible mini-panel.

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QueueItem, QueueStatus, QueuePriority } from '@/lib/queue'
import { QUEUE_STATUS_LABEL, PRIORITY_LABEL, PRIORITY_BADGE_CLASS, isInFlight } from '@/lib/queue'

function QueueIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function SpinnerIcon({ size = 12 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  )
}

const STATUS_DOT: Record<QueueStatus, string> = {
  pending:    'bg-amber-400',
  processing: 'bg-blue-500',
  complete:   'bg-green-500',
  failed:     'bg-red-500',
  cancelled:  'bg-stone-400',
}

export function QueueIndicator() {
  const supabase = createClient()
  const [items, setItems] = useState<QueueItem[]>([])
  const [open, setOpen] = useState(false)
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const fetchQueue = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('generation_queue')
      .select('*')
      .eq('requested_by', user.id)
      .in('status', ['pending', 'processing', 'failed'])
      .order('queued_at', { ascending: false })
      .limit(20)

    setItems(data ?? [])
  }, [supabase])

  // Initial load + polling every 8s for in-flight items
  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 8000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('queue-indicator')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_queue' }, fetchQueue)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchQueue])

  // Click-outside close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleCancel(itemId: string) {
    setCancellingIds(prev => new Set(prev).add(itemId))
    try {
      const res = await fetch(`/api/staging/queue/${itemId}`, { method: 'PATCH' })
      if (res.ok) {
        // Optimistically remove from local state; fetchQueue will reconcile
        setItems(prev => prev.filter(i => i.id !== itemId))
      }
    } catch {
      // Silent — fetchQueue will correct state on next poll
    } finally {
      setCancellingIds(prev => { const next = new Set(prev); next.delete(itemId); return next })
    }
  }

  const inFlightCount = items.filter(i => isInFlight(i.status as QueueStatus)).length
  const processingCount = items.filter(i => i.status === 'processing').length
  const failedCount = items.filter(i => i.status === 'failed').length

  if (items.length === 0) return null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[32px] ${
          failedCount > 0
            ? 'bg-red-50 text-red-700 border border-red-200'
            : inFlightCount > 0
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-stone-100 text-stone-600 border border-stone-200'
        }`}
        title={`${inFlightCount} generation${inFlightCount !== 1 ? 's' : ''} in queue`}
      >
        {processingCount > 0 ? <SpinnerIcon /> : <QueueIcon />}
        <span className="tabular-nums">
          {inFlightCount > 0 ? `${inFlightCount} queued` : failedCount > 0 ? `${failedCount} failed` : ''}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-72 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider">Generation Queue</h3>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 p-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-stone-50">
            {items.map(item => {
              const isCancelling = cancellingIds.has(item.id)
              const canCancel = item.status === 'pending' || item.status === 'processing' || item.status === 'failed'
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  {/* Status dot / spinner */}
                  <div className="mt-0.5 flex-shrink-0">
                    {item.status === 'processing' ? (
                      <SpinnerIcon size={10} />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT[item.status as QueueStatus] ?? 'bg-stone-400'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-stone-800 truncate">
                      Pass {item.pass_number} — {item.pass_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {QUEUE_STATUS_LABEL[item.status as QueueStatus]} · {item.variation_count}× {item.resolution_tier}
                    </p>
                    {item.error_message && (
                      <p className="text-[10px] text-red-500 mt-0.5 truncate">{item.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded ${
                      PRIORITY_BADGE_CLASS[item.priority as QueuePriority] ?? 'bg-stone-100 text-stone-500'
                    }`}>
                      {PRIORITY_LABEL[item.priority as QueuePriority] ?? 'normal'}
                    </span>
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        disabled={isCancelling}
                        title={item.status === 'failed' ? 'Dismiss' : 'Cancel generation'}
                        className="w-5 h-5 flex items-center justify-center rounded text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {isCancelling ? (
                          <SpinnerIcon size={8} />
                        ) : (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {inFlightCount > 0 && (
            <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50">
              <p className="text-[10px] text-stone-500">Queue auto-processes every 10 seconds</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
