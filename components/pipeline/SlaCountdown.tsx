'use client'

import { useState, useEffect } from 'react'
import { getSlaStatus, formatSlaDisplay } from '@/lib/sla'
import { cn } from '@/lib/utils'

interface SlaCountdownProps {
  slaDeadline: string
  className?: string
}

const SLA_STYLES = {
  green:    'text-green-700 bg-green-50 border-green-200',
  amber:    'text-amber-700 bg-amber-50 border-amber-200',
  red:      'text-red-700 bg-red-50 border-red-200',
  breached: 'text-stone-400 bg-stone-50 border-stone-200 line-through',
}

const SLA_DOT = {
  green:    'bg-green-500',
  amber:    'bg-amber-500',
  red:      'bg-red-500',
  breached: 'bg-stone-300',
}

export function SlaCountdown({ slaDeadline, className }: SlaCountdownProps) {
  const [display, setDisplay] = useState(formatSlaDisplay(slaDeadline))
  const [status, setStatus] = useState(getSlaStatus(slaDeadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(formatSlaDisplay(slaDeadline))
      setStatus(getSlaStatus(slaDeadline))
    }, 60_000)
    return () => clearInterval(interval)
  }, [slaDeadline])

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium',
      SLA_STYLES[status],
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', SLA_DOT[status])} />
      {display}
    </span>
  )
}
