// ─── Sec 32: Generation Queue types + helpers ───────────────────────────────
//
// Source of truth: generation_queue DB table
//   status  : 'pending' | 'processing' | 'complete' | 'failed'   (no 'd' on complete)
//   priority: integer 1=urgent · 2=high · 3=normal                (not a string)
//   requested_by: uuid FK to profiles                              (not user_id)
//   queued_at: timestamptz                                         (not created_at)

export type QueueStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled'

/** Numeric priority stored in DB — lower = more urgent */
export type QueuePriority = 1 | 2 | 3

export interface QueueItem {
  id: string
  project_id: string
  room_id: string
  pass_number: number
  pass_type: string
  variation_count: 1 | 2 | 3
  prompt: string
  reference_urls: string[]
  resolution_tier: '1K' | '2K' | '4K'
  /** 1 = urgent · 2 = high · 3 = normal */
  priority: QueuePriority
  status: QueueStatus
  queued_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  api_cost: number | null
  /** FK to profiles.id — team member who submitted the job */
  requested_by: string | null
}

/** Human label for each queue status */
export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  pending:    'Queued',
  processing: 'Processing',
  complete:   'Done',
  failed:     'Failed',
  cancelled:  'Cancelled',
}

/** Human label for each numeric priority */
export const PRIORITY_LABEL: Record<QueuePriority, string> = {
  1: 'urgent',
  2: 'high',
  3: 'normal',
}

/** Tailwind badge classes for each numeric priority */
export const PRIORITY_BADGE_CLASS: Record<QueuePriority, string> = {
  1: 'bg-red-100 text-red-600',
  2: 'bg-amber-100 text-amber-600',
  3: 'bg-stone-100 text-stone-500',
}

/** Map project-level priority strings → numeric queue priority */
export function projectPriorityToQueue(projectPriority: string): QueuePriority {
  if (projectPriority === 'Urgent') return 1
  if (projectPriority === 'High')   return 2
  return 3
}

/** Returns true if status is still in-flight (pending or processing) */
export function isInFlight(status: QueueStatus): boolean {
  return status === 'pending' || status === 'processing'
}
