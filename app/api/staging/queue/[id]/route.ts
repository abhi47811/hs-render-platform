// PATCH /api/staging/queue/[id]
// Cancels (or dismisses) a queue item owned by the authenticated user.
// Only items in status 'pending' or 'processing' can be cancelled.
// Failed items can be dismissed (status → 'cancelled') to remove them from the panel.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const queueId = params.id
    if (!queueId) {
      return NextResponse.json({ error: 'Missing queue item ID' }, { status: 400 })
    }

    // Fetch the item to verify ownership and current status
    const { data: item, error: fetchError } = await supabase
      .from('generation_queue')
      .select('id, status, requested_by')
      .eq('id', queueId)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
    }

    // Ownership check
    if (item.requested_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow cancel/dismiss for non-terminal statuses
    if (item.status === 'complete') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed generation' },
        { status: 400 }
      )
    }

    if (item.status === 'cancelled') {
      return NextResponse.json({ success: true, already_cancelled: true })
    }

    // Update to cancelled
    const { error: updateError } = await supabase
      .from('generation_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueId)

    if (updateError) {
      console.error('[Queue PATCH] update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/staging/queue/[id]] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
