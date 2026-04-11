import { IntakeForm } from '@/components/forms/IntakeForm'
import { createClient } from '@/lib/supabase/server'

export default async function NewProjectPage() {
  const supabase = createClient()

  // Fetch team members for the "assign to" dropdown
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'senior', 'junior'])
    .order('full_name')

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-stone-800">New Project</h1>
        <p className="text-sm text-stone-400 mt-1">
          Fill in the intake details to create a project and start the 72-hour SLA clock.
        </p>
      </div>

      <IntakeForm teamMembers={teamMembers ?? []} />
    </div>
  )
}
