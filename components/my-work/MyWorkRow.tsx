'use client'
import Link from 'next/link'
import { SlaCountdown } from '@/components/pipeline/SlaCountdown'

interface MyWorkRowProps {
  project: {
    id: string
    client_name: string
    city: string
    status: string
    priority: string
    sla_deadline: string
    project_type: string
  }
  sc:             { label: string; color: string; bg: string }
  priorityColor:  string
}

export function MyWorkRow({ project, sc, priorityColor }: MyWorkRowProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border-strong)'
          el.style.boxShadow   = 'var(--shadow-sm)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border)'
          el.style.boxShadow   = 'none'
        }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: priorityColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {project.client_name}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {project.city} · {project.project_type}
          </p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: sc.bg, color: sc.color }}
        >
          {sc.label}
        </span>
        <div className="flex-shrink-0">
          <SlaCountdown slaDeadline={project.sla_deadline} />
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </Link>
  )
}
