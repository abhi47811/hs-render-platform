import { createClient } from '@/lib/supabase/server'
import { isShareLinkValid } from '@/lib/share'
import { NextRequest, NextResponse } from 'next/server'

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

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/share/revision:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
