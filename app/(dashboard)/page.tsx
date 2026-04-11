import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/pipeline/PipelineBoard'
import Link from 'next/link'
import type { ProjectWithRoomCount } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  // Fetch all projects with room count, rooms (for delivered count), and assigned profile
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      room_count:rooms(count),
      rooms(id, status),
      assigned_profile:profiles!projects_assigned_to_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Pipeline fetch error:', error)
  }

  // Normalise room_count from Supabase count aggregate shape
  const normalised: ProjectWithRoomCount[] = (projects ?? []).map((p) => ({
    ...p,
    room_count: Array.isArray(p.room_count) ? (p.room_count[0] as { count: number })?.count ?? 0 : 0,
    rooms: p.rooms ?? [],
    assigned_profile: Array.isArray(p.assigned_profile)
      ? p.assigned_profile[0] ?? null
      : p.assigned_profile ?? null,
  }))

  const totalProjects = normalised.length
  const urgentCount = normalised.filter((p) => p.priority === 'Urgent').length
  const activeCount = normalised.filter(
    (p) => p.status !== 'delivered' && p.status !== 'intake'
  ).length

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-800">Project Pipeline</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {totalProjects} project{totalProjects !== 1 ? 's' : ''}
            {urgentCount > 0 && (
              <span className="text-red-500 ml-2">· {urgentCount} urgent</span>
            )}
            {activeCount > 0 && (
              <span className="text-stone-400 ml-2">· {activeCount} active</span>
            )}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-1.5 bg-stone-800 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-stone-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Pipeline board — horizontally scrollable */}
      <div className="flex-1 overflow-auto">
        <PipelineBoard projects={normalised} />
      </div>
    </div>
  )
}
