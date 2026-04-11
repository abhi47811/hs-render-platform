import Link from 'next/link'
import { SlaCountdown } from './SlaCountdown'
import { OCCUPANT_ICONS } from '@/lib/utils'
import { getSlaStatus } from '@/lib/sla'
import type { ProjectWithRoomCount } from '@/types/database'

interface ProjectCardProps {
  project: ProjectWithRoomCount
}

const PRIORITY_BADGE: Record<string, string> = {
  Urgent: 'bg-red-100 text-red-700 border border-red-200',
  High: 'bg-amber-100 text-amber-700 border border-amber-200',
  Normal: '',
}

export function ProjectCard({ project }: ProjectCardProps) {
  const slaStatus = getSlaStatus(project.sla_deadline)
  const pendingActionColor =
    slaStatus === 'red' || slaStatus === 'breached'
      ? 'bg-red-500'
      : slaStatus === 'amber'
      ? 'bg-amber-500'
      : 'bg-green-500'

  const deliveredRooms = project.rooms?.filter((r) => r.status === 'delivered').length ?? 0
  const totalRooms = project.room_count

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate group-hover:text-stone-900">
              {project.client_name}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">{project.city}</p>
          </div>
          {/* Action status dot */}
          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${pendingActionColor}`} />
        </div>

        {/* Room count + occupant persona */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-stone-500">
            {totalRooms} room{totalRooms !== 1 ? 's' : ''}
            {deliveredRooms > 0 && (
              <span className="text-green-600 ml-1">· {deliveredRooms} done</span>
            )}
          </span>
          <span className="text-sm" title={project.occupant_profile}>
            {OCCUPANT_ICONS[project.occupant_profile] ?? '👤'}
          </span>
        </div>

        {/* SLA + badges */}
        <div className="flex items-center justify-between gap-2">
          <SlaCountdown slaDeadline={project.sla_deadline} />
          <div className="flex items-center gap-1.5">
            {project.priority !== 'Normal' && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[project.priority]}`}
              >
                {project.priority}
              </span>
            )}
            {project.assigned_profile && (
              <div
                className="w-6 h-6 rounded-full bg-stone-700 text-white text-xs flex items-center justify-center font-medium flex-shrink-0"
                title={project.assigned_profile.full_name}
              >
                {project.assigned_profile.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* API cost badge (only shows if spend > ₹0) */}
        {project.total_api_cost > 0 && (
          <div className="mt-2 pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-400">
              API: ₹{project.total_api_cost.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
