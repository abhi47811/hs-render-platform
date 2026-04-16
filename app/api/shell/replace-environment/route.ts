import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type EnvironmentPreset =
  | 'city'
  | 'garden'
  | 'pool'
  | 'sea'
  | 'hills'
  | 'custom'

interface ReplaceRequest {
  room_id: string
  project_id: string
  shell_url: string
  preset: EnvironmentPreset
  custom_prompt?: string
  city: string
  project_type: string
}

// City-specific skyline descriptions — Indian cities, photorealistic
const CITY_VIEWS: Record<string, string> = {
  Hyderabad:  'the Hyderabad skyline with modern glass high-rise towers of HITEC City, Cyber Towers visible in the distance, warm golden afternoon light, clear blue sky with a few clouds',
  Bangalore:  'the Bangalore urban landscape with lush green tree canopies below, modern tech park towers of Whitefield or Koramangala visible in the distance, fresh morning light and a partly cloudy sky',
  Mumbai:     'the Mumbai coastline with the Arabian Sea stretching to the horizon, sleek high-rise towers along Marine Drive or Worli, golden hour light reflecting off the water',
  Delhi:      'the Delhi skyline with wide tree-lined avenues, a mix of modern glass towers and heritage structures, warm afternoon light and an expansive blue sky',
  Pune:       'the Pune landscape with green rolling hills in the background, modern city buildings in the mid-ground, lush tree coverage, soft daylight and a clear sky',
  Chennai:    'the Chennai cityscape with palm trees, modern towers, and a glimpse of the Bay of Bengal in the distance, bright tropical sunlight and a clear sky',
}

const PRESET_DESCRIPTIONS: Record<Exclude<EnvironmentPreset, 'city' | 'custom'>, string> = {
  garden: 'a beautifully landscaped garden with manicured green lawns, flowering plants, tall tropical trees, and soft dappled light filtering through the foliage',
  pool:   'a stunning infinity pool with crystal clear blue water, surrounded by elegant stone decking, tropical palm trees, and sun loungers, bright sunny day with a cloudless sky',
  sea:    'a serene ocean view with calm deep-blue water stretching to the horizon, gentle waves, a clear sky, and warm golden light',
  hills:  'rolling green hills covered in dense forest, misty morning light, a clear sky above, and the peaceful tranquility of nature',
}

function buildEnvironmentPrompt(
  preset: EnvironmentPreset,
  city: string,
  projectType: string,
  customPrompt?: string
): string {
  let envDescription: string

  if (preset === 'custom' && customPrompt) {
    envDescription = customPrompt
  } else if (preset === 'city') {
    envDescription = CITY_VIEWS[city] ?? `a beautiful ${city} urban skyline with modern buildings, clear sky, and warm daylight`
  } else if (preset !== 'custom') {
    envDescription = PRESET_DESCRIPTIONS[preset]
  } else {
    envDescription = 'a pleasant outdoor view with natural light'
  }

  return `You are an expert interior photography retoucher. I am giving you a reference interior room photograph.

CRITICAL RULE: If there are NO windows, glass panels, or outdoor-facing openings visible in this photograph, return the image COMPLETELY UNCHANGED. Do NOT add any windows, doors, openings, or architectural elements that do not exist in the original image.

If and ONLY IF windows or outdoor openings ARE already present: replace the outdoor view visible through them with: ${envDescription}.

Your task: Keep the entire interior of this room EXACTLY as it appears — all walls, flooring, ceiling, furniture, fixtures, lighting, and ALL interior surfaces must remain COMPLETELY UNCHANGED. Do NOT alter wall positions, room structure, or add any new architectural features.

Requirements:
- NEVER add windows, openings, or structural elements that did not exist in the reference photo
- NEVER change wall colors, textures, or positions
- The indoor environment must look 100% identical to the reference image
- Only the outdoor view seen THROUGH EXISTING openings may change
- The new outdoor view must look photorealistic and consistent with the interior lighting
- Blend the outdoor light naturally through existing windows to maintain realistic interior illumination
- The image should look like a professional interior photograph, not a composite
- Maintain the same camera angle, perspective, and composition as the reference
- Output as a high-quality interior room photograph`
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`)
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

async function uploadEnhancedShell(
  supabase: ReturnType<typeof createSupabaseClient>,
  projectId: string,
  roomId: string,
  imageBase64: string
): Promise<string> {
  const filePath = `${projectId}/${roomId}/enhanced_shell.jpg`
  const imageBuffer = Buffer.from(imageBase64, 'base64')

  const { error } = await supabase.storage
    .from('shells')
    .upload(filePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('shells').getPublicUrl(filePath)
  return publicUrl
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReplaceRequest
    const { room_id, project_id, shell_url, preset, custom_prompt, city, project_type } = body

    if (!room_id || !project_id || !shell_url || !preset) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 })
    }

    // Use service role client — bypasses RLS for server-side storage uploads and DB writes
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    // Fetch original shell as base64
    const shellBase64 = await fetchImageAsBase64(shell_url)

    // Build the prompt
    const prompt = buildEnvironmentPrompt(preset, city, project_type, custom_prompt)

    // Call Gemini 2.0 Flash image generation (same model as staging)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: shellBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      throw new Error(`Gemini API error: ${errText}`)
    }

    const geminiResult = await geminiResponse.json()
    const parts = geminiResult.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: Record<string, unknown>) => p.inlineData)

    if (!imagePart?.inlineData?.data) {
      throw new Error('No image returned by Gemini')
    }

    const enhancedBase64: string = imagePart.inlineData.data

    // Upload to Supabase storage
    const enhancedUrl = await uploadEnhancedShell(supabase, project_id, room_id, enhancedBase64)

    // Update room record
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ enhanced_shell_url: enhancedUrl })
      .eq('id', room_id)

    if (updateError) {
      console.error('Failed to update room enhanced_shell_url:', updateError)
    }

    // Log API cost (enhancement = ~₹4 flat for environment replacement)
    await supabase.from('api_cost_log').insert({
      project_id,
      room_id,
      call_type: 'enhancement',
      resolution_tier: null,
      cost_inr: 4.0,
      gemini_model: 'gemini-3-pro-image-preview',
    })

    // Activity log
    await supabase.from('activity_log').insert({
      project_id,
      room_id,
      action_type: 'shell_enhanced',
      action_description: `Environment replaced: ${preset === 'custom' ? 'custom view' : preset}`,
      metadata: { preset, city, project_type },
    })

    return NextResponse.json({ enhanced_url: enhancedUrl })
  } catch (error) {
    console.error('replace-environment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Environment replacement failed' },
      { status: 500 }
    )
  }
}
