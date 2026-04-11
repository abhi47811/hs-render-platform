import { createClient } from '@/lib/supabase/server'
import { createShareLink } from '@/lib/share'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/share/create
 * Creates a share link for a checkpoint and updates checkpoint status to 'shared'
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, room_id, checkpoint_number, expires_in_days } = body

    // Validate input
    if (!project_id || !room_id || checkpoint_number === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (![1, 2, 3].includes(checkpoint_number)) {
      return NextResponse.json({ error: 'Invalid checkpoint number' }, { status: 400 })
    }

    // Create the share link
    const token = await createShareLink({
      supabase,
      projectId: project_id,
      roomId: room_id,
      checkpointNumber: checkpoint_number,
      expiresInDays: expires_in_days || 7,
    })

    // Get the share link ID to store in checkpoint
    const { data: shareLinkData, error: shareLinkError } = await supabase
      .from('share_links')
      .select('id')
      .eq('url_token', token)
      .single()

    if (shareLinkError || !shareLinkData) {
      throw new Error('Failed to retrieve share link ID')
    }

    // Update checkpoint status to 'shared'
    const { error: checkpointError } = await supabase
      .from('checkpoints')
      .update({
        status: 'shared',
        shared_at: new Date().toISOString(),
        share_link_id: shareLinkData.id,
      })
      .eq('room_id', room_id)
      .eq('checkpoint_number', checkpoint_number)

    if (checkpointError) {
      throw new Error(`Failed to update checkpoint: ${checkpointError.message}`)
    }

    // Update project status to 'client_review' if checkpoint >= 2
    if (checkpoint_number >= 2) {
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'client_review' })
        .eq('id', project_id)

      if (projectError) {
        // Log but don't fail the request
        console.error('Failed to update project status:', projectError)
      }
    }

    // Return the share link token and full URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL
    const shareUrl = `${origin}/share/${token}`

    return NextResponse.json(
      {
        token,
        url: shareUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/share/create:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
