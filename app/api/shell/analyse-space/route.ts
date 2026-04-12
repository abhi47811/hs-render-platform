import { NextRequest, NextResponse } from 'next/server'

interface AnalyseSpaceRequest {
  room_id: string
  project_id: string
  shell_url: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyseSpaceRequest
    const { room_id, project_id, shell_url } = body

    if (!room_id || !project_id || !shell_url) {
      return NextResponse.json(
        { error: 'Missing required fields: room_id, project_id, shell_url' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const edgeFnResponse = await fetch(
      `${supabaseUrl}/functions/v1/analyse-space`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ room_id, project_id, shell_url }),
      }
    )

    const result = await edgeFnResponse.json()

    if (!edgeFnResponse.ok || !result.success) {
      throw new Error(result.error || 'Spatial analysis failed')
    }

    return NextResponse.json({
      spatial_analysis: result.spatial_analysis,
    })
  } catch (error) {
    console.error('shell/analyse-space route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Spatial analysis failed' },
      { status: 500 }
    )
  }
}
