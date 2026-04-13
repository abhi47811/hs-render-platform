import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { archived } = body as { archived: boolean }

    if (typeof archived !== 'boolean') {
      return NextResponse.json(
        { error: 'archived must be a boolean' },
        { status: 400 }
      )
    }

    // Verify project exists
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, is_archived')
      .eq('id', params.id)
      .single()

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ is_archived: archived })
      .eq('id', params.id)

    if (updateError) {
      console.error('[Project archive] update error:', updateError)
      return NextResponse.json({ error: 'Failed to update archive status' }, { status: 500 })
    }

    // Log to activity_log (fire-and-forget)
    supabase.from('activity_log').insert({
      project_id: params.id,
      user_id: user.id,
      action_type: archived ? 'project_archived' : 'project_unarchived',
      action_description: archived ? 'Project archived' : 'Project restored from archive',
    }).then(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Project archive] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
