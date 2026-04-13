import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Maps project priority label to queue numeric priority (higher = more urgent)
function priorityToNumber(priority: string): number {
  switch (priority?.toLowerCase()) {
    case 'high':   return 3
    case 'normal': return 2
    case 'low':    return 1
    default:       return 2
  }
}

interface GenerateRequest {
  room_id: string
  project_id: string
  pass_number: number
  pass_type: string
  prompt: string
  reference_urls: string[]
  reference_slots?: Array<{ slot: number; label: string; url: string }>
  resolution_tier: '1K' | '2K' | '4K'
  variation_count: 1 | 2 | 3
  // Sec 28/29: metadata for day_to_dusk and material_swap variants
  metadata?: Record<string, unknown>
}

/**
 * POST /api/staging/generate
 * Authenticated proxy to the generate-staging edge function.
 * Sec 32: Queues requests if another generation is already processing.
 * Sec 28/29: Passes metadata through for day_to_dusk and material_swap renders.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!SUPABASE_FUNCTIONS_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as GenerateRequest

    const {
      room_id, project_id, pass_number, pass_type,
      prompt, reference_urls, reference_slots,
      resolution_tier, variation_count, metadata,
    } = body

    if (!room_id || !project_id || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Sec 32: If another generation is already processing for this project,
    // queue this request rather than firing immediately.
    const { data: activeJobs } = await supabase
      .from('generation_queue')
      .select('id')
      .eq('project_id', project_id)
      .eq('status', 'processing')
      .limit(1)

    if (activeJobs && activeJobs.length > 0) {
      const { data: project } = await supabase
        .from('projects').select('priority').eq('id', project_id).single()
      const priority = priorityToNumber(project?.priority ?? 'Normal')

      const { data: queueItem, error: queueError } = await supabase
        .from('generation_queue')
        .insert({
          room_id, project_id, requested_by: user.id,
          pass_number, pass_type, prompt,
          reference_urls: reference_urls ?? [],
          resolution_tier: resolution_tier ?? '2K',
          variation_count: variation_count ?? 1,
          priority, status: 'pending',
        })
        .select('id')
        .single()

      if (queueError) {
        console.error('[/api/staging/generate] queue insert error:', queueError)
      } else {
        return NextResponse.json({ success: true, queued: true, queue_id: queueItem.id })
      }
    }

    // Call the generate-staging edge function with service role key
    const res = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/functions/v1/generate-staging`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          room_id, project_id, pass_number, pass_type,
          prompt, reference_urls, reference_slots,
          resolution_tier: resolution_tier ?? '2K',
          variation_count: variation_count ?? 1,
          requested_by: user.id,
          metadata,
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('[/api/staging/generate] edge function error:', data)
      return NextResponse.json(
        { error: data.error ?? 'Generation failed' },
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/staging/generate:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
