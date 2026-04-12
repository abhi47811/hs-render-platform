import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface EnvironmentConfig {
  style: string
  room_type: string
  palette?: string
  custom_prompt?: string
  resolution_tier?: '1K' | '2K' | '4K'
}

interface EnhanceRequest {
  room_id: string
  project_id: string
  shell_url: string
  // Optional: triggers combined enhancement + staging in one Gemini call
  environment?: EnvironmentConfig
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = (await request.json()) as EnhanceRequest
    const { room_id, project_id, shell_url, environment } = body

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
      `${supabaseUrl}/functions/v1/enhance-shell`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ room_id, project_id, shell_url, environment }),
      }
    )

    // Safely parse — edge function may return HTML on gateway/startup errors
    const rawText = await edgeFnResponse.text()
    let result: {
      success?: boolean
      error?: string
      mode?: string
      photorealistic_url?: string
      staged_url?: string
    }
    try {
      result = JSON.parse(rawText)
    } catch {
      const snippet = rawText.replace(/<[^>]+>/g, '').trim().slice(0, 300)
      throw new Error(`Edge function error (${edgeFnResponse.status}): ${snippet || rawText.slice(0, 300)}`)
    }

    if (!edgeFnResponse.ok || !result.success) {
      throw new Error(result.error || 'Edge function returned an error')
    }

    return NextResponse.json({
      photorealistic_url: result.photorealistic_url,
      staged_url: result.staged_url,
      mode: result.mode,
    })
  } catch (error) {
    console.error('shell/enhance route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Shell enhancement failed' },
      { status: 500 }
    )
  }
}
