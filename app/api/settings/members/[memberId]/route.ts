import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = ['admin', 'designer', 'reviewer', 'ops']

interface RouteParams {
  params: { memberId: string }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json() as { role?: string; is_active?: boolean }

  if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.role !== undefined)      update.role = body.role
  if (body.is_active !== undefined) update.is_active = body.is_active

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', params.memberId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
