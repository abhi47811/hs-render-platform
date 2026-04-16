import { IntakeForm } from '@/components/forms/IntakeForm'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function NewProjectPage() {
  const supabase = await createClient()

  // Fetch team members for the "assign to" dropdown
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'senior', 'junior'])
    .order('full_name')

  return (
    <div className="bg-stone-50">
      {/* Sticky breadcrumb bar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-stone-400">
          <Link href="/" className="hover:text-stone-700 transition-colors cursor-pointer">Pipeline</Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-700 font-medium">New Project</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-stone-900">New Project</h1>
          <p className="text-sm text-stone-400 mt-1">
            Fill in the intake details. The 72-hour SLA clock starts on submission.
          </p>
        </div>

        <IntakeForm teamMembers={teamMembers ?? []} />
      </div>
    </div>
  )
}
