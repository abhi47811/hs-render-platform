import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient()
    const { resetTo } = await req.json() as { resetTo: 'environment' | 'enhancement' }

    if (!resetTo || !['environment', 'enhancement'].includes(resetTo)) {
      return NextResponse.json({ error: 'Invalid resetTo value' }, { status: 400 })
    }

    // Build the fields to clear based on which step we're resetting to
    // 'environment' → clear only enhanced_shell_url (re-do the environment replacement)
    // 'enhancement' → clear photorealistic_shell_url + enhanced_shell_url (re-do full enhancement)
    const clearFields =
      resetTo === 'environment'
        ? { enhanced_shell_url: null }
        : { photorealistic_shell_url: null, enhanced_shell_url: null }

    const { error } = await supabase
      .from('rooms')
      .update(clearFields)
      .eq('id', params.roomId)

    if (error) {
      console.error('reset-shell error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, resetTo })
  } catch (err: any) {
    console.error('reset-shell exception:', err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}
