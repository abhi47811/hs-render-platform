import { NextRequest, NextResponse } from 'next/server'

interface ExtractPaletteRequest {
  room_id: string
  project_id: string
  style_seed_url: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExtractPaletteRequest
    const { room_id, project_id, style_seed_url } = body

    if (!room_id || !project_id || !style_seed_url) {
      return NextResponse.json(
        { error: 'Missing required fields: room_id, project_id, style_seed_url' },
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
      `${supabaseUrl}/functions/v1/extract-palette`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ room_id, project_id, style_seed_url }),
      }
    )

    const result = await edgeFnResponse.json()

    if (!edgeFnResponse.ok || !result.success) {
      throw new Error(result.error || 'Palette extraction failed')
    }

    return NextResponse.json({
      colour_palette: result.colour_palette,
    })
  } catch (error) {
    console.error('style/extract-palette route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Palette extraction failed' },
      { status: 500 }
    )
  }
}
