// app/api/shell/parse-floorplan/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const FLOOR_PLAN_PARSE_PROMPT = `You are an expert architectural analyst. Analyse this floor plan image and extract spatial data as structured JSON.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "dimensions": {
    "length_ft": <number or null>,
    "width_ft": <number or null>,
    "area_sqft": <number or null>,
    "ceiling_height_ft": <number or null>
  },
  "entry_wall": "<north|south|east|west|top|bottom|left|right — which wall has the main entry door>",
  "tv_wall": "<which wall is opposite/best for TV placement — based on entry and window positions>",
  "doors": [
    { "location": "<wall description>", "approximate_position": "<left/center/right of wall>", "notes": "<swing direction if visible>" }
  ],
  "windows": [
    { "location": "<wall description>", "approximate_position": "<position on wall>", "light_direction": "<direction light enters>", "notes": "<any notes>" }
  ],
  "fixed_elements": ["<list of fixed structural items: columns, kitchen island, wet wall, etc.>"],
  "forbidden_zones": [
    { "reason": "<why blocked>", "location": "<description>", "approximate_pct": "<rough % of floor area blocked>" }
  ],
  "furniture_zones": [
    { "zone_name": "<e.g. primary seating area>", "location": "<wall or corner reference>", "approximate_pct": "<% of floor space>", "notes": "<any notes>" }
  ],
  "analyst_notes": "<any critical observations about the room layout that affect furniture placement>"
}

Rules:
- If you cannot determine a value from the image, use null
- For Indian apartments, typical ceiling height is 9–10ft if not shown
- Identify the TV wall as opposite the main seating/entry for living rooms
- Mark door swing areas and passage corridors as forbidden zones
- Be specific about wall references (e.g. "south wall with window" not just "wall")
- Dimensions in feet only`

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch floor plan image: ${response.status}`)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500, headers: CORS })
    }

    const body = await request.json() as { room_id: string; floor_plan_url: string }
    const { room_id, floor_plan_url } = body

    if (!room_id || !floor_plan_url) {
      return NextResponse.json({ error: 'room_id and floor_plan_url are required' }, { status: 400, headers: CORS })
    }

    // Fetch image as base64
    const base64Image = await fetchImageAsBase64(floor_plan_url)

    // Call Gemini Vision
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              }
            },
            { text: FLOOR_PLAN_PARSE_PROMPT }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[parse-floorplan] Gemini error:', errText)
      return NextResponse.json({ error: 'Gemini Vision call failed' }, { status: 502, headers: CORS })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Extract JSON from response (strip any accidental markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[parse-floorplan] No JSON in Gemini response:', rawText)
      return NextResponse.json({ error: 'Could not parse Gemini response as JSON' }, { status: 422, headers: CORS })
    }

    const floorPlanData = JSON.parse(jsonMatch[0])

    // Save parsed data to rooms table
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        floor_plan_url,
        floor_plan_data: floorPlanData,
      })
      .eq('id', room_id)

    if (updateError) {
      console.error('[parse-floorplan] DB update error:', updateError)
      return NextResponse.json({ error: 'Failed to save floor plan data' }, { status: 500, headers: CORS })
    }

    return NextResponse.json({ success: true, floor_plan_data: floorPlanData }, { headers: CORS })
  } catch (err) {
    console.error('[POST /api/shell/parse-floorplan] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: CORS }
    )
  }
}
