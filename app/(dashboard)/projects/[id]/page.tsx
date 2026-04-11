import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SlaCountdown } from '@/components/pipeline/SlaCountdown'
import { getSlaStatus } from '@/lib/sla'
import { OCCUPANT_ICONS } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface ProjectPageProps {
  params: { id: string }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      rooms(*, renders(id, status, pass_number, created_at)),
      assigned_profile:profiles!projects_assigned_to_fkey(full_name, role),
      created_by_profile:profiles!projects_created_by_fkey(full_name)
    `)
    .eq('id', params.id)
    .single()

  if (error || !project) {
    notFound()
  }

  const slaStatus = getSlaStatus(project.sla_deadline)
  const rooms = project.rooms ?? []
  const deliveredRooms = rooms.filter((r: { status: string }) => r.status === 'delivered').length

  const statusColors: Record<string, string> = {
    intake: 'bg-stone-100 text-stone-600',
    shell_ready: 'bg-blue-100 text-blue-700',
    style_set: 'bg-violet-100 text-violet-700',
    staging: 'bg-amber-100 text-amber-700',
    client_review: 'bg-yellow-100 text-yellow-700',
    revisions: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
  }

  const statusLabels: Record<string, string> = {
    intake: 'Intake',
    shell_ready: 'Shell Ready',
    style_set: 'Style Set',
    staging: 'Staging',
    client_review: 'Client Review',
    revisions: 'Revisions',
    delivered: 'Delivered',
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
        <Link href="/dashboard" className="hover:text-stone-600 transition-colors">
          Pipeline
        </Link>
        <span>/</span>
        <span className="text-stone-600">{project.client_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-stone-800">{project.client_name}</h1>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[project.status] ?? 'bg-stone-100 text-stone-600'}`}
            >
              {statusLabels[project.status] ?? project.status}
            </span>
            {project.priority !== 'Normal' && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  project.priority === 'Urgent'
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}
              >
                {project.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-400">
            {project.city} · {project.project_type} · {' '}
            <span title={project.occupant_profile}>
              {OCCUPANT_ICONS[project.occupant_profile] ?? '👤'} {project.occupant_profile}
            </span>
          </p>
        </div>
        <SlaCountdown slaDeadline={project.sla_deadline} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <InfoCard label="Budget" value={{ economy: 'Economy (<₹5L)', standard: 'Standard (₹5–12L)', premium: 'Premium (₹12–25L)', luxury: 'Luxury (₹25L+)' }[project.budget_bracket] ?? project.budget_bracket} />
        <InfoCard
          label="Rooms"
          value={`${rooms.length} room${rooms.length !== 1 ? 's' : ''} · ${deliveredRooms} done`}
        />
        <InfoCard
          label="Assigned To"
          value={
            project.assigned_profile
              ? `${project.assigned_profile.full_name} (${project.assigned_profile.role})`
              : 'Unassigned'
          }
        />
        {project.vastu_required && (
          <InfoCard label="Vastu" value="Required" highlight />
        )}
        {project.client_phone && (
          <InfoCard label="Phone" value={project.client_phone} />
        )}
        {project.client_email && (
          <InfoCard label="Email" value={project.client_email} />
        )}
      </div>

      {/* Rooms list */}
      <div className="bg-white rounded-lg border border-stone-200 mb-6">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700">Rooms</h2>
        </div>
        <div className="divide-y divide-stone-50">
          {rooms.map((room: {
            id: string
            room_type: string
            design_style?: string
            status: string
            notes?: string
            renders?: { id: string; status: string; pass_number: number; created_at: string }[]
          }) => {
            const renderCount = room.renders?.length ?? 0
            const roomStatusColors: Record<string, string> = {
              pending: 'bg-stone-100 text-stone-500',
              in_progress: 'bg-blue-100 text-blue-600',
              delivered: 'bg-green-100 text-green-700',
            }
            return (
              <div key={room.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-700">{room.room_type}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {room.design_style ?? 'Style TBD'}
                    {room.notes && ` · ${room.notes}`}
                    {renderCount > 0 && ` · ${renderCount} render${renderCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${roomStatusColors[room.status] ?? 'bg-stone-100 text-stone-500'}`}
                >
                  {room.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      {(project.project_notes || project.vastu_notes) && (
        <div className="bg-white rounded-lg border border-stone-200 px-5 py-4 space-y-3">
          {project.project_notes && (
            <div>
              <p className="text-xs font-medium text-stone-500 mb-1">Project Notes</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{project.project_notes}</p>
            </div>
          )}
          {project.vastu_notes && (
            <div>
              <p className="text-xs font-medium text-stone-500 mb-1">Vastu Notes</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{project.vastu_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Coming soon banner for staging engine */}
      <div className="mt-8 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center">
        <p className="text-sm font-medium text-stone-500">Staging Engine</p>
        <p className="text-xs text-stone-400 mt-1">
          Shell upload, style configuration, and AI generation coming in Plan 2–3.
        </p>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 px-4 py-3">
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-amber-600' : 'text-stone-700'}`}>
        {value}
      </p>
    </div>
  )
}
