import type { SlaStatus } from '@/types/database'

/**
 * Returns hours remaining until SLA deadline.
 * Negative if breached.
 */
export function getSlaHoursRemaining(slaDeadline: string): number {
  const deadline = new Date(slaDeadline).getTime()
  const now = Date.now()
  return (deadline - now) / (1000 * 60 * 60)
}

/**
 * Returns the SLA traffic-light status:
 * green   = > 24 hours remaining
 * amber   = 12–24 hours remaining
 * red     = 0–12 hours remaining
 * breached = past deadline
 */
export function getSlaStatus(slaDeadline: string): SlaStatus {
  const hoursRemaining = getSlaHoursRemaining(slaDeadline)
  if (hoursRemaining <= 0) return 'breached'
  if (hoursRemaining <= 12) return 'red'
  if (hoursRemaining <= 24) return 'amber'
  return 'green'
}

/**
 * Returns a human-readable SLA display string.
 * Examples: "25h 30m", "11h 45m", "LATE"
 */
export function formatSlaDisplay(slaDeadline: string): string {
  const hoursRemaining = getSlaHoursRemaining(slaDeadline)
  if (hoursRemaining <= 0) return 'LATE'
  const hours = Math.floor(hoursRemaining)
  const minutes = Math.round((hoursRemaining - hours) * 60)
  return `${hours}h ${minutes}m`
}

/**
 * Calculates the SLA deadline: 72 hours from a given start time.
 * Defaults to now.
 */
export function calculateSlaDeadline(startTime?: Date): string {
  const start = startTime ?? new Date()
  const deadline = new Date(start.getTime() + 72 * 60 * 60 * 1000)
  return deadline.toISOString()
}
