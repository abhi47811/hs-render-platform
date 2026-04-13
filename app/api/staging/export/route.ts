// ─── Sec 42: Export API Route ──────────────────────────────────────────────
// Handles three export formats:
//   whatsapp — fetches the render, converts to JPEG 1280×720 @ 85% quality
//   highres   — fetches the render, returns as PNG (original quality)
//   zip       — fetches all render_urls, bundles into a ZIP archive
//
// Uses sharp for image processing and jszip for bundling.
// Falls back to direct proxy if sharp/jszip are unavailable.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { room_id, project_id, format, render_url, render_urls, room_name } = body

    if (!room_id || !project_id || !format) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify room belongs to the user's org
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, project_id')
      .eq('id', room_id)
      .single()

    if (roomError || !room || room.project_id !== project_id) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // ── ZIP export ─────────────────────────────────────────────────────────
    if (format === 'zip') {
      if (!render_urls || !Array.isArray(render_urls) || render_urls.length === 0) {
        return NextResponse.json({ error: 'No render URLs provided' }, { status: 400 })
      }

      try {
        // Dynamic import to avoid build-time issues if jszip isn't installed
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        const folder = zip.folder(room_name ?? 'renders')!

        // Fetch all renders concurrently
        const fetches = render_urls.map(async (url: string, idx: number) => {
          const res = await fetch(url)
          if (!res.ok) return
          const buffer = await res.arrayBuffer()
          const ext = url.split('?')[0].split('.').pop() ?? 'jpg'
          folder.file(`render-${idx + 1}.${ext}`, buffer)
        })

        await Promise.all(fetches)

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

        return new NextResponse(zipBuffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${(room_name ?? 'renders').replace(/\s+/g, '-')}.zip"`,
          },
        })
      } catch (err) {
        console.error('[Export/zip] error:', err)
        return NextResponse.json({ error: 'ZIP generation failed' }, { status: 500 })
      }
    }

    // ── Image export (whatsapp / highres) ──────────────────────────────────
    if (!render_url) {
      return NextResponse.json({ error: 'render_url required for image export' }, { status: 400 })
    }

    // Fetch the source image
    const imgRes = await fetch(render_url)
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch render image' }, { status: 502 })
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    if (format === 'whatsapp') {
      // Convert to JPEG 1280px width, 85% quality
      try {
        const sharp = (await import('sharp')).default
        const processed = await sharp(imgBuffer)
          .resize({ width: 1280, withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer()

        return new NextResponse(processed as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename="${(room_name ?? 'render').replace(/\s+/g, '-')}-whatsapp.jpg"`,
          },
        })
      } catch {
        // sharp not available — return original with content-type override
        return new NextResponse(imgBuffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename="${(room_name ?? 'render').replace(/\s+/g, '-')}-whatsapp.jpg"`,
          },
        })
      }
    }

    if (format === 'highres') {
      // Return as PNG (convert if needed)
      try {
        const sharp = (await import('sharp')).default
        const processed = await sharp(imgBuffer).png({ compressionLevel: 6 }).toBuffer()

        return new NextResponse(processed as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="${(room_name ?? 'render').replace(/\s+/g, '-')}-highres.png"`,
          },
        })
      } catch {
        // sharp not available — return original
        const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
        return new NextResponse(imgBuffer as unknown as BodyInit, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${(room_name ?? 'render').replace(/\s+/g, '-')}-highres.png"`,
          },
        })
      }
    }

    return NextResponse.json({ error: 'Unknown format' }, { status: 400 })
  } catch (err) {
    console.error('[Export] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
