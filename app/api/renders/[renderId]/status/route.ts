import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['generated', 'team_approved', 'client_approved', 'rejected'] as const
type RenderStatus = (typeof VALID_STATUSES)[number]

interface RouteParams {
  params: { renderId: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await request.json() as { status: unknown }

  if (!VALID_STATUSES.includes(status as RenderStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const { data: render } = await supabase
    .from('renders')
    .select('id, room_id')
    .eq('id', params.renderId)
    .single()

  if (!render) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('renders')
    .update({ status })
    .eq('id', params.renderId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, status })
}
