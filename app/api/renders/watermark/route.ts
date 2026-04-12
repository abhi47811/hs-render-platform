// app/api/renders/watermark/route.ts
// Section 27 — Watermarking API route
//
// Called by the UI when a render is being prepared for client sharing.
// Proxies to the apply-watermark Edge Function (server-side only —
// the watermark cannot be bypassed from the frontend).

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { render_id, render_url } = body

    if (!render_id || !render_url) {
      return NextResponse.json(
        { error: 'render_id and render_url are required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(`${supabaseUrl}/functions/v1/apply-watermark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ render_id, render_url }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()
    // { watermarked_url: string }
    return NextResponse.json(data)
  } catch (error) {
    console.error('[watermark route]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
