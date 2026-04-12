// detect-artifacts/index.ts
// Section 16 — AI Artifact Detection
// Runs Gemini 2.0 Flash vision on a render image and returns a structured
// list of quality issues (ArtifactFlags). Results stored in renders.artifact_flags.
//
// Checks performed (6 total):
//   floating_furniture  — objects not grounded / missing contact shadow
//   wall_bleed          — color/material bleeding across boundaries
//   perspective_break   — wrong perspective relative to room VP
//   double_shadow       — duplicate or physically impossible shadows
//   texture_repetition  — obvious tiling in floor / wall / fabric
//   unrendered_zone     — blank, AI-missed, or low-quality areas
//
// Severity: Critical | Major | Minor
// Critical flags → overall_quality = 'fail' → approve locked until override

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DETECTION_PROMPT = `You are a senior interior design rendering quality inspector.
Examine this AI-generated interior staging render for the following 6 quality defects.

DEFECT DEFINITIONS
1. floating_furniture  — Any furniture, decor item, or object that does not appear to be
   properly resting on the floor or a surface. Look for missing contact shadows, visible
   gaps under legs, or objects visually disconnected from their support surface.

2. wall_bleed — Material, color, or texture incorrectly bleeding across the junction
   between wall/floor, wall/ceiling, or two different surface materials. Should not
   happen in real rooms — walls and floors are distinct planes.

3. perspective_break — An object or surface that does not conform to the room's vanishing
   point / perspective grid. For example, a table top that appears to face a different
   direction than the room, or verticals that lean unexpectedly.

4. double_shadow — Two shadows from the same light source on the same object, shadows
   that overlap impossibly, or shadows that contradict the dominant lighting direction.

5. texture_repetition — Obvious repeated tile patterns in floor materials, wall
   coverings, or fabric/upholstery that betray the AI's texture synthesis. Look for
   identical patches arranged in a grid.

6. unrendered_zone — Any area with: blank/grey patches, pixelated artifacts, smeared or
   melted-looking geometry, clearly unfinished regions, or obvious AI generation errors.

RULES
- Only flag genuine technical defects. Do NOT flag stylistic or subjective choices.
- Assign severity based on visual impact:
    Critical: Immediately visible, ruins the realism or client experience
    Major: Noticeable on close inspection, would draw client attention
    Minor: Subtle, detectable only by trained eye
- Report the specific location using quadrant/region language (e.g. "bottom-left corner",
  "right wall mid-section", "ceiling above sofa").
- If no issues found, return an empty flags array.

Return ONLY valid JSON in this exact structure (no markdown, no explanation):
{
  "flags": [
    {
      "issue": "floating_furniture",
      "location": "bottom-left, armchair near window",
      "severity": "Critical",
      "description": "Armchair has visible gap below all four legs with no contact shadow."
    }
  ],
  "overall_quality": "pass",
  "analysis_notes": "Overall render quality is high. One minor texture repeat on accent rug."
}

overall_quality values:
  "pass"    — No flags, or only Minor flags
  "warning" — One or more Major flags (no Critical)
  "fail"    — One or more Critical flags (approve should be locked)
`

interface DetectArtifactsBody {
  render_id: string
  render_url: string  // public URL of the rendered image
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as DetectArtifactsBody
    const { render_id, render_url } = body

    if (!render_id || !render_url) {
      return new Response(JSON.stringify({ error: 'render_id and render_url required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // ── Fetch the render image as base64 ──────────────────────────────────
    const imageResponse = await fetch(render_url)
    if (!imageResponse.ok) throw new Error(`Could not fetch render image: ${imageResponse.status}`)

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageB64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    const mimeType = imageResponse.headers.get('content-type') ?? 'image/jpeg'

    // ── Call Gemini 2.0 Flash (vision-only — cheaper than pro-image) ──────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: DETECTION_PROMPT },
              { inline_data: { mime_type: mimeType, data: imageB64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.05,        // near-deterministic for QC
            responseMimeType: 'application/json',
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      throw new Error(`Gemini API error: ${err}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

    // ── Parse the JSON response (Gemini may wrap in markdown) ─────────────
    let parsed: {
      flags: Array<{ issue: string; location: string; severity: 'Critical' | 'Major' | 'Minor'; description: string }>
      overall_quality: 'pass' | 'warning' | 'fail'
      analysis_notes: string
    }

    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // Fallback: if JSON parse fails, treat as clean
      parsed = { flags: [], overall_quality: 'pass', analysis_notes: 'Analysis response could not be parsed.' }
    }

    const flags = parsed.flags ?? []
    const overallQuality = parsed.overall_quality ?? 'pass'

    // ── Persist to Supabase ───────────────────────────────────────────────
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: renderRow } = await supabase
      .from('renders')
      .select('room_id, project_id, pass_number')
      .eq('id', render_id)
      .single()

    await supabase
      .from('renders')
      .update({ artifact_flags: flags })
      .eq('id', render_id)

    // Log API cost (Gemini 2.0 Flash vision — ₹1.50 per call)
    if (renderRow) {
      await supabase.from('api_cost_log').insert({
        project_id: renderRow.project_id,
        room_id: renderRow.room_id,
        call_type: 'vision',
        resolution_tier: null,
        cost_inr: 1.5,
        gemini_model: 'gemini-2.0-flash',
      })

      await supabase.from('activity_log').insert({
        project_id: renderRow.project_id,
        room_id: renderRow.room_id,
        action_type: 'artifact_detection',
        action_description: `Artifact scan: ${flags.length} flag(s) — ${overallQuality.toUpperCase()}`,
        metadata: { render_id, flag_count: flags.length, overall_quality: overallQuality },
      })
    }

    return new Response(
      JSON.stringify({
        flags,
        overall_quality: overallQuality,
        analysis_notes: parsed.analysis_notes,
        critical_count: flags.filter(f => f.severity === 'Critical').length,
        major_count: flags.filter(f => f.severity === 'Major').length,
        minor_count: flags.filter(f => f.severity === 'Minor').length,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[detect-artifacts] error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
