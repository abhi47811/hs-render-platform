// Section 18: Vastu Compliance Layer
// Auto-injected into Block 9 when project.vastu_required !== 'No'

export interface VastuContext {
  vastu_required: 'Yes' | 'No' | 'Partial'
  vastu_notes: string | null
  room_type: string
}

// Standard Vastu directives per room type
const VASTU_BY_ROOM: Record<string, string> = {
  'Living': `
    Vastu for Living Room: Position the main sofa/seating on the south or west wall so occupants face north or east while seated.
    Avoid placing heavy furniture in the northeast corner — keep that zone light and open.
    Television and entertainment units should be on the southeast wall.
    Use earthy, warm tones (cream, beige, light yellow) on walls.
    Avoid dark blue or black in main living areas.`,

  'Master Bedroom': `
    Vastu for Master Bedroom: Bed head should face south (best) or east — never north.
    Keep the southwest corner free of heavy storage above the waist height.
    Wardrobe should be on the south or west wall.
    Mirrors should not face the bed directly — place on north or east wall.
    Avoid placing the bedroom in the northeast corner of the overall home.
    Use calm, grounding colours — soft greens, blues, or warm neutrals.`,

  'Bedroom 2': `
    Vastu for Secondary Bedroom: Bed should ideally face east or south.
    Keep the room clutter-free with good ventilation.
    Colours should be soft and calming — avoid stimulating reds or harsh yellows.`,

  'Kitchen': `
    Vastu for Kitchen: Cooking stove should be in the southeast zone (fire element).
    The cook should ideally face east while cooking.
    Sink and water storage in the northeast or north.
    Avoid placing the stove directly opposite the entrance.
    Use warm, energising colours — yellows, oranges, greens are auspicious.`,

  'Dining': `
    Vastu for Dining Room: Dining table ideally in the west zone.
    Members should face east or north while dining — avoid south-facing.
    Keep the dining area well-lit, clean, and uncluttered.
    Avoid placing the dining area directly under a beam.`,

  'Study': `
    Vastu for Study/Work Area: Study desk should face east or north for concentration and clarity.
    Bookshelves on east, west, or north walls.
    Avoid clutter — keep the north and northeast zones of the desk clear.
    Good natural light from the east preferred.`,

  'Bathroom': `
    Vastu for Bathroom: Keep bathrooms in the northwest or west zone.
    Avoid placing bathrooms in the northeast corner.
    Ensure good ventilation. Toilet seat should not face north or east.
    Use light, clean colours — whites, light blues, or pale greens.`,

  'Balcony': `
    Vastu for Balcony: Balconies in the north or east are most auspicious.
    Keep them clean and bright.
    Plants and water features are positive in north/east balconies.
    Avoid excessive dark colours or heavy furniture that blocks light.`,

  'default': `
    Vastu compliance required for this room:
    Maintain positive energy flow — avoid clutter in northeast corners.
    Ensure natural light from north or east directions where possible.
    Use earthy, natural tones that are grounding and harmonious.
    Keep pathways and main axes clear and unobstructed.`,
}

export function buildVastuBlock(context: VastuContext): string | null {
  if (context.vastu_required === 'No') return null

  const baseDirective = VASTU_BY_ROOM[context.room_type] ?? VASTU_BY_ROOM['default']

  let block = `VASTU COMPLIANCE REQUIRED:\n${baseDirective.trim()}`

  // Append client-specific Vastu notes if provided
  if (context.vastu_notes && context.vastu_notes.trim()) {
    block += `\n\nClient-specific Vastu requirements: ${context.vastu_notes.trim()}`
  }

  if (context.vastu_required === 'Partial') {
    block += `\n\nNote: Vastu compliance is partial for this project — apply the above as design guidance rather than strict rules where they conflict with aesthetic goals.`
  }

  return block
}
