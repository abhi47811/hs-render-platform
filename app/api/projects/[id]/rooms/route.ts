// POST /api/projects/[id]/rooms
// Creates a new room inside an existing project and initialises its 3 checkpoints.
// Requires authentication.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface AddRoomBody {
  room_name: string
  room_type: string
  dimensions_l?: number | null
  dimensions_w?: number | null
  dimensions_h?: number | null
}

interface RouteContext {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 })
    }

    // Verify project exists and belongs to this workspace
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, client_name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse and validate body
    const body = (await request.json()) as AddRoomBody
    const { room_name, room_type, dimensions_l, dimensions_w, dimensions_h } = body

    if (!room_name?.trim()) {
      return NextResponse.json({ error: 'room_name is required' }, { status: 400 })
    }
    if (!room_type?.trim()) {
      return NextResponse.json({ error: 'room_type is required' }, { status: 400 })
    }

    const VALID_ROOM_TYPES = [
      'Living', 'Master Bedroom', 'Bedroom 2', 'Kitchen',
      'Dining', 'Study', 'Office', 'Bathroom', 'Balcony', 'Other',
    ]
    if (!VALID_ROOM_TYPES.includes(room_type)) {
      return NextResponse.json({ error: 'Invalid room_type' }, { status: 400 })
    }

    // ── Insert room ───────────────────────────────────────────────────────────
    const { data: newRoom, error: roomError } = await supabase
      .from('rooms')
      .insert({
        project_id:   projectId,
        room_name:    room_name.trim(),
        room_type,
        dimensions_l: dimensions_l ?? null,
        dimensions_w: dimensions_w ?? null,
        dimensions_h: dimensions_h ?? null,
        status:       'not_started',
        current_pass: 0,
        style_locked: false,
        style_inherited: false,
      })
      .select('id')
      .single()

    if (roomError || !newRoom) {
      console.error('[Add Room] room insert error:', roomError)
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
    }

    const roomId = newRoom.id

    // ── Initialise 3 checkpoints ──────────────────────────────────────────────
    const checkpoints = [1, 2, 3].map((n) => ({
      room_id:           roomId,
      checkpoint_number: n,
      status:            'pending',
    }))

    const { error: cpError } = await supabase
      .from('checkpoints')
      .insert(checkpoints)

    if (cpError) {
      // Room was created — log but don't fail. Checkpoints can be re-created.
      console.error('[Add Room] checkpoint insert error:', cpError)
    }

    // ── Activity log ──────────────────────────────────────────────────────────
    supabase.from('activity_log').insert({
      project_id:         projectId,
      room_id:            roomId,
      user_id:            user.id,
      action_type:        'room_added',
      action_description: `Room added: ${room_name.trim()} (${room_type})`,
    }).then(() => {})

    return NextResponse.json({ room_id: roomId, success: true }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/projects/[id]/rooms] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
