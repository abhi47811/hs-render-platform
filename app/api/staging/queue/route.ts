// ─── Sec 32: Generation Queue API ────────────────────────────────────────────
// POST /api/staging/queue — insert a new job into generation_queue
// GET  /api/staging/queue — return pending/processing jobs for current user

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { projectPriorityToQueue } from '@/lib/queue'

// ── POST: enqueue a generation job ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      room_id, project_id, pass_number, pass_type,
      prompt, reference_urls, resolution_tier, variation_count,
    } = body

    if (!room_id || !project_id || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine priority from project
    const { data: project } = await supabase
      .from('projects')
      .select('priority')
      .eq('id', project_id)
      .single()

    const priority = projectPriorityToQueue(project?.priority ?? 'Normal')

    const { data: queueItem, error } = await supabase
      .from('generation_queue')
      .insert({
        room_id,
        project_id,
        requested_by: user.id,
        pass_number,
        pass_type,
        prompt,
        reference_urls: reference_urls ?? [],
        resolution_tier: resolution_tier ?? '2K',
        variation_count: variation_count ?? 1,
        priority,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Queue] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, queue_id: queueItem.id }, { status: 201 })
  } catch (err) {
    console.error('[Queue POST] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── GET: fetch current user's active queue items ──────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('generation_queue')
      .select('id, pass_number, pass_type, status, priority, variation_count, resolution_tier, queued_at, error_message')
      .eq('requested_by', user.id)
      .in('status', ['pending', 'processing', 'failed'])
      .order('queued_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
