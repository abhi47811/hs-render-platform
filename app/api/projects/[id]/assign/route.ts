import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assigned_to } = await request.json()

  if (assigned_to !== null && typeof assigned_to !== 'string') {
    return NextResponse.json({ error: 'assigned_to must be a UUID or null' }, { status: 400 })
  }

  const { error } = await supabase
    .from('projects')
    .update({ assigned_to: assigned_to ?? null })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  supabase
    .from('activity_log')
    .insert({
      project_id: params.id,
      user_id: user.id,
      action_type: 'assign_project',
      action_description: assigned_to ? `Assigned to ${assigned_to}` : 'Unassigned',
    })
    .then(() => {})

  return NextResponse.json({ success: true })
}
