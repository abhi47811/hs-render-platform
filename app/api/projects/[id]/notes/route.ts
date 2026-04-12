import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('project_notes')
    .select('id, note_text, created_at, user_id, profiles(full_name, role)')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { note_text } = await request.json() as { note_text: unknown }

  if (typeof note_text !== 'string' || note_text.trim().length === 0) {
    return NextResponse.json({ error: 'note_text is required' }, { status: 400 })
  }

  if (note_text.trim().length > 2000) {
    return NextResponse.json({ error: 'Note max 2000 characters' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('project_notes')
    .insert({ project_id: params.id, user_id: user.id, note_text: note_text.trim() })
    .select('id, note_text, created_at, user_id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
