// ─── Sec 43: Client Presentation PDF API Route ─────────────────────────────
// Generates a polished client-facing PDF presentation.
//
// Approach:
//   1. Build an HTML template with all approved renders + project info
//   2. Launch Puppeteer to render the HTML → PDF
//   3. Return PDF blob to the client for download
//
// PDF structure:
//   Page 1: Cover — Houspire logo, project name, city, date, primary style
//   Pages 2–N: One render per room per pass, labeled with pass type
//   Last page: Style summary — style, budget bracket, preferences
//
// Falls back to a simple HTML-to-download if Puppeteer isn't available.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PresentationRequest {
  project_id: string
  include: {
    cover?: boolean
    renders?: boolean
    style_card?: boolean
    budget?: boolean
    before_after?: boolean
  }
  orientation: 'portrait' | 'landscape'
  branding_style: 'full' | 'minimal'
}

const PASS_LABELS: Record<string, string> = {
  style_seed:     'Style Direction',
  flooring:       'Flooring',
  main_furniture: 'Main Furniture',
  accent_pieces:  'Accent Pieces',
  lighting:       'Lighting',
  decor:          'Final Decor',
  day_to_dusk:    'Day-to-Dusk Variant',
  surface_swap:   'Material Variant',
  revision:       'Revised Design',
}

function buildHtml(
  project: any,
  rooms: any[],
  renders: any[],
  opts: PresentationRequest,
): string {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const isFull = opts.branding_style === 'full'
  const isLandscape = opts.orientation === 'landscape'
  const pageSize = isLandscape ? '297mm 210mm' : '210mm 297mm'

  // Group renders by room
  const rendersByRoom = new Map<string, any[]>()
  for (const render of renders) {
    const roomRenders = rendersByRoom.get(render.room_id) ?? []
    roomRenders.push(render)
    rendersByRoom.set(render.room_id, roomRenders)
  }

  const coverPage = opts.include.cover ? `
    <div class="page cover-page">
      ${isFull ? '<div class="brand-bar"></div>' : ''}
      <div class="cover-content">
        <div class="houspire-logo">${isFull ? '🏠 Houspire' : 'Houspire'}</div>
        <h1 class="cover-title">${project.client_name}</h1>
        <p class="cover-subtitle">${project.city || ''} · ${project.primary_style || ''} · ${project.project_type || 'Interior Design'}</p>
        <p class="cover-date">Prepared ${date}</p>
        ${isFull ? '<div class="cover-tagline">India\'s transparent interior design platform<br>Flat fee · No hidden markups · 72-hour delivery</div>' : ''}
      </div>
      ${isFull ? '<div class="cover-footer">houspire.ai</div>' : ''}
    </div>
  ` : ''

  const roomPages = opts.include.renders ? rooms.map(room => {
    const roomRenders = rendersByRoom.get(room.id) ?? []
    if (!roomRenders.length) return ''

    return roomRenders.map(render => `
      <div class="page render-page">
        <div class="render-header">
          <div class="room-label">${room.room_name} · ${room.room_type}</div>
          <div class="pass-label">${PASS_LABELS[render.pass_type] ?? render.pass_type}</div>
        </div>
        <div class="render-image-wrap">
          <img src="${render.storage_url}" alt="${room.room_name}" class="render-image" />
        </div>
        ${isFull ? `<div class="page-footer">${project.client_name} · ${date} · Houspire</div>` : ''}
      </div>
    `).join('')
  }).join('') : ''

  const styleCard = opts.include.style_card ? `
    <div class="page style-page">
      <h2 class="section-title">Design Summary</h2>
      <div class="style-grid">
        <div class="style-item"><span class="style-label">Style</span><span class="style-value">${project.primary_style || '—'}</span></div>
        <div class="style-item"><span class="style-label">Budget</span><span class="style-value">${project.budget_bracket || '—'}</span></div>
        <div class="style-item"><span class="style-label">City</span><span class="style-value">${project.city || '—'}</span></div>
        <div class="style-item"><span class="style-label">Rooms</span><span class="style-value">${rooms.length}</span></div>
        ${project.vastu_required && project.vastu_required !== 'No' ? `<div class="style-item"><span class="style-label">Vastu</span><span class="style-value">${project.vastu_required}</span></div>` : ''}
        ${project.occupant_profile ? `<div class="style-item"><span class="style-label">Profile</span><span class="style-value">${project.occupant_profile}</span></div>` : ''}
      </div>
      ${project.style_preferences ? `<div class="pref-block"><span class="pref-label">Style Preferences</span><p class="pref-text">${project.style_preferences}</p></div>` : ''}
      ${project.material_preferences ? `<div class="pref-block"><span class="pref-label">Material Preferences</span><p class="pref-text">${project.material_preferences}</p></div>` : ''}
      ${project.exclusions ? `<div class="pref-block"><span class="pref-label">Exclusions</span><p class="pref-text">${project.exclusions}</p></div>` : ''}
      ${isFull ? '<div class="style-footer">Prepared by Houspire · houspire.ai · mediashaastra@gmail.com</div>' : ''}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: white; }
  .page { width: ${isLandscape ? '297mm' : '210mm'}; min-height: ${isLandscape ? '210mm' : '297mm'}; page-break-after: always; position: relative; overflow: hidden; }

  /* Cover */
  .cover-page { background: ${isFull ? '#1c1917' : '#ffffff'}; color: ${isFull ? '#ffffff' : '#1c1917'}; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .brand-bar { position: absolute; top: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #d97706, #92400e); }
  .cover-content { text-align: center; padding: 40px; }
  .houspire-logo { font-size: 14pt; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 48px; opacity: 0.7; }
  .cover-title { font-size: 36pt; font-weight: 700; letter-spacing: -1px; margin-bottom: 16px; }
  .cover-subtitle { font-size: 13pt; font-weight: 300; opacity: 0.7; margin-bottom: 12px; }
  .cover-date { font-size: 10pt; opacity: 0.5; }
  .cover-tagline { margin-top: 48px; font-size: 9pt; opacity: 0.4; line-height: 1.8; }
  .cover-footer { position: absolute; bottom: 20px; font-size: 8pt; opacity: 0.3; letter-spacing: 2px; text-transform: uppercase; }

  /* Render pages */
  .render-page { background: #fafaf9; }
  .render-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: white; border-bottom: 1px solid #e7e5e4; }
  .room-label { font-size: 10pt; font-weight: 600; color: #1c1917; }
  .pass-label { font-size: 9pt; color: #78716c; background: #f5f5f4; padding: 3px 10px; border-radius: 20px; }
  .render-image-wrap { padding: 16px; flex: 1; display: flex; align-items: center; justify-content: center; }
  .render-image { max-width: 100%; max-height: ${isLandscape ? '150mm' : '200mm'}; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  .page-footer { position: absolute; bottom: 10px; left: 20px; right: 20px; text-align: center; font-size: 7pt; color: #a8a29e; }

  /* Style page */
  .style-page { padding: 40px; }
  .section-title { font-size: 20pt; font-weight: 700; color: #1c1917; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e7e5e4; }
  .style-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .style-item { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 16px; }
  .style-label { display: block; font-size: 7pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; margin-bottom: 6px; }
  .style-value { display: block; font-size: 11pt; font-weight: 600; color: #1c1917; }
  .pref-block { margin-bottom: 16px; }
  .pref-label { display: block; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #78716c; margin-bottom: 6px; }
  .pref-text { font-size: 10pt; color: #44403c; line-height: 1.6; }
  .style-footer { position: absolute; bottom: 20px; left: 40px; right: 40px; text-align: center; font-size: 7pt; color: #a8a29e; border-top: 1px solid #f5f5f4; padding-top: 10px; }

  @media print { .page { page-break-after: always; } }
</style>
</head>
<body>
${coverPage}
${roomPages}
${styleCard}
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PresentationRequest = await request.json()
    const { project_id, include, orientation, branding_style } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at')

    // Fetch approved renders
    const { data: renders } = await supabase
      .from('renders')
      .select('*')
      .in('room_id', (rooms ?? []).map((r: any) => r.id))
      .in('status', ['team_approved', 'client_approved', 'approved'])
      .not('pass_type', 'in', '(day_to_dusk,surface_swap)')  // only main passes by default
      .order('pass_number')

    const opts: PresentationRequest = {
      project_id,
      include: include ?? { cover: true, renders: true, style_card: true },
      orientation: orientation ?? 'landscape',
      branding_style: branding_style ?? 'full',
    }

    const html = buildHtml(project, rooms ?? [], renders ?? [], opts)

    // Safe ASCII filename — strip non-ASCII chars (e.g. em dash) that cause
    // ERR_INVALID_CHAR when Node.js serialises the Content-Disposition header
    const safeFilename = (project.client_name as string)
      .replace(/[^a-zA-Z0-9\s]/g, '')  // remove non-alphanumeric / non-space
      .trim()
      .replace(/\s+/g, '-')             // spaces → hyphens
      || 'presentation'

    // Try Puppeteer
    try {
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: opts.orientation === 'landscape' ? 'A4' : 'A4',
        landscape: opts.orientation === 'landscape',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      await browser.close()

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename}-presentation.pdf"`,
        },
      })
    } catch (puppeteerErr) {
      console.warn('[Presentation] Puppeteer not available, falling back to HTML:', puppeteerErr)

      // Fallback: return the HTML for browser-side print
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${safeFilename}-presentation.html"`,
          'X-Fallback': 'true',
        },
      })
    }
  } catch (err) {
    console.error('[Presentation] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
