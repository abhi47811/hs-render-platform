'use client'

import { PipelineColumn } from './PipelineColumn'
import type { ProjectWithRoomCount, ProjectStatus } from '@/types/database'
import { PIPELINE_COLUMNS } from '@/types/database'

interface PipelineBoardProps {
  projects:        ProjectWithRoomCount[]
  selectedIds?:    Set<string>
  onToggleSelect?: (id: string) => void
}

export function PipelineBoard({ projects, selectedIds, onToggleSelect }: PipelineBoardProps) {
  const grouped = PIPELINE_COLUMNS.reduce<Record<ProjectStatus, ProjectWithRoomCount[]>>(
    (acc, status) => {
      acc[status] = projects.filter((p) => p.status === status)
      return acc
    },
    {} as Record<ProjectStatus, ProjectWithRoomCount[]>
  )

  return (
    <div
      className="flex gap-3 h-full px-6 pt-5 pb-6"
      style={{ overflowX: 'auto' }}
    >
      {PIPELINE_COLUMNS.map((status) => (
        <PipelineColumn
          key={status}
          status={status}
          projects={grouped[status]}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
      {/* Right-edge breathing room */}
      <div className="w-2 flex-shrink-0" />
    </div>
  )
}
