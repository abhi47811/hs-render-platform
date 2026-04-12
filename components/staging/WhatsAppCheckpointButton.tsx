'use client'

// ─── A3: WhatsApp One-Click Message Button ────────────────────────────────
// One-click button shown next to each checkpoint status indicator.
// Opens WhatsApp web with a pre-filled message template including:
//   • Client name
//   • Room name + checkpoint number
//   • Share link (if one exists)
//   • Customisable message template per checkpoint stage
//
// Uses the wa.me deep-link API (no WhatsApp Business API key needed).

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WhatsAppCheckpointButtonProps {
  checkpointNumber: 1 | 2 | 3
  clientName: string
  roomName: string
  projectId: string
  roomId: string
  /** Pass in if share link already loaded — skips DB fetch */
  existingShareUrl?: string | null
}

const CP_TEMPLATES: Record<1 | 2 | 3, (clientName: string, roomName: string, shareUrl?: string | null) => string> = {
  1: (c, r, u) => [
    `Hi ${c}! 👋`,
    `Your Houspire design for *${r}* is ready for review.`,
    `We've prepared the initial style direction for your space. Please take a look and let us know your feedback!`,
    u ? `🔗 View designs: ${u}` : '',
    `Feel free to call or message us with any questions. 😊`,
    `— Team Houspire`,
  ].filter(Boolean).join('\n\n'),

  2: (c, r, u) => [
    `Hi ${c}! 🎨`,
    `Great news — your *${r}* is ready for the second design checkpoint.`,
    `The furniture selection and material palette are locked in. Please review and approve to move to the final stage!`,
    u ? `🔗 View designs: ${u}` : '',
    `Your feedback helps us deliver exactly what you envision. 🏠`,
    `— Team Houspire`,
  ].filter(Boolean).join('\n\n'),

  3: (c, r, u) => [
    `Hi ${c}! 🎉`,
    `Your *${r}* final design is complete!`,
    `This is the photorealistic render of your completed space — every detail as we discussed. Please review and share your approval!`,
    u ? `🔗 View final designs: ${u}` : '',
    `Once approved, we'll proceed with the detailed BOQ and vendor list. 📋`,
    `— Team Houspire | houspire.ai`,
  ].filter(Boolean).join('\n\n'),
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export function WhatsAppCheckpointButton({
  checkpointNumber,
  clientName,
  roomName,
  projectId,
  roomId,
  existingShareUrl,
}: WhatsAppCheckpointButtonProps) {
  const supabase = createClient()
  const [isFetching, setIsFetching] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const handleClick = useCallback(async () => {
    setIsFetching(true)
    let shareUrl = existingShareUrl ?? null

    // If no share URL passed, try to fetch the latest active one
    if (!shareUrl) {
      try {
        const { data } = await supabase
          .from('share_links')
          .select('url_token, expires_at, is_revoked')
          .eq('room_id', roomId)
          .eq('checkpoint_number', checkpointNumber)
          .eq('is_revoked', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        if (data?.[0]?.url_token) {
          const origin = window.location.origin
          shareUrl = `${origin}/share/${data[0].url_token}`
        }
      } catch {
        // If we can't fetch, send without link
      }
    }

    const messageTemplate = CP_TEMPLATES[checkpointNumber]
    const message = messageTemplate(clientName, roomName, shareUrl)
    const encoded = encodeURIComponent(message)
    const waUrl = `https://wa.me/?text=${encoded}`

    window.open(waUrl, '_blank', 'noopener,noreferrer')
    setIsFetching(false)
  }, [checkpointNumber, clientName, roomName, roomId, existingShareUrl, supabase])

  return (
    <div className="relative inline-flex">
      <button
        onClick={handleClick}
        disabled={isFetching}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1DAA52] text-white text-[10px] font-semibold transition-colors min-h-[28px]"
        title={`Send CP${checkpointNumber} via WhatsApp`}
      >
        {isFetching ? (
          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <WhatsAppIcon />
        )}
        Send CP{checkpointNumber}
      </button>

      {/* Tooltip */}
      {tooltipVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-stone-900 text-white text-[10px] rounded-lg whitespace-nowrap shadow-lg z-10 pointer-events-none">
          Open WhatsApp with pre-filled message
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-stone-900" />
        </div>
      )}
    </div>
  )
}
