import { createClient } from '@/lib/supabase/server'
import { isShareLinkValid } from '@/lib/share'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function notifyClientRevision(
  projectId: string,
  roomId: string,
  revisionNumber: number,
  brief: string,
) {
  if (!SUPABASE_FUNCTIONS_URL || !SUPABASE_SERVICE_KEY) return
  fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/send-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      room_id: roomId,
      notification_type: 'client_revision',
      title: `Client requested changes (Revision ${revisionNumber})`,
      message: brief.length > 120 ? brief.slice(0, 117) + '…' : brief,
    }),
  }).catch(err => console.warn('[share/revision] notification failed:', err))
}

/**
 * POST /api/share/revision
 * Public endpoint (no auth required, validated by token)
 * Client requests revisions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { token, brief, element_tags } = body

    if (!token || !brief || !Array.isArray(element_tags)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Brief must be at least 20 characters
    if (brief.trim().length < 20) {
      return NextResponse.json(
        { error: 'Brief must be at least 20 characters' },
        { status: 400 }
      )
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

    const { room_id, project_id } = shareLink

    // Get current revision count for this room
    const { data: revisions, error: revisionCountError } = await supabase
      .from('revisions')
      .select('revision_number', { count: 'exact' })
      .eq('room_id', room_id)
      .order('revision_number', { ascending: false })
      .limit(1)

    if (revisionCountError) {
      throw new Error(`Failed to fetch revision count: ${revisionCountError.message}`)
    }

    const nextRevisionNumber = (revisions?.[0]?.revision_number || 0) + 1

    // Insert revision record
    const { error: insertError } = await supabase
      .from('revisions')
      .insert({
        room_id,
        revision_number: nextRevisionNumber,
        brief,
        element_tags,
        status: 'in_progress',
        created_by: null, // Client submitted
      })

    if (insertError) {
      throw new Error(`Failed to create revision: ${insertError.message}`)
    }

    // Update project status to 'revisions'
    const { error: projectError } = await supabase
      .from('projects')
      .update({ status: 'revisions' })
      .eq('id', project_id)

    if (projectError) {
      throw new Error(`Failed to update project status: ${projectError.message}`)
    }

    // Notify team that client requested revisions (fire-and-forget)
    notifyClientRevision(project_id, room_id, nextRevisionNumber, brief)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/share/revision:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
