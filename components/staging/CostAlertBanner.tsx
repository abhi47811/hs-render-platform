'use client'

// ─── A5: Room-Level Cost Alert ─────────────────────────────────────────────
// Shown inside the staging workspace when the total API cost for this room
// crosses the ₹150 warning threshold (configurable).
//
// Alert levels:
//   warning  — ₹150+ — amber banner, dismissable
//   critical — ₹300+ — red banner, persistent
//   extreme  — ₹500+ — red banner with escalation note
//
// Queries `renders` table for this room's cumulative cost.
// Re-checks every time a new render is generated (via refreshKey prop).

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

type AlertLevel = 'warning' | 'critical' | 'extreme'

interface AlertConfig {
  level: AlertLevel
  title: string
  message: string
  bgColor: string
  borderColor: string
  textColor: string
  icon: string
}

function getAlertConfig(cost: number, threshold: number): AlertConfig | null {
  if (cost >= threshold * 3.33) {  // ~₹500 if threshold is ₹150
    return {
      level: 'extreme',
      title: 'High API spend alert',
      message: `This room has used ₹${cost.toFixed(0)} in API calls. Consider discussing scope with the team before generating more.`,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-800',
      icon: '🚨',
    }
  }
  if (cost >= threshold * 2) {    // ~₹300
    return {
      level: 'critical',
      title: 'Cost threshold exceeded',
      message: `Total API cost for this room: ₹${cost.toFixed(2)}. This is above the standard ₹${(threshold * 2).toFixed(0)} budget.`,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      icon: '⚠️',
    }
  }
  if (cost >= threshold) {
    return {
      level: 'warning',
      title: 'Cost notice',
      message: `API spend for this room has reached ₹${cost.toFixed(2)} (${Math.round((cost / threshold) * 100)}% of ₹${threshold} threshold).`,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      icon: '💡',
    }
  }
  return null
}

// ── Props ──────────────────────────────────────────────────────────────────

interface CostAlertBannerProps {
  roomId: string
  /** Warning threshold in ₹. Default: 150 */
  threshold?: number
  /** Triggers re-fetch when changed (after each generation) */
  refreshKey?: number
}

// ── Component ──────────────────────────────────────────────────────────────

export function CostAlertBanner({
  roomId,
  threshold = 150,
  refreshKey = 0,
}: CostAlertBannerProps) {
  const supabase = createClient()
  const [totalCost, setTotalCost] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState<AlertLevel | null>(null)

  const fetchCost = useCallback(async () => {
    const { data } = await supabase
      .from('renders')
      .select('api_cost')
      .eq('room_id', roomId)
      .not('api_cost', 'is', null)

    if (!data) return
    const total = data.reduce((sum, r) => sum + (Number(r.api_cost) || 0), 0)
    setTotalCost(total)
  }, [supabase, roomId])

  useEffect(() => {
    fetchCost()
  }, [fetchCost, refreshKey])

  if (totalCost === null) return null

  const alert = getAlertConfig(totalCost, threshold)
  if (!alert) return null

  // Don't re-show warning level if dismissed (critical + extreme persist)
  if (alert.level === 'warning' && dismissed === 'warning') return null

  return (
    <div className={`rounded-xl border ${alert.bgColor} ${alert.borderColor} px-4 py-3 flex items-start gap-3`}>
      <span className="text-lg flex-shrink-0">{alert.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${alert.textColor}`}>{alert.title}</p>
        <p className={`text-xs mt-0.5 ${alert.textColor} opacity-80 leading-relaxed`}>{alert.message}</p>

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-white/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              alert.level === 'warning' ? 'bg-amber-400' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min((totalCost / (threshold * 3.33)) * 100, 100)}%` }}
          />
        </div>
        <p className={`text-[10px] mt-1 ${alert.textColor} opacity-60`}>
          ₹{totalCost.toFixed(2)} of ~₹{(threshold * 3.33).toFixed(0)} budget range
        </p>
      </div>

      {/* Dismiss (warning only) */}
      {alert.level === 'warning' && (
        <button
          onClick={() => setDismissed('warning')}
          className="flex-shrink-0 mt-0.5 text-amber-400 hover:text-amber-700 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}
