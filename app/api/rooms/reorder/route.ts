import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { room_ids } = body as { room_ids: string[] }

    if (!Array.isArray(room_ids) || room_ids.length === 0) {
      return NextResponse.json(
        { error: 'room_ids array required and must not be empty' },
        { status: 400 }
      )
    }

    // Update display_order for each room
    const updates = room_ids.map((id, index) =>
      supabase.from('rooms').update({ display_order: index }).eq('id', id)
    )

    const results = await Promise.all(updates)

    // Check for errors
    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      console.error('[Room reorder] update errors:', errors)
      return NextResponse.json(
        { error: 'Failed to update room order' },
        { status: 500 }
      )
    }

    // Log to activity_log (fire-and-forget)
    const projectId = room_ids[0] ?
      (await supabase.from('rooms').select('project_id').eq('id', room_ids[0]).single()).data?.project_id
      : null

    if (projectId) {
      supabase.from('activity_log').insert({
        project_id: projectId,
        user_id: user.id,
        action_type: 'rooms_reordered',
        action_description: 'Room sequence updated',
      }).then(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Room reorder] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
