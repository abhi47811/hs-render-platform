import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_EXTENSIONS = [24, 48, 72]

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { extend_hours } = await request.json() as { extend_hours: unknown }
  const hours = Number(extend_hours)

  if (!VALID_EXTENSIONS.includes(hours)) {
    return NextResponse.json({ error: 'extend_hours must be 24, 48, or 72' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('sla_deadline')
    .eq('id', params.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const newDeadline = new Date(new Date(project.sla_deadline).getTime() + hours * 60 * 60 * 1000)

  const { error } = await supabase
    .from('projects')
    .update({ sla_deadline: newDeadline.toISOString() })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  supabase
    .from('activity_log')
    .insert({
      project_id: params.id,
      user_id: user.id,
      action_type: 'sla_extended',
      action_description: `SLA extended by ${hours}h`,
    })
    .then(() => {})

  return NextResponse.json({ success: true, new_deadline: newDeadline.toISOString() })
}
