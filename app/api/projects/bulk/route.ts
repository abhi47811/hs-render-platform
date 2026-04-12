import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES  = ['intake', 'shell_ready', 'style_set', 'staging', 'client_review', 'revisions', 'delivered'] as const
const VALID_PRIORITIES = ['Normal', 'High', 'Urgent'] as const
const VALID_ACTIONS   = ['status', 'priority', 'assign'] as const

type BulkAction = typeof VALID_ACTIONS[number]

// POST /api/projects/bulk
// Body: { projectIds: string[], action: BulkAction, value: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { projectIds: unknown; action: unknown; value: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { projectIds, action, value } = body

  // Validate projectIds
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return NextResponse.json({ error: 'projectIds must be a non-empty array' }, { status: 400 })
  }
  if (projectIds.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 projects per bulk action' }, { status: 400 })
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!projectIds.every((id) => typeof id === 'string' && uuidRegex.test(id))) {
    return NextResponse.json({ error: 'All projectIds must be valid UUIDs' }, { status: 400 })
  }

  // Validate action
  if (!VALID_ACTIONS.includes(action as BulkAction)) {
    return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 })
  }

  // Validate value per action
  let updatePayload: Record<string, string | null>
  if (action === 'status') {
    if (!VALID_STATUSES.includes(value as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }
    updatePayload = { status: value as string }
  } else if (action === 'priority') {
    if (!VALID_PRIORITIES.includes(value as typeof VALID_PRIORITIES[number])) {
      return NextResponse.json({ error: `Invalid priority. Valid: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
    }
    updatePayload = { priority: value as string }
  } else {
    // assign — value is UUID or 'unassigned'
    if (value === 'unassigned') {
      updatePayload = { assigned_to: null }
    } else if (typeof value === 'string' && uuidRegex.test(value)) {
      updatePayload = { assigned_to: value }
    } else {
      return NextResponse.json({ error: 'assign value must be a UUID or "unassigned"' }, { status: 400 })
    }
  }

  // Execute update
  const { data, error } = await supabase
    .from('projects')
    .update(updatePayload)
    .in('id', projectIds as string[])
    .select('id')

  if (error) {
    console.error('[bulk] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0

  // Log bulk action (fire-and-forget, once per batch)
  supabase.from('activity_log').insert({
    project_id:          projectIds[0] as string,
    user_id:             user.id,
    action_type:         `bulk_${action}`,
    action_description:  `Bulk ${action} → "${value}" applied to ${count} project${count !== 1 ? 's' : ''}`,
    metadata:            { projectIds, action, value, count },
  }).then(() => {})

  return NextResponse.json({ count })
}
