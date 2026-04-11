'use client'

import { useState, useEffect } from 'react'
import { getSlaStatus, formatSlaDisplay } from '@/lib/sla'
import { cn, SLA_STATUS_COLORS } from '@/lib/utils'

interface SlaCountdownProps {
  slaDeadline: string
  className?: string
}

export function SlaCountdown({ slaDeadline, className }: SlaCountdownProps) {
  const [display, setDisplay] = useState(formatSlaDisplay(slaDeadline))
  const [status, setStatus] = useState(getSlaStatus(slaDeadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(formatSlaDisplay(slaDeadline))
      setStatus(getSlaStatus(slaDeadline))
    }, 60_000) // update every 60 seconds

    return () => clearInterval(interval)
  }, [slaDeadline])

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        SLA_STATUS_COLORS[status],
        className
      )}
    >
      ⏱ {display}
    </span>
  )
}
