import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { image_url, declared_room_type } = await req.json()

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    // Fetch image and convert to base64
    const imgResponse = await fetch(image_url)
    if (!imgResponse.ok) throw new Error('Failed to fetch image')
    const buffer = await imgResponse.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      const chunk = Array.from(bytes.subarray(i, i + chunkSize))
      binary += String.fromCharCode(...chunk)
    }
    const base64 = btoa(binary)
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg'

    const prompt = `You are an expert interior design analyst. Analyse this image and respond ONLY in valid JSON with no markdown or explanation.

Identify exactly what kind of space/room this is. Be specific and honest — if it's a balcony, say balcony; if it's a living room, say living room; etc.

Respond with this exact JSON structure:
{
  "detected_room_type": "string — exact room type detected (e.g. bedroom, living room, balcony, kitchen, bathroom, dining room, study, corridor, terrace, outdoor)",
  "is_indoor": true or false,
  "is_bare_shell": true or false — true if the room is empty/unfurnished, false if furniture is present,
  "has_furniture": true or false,
  "confidence": "high" or "medium" or "low",
  "key_features": ["array", "of", "3-5", "things", "you", "see"],
  "image_quality": "good" or "acceptable" or "poor",
  "quality_issues": ["list any issues: dark, blurry, partial view, wrong angle, etc. Empty array if none"],
  "declared_match": ${declared_room_type ? `"${declared_room_type}"` : null},
  "mismatch_detected": true or false — true if detected type doesn't match declared type,
  "mismatch_reason": "string explaining the mismatch, or null if no mismatch"
}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: contentType, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      throw new Error(`Gemini error: ${err.slice(0, 200)}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

    let analysis
    try {
      analysis = JSON.parse(rawText)
    } catch {
      // Strip markdown fences if present
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleaned)
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('detect-room error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
