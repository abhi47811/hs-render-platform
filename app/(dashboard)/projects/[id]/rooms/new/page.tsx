import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AddRoomForm } from '@/components/forms/AddRoomForm'

interface AddRoomPageProps {
  params: { id: string }
}

export default async function AddRoomPage({ params }: AddRoomPageProps) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, client_name, city, project_type')
    .eq('id', params.id)
    .single()

  if (error || !project) notFound()

  return (
    <div className="bg-stone-50 min-h-full">
      {/* Sticky breadcrumb bar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-stone-400">
          <Link href="/" className="hover:text-stone-700 transition-colors cursor-pointer">
            Pipeline
          </Link>
          <span className="text-stone-300">/</span>
          <Link
            href={`/projects/${project.id}`}
            className="hover:text-stone-700 transition-colors font-medium text-stone-600 cursor-pointer"
          >
            {project.client_name}
          </Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-700 font-medium">Add Room</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-stone-900">Add Room</h1>
          <p className="text-sm text-stone-400 mt-1">
            {project.client_name} · {project.city} · {project.project_type}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <AddRoomForm projectId={project.id} projectName={project.client_name} />
        </div>
      </div>
    </div>
  )
}
