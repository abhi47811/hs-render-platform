import { ProjectCard } from './ProjectCard'
import type { ProjectWithRoomCount, ProjectStatus } from '@/types/database'
import { PIPELINE_COLUMN_LABELS } from '@/types/database'

interface PipelineColumnProps {
  status: ProjectStatus
  projects: ProjectWithRoomCount[]
}

export function PipelineColumn({ status, projects }: PipelineColumnProps) {
  const label = PIPELINE_COLUMN_LABELS[status]
  const count = projects.length

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {label}
        </h3>
        <span className="text-xs font-medium text-stone-400 bg-stone-100 rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 min-h-[4rem]">
        {projects.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-lg p-4 text-center">
            <p className="text-xs text-stone-300">No projects</p>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  )
}
