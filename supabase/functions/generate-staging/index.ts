// generate-staging/index.ts
// Section 48 — Gemini API Integration (complete)
//
// Upgrades from Sprint 1 baseline:
//   ✓ Full 14-slot multi-part reference image body (Sec 12)
//   ✓ references_used stores slot labels, not just raw URLs
//   ✓ Auto-triggers detect-artifacts after each render is saved (fire-and-forget)
//   ✓ Proper activity log per generation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface ReferenceSlotMeta {
  slot: number
  label: string
  url: string
}

interface GenerateStagingRequest {
  room_id: string
  project_id: string
  pass_number: number
  pass_type: string
  prompt: string
  // reference_urls: ordered array matching the 14-slot architecture
  reference_urls: string[]
  // Optional: slot metadata for references_used storage
  reference_slots?: ReferenceSlotMeta[]
  resolution_tier: '1K' | '2K' | '4K'
  variation_count: number
  requested_by: string
}

const COST_PER_IMAGE: Record<string, number> = {
  '1K': 2.5,
  '2K': 6.0,
  '4K': 15.0,
}

const getVariationLabels = (count: number) => ['A', 'B', 'C'].slice(0, count)

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${url} (${response.status})`)
  const buffer = await response.arrayBuffer()
  // Chunked to avoid "Maximum call stack size exceeded" on large images
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

const uploadToSupabase = async (
  projectId: string,
  roomId: string,
  passNumber: number,
  passType: string,
  variationLabel: string,
  imageBase64: string
): Promise<string> => {
  const fileName = `${passType}_pass${passNumber}_${variationLabel}_${Date.now()}.jpg`
  const filePath = `${projectId}/${roomId}/${fileName}`

  const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0))

  const { error } = await supabase.storage
    .from('renders')
    .upload(filePath, imageBuffer, { contentType: 'image/jpeg', upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('renders').getPublicUrl(filePath)
  return publicUrl
}

/**
 * Full 14-ref multi-part Gemini request body.
 * Images are sent as inline_data parts BEFORE the text prompt,
 * matching Gemini's expected ordering for image-conditioned generation.
 */
const generateWithGemini = async (
  prompt: string,
  referenceUrls: string[]
): Promise<string> => {
  const parts: Record<string, unknown>[] = []

  // Fetch all reference images in parallel (slots 1–14)
  const imageResults = await Promise.allSettled(
    referenceUrls.map(async (url, idx) => {
      try {
        const base64 = await fetchImageAsBase64(url)
        return { idx, base64, ok: true }
      } catch (err) {
        console.warn(`[generate-staging] Slot ${idx + 1} image failed: ${url}`, err)
        return { idx, base64: null, ok: false }
      }
    })
  )

  // Add successfully fetched images as inline_data parts (maintains slot order)
  for (const result of imageResults) {
    if (result.status === 'fulfilled' && result.value.ok && result.value.base64) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: result.value.base64,
        },
      })
    }
  }

  // Text prompt goes last
  parts.push({ text: prompt })

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const result = await response.json()

  if (!result.candidates?.[0]?.content?.parts) {
    throw new Error('No image generated in Gemini response')
  }

  const imagePart = result.candidates[0].content.parts.find(
    (p: Record<string, unknown>) => p.inline_data
  )
  if (!imagePart?.inline_data?.data) {
    throw new Error('No image data in Gemini response')
  }

  return imagePart.inline_data.data as string
}

/**
 * Fire-and-forget: auto-trigger artifact detection on a freshly saved render.
 * Runs asynchronously — does not block the generation response.
 */
const triggerArtifactDetection = (renderId: string, renderUrl: string) => {
  fetch(`${SUPABASE_URL}/functions/v1/detect-artifacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ render_id: renderId, render_url: renderUrl }),
  }).catch(err => console.warn('[generate-staging] artifact detection trigger failed:', err))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as GenerateStagingRequest
    const {
      room_id, project_id, pass_number, pass_type,
      prompt, reference_urls, reference_slots,
      resolution_tier, variation_count, requested_by,
    } = body

    // Build references_used: prefer slot labels if provided, else raw URLs
    const referencesUsed: string[] = reference_slots?.length
      ? reference_slots.map(s => `Slot ${s.slot}: ${s.label}`)
      : reference_urls

    // Insert generation_queue row
    const { data: queueRow, error: queueError } = await supabase
      .from('generation_queue')
      .insert({
        project_id, room_id, pass_number, pass_type,
        variation_count, prompt,
        reference_urls,
        resolution_tier,
        priority: 2,
        status: 'processing',
        requested_by,
      })
      .select()
      .single()

    if (queueError) throw new Error(`Queue insert failed: ${queueError.message}`)

    const queueId = queueRow.id
    const variationLabels = getVariationLabels(variation_count)
    const costPerImage = COST_PER_IMAGE[resolution_tier] ?? 6.0
    const totalCost = costPerImage * variation_count
    const renderIds: string[] = []

    // Generate each variation
    for (const variationLabel of variationLabels) {
      try {
        const imageBase64 = await generateWithGemini(prompt, reference_urls)

        const storageUrl = await uploadToSupabase(
          project_id, room_id, pass_number, pass_type, variationLabel, imageBase64
        )

        const { data: renderRow, error: renderError } = await supabase
          .from('renders')
          .insert({
            room_id,
            project_id,
            pass_number,
            pass_type,
            variation_label: variationLabel,
            resolution_tier,
            storage_url: storageUrl,
            watermarked_url: null,         // populated by apply-watermark at CP share time
            thumbnail_url: storageUrl,
            status: 'generated',
            prompt_used: prompt,
            references_used: referencesUsed,
            api_cost: costPerImage,
            artifact_flags: null,          // populated by detect-artifacts (fire-and-forget below)
          })
          .select()
          .single()

        if (renderError) throw new Error(`Render insert failed: ${renderError.message}`)

        renderIds.push(renderRow.id)

        // Sec 48 — auto-trigger artifact detection after each render (fire-and-forget)
        triggerArtifactDetection(renderRow.id, storageUrl)

      } catch (variationError) {
        console.error(`[generate-staging] Variation ${variationLabel} failed:`, variationError)
      }
    }

    // Log cost
    await supabase.from('api_cost_log').insert({
      project_id,
      room_id,
      call_type: 'generation',
      resolution_tier,
      cost_inr: totalCost,
      gemini_model: 'gemini-3.1-flash-image-preview',
    })

    // Update queue to complete
    await supabase
      .from('generation_queue')
      .update({ status: 'complete', completed_at: new Date().toISOString(), api_cost: totalCost })
      .eq('id', queueId)

    // Update rooms.current_pass
    await supabase
      .from('rooms')
      .update({ current_pass: pass_number })
      .eq('id', room_id)

    // Activity log
    await supabase.from('activity_log').insert({
      project_id,
      room_id,
      action_type: 'generation_complete',
      action_description: `Pass ${pass_number} (${pass_type}) — ${renderIds.length}/${variationLabels.length} render${renderIds.length !== 1 ? 's' : ''} generated · ${resolution_tier} · ₹${totalCost.toFixed(2)}`,
      metadata: {
        pass_number, pass_type, resolution_tier,
        variation_count, render_ids: renderIds,
        reference_count: reference_urls.length,
        total_cost: totalCost,
      },
    })

    return new Response(
      JSON.stringify({ success: true, render_ids: renderIds, total_cost: totalCost, queue_id: queueId }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[generate-staging] error:', msg)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
