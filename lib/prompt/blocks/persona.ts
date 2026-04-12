// Section 19: Occupant Persona Staging
// Auto-injected into Block 5 (Client Preferences) based on project.occupant_profile

export type OccupantProfile =
  | 'Single Professional'
  | 'Young Couple'
  | 'Family with Children'
  | 'Multi-Generational'
  | 'Elderly'
  | 'Corporate'

interface PersonaBlock {
  summary: string
  furniture_guidance: string
  colour_guidance: string
  lifestyle_elements: string
  avoid: string
}

const PERSONA_BLOCKS: Record<OccupantProfile, PersonaBlock> = {
  'Single Professional': {
    summary: 'Urban single professional, likely 25–40 years old, values clean aesthetics, smart functionality, and premium quality within a compact footprint.',
    furniture_guidance: 'Sleek, multifunctional furniture. A dedicated work-from-home corner. Streamlined storage solutions. Less is more — avoid overcrowding.',
    colour_guidance: 'Sophisticated monochromes, deep charcoals, warm greys, slate blues, or muted earth tones. Single bold accent (teal, terracotta, mustard) is acceptable.',
    lifestyle_elements: 'Coffee station, book collection, quality audio/speaker setup visible, curated art prints, minimal but quality decor pieces.',
    avoid: 'Family-oriented items, children\'s elements, overly ornate or maximalist styling.',
  },

  'Young Couple': {
    summary: 'Couple aged 25–35, dual income, design-conscious, values both style and practicality. Likely first home — wants it to impress.',
    furniture_guidance: 'Stylish yet functional. A mix of serious (sofa, dining) and fun (bar cart, floor cushions). Space for both individual and shared activities.',
    colour_guidance: 'Fresh, contemporary palettes — warm whites with warm wood tones, sage greens, dusty rose accents, or bold jewel tones. Personality-forward.',
    lifestyle_elements: 'Plants (2–3 statement pieces), a bar/wine storage area, quality textiles (throws, cushions), curated coffee table books.',
    avoid: 'Baby/children\'s elements, overly mature or traditional styles, clinical or cold aesthetics.',
  },

  'Family with Children': {
    summary: 'Family with one or more children under 18. Practicality, durability, and storage are as important as aesthetics.',
    furniture_guidance: 'Generous seating (5+ seat sofa/sectional for living). Washable/durable upholstery implied by material choices. Ample storage with concealed options. Kid-friendly but still design-conscious.',
    colour_guidance: 'Warm, welcoming palettes. Cream, warm white, terracotta, forest green, warm wood tones. Avoid very light upholstery (implies impractical for families). Medium-value colours preferred.',
    lifestyle_elements: 'Board game storage area, family-sized dining table (6+ seat), rug that grounds the space, quality lighting that suits both play and relaxation.',
    avoid: 'Fragile-looking decor, all-glass coffee tables, overly minimalist (implies no storage), purely white upholstery.',
  },

  'Multi-Generational': {
    summary: 'Home shared by multiple generations — parents, children, and grandparents. Cultural warmth, functionality for all ages, and traditional elements blend with modern comfort.',
    furniture_guidance: 'Higher seat heights (easier for elderly). Generous seating for gathering. Separate zones within rooms for different generations. Traditional craftsmanship mixed with modern comfort.',
    colour_guidance: 'Rich, warm tones that feel culturally grounded — deep teaks, warm golds, terracotta, cream. Traditional textiles (silk, cotton weaves) implied in soft furnishings. Avoid cold, minimal or hyper-modern aesthetics.',
    lifestyle_elements: 'A prayer/puja niche or corner if space allows. A large dining table that accommodates the whole family. Cultural art pieces, quality handcrafted items visible.',
    avoid: 'Purely western minimalism, clinical aesthetics, elements that feel impersonal or corporate.',
  },

  'Elderly': {
    summary: 'Primary occupant is 60+ years old. Prioritises comfort, easy navigation, safety-conscious design, and classic timeless aesthetics.',
    furniture_guidance: 'Firmer, higher-seat sofas and chairs (easier to sit/stand). Unobstructed pathways — no low coffee tables that can be tripped over. Adequate and direct lighting. Familiar, quality materials.',
    colour_guidance: 'Warm, familiar palettes — cream, soft gold, warm beige, traditional wood tones. Avoid trendy or jarring colour combinations. Timeless over fashionable.',
    lifestyle_elements: 'Reading chair with good lighting nearby, familiar religious or cultural elements if room type allows, quality craftsmanship visible in furniture choices, classic patterns in textiles.',
    avoid: 'Low floor-level seating, industrial aesthetics, very dark rooms, cluttered small objects, flashy contemporary styling that may feel unfamiliar.',
  },

  'Corporate': {
    summary: 'Commercial/office space for professional use. Productivity, brand impression, and professional aesthetic are paramount.',
    furniture_guidance: 'Ergonomic, professional furniture. Clear workstation zoning. Storage that conceals rather than displays. Meeting/collaboration zones clearly defined.',
    colour_guidance: 'Professional palettes — charcoal, navy, slate grey, corporate warm greys. Strategic brand-colour accents if applicable. Clean, uncluttered visual tone.',
    lifestyle_elements: 'Branded elements if possible, quality art or architectural photography, clean desk policy implied in the staging, professional lighting (no warm Edison bulbs).',
    avoid: 'Residential-style elements, cozy/homey styling, children\'s elements, overly colourful or casual aesthetics.',
  },
}

export function buildPersonaBlock(occupantProfile: string): string {
  const persona = PERSONA_BLOCKS[occupantProfile as OccupantProfile]
  if (!persona) return ''

  return `OCCUPANT PROFILE — ${occupantProfile.toUpperCase()}:
${persona.summary}

Furniture guidance: ${persona.furniture_guidance}
Colour guidance: ${persona.colour_guidance}
Lifestyle elements to include: ${persona.lifestyle_elements}
Avoid: ${persona.avoid}`
}

export function getPersonaLabel(occupantProfile: string): string {
  return occupantProfile
}

export const ALL_PERSONA_PROFILES: OccupantProfile[] = [
  'Single Professional',
  'Young Couple',
  'Family with Children',
  'Multi-Generational',
  'Elderly',
  'Corporate',
]
