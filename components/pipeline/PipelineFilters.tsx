'use client'
import { useRef } from 'react'
import type { PipelineFilterState } from '@/hooks/usePipelineFilter'
import type { ProjectWithRoomCount } from '@/types/database'

interface PipelineFiltersProps {
  filters:    PipelineFilterState
  setFilters: (f: PipelineFilterState) => void
  activeCount: number
  reset:      () => void
  projects:   ProjectWithRoomCount[]   // for building dropdown options
}

const CITIES   = ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Chennai']
const PRIORITIES = ['Normal', 'High', 'Urgent']
const BUDGETS  = ['economy', 'standard', 'premium', 'luxury']
const BUDGET_LABELS: Record<string, string> = {
  economy: 'Economy', standard: 'Standard', premium: 'Premium', luxury: 'Luxury',
}

export function PipelineFilters({ filters, setFilters, activeCount, reset, projects }: PipelineFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  function patch(partial: Partial<PipelineFilterState>) {
    setFilters({ ...filters, ...partial })
  }

  // Build unique assignees from projects
  const assignees = Array.from(
    new Map(
      projects
        .filter((p) => p.assigned_profile)
        .map((p) => [p.assigned_to!, p.assigned_profile!])
    ).entries()
  ).map(([id, profile]) => ({ id, name: profile.full_name }))

  return (
    <div
      className="flex items-center gap-2 px-6 py-2.5 flex-shrink-0 flex-wrap"
      style={{
        background:    'var(--surface)',
        borderBottom:  '1px solid var(--border)',
        position:      'sticky',
        top:           0,
        zIndex:        10,
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 flex-1 min-w-[180px] max-w-[260px] px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        onClick={() => searchRef.current?.focus()}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search projects…"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: 'var(--text-primary)' }}
        />
        {filters.search && (
          <button
            onClick={() => patch({ search: '' })}
            className="flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* City filter */}
      <FilterSelect
        value={filters.city}
        onChange={(v) => patch({ city: v })}
        placeholder="City"
        options={CITIES.map((c) => ({ value: c, label: c }))}
        active={!!filters.city}
      />

      {/* Priority filter */}
      <FilterSelect
        value={filters.priority}
        onChange={(v) => patch({ priority: v })}
        placeholder="Priority"
        options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        active={!!filters.priority}
      />

      {/* Budget filter */}
      <FilterSelect
        value={filters.budget}
        onChange={(v) => patch({ budget: v })}
        placeholder="Budget"
        options={BUDGETS.map((b) => ({ value: b, label: BUDGET_LABELS[b] }))}
        active={!!filters.budget}
      />

      {/* Assignee filter */}
      {assignees.length > 0 && (
        <FilterSelect
          value={filters.assignee}
          onChange={(v) => patch({ assignee: v })}
          placeholder="Assignee"
          options={[
            { value: 'unassigned', label: 'Unassigned' },
            ...assignees.map((a) => ({ value: a.id, label: a.name })),
          ]}
          active={!!filters.assignee}
        />
      )}

      {/* Active count + clear */}
      {activeCount > 0 && (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
          style={{
            background: '#FEF3C7',
            color:      '#92400E',
            border:     '1px solid #FDE68A',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
          {activeCount} filter{activeCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

// ─── Reusable pill-select ────────────────────────────────────────

interface FilterSelectProps {
  value:    string
  onChange: (v: string) => void
  placeholder: string
  options:  { value: string; label: string }[]
  active:   boolean
}

function FilterSelect({ value, onChange, placeholder, options, active }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-[11px] font-semibold pr-6 pl-2.5 py-1.5 rounded-lg outline-none transition-all cursor-pointer"
        style={{
          background: active ? '#FDF4E7' : 'var(--surface-2)',
          color:      active ? '#92400E' : 'var(--text-secondary)',
          border:     active ? '1px solid #FDE68A' : '1px solid var(--border)',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        width="10" height="10"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
        style={{ color: active ? '#92400E' : 'var(--text-muted)' }}
      >
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </div>
  )
}
