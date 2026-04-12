import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = [
  'intake',
  'shell_ready',
  'style_set',
  'staging',
  'client_review',
  'revisions',
  'delivered',
] as const

type ProjectStatus = (typeof VALID_STATUSES)[number]

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body as { status: unknown }

    if (!status || !VALID_STATUSES.includes(status as ProjectStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify project exists
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', params.id)
      .single()

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // If moving to delivered, write delivered_at timestamp
    const updatePayload: Record<string, unknown> = { status }
    if (status === 'delivered' && project.status !== 'delivered') {
      updatePayload.delivered_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', params.id)

    if (updateError) {
      console.error('[Project status] update error:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Log to activity_log (fire-and-forget)
    supabase.from('activity_log').insert({
      project_id:         params.id,
      user_id:            user.id,
      action_type:        'status_change',
      action_description: `Status changed to ${status}`,
    }).then(() => {})

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('[Project status] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
