import { createClient } from '@/lib/supabase/server'
import { isShareLinkValid } from '@/lib/share'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function notifyClientApproval(
  projectId: string,
  roomId: string,
  checkpointNumber: number,
) {
  if (!SUPABASE_FUNCTIONS_URL || !SUPABASE_SERVICE_KEY) return
  const cpLabel = checkpointNumber === 3 ? 'Final sign-off' : `CP${checkpointNumber}`
  fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/send-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      room_id: roomId,
      notification_type: 'cp_approved',
      title: `Client approved ${cpLabel}`,
      message: checkpointNumber === 3
        ? 'Client has signed off on the final design. Project is now delivered.'
        : `Client approved checkpoint ${checkpointNumber} — staging can proceed to the next phase.`,
    }),
  }).catch(err => console.warn('[share/approve] notification failed:', err))
}

/**
 * POST /api/share/approve
 * Public endpoint (no auth required, validated by token)
 * Client approves designs from share link
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { token, checkpoint_number } = body

    if (!token || checkpoint_number === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Look up share link by token
    const { data: shareLink, error: shareLinkError } = await supabase
      .from('share_links')
      .select('*')
      .eq('url_token', token)
      .single()

    if (shareLinkError || !shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // Validate share link
    if (!isShareLinkValid(shareLink)) {
      return NextResponse.json(
        { error: 'Share link has expired or been revoked' },
        { status: 403 }
      )
    }

    const { room_id, project_id, checkpoint_number: linkCheckpointNumber } = shareLink

    // Verify checkpoint number matches
    if (linkCheckpointNumber !== checkpoint_number) {
      return NextResponse.json(
        { error: 'Checkpoint number mismatch' },
        { status: 400 }
      )
    }

    // Update checkpoint: status='approved', approved_at=now()
    const { error: checkpointError } = await supabase
      .from('checkpoints')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('room_id', room_id)
      .eq('checkpoint_number', checkpoint_number)

    if (checkpointError) {
      throw new Error(`Failed to approve checkpoint: ${checkpointError.message}`)
    }

    // Update all renders with status='team_approved' to 'client_approved'
    const { error: renderError } = await supabase
      .from('renders')
      .update({ status: 'client_approved', approved_at: new Date().toISOString() })
      .eq('room_id', room_id)
      .eq('status', 'team_approved')

    if (renderError) {
      throw new Error(`Failed to update renders: ${renderError.message}`)
    }

    // Update project status
    if (checkpoint_number === 3) {
      // Final checkpoint — mark as delivered
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', project_id)

      if (projectError) {
        throw new Error(`Failed to update project status: ${projectError.message}`)
      }
    } else {
      // Earlier checkpoint — keep in client_review
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'client_review' })
        .eq('id', project_id)

      if (projectError) {
        throw new Error(`Failed to update project status: ${projectError.message}`)
      }
    }

    // Sec 39: Notify team that client approved (fire-and-forget)
    notifyClientApproval(project_id, room_id, checkpoint_number)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/share/approve:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
