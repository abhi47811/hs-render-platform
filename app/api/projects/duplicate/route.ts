// ─── Sec 37: Project Duplication API ─────────────────────────────────────────
// POST /api/projects/duplicate
//
// duplication_mode: 'shell_only' | 'shell_style' | 'full_copy'
//
// Shell only:  new project + rooms with shell URLs, all renders/style cleared
// Shell+style: shell + style_seed_url per room, start from pass 2
// Full copy:   shallow clone of all project + room data; renders linked by URL

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type DuplicationMode = 'shell_only' | 'shell_style' | 'full_copy'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { source_project_id, duplication_mode, new_client_name } = body as {
      source_project_id: string
      duplication_mode: DuplicationMode
      new_client_name: string
    }

    if (!source_project_id || !duplication_mode || !new_client_name?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Fetch source project ──────────────────────────────────────────────────
    const { data: sourceProject, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', source_project_id)
      .single()
    if (projError || !sourceProject) {
      return NextResponse.json({ error: 'Source project not found' }, { status: 404 })
    }

    // ── Fetch source rooms ────────────────────────────────────────────────────
    const { data: sourceRooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('project_id', source_project_id)
      .order('created_at', { ascending: true })

    const rooms = sourceRooms ?? []

    // ── Compute new SLA deadline (same turnaround from today) ─────────────────
    const originalCreated = new Date(sourceProject.created_at)
    const originalSla     = new Date(sourceProject.sla_deadline)
    const turnaroundMs    = originalSla.getTime() - originalCreated.getTime()
    const newSlaDeadline  = new Date(Date.now() + turnaroundMs).toISOString()

    // ── Create new project (client details reset) ─────────────────────────────
    const { data: newProject, error: newProjError } = await supabase
      .from('projects')
      .insert({
        // Copy project settings
        project_type:       sourceProject.project_type,
        primary_style:      sourceProject.primary_style,
        budget_bracket:     sourceProject.budget_bracket,
        city:               sourceProject.city,
        occupant_profile:   sourceProject.occupant_profile,
        vastu_required:     sourceProject.vastu_required,
        vastu_notes:        sourceProject.vastu_notes,
        style_preferences:  sourceProject.style_preferences,
        material_preferences: sourceProject.material_preferences,
        exclusions:         sourceProject.exclusions,
        revision_limit:     sourceProject.revision_limit,
        priority:           sourceProject.priority,
        assigned_to:        sourceProject.assigned_to,
        // Reset: client info, SLA, status, costs
        client_name:        new_client_name,
        client_email:       null,
        client_phone:       null,
        sla_deadline:       newSlaDeadline,
        status:             'intake',
        total_api_cost:     0,
        // Mark source
        duplicated_from:    source_project_id,
      })
      .select('id')
      .single()

    if (newProjError || !newProject) {
      console.error('[Duplicate] project insert error:', newProjError)
      return NextResponse.json({ error: 'Failed to create new project' }, { status: 500 })
    }

    const newProjectId = newProject.id

    // ── Duplicate rooms ───────────────────────────────────────────────────────
    for (const sourceRoom of rooms) {
      // Determine what to carry over per mode
      const includeStyle = duplication_mode === 'shell_style' || duplication_mode === 'full_copy'
      const includeSpatial = duplication_mode === 'full_copy'

      const { error: roomError } = await supabase
        .from('rooms')
        .insert({
          project_id:              newProjectId,
          room_name:               sourceRoom.room_name,
          room_type:               sourceRoom.room_type,
          // Shell images always copied
          original_shell_url:      sourceRoom.original_shell_url,
          enhanced_shell_url:      sourceRoom.enhanced_shell_url,
          photorealistic_shell_url: sourceRoom.photorealistic_shell_url,
          // Style: only if shell_style or full_copy
          style_seed_url:          includeStyle ? sourceRoom.style_seed_url : null,
          style_locked:            includeStyle ? sourceRoom.style_locked : false,
          colour_palette:          includeStyle ? sourceRoom.colour_palette : null,
          // Spatial: only if full_copy
          spatial_analysis:        includeSpatial ? sourceRoom.spatial_analysis : null,
          // Always reset pass and status
          current_pass:            includeStyle ? 2 : 1,
          status:                  'not_started',
        })

      if (roomError) {
        console.error(`[Duplicate] room insert error for room ${sourceRoom.id}:`, roomError)
        // Non-fatal — continue with other rooms
      }
    }

    // ── Create initial activity log entry ─────────────────────────────────────
    supabase.from('activity_log').insert({
      project_id: newProjectId,
      user_id:    user.id,
      action:     'project_duplicated',
      metadata:   {
        source_project_id,
        duplication_mode,
        source_client_name: sourceProject.client_name,
      },
    }).then(() => {})

    return NextResponse.json({
      success:        true,
      new_project_id: newProjectId,
      rooms_copied:   rooms.length,
    })
  } catch (err) {
    console.error('[Duplicate POST] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
