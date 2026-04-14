// Section 13: Prompt Weight Architecture
// 9-block prompt assembly engine
// Only Block 2 (Pass Instruction) is editable by the team.
// All other blocks are auto-assembled from room/project data.

import { buildVastuBlock } from './blocks/vastu'
import { buildPersonaBlock } from './blocks/persona'
import { buildRegionalBlock } from './blocks/regional'

export type PassType =
  | 'shell_enhancement'
  | 'style_seed'
  | 'flooring'
  | 'main_furniture'
  | 'accent_pieces'
  | 'lighting'
  | 'decor'
  | 'revision'
  | 'day_to_dusk'
  | 'surface_swap'

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface SpatialConstraintData {
  vanishing_point?: { x_pct: number; y_pct: number }
  depth_planes?: { foreground: string; mid: string; background: string }
  doors?: Array<{ location: string; approximate_position: string; notes: string }>
  windows?: Array<{ location: string; approximate_position: string; light_direction: string; notes: string }>
  forbidden_zones?: Array<{ reason: string; location: string; approximate_pct: string }>
  furniture_zones?: Array<{ zone_name: string; location: string; approximate_pct: string; notes: string }>
  ceiling_height_estimate?: string
  floor_area_estimate?: string
  structural_features?: string[]
  lighting_conditions?: string
  analyst_notes?: string
}

export interface FloorPlanData {
  dimensions?: {
    length_ft?: number
    width_ft?: number
    area_sqft?: number
    ceiling_height_ft?: number
  }
  entry_wall?: string
  tv_wall?: string
  doors?: Array<{ location: string; approximate_position: string; notes: string }>
  windows?: Array<{ location: string; approximate_position: string; light_direction: string; notes: string }>
  fixed_elements?: string[]
  forbidden_zones?: Array<{ reason: string; location: string; approximate_pct: string }>
  furniture_zones?: Array<{ zone_name: string; location: string; approximate_pct: string; notes: string }>
  analyst_notes?: string
}

export interface ColourPaletteData {
  swatches?: Array<{ role: string; hex: string; name: string; usage: string }>
  dominant_temperature?: string
  saturation_level?: string
  overall_mood?: string
}

export interface PromptAssemblyInput {
  // Room context
  room_type: string
  room_name: string

  // Project context
  primary_style: string
  budget_bracket: string
  city: string
  occupant_profile: string
  vastu_required: 'Yes' | 'No' | 'Partial'
  vastu_notes: string | null
  style_preferences: string | null
  material_preferences: string | null
  exclusions: string | null

  // Pass context
  pass_type: PassType
  pass_number: number

  // Block 2: Pass instruction (team-editable)
  pass_instruction: string

  // Locked room data
  spatial_analysis: SpatialConstraintData | null
  floor_plan_data: FloorPlanData | null
  colour_palette: ColourPaletteData | null
}

// ─── Output Types ─────────────────────────────────────────────────────────────

export interface PromptBlock {
  block_number: number
  label: string
  content: string
  is_editable: boolean
  is_active: boolean // false = skipped/empty for this pass
}

export interface AssembledPrompt {
  final_prompt: string
  blocks: PromptBlock[]
  char_count: number
  block_count: number
}

// ─── Block Builders ──────────────────────────────────────────────────────────

function buildBlock1_SpatialConstraint(
  spatial: SpatialConstraintData | null,
  floorPlan: FloorPlanData | null
): string {
  if (!spatial && !floorPlan) return ''

  const parts: string[] = ['SPATIAL CONSTRAINTS (do not violate):']

  // Vanishing point (visual analysis only — not in floor plans)
  if (spatial?.vanishing_point) {
    parts.push(`Primary vanishing point at ${spatial.vanishing_point.x_pct}% horizontal, ${spatial.vanishing_point.y_pct}% vertical in the frame.`)
  }

  // Dimensions — floor plan wins over visual estimate
  const dimSource = floorPlan?.dimensions || null
  const ceilSource = floorPlan?.dimensions?.ceiling_height_ft
    ? `${floorPlan.dimensions.ceiling_height_ft}ft`
    : spatial?.ceiling_height_estimate || null
  const areaSource = floorPlan?.dimensions?.area_sqft
    ? `${floorPlan.dimensions.area_sqft} sq ft`
    : spatial?.floor_area_estimate || null

  if (dimSource?.length_ft && dimSource?.width_ft) {
    parts.push(`Room dimensions: ${dimSource.length_ft}ft × ${dimSource.width_ft}ft${dimSource.area_sqft ? ` (${dimSource.area_sqft} sq ft)` : ''}.`)
  } else if (areaSource) {
    parts.push(`Floor area: ${areaSource}.`)
  }
  if (ceilSource) {
    parts.push(`Ceiling height: ${ceilSource}.`)
  }

  // Entry and TV wall (floor plan only)
  if (floorPlan?.entry_wall) {
    parts.push(`Main entry: ${floorPlan.entry_wall}.`)
  }
  if (floorPlan?.tv_wall) {
    parts.push(`TV wall: ${floorPlan.tv_wall}. The entertainment unit and TV should be placed on this wall.`)
  }

  // Doors — floor plan wins, fall back to visual
  const doors = floorPlan?.doors?.length ? floorPlan.doors : (spatial?.doors ?? [])
  if (doors.length) {
    const doorList = doors.map(d => `${d.location} (${d.approximate_position})${d.notes ? ` — ${d.notes}` : ''}`).join('; ')
    parts.push(`Doors: ${doorList}. Maintain clearance, do not block or place furniture in door swings.`)
  }

  // Windows — floor plan wins, fall back to visual
  const windows = floorPlan?.windows?.length ? floorPlan.windows : (spatial?.windows ?? [])
  if (windows.length) {
    const winList = windows.map(w => `${w.location} (${w.approximate_position}), light direction: ${w.light_direction}`).join('; ')
    parts.push(`Windows: ${winList}. Natural light must remain visible through windows. Do not obstruct window openings.`)
  }

  // Fixed elements (floor plan only)
  if (floorPlan?.fixed_elements?.length) {
    parts.push(`Fixed structural elements: ${floorPlan.fixed_elements.join(', ')}.`)
  }

  // Structural features (visual analysis only)
  if (spatial?.structural_features?.length) {
    parts.push(`Structural features to preserve: ${spatial.structural_features.join(', ')}.`)
  }

  // Forbidden zones — merge (floor plan first, then visual)
  const fpForbidden = floorPlan?.forbidden_zones ?? []
  const visForbidden = spatial?.forbidden_zones ?? []
  const allForbidden = [...fpForbidden, ...visForbidden]
  if (allForbidden.length) {
    const zoneList = allForbidden.map(z => `${z.location} (${z.reason}: ${z.approximate_pct})`).join('; ')
    parts.push(`FORBIDDEN ZONES — no furniture placement here: ${zoneList}.`)
  }

  // Furniture zones — merge (floor plan first, then visual)
  const fpZones = floorPlan?.furniture_zones ?? []
  const visZones = spatial?.furniture_zones ?? []
  const allZones = [...fpZones, ...visZones]
  if (allZones.length) {
    const fzList = allZones.map(z => `${z.zone_name} at ${z.location}`).join('; ')
    parts.push(`Optimal furniture placement zones: ${fzList}.`)
  }

  // Depth planes (visual only)
  if (spatial?.depth_planes) {
    const dp = spatial.depth_planes
    parts.push(`Depth planes — foreground: ${dp.foreground}, mid: ${dp.mid}, background: ${dp.background}.`)
  }

  // Lighting conditions (visual only)
  if (spatial?.lighting_conditions) {
    parts.push(`Lighting conditions: ${spatial.lighting_conditions}.`)
  }

  // Analyst notes — floor plan first, then visual
  if (floorPlan?.analyst_notes) {
    parts.push(`Floor plan note: ${floorPlan.analyst_notes}`)
  }
  if (spatial?.analyst_notes) {
    parts.push(`Visual analysis note: ${spatial.analyst_notes}`)
  }

  return parts.join('\n')
}

function buildBlock3_StyleDirection(input: PromptAssemblyInput): string {
  const budgetDescriptors: Record<string, string> = {
    economy: 'budget-conscious, value-driven, practical yet tasteful',
    standard: 'mid-range quality, balanced finishes, aspirational without excess',
    premium: 'high-end materials, sophisticated detailing, clearly premium quality',
    luxury: 'ultra-premium, bespoke, opulent, investment-grade materials and craftsmanship',
  }

  const budgetDesc = budgetDescriptors[input.budget_bracket] || 'quality-conscious'
  const regionalBlock = buildRegionalBlock(input.city)

  let block = `STYLE DIRECTION:
Interior design style: ${input.primary_style}.
Budget tier: ${input.budget_bracket} — ${budgetDesc}.
Room type: ${input.room_type} — ${input.room_name}.`

  if (regionalBlock) {
    block += `\n\n${regionalBlock}`
  }

  return block
}

function buildBlock4_GeometryContinuity(passNumber: number): string {
  // R1: For passes 2+, Slot 1 is the previous approved render (primary input).
  //     Slot 2 is the original shell (structural anchor).
  //     For pass 1, Slot 1 is the shell — no prior render exists.
  const primaryDesc = passNumber > 1
    ? `Slot 1 (first reference image) is the APPROVED RENDER from the previous pass — this is your PRIMARY input. Build directly on it; preserve every element already staged there and add only the new elements for this pass. Slot 2 is the original empty shell — use it solely to verify wall positions, door/window locations, and perspective.`
    : `Slot 1 is the empty shell — this is your PRIMARY input. Establish the structural baseline before adding any styling.`

  return `GEOMETRY AND STRUCTURAL CONTINUITY (CRITICAL):
${primaryDesc}
Preserve all structural elements exactly:
- All walls, their angles, positions, and surface textures must remain identical
- Ceiling height, ceiling features, and any cornicing must be unchanged
- All doors and window openings: their sizes, positions, frames, and reveals unchanged
- Floor plane: its level, material if already established, and area unchanged
- Any existing built-in elements (wardrobes, kitchen units, bathroom fixtures) unchanged
- Camera perspective, focal length, and composition angle must be identical to the primary input
The room structure is LOCKED. Only add or modify furnishings and styling elements.`
}

function buildBlock5_ClientPreferences(input: PromptAssemblyInput): string {
  const parts: string[] = [`CLIENT PREFERENCES — ${input.occupant_profile}:`]

  // Inject persona block
  const personaBlock = buildPersonaBlock(input.occupant_profile)
  if (personaBlock) {
    parts.push(personaBlock)
  }

  // Additional preferences from intake
  if (input.style_preferences?.trim()) {
    parts.push(`Style preferences: ${input.style_preferences.trim()}`)
  }

  if (input.material_preferences?.trim()) {
    parts.push(`Material preferences: ${input.material_preferences.trim()}`)
  }

  if (input.exclusions?.trim()) {
    parts.push(`EXCLUSIONS — do not include: ${input.exclusions.trim()}`)
  }

  return parts.join('\n\n')
}

function buildBlock6_MoodboardContext(moodboardCount: number): string {
  if (moodboardCount === 0) return ''
  return `MOODBOARD REFERENCE IMAGES (slots 4–8 in reference images):
${moodboardCount} moodboard image${moodboardCount !== 1 ? 's' : ''} provided. Extract and apply:
- The overall mood, atmosphere, and emotional quality of these spaces
- Colour stories, material combinations, and tonal relationships
- Furniture style, proportions, and arrangement philosophy
- Lighting character and ambiance
Do not copy these rooms literally — use them as stylistic inspiration anchored to this specific room's geometry.`
}

function buildBlock7_FurnitureRefs(furnitureRefCount: number): string {
  if (furnitureRefCount === 0) return ''
  return `FURNITURE REFERENCE IMAGES (slots 9–14 in reference images):
${furnitureRefCount} specific furniture reference image${furnitureRefCount !== 1 ? 's' : ''} provided. These are actual products to be placed in the room:
- Place these specific items (or extremely close equivalents) in the staging
- Maintain their scale, material, and colour relative to the room
- Position them in the furniture zones identified in the spatial analysis
- Ensure they are proportionally correct to the room scale`
}

function buildBlock8_QualityDirective(): string {
  return `OUTPUT QUALITY REQUIREMENTS:
Photorealistic architectural interior photograph. 8K image quality. Professional interior photography lighting. No CGI artifacts, no floating objects, no impossible shadows. The output must be indistinguishable from a high-end real estate or interior design photograph. Straight verticals, correct perspective, no lens distortion. Warm, inviting ambient light unless otherwise specified in the pass instruction.`
}

// ─── Colour Constraint Injection (from locked palette) ────────────────────────

function buildColourConstraintText(palette: ColourPaletteData | null): string {
  if (!palette?.swatches?.length) return ''

  const swatchList = palette.swatches
    .map(s => `${s.role.replace('_', ' ')}: ${s.name} (${s.hex})${s.usage ? ` — ${s.usage}` : ''}`)
    .join('; ')

  return `COLOUR PALETTE CONSTRAINT (locked from style seed):
The following colours must be respected across all surfaces and materials.
${swatchList}.
Overall mood: ${palette.overall_mood || 'as established by the style seed'}.
Temperature: ${palette.dominant_temperature || 'warm'}. Saturation: ${palette.saturation_level || 'moderate'}.
Do not introduce new dominant colours not present in this palette.`
}

// ─── R2: Block 10 — Negative Prompt ──────────────────────────────────────────

function buildBlock10_NegativePrompt(): string {
  return `NEGATIVE CONSTRAINTS — STRICTLY AVOID:
- No floating furniture or objects not in full contact with the floor or a surface
- No impossible, contradictory, or mismatched shadows (all shadows must obey a single consistent light source)
- No duplicate furniture pieces — each item appears exactly once
- No CGI artifacts: no plastic-looking surfaces, no over-smooth textures, no visible polygon edges
- No distorted, warped, or stretched geometry on walls, floors, or furniture
- No text, watermarks, logos, brand names, or labels visible anywhere in the image
- No oversaturated or unnatural colours — all colours must be plausible for real interior materials
- No visible texture seams or tiling patterns on floors, walls, or upholstery
- No furniture that is incorrectly scaled to the room (chairs must look chair-sized, sofas sofa-sized)
- No objects partially clipping through walls, floors, or other furniture
- No missing floor contact — every leg, base, or lower edge must meet the floor plane correctly
- No blown-out highlights or pitch-black shadow zones that obscure room detail`
}

// ─── Pass Default Instructions ────────────────────────────────────────────────

export const PASS_DEFAULT_INSTRUCTIONS: Record<string, string> = {
  shell_enhancement: 'Transform this 3D render into a photorealistic architectural photograph of the same empty room. Add ambient occlusion, realistic surface textures, and physically accurate natural lighting. No furniture or styling changes.',
  style_seed: 'Establish the complete style direction for this room. Apply the chosen design style with appropriate flooring, wall treatment, and one or two key furniture pieces that anchor the space. This will set the colour and material palette for all subsequent passes.',
  flooring: 'Focus on floor material selection and placement. Show the chosen flooring in full detail — tile pattern, wood grain, or carpet texture as appropriate. The floor should be the hero of this pass. Walls and ceiling remain as established.',
  main_furniture: 'Add all primary furniture pieces appropriate for this room type. Sofa and seating for living rooms, bed frame and headboard for bedrooms, dining table and chairs for dining. Ensure furniture is to scale and respects the spatial zones. Build on previous pass — all established elements remain.',
  accent_pieces: 'Layer accent furniture and soft furnishings. Rugs, side tables, cushions, throws, ottomans. Add textural interest and visual depth. No structural or primary furniture changes from previous passes.',
  lighting: 'Add all lighting fixtures — ceiling pendant, floor lamp, table lamps, accent lighting strips if appropriate. Create a warm, layered lighting scheme that highlights the room\'s best features. All furnishings from previous passes remain unchanged.',
  decor: 'Final styling pass. Add curated accessories — art pieces, plants, books, vases, trays, candles, picture frames. Complete the room with personal touches that reflect the style direction and occupant persona. This is the final version of the room.',
  revision: 'Apply the revision instructions precisely. Maintain everything else from the approved render exactly as it appears — only modify what is specifically requested.',
  day_to_dusk: 'Convert the room lighting from natural daylight to dusk/evening ambiance. Add warm artificial lighting from the fixtures. Show city lights or sunset tones through windows. The interior elements remain identical — only the lighting character changes.',
  surface_swap: 'Apply the surface material change as instructed. Maintain all furniture, decor, and spatial elements exactly. Only modify the specified surface.',
}

// ─── Main Assembler ──────────────────────────────────────────────────────────

export function assemblePrompt(
  input: PromptAssemblyInput,
  moodboardCount: number = 0,
  furnitureRefCount: number = 0
): AssembledPrompt {

  const blocks: PromptBlock[] = []

  // Block 1: Spatial Constraint
  const b1 = buildBlock1_SpatialConstraint(input.spatial_analysis, input.floor_plan_data)
  blocks.push({
    block_number: 1,
    label: 'Spatial Constraint',
    content: b1,
    is_editable: false,
    is_active: b1.length > 0,
  })

  // Block 2: Pass Instruction (ONLY EDITABLE BLOCK)
  blocks.push({
    block_number: 2,
    label: 'Pass Instruction',
    content: input.pass_instruction || PASS_DEFAULT_INSTRUCTIONS[input.pass_type] || '',
    is_editable: true,
    is_active: true,
  })

  // Block 3: Style Direction (includes Regional block)
  const b3 = buildBlock3_StyleDirection(input)
  blocks.push({
    block_number: 3,
    label: 'Style Direction',
    content: b3,
    is_editable: false,
    is_active: b3.length > 0,
  })

  // Block 4: Geometry Continuity
  const b4 = buildBlock4_GeometryContinuity(input.pass_number)
  blocks.push({
    block_number: 4,
    label: 'Geometry Continuity',
    content: b4,
    is_editable: false,
    is_active: input.pass_number > 1, // Not needed on Pass 1
  })

  // Block 5: Client Preferences (includes Persona block)
  const b5 = buildBlock5_ClientPreferences(input)
  blocks.push({
    block_number: 5,
    label: 'Client Preferences',
    content: b5,
    is_editable: false,
    is_active: b5.length > 0,
  })

  // Block 6: Moodboard context
  const b6 = buildBlock6_MoodboardContext(moodboardCount)
  blocks.push({
    block_number: 6,
    label: 'Moodboard Context',
    content: b6,
    is_editable: false,
    is_active: moodboardCount > 0,
  })

  // Block 7: Furniture references
  const b7 = buildBlock7_FurnitureRefs(furnitureRefCount)
  blocks.push({
    block_number: 7,
    label: 'Furniture References',
    content: b7,
    is_editable: false,
    is_active: furnitureRefCount > 0,
  })

  // Block 8: Quality Directive
  const b8 = buildBlock8_QualityDirective()
  blocks.push({
    block_number: 8,
    label: 'Quality Directive',
    content: b8,
    is_editable: false,
    is_active: true,
  })

  // Block 9: Vastu (conditional)
  const b9 = buildVastuBlock({
    vastu_required: input.vastu_required,
    vastu_notes: input.vastu_notes,
    room_type: input.room_type,
  })
  blocks.push({
    block_number: 9,
    label: 'Vastu Compliance',
    content: b9 ?? '',
    is_editable: false,
    is_active: b9 !== null,
  })

  // Block 10: Negative Prompt (R2 — always active)
  const b10 = buildBlock10_NegativePrompt()
  blocks.push({
    block_number: 10,
    label: 'Negative Constraints',
    content: b10,
    is_editable: false,
    is_active: true,
  })

  // Inject colour constraint after Block 3 if palette exists
  let colourConstraint = ''
  if (input.colour_palette && input.pass_number > 1) {
    colourConstraint = buildColourConstraintText(input.colour_palette)
  }

  // Assemble final prompt from active blocks
  const activeBlocks = blocks.filter(b => b.is_active && b.content.trim())
  let assembled = activeBlocks.map(b => b.content.trim()).join('\n\n')

  // Inject colour constraint after block 3 content if applicable
  if (colourConstraint) {
    const b3Content = blocks[2].content.trim()
    assembled = assembled.replace(b3Content, `${b3Content}\n\n${colourConstraint}`)
  }

  return {
    final_prompt: assembled,
    blocks,
    char_count: assembled.length,
    block_count: activeBlocks.length,
  }
}

// ─── Convenience helper — get default pass instruction for editing ─────────────

export function getDefaultPassInstruction(passType: string): string {
  return PASS_DEFAULT_INSTRUCTIONS[passType] || ''
}
