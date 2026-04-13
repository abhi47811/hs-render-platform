import { createClient } from '@/lib/supabase/server'
import { createShareLink } from '@/lib/share'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Fire-and-forget: watermark all renders for a room that don't yet have a watermarked_url.
 * Called just before issuing a share link so clients always see watermarked images.
 */
async function watermarkRendersForRoom(roomId: string) {
  if (!SUPABASE_FUNCTIONS_URL || !SUPABASE_SERVICE_KEY) return

  try {
    // Import the service-role client to query renders
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(SUPABASE_FUNCTIONS_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    // Find renders that have a storage_url but no watermarked_url yet
    const { data: renders } = await serviceSupabase
      .from('renders')
      .select('id, storage_url')
      .eq('room_id', roomId)
      .not('storage_url', 'is', null)
      .is('watermarked_url', null)

    if (!renders?.length) return

    // Fire apply-watermark for each render (non-blocking)
    for (const render of renders) {
      fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/apply-watermark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ render_id: render.id, render_url: render.storage_url }),
      }).catch((err) =>
        console.warn(`[share/create] watermark failed for render ${render.id}:`, err)
      )
    }
  } catch (err) {
    console.warn('[share/create] watermarkRendersForRoom error:', err)
  }
}

/**
 * POST /api/share/create
 * Creates a share link for a checkpoint and updates checkpoint status to 'shared'.
 * Auto-triggers watermarking of all unwatermarked renders before the link is issued.
 * Requires authentication.
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

    // Kick off watermarking for all un-watermarked renders (fire-and-forget)
    watermarkRendersForRoom(room_id)

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
