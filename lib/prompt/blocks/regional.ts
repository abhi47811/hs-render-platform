// Section 20: Regional Style Presets
// Auto-injected into Block 3 (Style Direction) based on project.city
// Each city has distinct design sensibilities, climate considerations, and cultural influences

export type City = 'Hyderabad' | 'Bangalore' | 'Mumbai' | 'Delhi' | 'Pune' | 'Chennai'

interface RegionalBlock {
  climate_notes: string
  material_preferences: string
  colour_sensibility: string
  cultural_notes: string
  local_influences: string
}

const REGIONAL_BLOCKS: Record<City, RegionalBlock> = {
  'Hyderabad': {
    climate_notes: 'Semi-arid climate with hot summers. Rooms benefit from cooling aesthetics — light colours, natural ventilation implied through window treatments, stone or tile flooring.',
    material_preferences: 'Natural stone (Shahabad, Kota stone) for flooring is authentic. Teak wood furniture. Ceramic tile work. Brass and copper hardware. Handwoven Pochampally ikat textiles.',
    colour_sensibility: 'Rich Nizami palette — deep teals, royal blues, warm golds, rust orange, ivory, and jewel tones. Layered with warm neutrals as base. Influenced by the Nizam-era aesthetic.',
    cultural_notes: 'Hyderabad blends Mughal grandeur with Deccani sensibility. Tech-forward residents appreciate modern comfort but with cultural warmth. Both traditional and contemporary design work well.',
    local_influences: 'Bidriware metalwork as accent pieces, Kalamkari textile patterns, traditional arches and geometric inlay patterns inspired by Charminar-era architecture.',
  },

  'Bangalore': {
    climate_notes: 'Pleasant year-round climate (18–28°C). Rooms can use lighter, airier aesthetics. Good natural light is a consistent feature. Green, garden-city connections are appreciated.',
    material_preferences: 'Light woods (rubberwood, light teak). Natural fibres — jute, cotton, linen. Terracotta planters. Glass and polished concrete for modern homes. Mango wood furniture.',
    colour_sensibility: 'Bangalore leans modern and cosmopolitan — clean whites, soft greys, sage greens, warm woods, blush tones. The tech-culture influences minimalist-premium aesthetics. Plants and biophilic elements are strongly preferred.',
    cultural_notes: 'Cosmopolitan mix of Kannada culture, tech professionals, and expats. Design tends toward global contemporary with earthy, sustainable undertones. Books, art, and quality materials are valued.',
    local_influences: 'Bidriware occasional pieces, Channapatna wooden toys/decor, Mysore silk cushion covers, traditional brass oil lamps as statement decor.',
  },

  'Mumbai': {
    climate_notes: 'Hot and humid, especially in monsoon. Rooms need to feel airy despite often being compact. Space optimisation is critical — Mumbai homes tend toward smaller footprints with high-value styling.',
    material_preferences: 'Space-saving, high-quality furniture. Lacquered wood, polished stone, glass. Marine-grade materials for coastal properties. High-gloss finishes are acceptable. Reflective surfaces to amplify space.',
    colour_sensibility: 'Mumbai is glamorous and aspirational. Neutrals (off-white, warm grey) as base with bold accent walls or statement furniture. Jewel tones (deep teal, emerald, sapphire) are popular for premium homes. Gold hardware and accents are standard.',
    cultural_notes: 'Fast-paced, aspirational, cosmopolitan. Design reflects status and lifestyle. Both ultra-modern and traditional (Parsi, Gujarati, Maharashtrian) aesthetics have a place depending on the client.',
    local_influences: 'Warli art prints, Paithani silk textile patterns as accents, Bidri metalwork, Dhokra brass figurines for premium homes, coastal/marine aesthetic elements for waterfront properties.',
  },

  'Delhi': {
    climate_notes: 'Extreme seasons — hot dry summers, cold winters. Rooms should feel warm and cocooning in winter aesthetics. Heavy textiles, layered rugs, and warm lighting are appropriate. Summer staging can use lighter, breezier tones.',
    material_preferences: 'Marble is quintessential Delhi luxury. Heavy carved teak furniture. Block print textiles (Jaipur influence). Persian and Kashmiri rugs. Brass and copper fixtures.',
    colour_sensibility: 'Delhi appreciates opulence and scale. Rich jewel tones — deep burgundy, forest green, royal blue, warm gold. Heritage-inspired palettes with a modern twist. Both regal traditional and ultra-modern premium aesthetics work well depending on the area (South Delhi vs. Gurgaon).',
    cultural_notes: 'North Indian grandeur and scale. Space is used generously. Heritage craftsmanship is valued. South Delhi prefers more traditional luxury; Gurgaon/Noida leans modern corporate. Punjabi, Rajasthani, and Mughal influences coexist.',
    local_influences: 'Block print textiles, handknotted carpets, carved wooden furniture, lattice/jali screens, blue pottery accents, Rajasthani miniature art prints.',
  },

  'Pune': {
    climate_notes: 'Moderate climate, pleasant most of the year. Slightly cool evenings. Outdoor-indoor connection is valued. Garden views and natural light are important.',
    material_preferences: 'Warm teak and rosewood. Natural stone (local basalt and Shahabad). Cotton and linen textiles. Some industrial elements acceptable in newer residential areas (Baner, Hinjewadi).',
    colour_sensibility: 'Pune blends Maharashtrian traditional sensibility with a modern, educational-city openness. Warm neutrals — beige, camel, warm white — with natural green accents. More understated than Mumbai; quality over flash.',
    cultural_notes: 'Strong Maratha cultural pride. Educated, quality-conscious demographic. Traditional puja rooms are common. Both traditional and contemporary international design are embraced in this university city.',
    local_influences: 'Paithani silk accents, Ajrak and Maheshwari textile patterns, traditional Maharashtrian wooden furniture (carved rosewood), brass puja items as cultural markers.',
  },

  'Chennai': {
    climate_notes: 'Hot and humid tropical climate. Rooms benefit from light-coloured, cool-feeling aesthetics. Ventilation, ceiling fans (stylish ones), and cross-breeze design considerations matter. Stone and tile flooring is practically universal.',
    material_preferences: 'Granite and marble flooring (practically essential). Solid teak and neem wood furniture. Terracotta pots. Brass and bronze hardware. Cotton and handloom textiles (Kanjivaram silk accents).',
    colour_sensibility: 'Chennai tends toward warm, bright, auspicious colours — ivory, warm white, golden yellow, deep red, and earthy terracotta. Kolam-inspired geometric patterns are culturally resonant. Contemporary apartments increasingly use neutral international palettes.',
    cultural_notes: 'Deep Dravidian and Tamil cultural identity. Traditional elements (puja room, brass items, Tanjore art) are often expected even in modern homes. Family values and cultural continuity are strong. South Indian Brahmin aesthetic is distinct and respected.',
    local_influences: 'Tanjore painting reproductions, Kanjivaram silk cushion covers, bronze Nataraja or Ganesha accents, Chettinad teak furniture, kolam-inspired geometric patterns in rugs or tiles, brass hanging lamps.',
  },
}

export function buildRegionalBlock(city: string): string {
  const regional = REGIONAL_BLOCKS[city as City]
  if (!regional) return ''

  return `REGIONAL CONTEXT — ${city.toUpperCase()}:
Climate/spatial considerations: ${regional.climate_notes}
Material preferences: ${regional.material_preferences}
Colour sensibility: ${regional.colour_sensibility}
Cultural context: ${regional.cultural_notes}
Local design influences to incorporate: ${regional.local_influences}`
}

export const ALL_CITIES: City[] = [
  'Hyderabad',
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Pune',
  'Chennai',
]
