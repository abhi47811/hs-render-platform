import { ProjectCard } from './ProjectCard'
import type { ProjectWithRoomCount, ProjectStatus } from '@/types/database'
import { PIPELINE_COLUMN_LABELS } from '@/types/database'

interface PipelineColumnProps {
  status:          ProjectStatus
  projects:        ProjectWithRoomCount[]
  selectedIds?:    Set<string>
  onToggleSelect?: (id: string) => void
}

// Status-specific color for the column accent dot
const STATUS_ACCENT: Record<ProjectStatus, { dot: string; text: string }> = {
  intake:        { dot: '#78716C', text: '#78716C' },
  shell_ready:   { dot: '#2563EB', text: '#2563EB' },
  style_set:     { dot: '#7C3AED', text: '#7C3AED' },
  staging:       { dot: '#D97706', text: '#D97706' },
  client_review: { dot: '#0891B2', text: '#0891B2' },
  revisions:     { dot: '#EA580C', text: '#EA580C' },
  delivered:     { dot: '#16A34A', text: '#16A34A' },
}

export function PipelineColumn({ status, projects, selectedIds, onToggleSelect }: PipelineColumnProps) {
  const label  = PIPELINE_COLUMN_LABELS[status]
  const count  = projects.length
  const accent = STATUS_ACCENT[status]

  return (
    <div className="flex flex-col flex-1 min-w-[168px] max-w-[230px] min-h-0 h-full">

      {/* ── Column header ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between mb-3 px-0.5 flex-shrink-0 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: accent.dot, boxShadow: `0 0 6px ${accent.dot}55` }}
          />
          <h3
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </h3>
        </div>
        {/* Count badge */}
        {count > 0 && (
          <span
            className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
            style={{
              background: `${accent.dot}18`,
              color:      accent.text,
            }}
          >
            {count}
          </span>
        )}
      </div>

      {/* ── Cards ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5 pr-0.5 pb-2">
        {projects.length === 0 ? (
          <div
            className="rounded-xl p-5 text-center mt-1"
            style={{
              border: '1.5px dashed var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            <p
              className="text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              No projects
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={selectedIds?.has(project.id) ?? false}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
