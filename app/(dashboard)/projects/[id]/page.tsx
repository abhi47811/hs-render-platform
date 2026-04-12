import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SlaCountdown } from '@/components/pipeline/SlaCountdown'
import { getSlaStatus } from '@/lib/sla'
import { OCCUPANT_ICONS } from '@/lib/utils'
// Sec 08: new project workspace components
import { ProjectInfoSidebar } from '@/components/project/ProjectInfoSidebar'
import { RoomPassTimeline } from '@/components/project/RoomPassTimeline'
// Sec 37: Project Duplication
import { DuplicateButton } from '@/components/projects/DuplicateButton'
import { ProjectStatusControl } from '@/components/project/ProjectStatusControl'
import { ProjectAssignControl } from '@/components/project/ProjectAssignControl'
import { ProjectPriorityControl } from '@/components/project/ProjectPriorityControl'
import { SlaExtendButton } from '@/components/project/SlaExtendButton'
import { ProjectNotes } from '@/components/project/ProjectNotes'

export const dynamic = 'force-dynamic'

interface ProjectPageProps {
  params: { id: string }
}

const ROOM_TYPE_ICONS: Record<string, string> = {
  'Living': 'LR', 'Master Bedroom': 'MB', 'Bedroom 2': 'BR',
  'Kitchen': 'KT', 'Dining': 'DI', 'Study': 'ST',
  'Office': 'OF', 'Bathroom': 'BA', 'Balcony': 'BL', 'Other': '—',
}

const ROOM_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  not_started:    { label: 'Not Started',   color: 'text-stone-400',  dot: 'bg-stone-300' },
  shell_uploaded: { label: 'Shell Ready',   color: 'text-blue-600',   dot: 'bg-blue-400' },
  in_progress:    { label: 'In Progress',   color: 'text-amber-600',  dot: 'bg-amber-400' },
  client_review:  { label: 'In Review',     color: 'text-violet-600', dot: 'bg-violet-400' },
  delivered:      { label: 'Delivered',     color: 'text-green-600',  dot: 'bg-green-500' },
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !project) notFound()

  const { data: roomsData } = await supabase
    .from('rooms')
    .select('*, renders(id, status)')
    .eq('project_id', params.id)
    .order('created_at')

  const { data: assignedProfile } = project.assigned_to
    ? await supabase.from('profiles').select('full_name, role').eq('id', project.assigned_to).single()
    : { data: null }

  const { data: teamMembers = [] } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name')

  const rooms = roomsData ?? []
  const slaStatus = getSlaStatus(project.sla_deadline)
  const deliveredRooms = rooms.filter((r) => r.status === 'delivered').length

  // Sec 40: SLA breach → write is_late_delivery flag on the project if delivered past deadline
  // (done at read-time as a passive check — idempotent update)
  if (project.status === 'delivered' && slaStatus === 'breached' && !project.is_late_delivery) {
    supabase.from('projects')
      .update({ is_late_delivery: true })
      .eq('id', params.id)
      .then(() => {}) // fire-and-forget
  }

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Sticky sub-breadcrumb */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-stone-400">
            <Link href="/" className="hover:text-stone-700 transition-colors cursor-pointer">Pipeline</Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-700 font-medium">{project.client_name}</span>
          </nav>
          <div className="flex items-center gap-2">
            <SlaExtendButton projectId={params.id} />
            <SlaCountdown slaDeadline={project.sla_deadline} />
          </div>
        </div>
      </div>

      {/* Sec 08: main layout with collapsible sidebar */}
      <div className="flex gap-6 px-6 py-6 max-w-7xl mx-auto">

        {/* ── Main content area ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Project header */}
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">{project.client_name}</h1>
              <ProjectStatusControl
                projectId={params.id}
                currentStatus={project.status as 'intake' | 'shell_ready' | 'style_set' | 'staging' | 'client_review' | 'revisions' | 'delivered'}
              />
              <ProjectPriorityControl
                projectId={params.id}
                currentPriority={project.priority as 'Normal' | 'High' | 'Urgent'}
              />
              {project.is_late_delivery && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                  ⚠ Late Delivery
                </span>
              )}
            </div>
            <p className="text-sm text-stone-500">
              {project.city} · {project.project_type}
              {project.occupant_profile && (
                <> · <span title={project.occupant_profile}>
                  {OCCUPANT_ICONS[project.occupant_profile] ?? ''} {project.occupant_profile}
                </span></>
              )}
            </p>
          </div>

          {/* Sec 37: Duplicate button & Delivery link */}
          <div className="flex items-center gap-2 mt-2">
            <DuplicateButton projectId={project.id} projectName={project.client_name} />
            {project.status === 'delivered' && (
              <Link
                href={`/projects/${params.id}/delivery`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: '#F0FDF4',
                  color: '#16A34A',
                  border: '1px solid #BBF7D0',
                }}
              >
                ✓ View Delivery Summary
              </Link>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Budget"
              value={({ economy: 'Economy <₹5L', standard: 'Std ₹5–12L', premium: 'Premium ₹12–25L', luxury: 'Luxury ₹25L+' } as Record<string, string>)[project.budget_bracket] ?? project.budget_bracket}
            />
            <StatCard
              label="Rooms"
              value={`${rooms.length} total · ${deliveredRooms} done`}
            />
            <div className="bg-white rounded-lg border border-stone-200 px-4 py-3">
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">Assigned To</p>
              <ProjectAssignControl
                projectId={params.id}
                currentAssigneeId={project.assigned_to ?? null}
                currentAssigneeName={assignedProfile?.full_name ?? null}
                members={teamMembers ?? []}
              />
            </div>
            {project.vastu_required && project.vastu_required !== 'No' && (
              <StatCard label="Vastu" value={project.vastu_required} highlight />
            )}
          </div>

          {/* Internal Notes */}
          <ProjectNotes projectId={params.id} />

          {/* Sec 08: Room pass timeline strip */}
          {rooms.length > 0 && (
            <RoomPassTimeline
              rooms={rooms.map(r => ({
                id: r.id,
                room_name: r.room_name,
                room_type: r.room_type,
                current_pass: r.current_pass ?? 0,
                status: r.status,
                style_locked: r.style_locked ?? false,
              }))}
              projectId={params.id}
            />
          )}

          {/* Room cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Rooms</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-400">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
                <Link
                  href={`/projects/${params.id}/rooms/new`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="M12 5v14"/>
                  </svg>
                  Add Room
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rooms.map((room) => {
                const statusCfg = ROOM_STATUS_CONFIG[room.status] ?? ROOM_STATUS_CONFIG.not_started
                const renderCount = Array.isArray(room.renders) ? room.renders.length : 0
                const hasShell = !!room.original_shell_url
                return (
                  <Link key={room.id} href={`/projects/${params.id}/rooms/${room.id}`}>
                    <div className="group bg-white rounded-lg border border-stone-200 hover:border-stone-400 hover:shadow-sm transition-all cursor-pointer p-4 flex items-center gap-4">
                      {/* Room type badge */}
                      <div className="w-10 h-10 rounded bg-stone-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-stone-500 group-hover:bg-stone-200 transition-colors">
                        {ROOM_TYPE_ICONS[room.room_type] ?? '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-stone-800 truncate">{room.room_name}</p>
                          <span className="text-xs text-stone-400 flex-shrink-0">{room.room_type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-500">
                          <span className={`flex items-center gap-1 ${statusCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                          {hasShell && <span className="text-stone-400">Shell ✓</span>}
                          {renderCount > 0 && <span className="text-stone-400">{renderCount} render{renderCount !== 1 ? 's' : ''}</span>}
                          {room.current_pass > 0 && <span className="text-stone-400">P{room.current_pass}/6</span>}
                          {(room as any).style_locked && <span className="text-emerald-600">🔒</span>}
                        </div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 group-hover:text-stone-500 flex-shrink-0 transition-colors">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Staging engine prompt */}
          {rooms.length === 0 && (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">No Rooms Yet</p>
              <p className="text-xs text-stone-400 mb-4">Add rooms to start uploading shells and generating AI staging.</p>
              <Link
                href={`/projects/${params.id}/rooms/new`}
                className="inline-flex items-center gap-1.5 bg-stone-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5v14"/>
                </svg>
                Add First Room
              </Link>
            </div>
          )}
        </div>

        {/* ── Sec 08: Collapsible Project Brief Sidebar ── */}
        <ProjectInfoSidebar
          stylePreferences={project.style_preferences ?? null}
          materialPreferences={project.material_preferences ?? null}
          exclusions={project.exclusions ?? null}
          vastuRequired={project.vastu_required ?? 'No'}
          vastuNotes={project.vastu_notes ?? null}
          occupantProfile={project.occupant_profile ?? null}
          primaryStyle={project.primary_style}
          budgetBracket={project.budget_bracket}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 px-4 py-3">
      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-medium truncate ${highlight ? 'text-amber-600' : 'text-stone-800'}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5 capitalize">{sub}</p>}
    </div>
  )
}
