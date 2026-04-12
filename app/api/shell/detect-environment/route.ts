import { NextRequest, NextResponse } from 'next/server'

interface DetectRequest {
  shell_url: string
}

interface DetectResult {
  has_outdoor_view: boolean
  confidence: 'high' | 'medium' | 'low'
  description: string
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image from ${url}`)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  // Normalise mime type
  const mimeType = contentType.includes('png') ? 'image/png'
    : contentType.includes('webp') ? 'image/webp'
    : 'image/jpeg'
  return { base64, mimeType }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DetectRequest
    const { shell_url } = body

    if (!shell_url) {
      return NextResponse.json({ error: 'shell_url is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // Fetch image as base64
    const { base64, mimeType } = await fetchImageAsBase64(shell_url)

    // Call Claude Vision
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Analyze this interior room photo carefully.

Is there a visible outdoor environment through windows, glass doors, sliding panels, balcony openings, or any transparent surface?

Reply ONLY with this exact JSON (no other text):
{
  "has_outdoor_view": true or false,
  "confidence": "high" or "medium" or "low",
  "description": "one sentence describing what is visible outside, or 'No outdoor view visible' if none"
}`,
              },
            ],
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text()
      console.error('Claude API error:', err)
      // Fail gracefully — don't block the flow
      return NextResponse.json<DetectResult>({
        has_outdoor_view: false,
        confidence: 'low',
        description: 'Detection unavailable',
      })
    }

    const claudeResult = await claudeResponse.json()
    const rawText: string = claudeResult.content?.[0]?.text ?? '{}'

    // Extract JSON from response (Claude sometimes wraps in markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : rawText

    try {
      const parsed = JSON.parse(jsonStr) as DetectResult
      return NextResponse.json(parsed)
    } catch {
      // JSON parse failed — default to no outdoor view so flow continues
      return NextResponse.json<DetectResult>({
        has_outdoor_view: false,
        confidence: 'low',
        description: 'Could not analyse image',
      })
    }
  } catch (error) {
    console.error('detect-environment error:', error)
    return NextResponse.json<DetectResult>({
      has_outdoor_view: false,
      confidence: 'low',
      description: 'Detection failed',
    })
  }
}
