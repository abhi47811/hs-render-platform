'use client'
import Link from 'next/link'
import { SlaCountdown } from './SlaCountdown'
import { getSlaStatus } from '@/lib/sla'
import { OCCUPANT_ICONS } from '@/lib/utils'
import type { ProjectWithRoomCount } from '@/types/database'

interface ProjectCardProps {
  project:         ProjectWithRoomCount
  isSelected?:     boolean
  onToggleSelect?: (id: string) => void
}

const BUDGET_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  economy:  { label: 'Eco',  bg: '#F0FDF4', text: '#16A34A' },
  standard: { label: 'Std',  bg: '#EFF6FF', text: '#2563EB' },
  premium:  { label: 'Pre',  bg: '#F5F3FF', text: '#7C3AED' },
  luxury:   { label: 'Lux',  bg: '#FDF4E7', text: '#C4913A' },
}

const PRIORITY_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  Urgent: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  High:   { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  Normal: { bg: '',        text: '',        border: '' },
}

// Left border accent maps SLA urgency
const SLA_BORDER_COLOR: Record<string, string> = {
  green:    '#22C55E',
  amber:    '#F59E0B',
  red:      '#EF4444',
  breached: '#D4CFC9',
}

// Card background tint when critical
const SLA_CARD_BG: Record<string, string> = {
  green:    'var(--surface)',
  amber:    'var(--surface)',
  red:      '#FFF5F5',
  breached: 'var(--surface-2)',
}

const NEXT_ACTION: Record<string, { label: string; color: string }> = {
  intake:        { label: 'Upload Shell',     color: '#78716C' },
  shell_ready:   { label: 'Enhance Shell',    color: '#2563EB' },
  style_set:     { label: 'Generate Seed',    color: '#7C3AED' },
  staging:       { label: 'Continue Staging', color: '#D97706' },
  client_review: { label: 'Awaiting Client',  color: '#0891B2' },
  revisions:     { label: 'Apply Revisions',  color: '#EA580C' },
  delivered:     { label: 'Delivered',        color: '#16A34A' },
}

export function ProjectCard({ project, isSelected = false, onToggleSelect }: ProjectCardProps) {
  const slaStatus   = getSlaStatus(project.sla_deadline)
  const deliveredRooms = project.rooms?.filter((r) => r.status === 'delivered').length ?? 0
  const totalRooms  = project.room_count
  const progressPct = totalRooms > 0 ? (deliveredRooms / totalRooms) * 100 : 0

  const priorityCfg = PRIORITY_BADGE[project.priority] ?? PRIORITY_BADGE.Normal
  const budgetCfg   = BUDGET_BADGE[project.budget_bracket]
  const borderColor = SLA_BORDER_COLOR[slaStatus] ?? SLA_BORDER_COLOR.green
  const cardBg      = SLA_CARD_BG[slaStatus] ?? 'var(--surface)'
  const nextAction  = NEXT_ACTION[project.status] ?? NEXT_ACTION.intake
  const occupantIcon = project.occupant_profile ? OCCUPANT_ICONS[project.occupant_profile] : null

  return (
    <div className="relative group">
      {/* Checkbox toggle — shown on hover or when selected */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(project.id) }}
          className="absolute top-2 left-2 z-10 flex items-center justify-center w-5 h-5 rounded transition-all"
          style={{
            opacity:    isSelected ? 1 : 0,
            background: isSelected ? 'var(--brand)' : 'var(--surface)',
            border:     isSelected ? '1.5px solid var(--brand)' : '1.5px solid var(--border-strong)',
            boxShadow:  isSelected ? '0 1px 4px rgba(196,145,58,0.4)' : 'none',
          }}
          onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.opacity = '1' }}
          onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.opacity = '0' }}
          title="Select project"
        >
          {isSelected && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          )}
        </button>
      )}

    <Link href={`/projects/${project.id}`} className="block cursor-pointer">
      <article
        style={{
          background:   isSelected ? '#FDF4E7' : cardBg,
          border:       isSelected ? '1px solid var(--brand)' : '1px solid var(--border)',
          borderLeft:   `3px solid ${borderColor}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow:    isSelected ? '0 0 0 2px rgba(196,145,58,0.15)' : 'var(--shadow-xs)',
          transition:   'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          if (!isSelected) {
            el.style.boxShadow = 'var(--shadow-md)'
            el.style.transform = 'translateY(-1px)'
            el.style.borderColor = 'var(--border-strong)'
          }
          el.style.borderLeft = `3px solid ${borderColor}`
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          if (!isSelected) {
            el.style.boxShadow = 'var(--shadow-xs)'
            el.style.transform = ''
            el.style.borderColor = 'var(--border)'
          }
          el.style.borderLeft = `3px solid ${borderColor}`
        }}
      >
        <div className="p-3.5">

          {/* ── Row 1: Client name + badges ─── */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p
              className="text-[13px] font-semibold leading-snug truncate"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              {project.client_name}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {occupantIcon && (
                <span className="text-sm leading-none" title={project.occupant_profile ?? ''}>
                  {occupantIcon}
                </span>
              )}
              {/* Revision badge */}
              {project.status === 'revisions' && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    background: project.revision_count >= project.revision_limit ? '#FEF2F2' : '#FFF7ED',
                    color:      project.revision_count >= project.revision_limit ? '#DC2626' : '#EA580C',
                    border:     `1px solid ${project.revision_count >= project.revision_limit ? '#FECACA' : '#FED7AA'}`,
                  }}
                >
                  REV {project.revision_count}/{project.revision_limit}
                </span>
              )}
              {/* Priority badge */}
              {project.priority !== 'Normal' && priorityCfg.bg && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wide"
                  style={{
                    background: priorityCfg.bg,
                    color:      priorityCfg.text,
                    border:     `1px solid ${priorityCfg.border}`,
                  }}
                >
                  {project.priority.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* ── Row 2: Location meta ─── */}
          <div className="flex items-center gap-1.5 mb-3">
            <span
              className="text-[11px] truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {project.city} · {project.project_type}
            </span>
            {budgetCfg && (
              <span
                className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: budgetCfg.bg, color: budgetCfg.text }}
              >
                {budgetCfg.label}
              </span>
            )}
          </div>

          {/* ── Row 3: Next action ─── */}
          <div
            className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-md"
            style={{ background: `${nextAction.color}12` }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: nextAction.color }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: nextAction.color }}
            >
              {nextAction.label}
            </span>
          </div>

          {/* ── Row 4: Room progress ─── */}
          {totalRooms > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span
                  className="text-[10px] tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {deliveredRooms}/{totalRooms} {totalRooms === 1 ? 'room' : 'rooms'}
                </span>
                {progressPct > 0 && (
                  <span
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: progressPct === 100 ? '#16A34A' : 'var(--brand)' }}
                  >
                    {Math.round(progressPct)}%
                  </span>
                )}
              </div>
              {/* Multi-segment progress bar */}
              <div
                className="h-1 w-full overflow-hidden rounded-full"
                style={{ background: 'var(--surface-3)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? '#16A34A'
                      : 'linear-gradient(90deg, var(--brand) 0%, var(--brand-mid) 100%)',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Row 5: Footer ─── */}
          <div
            className="flex items-center justify-between gap-2 pt-2.5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <SlaCountdown slaDeadline={project.sla_deadline} />

            <div className="flex items-center gap-2">
              {/* API cost */}
              {project.total_api_cost > 0 && (
                <span
                  className="text-[10px] font-mono tabular-nums"
                  style={{ color: project.total_api_cost > 500 ? 'var(--brand)' : 'var(--border-strong)' }}
                >
                  ₹{project.total_api_cost.toFixed(0)}
                </span>
              )}
              {/* Assignee avatar */}
              {project.assigned_profile && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold select-none"
                  title={`${project.assigned_profile.full_name} (${project.assigned_profile.role})`}
                  style={{
                    background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)',
                    color: 'white',
                  }}
                >
                  {project.assigned_profile.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              {/* Chevron */}
              <svg
                width="12" height="12"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--border-strong)', transition: 'color 0.15s' }}
                className="group-hover:!text-[var(--brand-dark)]"
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
        </div>

        {/* SLA breached footer stripe */}
        {slaStatus === 'breached' && (
          <div
            className="px-3.5 py-1.5 flex items-center gap-1.5"
            style={{
              background:  'var(--surface-3)',
              borderTop:   '1px solid var(--border)',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span
              className="text-[9px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              SLA Breached
            </span>
          </div>
        )}
      </article>
    </Link>
    </div>
  )
}
