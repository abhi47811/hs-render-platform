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

function buildBlock1_SpatialConstraint(spatial: SpatialConstraintData | null): string {
  if (!spatial) return ''

  const parts: string[] = ['SPATIAL CONSTRAINTS (do not violate):']

  if (spatial.vanishing_point) {
    parts.push(`Primary vanishing point at ${spatial.vanishing_point.x_pct}% horizontal, ${spatial.vanishing_point.y_pct}% vertical in the frame.`)
  }

  if (spatial.doors?.length) {
    const doorList = spatial.doors.map(d => `${d.location} (${d.approximate_position})${d.notes ? ` — ${d.notes}` : ''}`).join('; ')
    parts.push(`Doors: ${doorList}. Maintain clearance, do not block or place furniture in door swings.`)
  }

  if (spatial.windows?.length) {
    const winList = spatial.windows.map(w => `${w.location} (${w.approximate_position}), light direction: ${w.light_direction}`).join('; ')
    parts.push(`Windows: ${winList}. Natural light must remain visible through windows. Do not obstruct window openings.`)
  }

  if (spatial.forbidden_zones?.length) {
    const zoneList = spatial.forbidden_zones.map(z => `${z.location} (${z.reason}: ${z.approximate_pct})`).join('; ')
    parts.push(`FORBIDDEN ZONES — no furniture placement here: ${zoneList}.`)
  }

  if (spatial.furniture_zones?.length) {
    const fzList = spatial.furniture_zones.map(z => `${z.zone_name} at ${z.location}`).join('; ')
    parts.push(`Optimal furniture placement zones: ${fzList}.`)
  }

  if (spatial.structural_features?.length) {
    parts.push(`Structural features to preserve: ${spatial.structural_features.join(', ')}.`)
  }

  if (spatial.lighting_conditions) {
    parts.push(`Lighting conditions: ${spatial.lighting_conditions}.`)
  }

  if (spatial.analyst_notes) {
    parts.push(`Important: ${spatial.analyst_notes}`)
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

function buildBlock4_GeometryContinuity(): string {
  return `GEOMETRY AND STRUCTURAL CONTINUITY (CRITICAL):
Preserve all structural elements exactly as they appear in the reference image:
- All walls, their angles, positions, and surface textures must remain identical
- Ceiling height, ceiling features, and any cornicing must be unchanged
- All doors and window openings: their sizes, positions, frames, and reveals unchanged
- Floor plane: its level, material if already established, and area unchanged
- Any existing built-in elements (wardrobes, kitchen units, bathroom fixtures) unchanged
- Camera perspective, focal length, and composition angle must be identical to reference
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
  const b1 = buildBlock1_SpatialConstraint(input.spatial_analysis)
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
  const b4 = buildBlock4_GeometryContinuity()
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
