import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSlaStatus, getSlaHoursRemaining } from '@/lib/sla'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Team Schedule | Houspire Staging',
}

interface ProjectWithProfile {
  id: string
  client_name: string
  city: string
  sla_deadline: string
  assigned_to: string | null
  status: string
  priority: string
}

interface ProfileData {
  id: string
  full_name: string | null
  role: string | null
}

const SLA_COLOR_MAP: Record<string, { bg: string; dot: string; text: string }> = {
  breached: { bg: '#FEE2E2', dot: '#DC2626', text: '#991B1B' },
  red: { bg: '#FEE2E2', dot: '#DC2626', text: '#991B1B' },
  amber: { bg: '#FEF3C7', dot: '#D97706', text: '#B45309' },
  green: { bg: '#F0FDF4', dot: '#16A34A', text: '#15803D' },
}

function formatSlaDisplay(slaDeadline: string): string {
  const hoursRemaining = getSlaHoursRemaining(slaDeadline)
  if (hoursRemaining <= 0) return 'OVERDUE'
  const hours = Math.floor(hoursRemaining)
  const minutes = Math.round((hoursRemaining - hours) * 60)
  if (hours === 0) return `${minutes}m left`
  return `${hours}h left`
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const firstDay = new Date(now)
  firstDay.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Monday
  firstDay.setHours(0, 0, 0, 0)

  return firstDay.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all active projects with SLA deadlines
  const { data: projects } = await supabase
    .from('projects')
    .select('id, client_name, city, sla_deadline, assigned_to, status, priority')
    .neq('status', 'delivered')
    .not('sla_deadline', 'is', null)
    .order('sla_deadline', { ascending: true })

  // Fetch all team members
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true)
    .order('full_name')

  const projectList = (projects || []) as ProjectWithProfile[]
  const profileList = (profiles || []) as ProfileData[]

  // Group projects by designer (assigned_to)
  const projectsByDesigner: Record<string, ProjectWithProfile[]> = {}
  const unassignedProjects: ProjectWithProfile[] = []

  for (const project of projectList) {
    if (project.assigned_to) {
      if (!projectsByDesigner[project.assigned_to]) {
        projectsByDesigner[project.assigned_to] = []
      }
      projectsByDesigner[project.assigned_to].push(project)
    } else {
      unassignedProjects.push(project)
    }
  }

  // Create designer rows
  const designerRows = profileList
    .filter((p) => projectsByDesigner[p.id] || p.role === 'senior' || p.role === 'admin')
    .map((profile) => ({
      profile,
      projects: projectsByDesigner[profile.id] || [],
    }))

  return (
    <div
      className="flex-1 flex flex-col p-6 overflow-auto min-h-full"
      style={{
        background: 'var(--bg)',
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          Team Schedule
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Week of {getWeekRange()} · Active projects by designer
        </p>
      </div>

      {/* Legend */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          SLA Legend
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Overdue / &lt;24h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#D97706' }} />
            <span style={{ color: 'var(--text-secondary)' }}>&lt;72h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#16A34A' }} />
            <span style={{ color: 'var(--text-secondary)' }}>This week</span>
          </div>
        </div>
      </div>

      {/* Designer workload rows */}
      <div className="space-y-4">
        {designerRows.length === 0 ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{
              background: 'var(--surface)',
              border: '1px dashed var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)' }}>No active projects</p>
          </div>
        ) : (
          designerRows.map(({ profile, projects: designerProjects }) => (
            <div
              key={profile.id}
              className="rounded-lg p-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Designer header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)',
                  }}
                >
                  {(profile.full_name ?? '')
                    .split(' ')
                    .slice(0, 2)
                    .map((w: string) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {profile.full_name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {profile.role} · {designerProjects.length} active
                  </p>
                </div>
              </div>

              {/* Projects in horizontal layout */}
              {designerProjects.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                  No active projects
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {designerProjects.map((proj) => {
                    const slaStatus = getSlaStatus(proj.sla_deadline)
                    const colors = SLA_COLOR_MAP[slaStatus] || SLA_COLOR_MAP.green
                    const displayTime = formatSlaDisplay(proj.sla_deadline)

                    return (
                      <div
                        key={proj.id}
                        className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 flex-shrink-0"
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.dot}20`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
                        <span className="font-semibold">{proj.client_name}</span>
                        <span className="opacity-75">·</span>
                        <span className="font-mono">{displayTime}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Unassigned projects section */}
      {unassignedProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Unassigned
          </h2>
          <div
            className="rounded-lg p-4"
            style={{
              background: 'var(--surface)',
              border: '1px dashed var(--border)',
            }}
          >
            <div className="space-y-2">
              {unassignedProjects.map((proj) => {
                const slaStatus = getSlaStatus(proj.sla_deadline)
                const colors = SLA_COLOR_MAP[slaStatus] || SLA_COLOR_MAP.green
                const displayTime = formatSlaDisplay(proj.sla_deadline)

                return (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{
                      background: colors.bg,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: colors.text }}>
                          {proj.client_name}
                        </p>
                        <p className="text-xs" style={{ color: colors.text, opacity: 0.75 }}>
                          {proj.city} · {proj.priority}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: colors.text }}>
                      {displayTime}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
