import { createClient } from '@/lib/supabase/server'
import { isShareLinkValid } from '@/lib/share'
import { NextRequest, NextResponse } from 'next/server'

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

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/share/approve:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
