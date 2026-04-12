import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['not_started', 'shell_uploaded', 'in_progress', 'client_review', 'delivered'] as const
type RoomStatus = (typeof VALID_STATUSES)[number]

interface RouteParams {
  params: { roomId: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await request.json() as { status: unknown }

  if (!VALID_STATUSES.includes(status as RoomStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('id, project_id')
    .eq('id', params.roomId)
    .single()

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('rooms')
    .update({ status })
    .eq('id', params.roomId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity asynchronously (fire and forget)
  void supabase
    .from('activity_log')
    .insert({
      project_id: room.project_id,
      user_id: user.id,
      action_type: 'room_status_change',
      action_description: `Room status changed to ${status}`,
    })

  return NextResponse.json({ success: true, status })
}
