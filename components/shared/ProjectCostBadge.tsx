'use client';

// ProjectCostBadge — Section 44
// Shows running API cost total for a project in any workspace header.
// Fetches from api_cost_log, updates on each generation via the onRefresh
// callback pattern. Can also be polled on a short interval.

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProjectCostBadgeProps {
  projectId: string;
  /** Optional: budget cap to show warning when exceeded (default ₹500) */
  warnAt?: number;
  /** Optional: external trigger to re-fetch (pass a changing key after generation) */
  refreshKey?: string | number;
}

function CostIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}

export function ProjectCostBadge({ projectId, warnAt = 500, refreshKey }: ProjectCostBadgeProps) {
  const supabase = createClient();
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('api_cost_log')
        .select('cost_inr')
        .eq('project_id', projectId);

      if (error) throw error;

      const total = (data ?? []).reduce((sum, row) => sum + (row.cost_inr ?? 0), 0);
      setTotalCost(total);
    } catch {
      // Silently fail — cost badge is non-critical
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    fetchCost();
  }, [fetchCost, refreshKey]);

  if (loading || totalCost === null) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 animate-pulse">
        <div className="w-14 h-3 bg-stone-200 rounded" />
      </div>
    );
  }

  const isWarning = totalCost >= warnAt;
  const isHigh = totalCost >= warnAt * 1.5;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold tabular-nums transition-colors ${
        isHigh    ? 'bg-red-50 text-red-700 border border-red-200' :
        isWarning ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-stone-100 text-stone-600'
      }`}
      title={`Total API cost for this project${isWarning ? ` — approaching ₹${warnAt} cap` : ''}`}
    >
      <CostIcon />
      <span>₹{totalCost.toFixed(2)}</span>
      {isWarning && <span className="opacity-70">/ ₹{warnAt}</span>}
    </div>
  );
}
