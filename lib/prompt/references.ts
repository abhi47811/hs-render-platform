// Section 12: 14-Reference Image Architecture
// Manages the allocation of up to 14 reference image slots per generation
//
// Slot allocation:
//   Slot 1  — Bare shell (photorealistic_shell_url or enhanced_shell_url)
//   Slot 2  — Last approved render (continuity from previous pass)
//   Slot 3  — Style seed render (CP2-approved, style anchor)
//   Slots 4–8  — Moodboard images (style vault selections)
//   Slots 9–14 — Furniture reference images (specific product/piece references)

export interface ReferenceSlot {
  slot: number
  label: string
  url: string
  purpose: string
}

export interface ReferenceInput {
  // Shell references
  photorealistic_shell_url?: string | null
  enhanced_shell_url?: string | null
  original_shell_url?: string | null

  // Previous approved renders (for continuity) — ordered most recent first
  approved_renders?: Array<{ storage_url: string | null; watermarked_url: string | null; pass_number: number }>

  // Style seed render (CP2 approved)
  style_seed_url?: string | null

  // Moodboard images (0–5 images, slots 4–8)
  moodboard_urls?: string[]

  // Furniture reference images (0–6 images, slots 9–14)
  furniture_ref_urls?: string[]

  // Current pass being generated
  pass_number: number
}

export interface ReferenceAllocation {
  slots: ReferenceSlot[]
  urls: string[]  // Ordered by slot number — passed directly to Gemini API
  moodboard_count: number
  furniture_ref_count: number
  slot_summary: string
}

export function allocateReferenceSlots(input: ReferenceInput): ReferenceAllocation {
  const slots: ReferenceSlot[] = []

  // ── Slot 1: Bare shell ───────────────────────────────────────
  const shellUrl =
    input.photorealistic_shell_url ||
    input.enhanced_shell_url ||
    input.original_shell_url

  if (shellUrl) {
    slots.push({
      slot: 1,
      label: 'Shell (Structure)',
      url: shellUrl,
      purpose: 'Establishes the room geometry, dimensions, and structural anchors for all placements.',
    })
  }

  // ── Slot 2: Last approved render (continuity) ────────────────
  if (input.pass_number > 1 && input.approved_renders?.length) {
    // Find the most recent approved render from the immediately preceding pass
    const prevPassRenders = input.approved_renders
      .filter(r => r.pass_number === input.pass_number - 1)

    const continuityRender = prevPassRenders[0] ?? input.approved_renders[0]
    const continuityUrl = continuityRender?.watermarked_url || continuityRender?.storage_url

    if (continuityUrl) {
      slots.push({
        slot: 2,
        label: 'Previous Pass (Continuity)',
        url: continuityUrl,
        purpose: `Pass ${continuityRender.pass_number} approved render — ensures styling continuity from the previous generation.`,
      })
    }
  }

  // ── Slot 3: Style seed (style anchor) ────────────────────────
  if (input.style_seed_url) {
    slots.push({
      slot: 3,
      label: 'Style Seed',
      url: input.style_seed_url,
      purpose: 'CP2-approved style seed — defines the design direction, colour palette, and material story for all passes.',
    })
  }

  // ── Slots 4–8: Moodboard images (max 5) ──────────────────────
  const moodboardUrls = (input.moodboard_urls ?? []).slice(0, 5)
  moodboardUrls.forEach((url, idx) => {
    slots.push({
      slot: 4 + idx,
      label: `Moodboard ${idx + 1}`,
      url,
      purpose: 'Moodboard image — provides stylistic inspiration, atmosphere, and material/colour references.',
    })
  })

  // ── Slots 9–14: Furniture references (max 6) ─────────────────
  const furnitureUrls = (input.furniture_ref_urls ?? []).slice(0, 6)
  furnitureUrls.forEach((url, idx) => {
    slots.push({
      slot: 9 + idx,
      label: `Furniture Ref ${idx + 1}`,
      url,
      purpose: 'Specific furniture piece to be placed in the staging — place this exact item (or very close equivalent).',
    })
  })

  const urls = slots.map(s => s.url)

  const slotParts: string[] = [`${slots.length}/14 reference slots used:`]
  if (slots.find(s => s.slot === 1)) slotParts.push('Slot 1: Shell')
  if (slots.find(s => s.slot === 2)) slotParts.push('Slot 2: Continuity')
  if (slots.find(s => s.slot === 3)) slotParts.push('Slot 3: Style seed')
  if (moodboardUrls.length > 0) slotParts.push(`Slots 4–${3 + moodboardUrls.length}: Moodboard (${moodboardUrls.length})`)
  if (furnitureUrls.length > 0) slotParts.push(`Slots ${9}–${8 + furnitureUrls.length}: Furniture refs (${furnitureUrls.length})`)

  return {
    slots,
    urls,
    moodboard_count: moodboardUrls.length,
    furniture_ref_count: furnitureUrls.length,
    slot_summary: slotParts.join(' · '),
  }
}

// ─── Convenience: build from room + render data ───────────────────────────────

export function buildReferenceInputFromRoom(
  room: {
    photorealistic_shell_url?: string | null
    enhanced_shell_url?: string | null
    original_shell_url?: string | null
  },
  passNumber: number,
  approvedRenders: Array<{ storage_url: string | null; watermarked_url: string | null; pass_number: number }>,
  styleSeedUrl?: string | null,
  moodboardUrls?: string[],
  furnitureRefUrls?: string[]
): ReferenceInput {
  return {
    photorealistic_shell_url: room.photorealistic_shell_url,
    enhanced_shell_url: room.enhanced_shell_url,
    original_shell_url: room.original_shell_url,
    approved_renders: approvedRenders,
    style_seed_url: styleSeedUrl ?? null,
    moodboard_urls: moodboardUrls ?? [],
    furniture_ref_urls: furnitureRefUrls ?? [],
    pass_number: passNumber,
  }
}
