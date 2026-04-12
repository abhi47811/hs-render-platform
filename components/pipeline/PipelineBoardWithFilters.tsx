'use client'
import { useState, useCallback } from 'react'
import { usePipelineFilter } from '@/hooks/usePipelineFilter'
import { PipelineFilters } from './PipelineFilters'
import { PipelineBoard } from './PipelineBoard'
import { BulkActionBar } from './BulkActionBar'
import type { ProjectWithRoomCount } from '@/types/database'

interface PipelineBoardWithFiltersProps {
  projects: ProjectWithRoomCount[]
  members:  { id: string; full_name: string }[]
}

export function PipelineBoardWithFilters({ projects, members }: PipelineBoardWithFiltersProps) {
  const { filters, setFilters, filtered, activeCount, reset } = usePipelineFilter(projects)

  // ── Bulk selection state ─────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  function clearSelection() { setSelectedIds(new Set()) }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filter bar — sticky within scroll container */}
      <PipelineFilters
        filters={filters}
        setFilters={setFilters}
        activeCount={activeCount}
        reset={reset}
        projects={projects}
      />

      {/* Board — scrollable area */}
      <div className="flex-1 overflow-auto min-h-0">
        <PipelineBoard
          projects={filtered}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      </div>

      {/* Bulk action floating bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClear={clearSelection}
        members={members}
      />
    </div>
  )
}
