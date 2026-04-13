import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * POST /api/notifications/create
 * Thin server-side proxy to the send-notification edge function.
 * Requires authentication — prevents unauthenticated notification injection.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!SUPABASE_FUNCTIONS_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Notification service not configured' }, { status: 503 })
    }

    const body = await request.json()

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'Notification failed' }, { status: res.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/notifications/create:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
