// apply-watermark/index.ts
// Section 27 — Server-Side Watermarking System
//
// Adds a "HOUSPIRE · houspire.ai · STAGING PREVIEW" watermark to any render
// before it is shared with a client. Uses imagescript (pure Deno/WASM — no
// native bindings, works in Supabase Edge Functions).
//
// Watermark design:
//   - Semi-transparent dark bar across the full bottom of the image (48px)
//   - Text: "HOUSPIRE  ·  houspire.ai  ·  STAGING PREVIEW"
//   - White text at 30% opacity
//   - Cannot be bypassed from frontend (always server-applied)
//
// Font:
//   Set WATERMARK_FONT_URL to a publicly accessible .ttf URL.
//   Recommended: host Inter-Regular.ttf in Supabase Storage and set:
//     WATERMARK_FONT_URL = https://<project>.supabase.co/storage/v1/object/public/assets/Inter-Regular.ttf
//   Default fallback uses Noto Sans from jsDelivr CDN.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image, Font } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WATERMARK_TEXT = 'HOUSPIRE  ·  houspire.ai  ·  STAGING PREVIEW'
const FONT_SIZE = 13
const BAR_HEIGHT = 48
const OPACITY_FACTOR = 0.30  // 30% opacity for watermark text

interface ApplyWatermarkBody {
  render_id: string
  render_url: string  // public URL of the original render
}

/** Load a remote resource as Uint8Array */
async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`)
  return new Uint8Array(await res.arrayBuffer())
}

/**
 * Create an RGBA color int from components.
 * imagescript uses 32-bit RGBA where R is high bits.
 */
function rgba(r: number, g: number, b: number, a: number): number {
  return ((r & 0xFF) << 24) | ((g & 0xFF) << 16) | ((b & 0xFF) << 8) | (a & 0xFF)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as ApplyWatermarkBody
    const { render_id, render_url } = body

    if (!render_id || !render_url) {
      return new Response(JSON.stringify({ error: 'render_id and render_url required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const fontUrl = Deno.env.get('WATERMARK_FONT_URL') ??
      'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Regular.ttf'

    // ── Fetch the original render and font ───────────────────────────────────
    const [imageBytes, fontBytes] = await Promise.all([
      fetchBytes(render_url),
      fetchBytes(fontUrl),
    ])

    // ── Decode the render image ──────────────────────────────────────────────
    const img = await Image.decode(imageBytes)

    // ── Draw watermark bar at the bottom ─────────────────────────────────────
    // Semi-transparent dark strip across full width
    const barY = img.height - BAR_HEIGHT
    const darkColor = rgba(0, 0, 0, 140)   // black at ~55% opacity → bar background

    for (let x = 1; x <= img.width; x++) {
      for (let y = barY + 1; y <= img.height; y++) {
        // Blend existing pixel with dark overlay
        const existing = img.getPixelAt(x, y)
        const eR = (existing >>> 24) & 0xFF
        const eG = (existing >>> 16) & 0xFF
        const eB = (existing >>> 8)  & 0xFF
        // Blend: 45% original + 55% black
        const blendedR = Math.round(eR * 0.45)
        const blendedG = Math.round(eG * 0.45)
        const blendedB = Math.round(eB * 0.45)
        img.setPixelAt(x, y, rgba(blendedR, blendedG, blendedB, 255))
      }
    }

    // ── Render watermark text ─────────────────────────────────────────────────
    try {
      const font = new Font(fontBytes)
      // Measure text to right-align (imagescript measures in pixels)
      const [textWidth, textHeight] = font.size(WATERMARK_TEXT, FONT_SIZE)

      // Position: 16px from right edge, vertically centred in the bar
      const textX = img.width - textWidth - 16
      const textY = barY + Math.floor((BAR_HEIGHT - textHeight) / 2)

      // White text at 30% opacity → approx alpha = 77 (30% of 255)
      const textAlpha = Math.round(255 * OPACITY_FACTOR)
      const textColor = rgba(255, 255, 255, textAlpha)

      font.drawText(img, WATERMARK_TEXT, FONT_SIZE, textX, textY, textColor)
    } catch (fontError) {
      // If font rendering fails (unlikely with imagescript) log and continue
      // The dark bar is still a meaningful watermark
      console.warn('[apply-watermark] font rendering failed:', fontError)
    }

    // ── Encode back to JPEG (quality 90) ─────────────────────────────────────
    const outputBuffer = await img.encodeJPEG(90)

    // ── Upload to Supabase Storage ────────────────────────────────────────────
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: renderRow } = await supabase
      .from('renders')
      .select('room_id, project_id, pass_number, pass_type')
      .eq('id', render_id)
      .single()

    const storagePath = `${renderRow?.project_id ?? 'unknown'}/${renderRow?.room_id ?? 'unknown'}/watermarked_${render_id}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('renders')
      .upload(storagePath, outputBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: publicUrlData } = supabase.storage
      .from('renders')
      .getPublicUrl(storagePath)

    const watermarkedUrl = publicUrlData.publicUrl

    // ── Persist watermarked_url to renders table ──────────────────────────────
    await supabase
      .from('renders')
      .update({ watermarked_url: watermarkedUrl })
      .eq('id', render_id)

    // Log activity
    if (renderRow) {
      await supabase.from('activity_log').insert({
        project_id: renderRow.project_id,
        room_id: renderRow.room_id,
        action_type: 'watermark_applied',
        action_description: `Watermark applied to render (pass ${renderRow.pass_type ?? renderRow.pass_number})`,
        metadata: { render_id, watermarked_url: watermarkedUrl },
      })
    }

    return new Response(
      JSON.stringify({ watermarked_url: watermarkedUrl }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[apply-watermark] error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
