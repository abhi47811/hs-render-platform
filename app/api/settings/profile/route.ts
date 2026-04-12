import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = ['admin', 'designer', 'reviewer', 'ops']

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, role } = body

    if (typeof full_name !== 'string' || full_name.trim().length === 0) {
      return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
    }

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: full_name.trim(),
        ...(role ? { role } : {}),
        updated_at: new Date().toISOString(),
      })

    if (updateError) {
      console.error('[Settings] profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Settings] PATCH /api/settings/profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
