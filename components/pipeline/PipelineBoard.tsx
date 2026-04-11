'use client'

import { PipelineColumn } from './PipelineColumn'
import type { ProjectWithRoomCount, ProjectStatus } from '@/types/database'
import { PIPELINE_COLUMNS } from '@/types/database'

interface PipelineBoardProps {
  projects: ProjectWithRoomCount[]
}

export function PipelineBoard({ projects }: PipelineBoardProps) {
  // Group projects by status
  const grouped = PIPELINE_COLUMNS.reduce<Record<ProjectStatus, ProjectWithRoomCount[]>>(
    (acc, status) => {
      acc[status] = projects.filter((p) => p.status === status)
      return acc
    },
    {} as Record<ProjectStatus, ProjectWithRoomCount[]>
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 px-6 pt-2 min-h-full">
      {PIPELINE_COLUMNS.map((status) => (
        <PipelineColumn
          key={status}
          status={status}
          projects={grouped[status]}
        />
      ))}
    </div>
  )
}
