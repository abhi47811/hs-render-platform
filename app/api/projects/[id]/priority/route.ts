import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_PRIORITIES = ['Normal', 'High', 'Urgent'] as const
type Priority = (typeof VALID_PRIORITIES)[number]

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { priority } = await request.json() as { priority: unknown }

  if (!VALID_PRIORITIES.includes(priority as Priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  }

  const { error } = await supabase
    .from('projects')
    .update({ priority })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  supabase
    .from('activity_log')
    .insert({
      project_id: params.id,
      user_id: user.id,
      action_type: 'priority_change',
      action_description: `Priority set to ${priority}`,
    })
    .then(() => {})

  return NextResponse.json({ success: true, priority })
}
