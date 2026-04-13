import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ProjectArchiveButton } from '@/components/project/ProjectArchiveButton'

export const dynamic = 'force-dynamic'

interface ArchivedProject {
  id: string
  client_name: string
  city: string
  status: string
  delivered_at: string | null
  budget_bracket: string
  assigned_to: string | null
  assigned_profile?: { id: string; full_name: string; role: string } | null
}

export default async function ArchivePage() {
  const supabase = await createClient()

  // Fetch archived projects
  const { data: archivedProjects } = await supabase
    .from('projects')
    .select('id, client_name, city, status, delivered_at, budget_bracket, assigned_to')
    .eq('is_archived', true)
    .order('delivered_at', { ascending: false })

  const projectsList = archivedProjects ?? []

  // Fetch assigned profiles
  const assignedIds = Array.from(
    new Set(projectsList.map((p) => p.assigned_to).filter(Boolean))
  ) as string[]

  const profileMap: Record<string, { id: string; full_name: string; role: string } | null> = {}
  if (assignedIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', assignedIds)

    ;(profiles ?? []).forEach((p) => {
      profileMap[p.id] = p
    })
  }

  // Add profile data to projects
  const projects: ArchivedProject[] = projectsList.map((p) => ({
    ...p,
    assigned_profile: p.assigned_to ? profileMap[p.assigned_to] ?? null : null,
  }))

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Sticky header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Archive</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {projects.length} archived project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to Pipeline
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">No Archived Projects</p>
            <p className="text-xs text-stone-400 mb-4">Archive delivered projects to keep your pipeline clean.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 bg-stone-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              View Pipeline
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group bg-white rounded-lg border border-stone-200 hover:border-stone-400 hover:shadow-sm transition-all p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-stone-900 mb-2">{project.client_name}</h3>
                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      <span>{project.city}</span>
                      <span>·</span>
                      <span>
                        {({ economy: 'Economy <₹5L', standard: 'Std ₹5–12L', premium: 'Premium ₹12–25L', luxury: 'Luxury ₹25L+' } as Record<string, string>)[project.budget_bracket] ?? project.budget_bracket}
                      </span>
                      {project.status && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{project.status.replace('_', ' ')}</span>
                        </>
                      )}
                      {project.assigned_profile && (
                        <>
                          <span>·</span>
                          <span>{project.assigned_profile.full_name}</span>
                        </>
                      )}
                      {project.delivered_at && (
                        <>
                          <span>·</span>
                          <span>
                            Delivered{' '}
                            {new Date(project.delivered_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4" onClick={(e) => e.preventDefault()}>
                    <ProjectArchiveButton projectId={project.id} isArchived={true} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
