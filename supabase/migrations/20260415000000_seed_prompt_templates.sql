-- Migration: Seed Prompt Template Library
-- Sprint 10 — Sec 36: Starter templates for all 6 passes × core room types × primary styles
--
-- Pass mapping:
--   Pass 1 → style_seed    (overall mood, palette, look-and-feel)
--   Pass 2 → flooring      (floor materials and finishes)
--   Pass 3 → main_furniture (primary furniture pieces and layout)
--   Pass 4 → accent_pieces  (accent furniture, cushions, rugs)
--   Pass 5 → lighting       (fixtures and ambiance)
--   Pass 6 → decor          (plants, art, accessories, finishing touches)
--
-- Room types seeded: living_room, master_bedroom, kitchen, dining_room, home_office, kids_room
-- Styles seeded: modern_indian, contemporary, minimal, classic_luxury, tropical

-- ─── LIVING ROOM — MODERN INDIAN ─────────────────────────────────────────────

INSERT INTO public.prompt_templates (name, room_type, style, city, pass_number, instruction, usage_count, zero_revision_count, success_rate, is_active) VALUES

-- Pass 1: Style Seed
(
  'Living Room — Modern Indian Style Seed',
  'living_room', 'modern_indian', NULL, 1,
  'Transform this empty shell into a Modern Indian living room. The mood is warm, refined, and rooted in Indian sensibility. Use a base palette of warm ivory walls with deep teal or emerald green as the primary accent. Layer in brass and warm gold metallic accents throughout. The space should feel aspirational yet culturally grounded. Reference images define the furniture placement and proportions — reproduce that spatial arrangement exactly. Render in photorealistic style with soft afternoon light entering from the left, creating warm shadows. Overall atmosphere: wealthy yet approachable, the home of a cultured Indian professional.',
  0, 0, 0, true
),

-- Pass 2: Flooring
(
  'Living Room — Italian Marble Flooring (Modern Indian)',
  'living_room', 'modern_indian', NULL, 2,
  'Apply polished Italian Carrara white marble flooring with subtle grey veining throughout the living area. Use large 1200×1200mm tiles laid in a straight grid pattern with 3mm off-white grout lines. The marble should reflect the ceiling lights softly — avoid mirror-like over-reflection. Transition to a 600×600mm beige marble border at the walls. Keep all existing furniture, walls, and ceiling elements exactly as they are. Only modify the floor surface. Lighting and shadow should update naturally to reflect the new marble surface.',
  0, 0, 0, true
),
(
  'Living Room — Engineered Oak Wood Flooring (Modern Indian)',
  'living_room', 'modern_indian', NULL, 2,
  'Install wide-plank engineered oak wood flooring in a warm honey-brown finish throughout the living room. Use 200mm wide planks laid in a straight horizontal pattern parallel to the main wall. The wood should have a semi-matte satin finish showing natural grain and slight knot variations. Apply a thin 80mm white skirting board at all wall bases. Keep all existing furniture and wall treatments unchanged. Cast natural-looking shadows from furniture legs onto the wood floor. The floor should feel warm and tactile, complementing the Indian-contemporary design direction.',
  0, 0, 0, true
),

-- Pass 3: Main Furniture
(
  'Living Room — L-Sofa + TV Unit (Modern Indian)',
  'living_room', 'modern_indian', NULL, 3,
  'Place a large L-shaped sectional sofa in deep teal fabric with brass nail-head trim along the arms. The sofa should have clean contemporary lines with a slightly tufted seat. Opposite the sofa, install a full-width wall-mounted TV unit in warm walnut veneer with integrated LED strip lighting underneath and above. The TV panel backing wall should be clad in vertical fluted walnut panels from floor to ceiling. Centre a large round coffee table in smoked glass on brass hairpin legs in front of the sofa. All pieces must follow the spatial layout defined in the reference images — do not reinterpret the furniture arrangement.',
  0, 0, 0, true
),

-- Pass 4: Accent Pieces
(
  'Living Room — Accent Furniture + Rugs (Modern Indian)',
  'living_room', 'modern_indian', NULL, 4,
  'Add a large 3×4m hand-knotted wool rug in cream with a subtle geometric Indian block-print pattern in gold thread — centred under the coffee table and sofa. Place two brass-and-cane accent chairs flanking the sofa. Add a pair of brushed brass floor lamps with off-white linen shades behind the sofa ends. Include a mid-height console table in dark walnut against the entrance wall with a hammered brass bowl and a small sculptural stone piece on top. Add two throw cushions in jewel-toned velvet (ruby and emerald) on the sofa. Keep all existing main furniture unchanged.',
  0, 0, 0, true
),

-- Pass 5: Lighting
(
  'Living Room — Warm Layered Lighting (Modern Indian)',
  'living_room', 'modern_indian', NULL, 5,
  'Install a statement brass jali chandelier (600mm diameter, 5-arm, lantern-form with geometric cutouts casting patterned light) centred over the coffee table at ceiling height. Add 6 recessed downlights in a 2×3 grid around the chandelier for ambient fill. Install a continuous warm-white LED cove strip behind the ceiling perimeter at 2850K colour temperature. Add subtle under-shelf LED lighting inside the TV unit niches. All lighting should be warm white (2700K–3000K) and the room should feel like a well-lit evening scene with soft, flattering shadows. No harsh or cool-toned lighting.',
  0, 0, 0, true
),

-- Pass 6: Decor
(
  'Living Room — Finishing Decor (Modern Indian)',
  'living_room', 'modern_indian', NULL, 6,
  'Complete the living room with final decor touches. Add a large abstract canvas artwork (1200×900mm) above the TV wall credenza — warm ochre, teal, and ivory tones with Indian-inspired geometric forms. Place 3 varying-height floor plants (fiddle-leaf fig, snake plant, and trailing pothos) in brushed brass planters in the corners and beside the sofa. Style the coffee table with 3 art books, a small white ceramic vase with dried pampas grass, and a decorative stone sphere. Add a tall brass-frame mirror (full-length) beside the entrance. Keep all existing furniture and lighting unchanged.',
  0, 0, 0, true
),

-- ─── MASTER BEDROOM — CONTEMPORARY ──────────────────────────────────────────

-- Pass 1: Style Seed
(
  'Master Bedroom — Contemporary Luxury Style Seed',
  'master_bedroom', 'contemporary', NULL, 1,
  'Transform this shell into a contemporary luxury master bedroom. The overall mood is calm, hotel-like, and cocoon-like. Use a palette of warm greige walls (paint in warm greige tone), off-white ceiling, with deep charcoal grey as the accent. The room should feel serene and high-end — think a 5-star boutique hotel suite. Reference images define the spatial layout — maintain all proportions exactly. Render with soft morning light diffused through sheer drapes, creating a gentle luminous atmosphere. No harsh contrasts, no bright pops of colour. The luxury here is in the quality of materials and restraint of palette.',
  0, 0, 0, true
),

-- Pass 2: Flooring
(
  'Master Bedroom — Herringbone Oak Flooring (Contemporary)',
  'master_bedroom', 'contemporary', NULL, 2,
  'Install dark walnut engineered wood flooring in a classic herringbone pattern throughout the master bedroom. The wood colour is dark chocolate brown with natural grain variation and a low-sheen matte finish — no glossy reflections. Individual plank size should be 90×360mm. Add a thin brushed brass threshold strip at the bedroom entrance. Place a soft area rug under the bed (approximately 2×3m) in cream wool to anchor the bed zone — this rug is part of the floor composition but should show its texture. Keep all walls, ceiling, and existing elements unchanged.',
  0, 0, 0, true
),

-- Pass 3: Main Furniture
(
  'Master Bedroom — Upholstered Bed + Wardrobes (Contemporary)',
  'master_bedroom', 'contemporary', NULL, 3,
  'Place a king-size upholstered platform bed with a full-height padded headboard in soft mushroom grey linen against the feature wall. The headboard should reach from floor to ceiling (2.7m high) and extend 200mm wider than the bed on each side. Install floor-to-ceiling sliding wardrobes on the opposite wall in a warm white matte lacquer with recessed finger-pull handles in brushed gold. Add two floating bedside tables in light oak wood with a single drawer. Keep the bed placement exactly as shown in the reference images — do not change the room layout.',
  0, 0, 0, true
),

-- Pass 4: Accent Pieces
(
  'Master Bedroom — Accent Pieces (Contemporary)',
  'master_bedroom', 'contemporary', NULL, 4,
  'Style the master bedroom with accent pieces. Layer the bed with crisp white linen bedding, add 6 pillows (2 square European pillow shams in textured linen, 2 standard pillows in white, 2 decorative lumbar pillows in charcoal velvet). Place a small upholstered bench at the foot of the bed in complementary grey bouclé fabric. Add a contemporary arc floor lamp in matte black with a white shade beside one bedside table. Place a small oval side mirror in brushed gold on the wall above one bedside. Keep all main furniture and flooring unchanged.',
  0, 0, 0, true
),

-- Pass 5: Lighting
(
  'Master Bedroom — Bedroom Lighting (Contemporary)',
  'master_bedroom', 'contemporary', NULL, 5,
  'Install a pair of matching pendant lights (20cm diameter, globe form in smoked glass with brushed brass fittings) hanging from the ceiling on long cords, positioned over each bedside table. Add 4 recessed downlights in a symmetrical pattern for ambient ceiling fill at 2700K warm white. Install a warm LED cove light strip running along the top perimeter of the full-height headboard panel, creating a soft halo glow behind the headboard. Add a narrow LED strip under the bed frame for a subtle floating effect. All light should be warm and intimate — this should look like a warmly lit evening in a luxury hotel suite.',
  0, 0, 0, true
),

-- Pass 6: Decor
(
  'Master Bedroom — Finishing Decor (Contemporary)',
  'master_bedroom', 'contemporary', NULL, 6,
  'Complete the master bedroom with final styling. Place matching ceramic table lamps (white with gold base) on each bedside table. Add a large abstract canvas (900×1200mm) in muted tones (cream, warm grey, soft blush) above the headboard, centred. Style one bedside with a small vase of dried flowers, a single hardcover book, and a glass of water. Add a potted fiddle-leaf fig (1.5m height) in a matt white ceramic planter in the corner by the window. Hang thin sheer cream linen curtains on a black iron rod across the full window wall — curtains should pool slightly on the floor. Keep all existing furniture and lighting unchanged.',
  0, 0, 0, true
),

-- ─── KITCHEN — MODERN INDIAN ─────────────────────────────────────────────────

-- Pass 1: Style Seed
(
  'Kitchen — Modern Indian Contemporary Style Seed',
  'kitchen', 'modern_indian', NULL, 1,
  'Transform this kitchen shell into a modern Indian contemporary kitchen. The palette is warm white cabinetry with dark green island or accent cabinets, brass hardware throughout, and warm white stone countertops. The mood should feel premium, functional, and Instagram-worthy. Think a high-end Mumbai apartment kitchen. Reference images define the spatial layout — do not change cabinet positions or proportions. Render with bright natural daylight from overhead and windows, supplemented by warm under-cabinet LED lighting. The kitchen should look aspirational yet achievable for the Indian upper-middle-class homeowner.',
  0, 0, 0, true
),

-- Pass 2: Flooring
(
  'Kitchen — Large Format Porcelain Tiles (Modern Indian)',
  'kitchen', 'modern_indian', NULL, 2,
  'Apply large format 800×800mm porcelain floor tiles in a warm beige with subtle concrete-look texture throughout the kitchen. Use a straight grid layout with 2mm light grey grout lines. The tile finish should be matte to avoid slippery-looking reflections while still having depth and quality. Apply matching 100mm skirting tiles at the base of all cabinets. If there is an island, ensure the tile runs continuously under it without interruption. Keep all cabinets, countertops, appliances, and walls unchanged.',
  0, 0, 0, true
),

-- Pass 3: Main Cabinetry
(
  'Kitchen — Shaker Cabinetry + Stone Countertops (Modern Indian)',
  'kitchen', 'modern_indian', NULL, 3,
  'Install classic shaker-profile cabinetry in warm white matte finish for all upper and lower wall cabinets. Make the kitchen island (if present) in deep forest green matte lacquer with brass bar-pull handles. Apply Calacatta gold quartz countertops throughout — white base with warm gold veining. Install a full-height backsplash of 300×600mm white metro tiles in a horizontal brick-bond pattern with white grout. All appliances remain stainless steel. The deep green island against white perimeter cabinets should be the focal design statement. Keep the spatial layout exactly as shown in the reference images.',
  0, 0, 0, true
),

-- Pass 5: Lighting
(
  'Kitchen — Task + Ambient Lighting (Modern Indian)',
  'kitchen', 'modern_indian', NULL, 5,
  'Install a row of 3 pendant lights over the kitchen island — aged brass pendants in an industrial-meets-artisan style, approximately 200mm diameter, spaced 450mm apart. Add continuous warm-white LED under-cabinet strip lighting below all upper cabinets to illuminate the countertop work areas. Install 6 recessed downlights in the main kitchen ceiling for ambient fill at 3000K colour temperature. Add a single pendant or chandelier over the dining zone if one exists. All lighting should be warm white (2700–3000K). No cool blue-white lighting. The kitchen should feel warm, inviting, and professional when rendered.',
  0, 0, 0, true
),

-- ─── DINING ROOM — MODERN INDIAN ─────────────────────────────────────────────

-- Pass 1: Style Seed
(
  'Dining Room — Modern Indian Style Seed',
  'dining_room', 'modern_indian', NULL, 1,
  'Transform this shell into a Modern Indian dining room. The mood is celebratory, warm, and suited to family gatherings and dinner parties. Feature an accent wall in deep jewel tone (midnight blue or bottle green) behind the dining table, with the other walls in warm white. Use warm brass and dark walnut materials throughout. The space should feel generous — wide enough for 6-8 people to dine comfortably. Reference images define the spatial layout — maintain all proportions exactly. Render in warm evening light with a statement chandelier as the focal point. The atmosphere should feel like a beautiful Indian home ready for a dinner party.',
  0, 0, 0, true
),

-- Pass 3: Dining Table + Chairs
(
  'Dining Room — Solid Wood Table + Upholstered Chairs (Modern Indian)',
  'dining_room', 'modern_indian', NULL, 3,
  'Place a 2.4m × 1.0m solid live-edge walnut dining table with a natural finish and visible wood grain at centre of the dining space. Surround it with 8 upholstered dining chairs in deep teal velvet with dark walnut legs — 3 chairs on each long side and 1 at each short end. The chair back height should be approximately 900mm. Add a matching walnut sideboard against the feature wall with brass ring handles on 4 drawers. Keep the room layout exactly as shown in the reference images — only modify the furniture selection.',
  0, 0, 0, true
),

-- Pass 5: Lighting
(
  'Dining Room — Chandelier + Ambient Lighting (Modern Indian)',
  'dining_room', 'modern_indian', NULL, 5,
  'Install a statement brass globe chandelier (800mm diameter, multi-arm cluster of 12 bulbs) centred directly above the dining table at 1.8m from floor level. The chandelier style should be transitional — not too ornate but definitely a conversation piece. Add 4 recessed downlights in the ceiling corners for ambient fill. Install a picture light above the artwork on the feature wall. All lighting at 2700K warm white. The rendered scene should be in warm evening light — chandelier on, windows dark outside, creating a warm intimate dining atmosphere.',
  0, 0, 0, true
),

-- ─── HOME OFFICE — MINIMAL ───────────────────────────────────────────────────

-- Pass 1: Style Seed
(
  'Home Office — Minimal Style Seed',
  'home_office', 'minimal', NULL, 1,
  'Transform this shell into a calm, minimal home office space. The mood is focused, uncluttered, and creative. Use white walls, a single feature wall in very pale sage green, and natural light wood furniture. This should feel like the workspace of a thoughtful creative professional — organised, serene, nothing out of place. Reference images define the room proportions and spatial layout — maintain exactly. Render in clear bright morning daylight with natural shadows. The goal is a space that looks productive yet peaceful — zero visual clutter, high craft in the details.',
  0, 0, 0, true
),

-- Pass 3: Furniture
(
  'Home Office — Desk + Shelving (Minimal)',
  'home_office', 'minimal', NULL, 3,
  'Install a large 1800×800mm solid oak writing desk against the window or feature wall. Use hairpin legs in matte black steel — clean and contemporary. Mount floor-to-ceiling open shelving in light oak on the adjacent wall (3 columns, 5 shelves high) with a minimal floating appearance and thin steel brackets. Place an ergonomic task chair in light grey mesh at the desk. Add a low 2-seat sofa in stone grey beside a side table for reading or calls. Keep the layout exactly as shown in reference images — only update the furniture.',
  0, 0, 0, true
),

-- Pass 6: Decor
(
  'Home Office — Styling + Decor (Minimal)',
  'home_office', 'minimal', NULL, 6,
  'Style the home office with curated, purposeful decor. On the shelves: arrange books by colour blocking (white/cream spines on upper shelves, darker spines lower), add 3 small sculptural objects in white plaster or natural stone, one small potted succulent, and a framed black-and-white architecture print. On the desk: a clean desk mat in cognac leather, a single monitor on a riser, a desk lamp in matte black, and a small ceramic pen holder. One large monstera plant in a simple black cylindrical planter in the corner. No clutter, nothing decorative that is not intentional. Keep all furniture and lighting unchanged.',
  0, 0, 0, true
),

-- ─── KIDS ROOM — CONTEMPORARY ────────────────────────────────────────────────

-- Pass 1: Style Seed
(
  'Kids Room — Contemporary Playful Style Seed',
  'kids_room', 'contemporary', NULL, 1,
  'Transform this shell into a bright, contemporary kids room for a child aged 6-10 years. The mood is playful but not chaotic — refined enough for design-conscious Indian parents, fun enough for a child to love. Use a soft white base with one accent wall in a gentle warm coral or sky blue. Introduce pops of colour through furniture and soft furnishings — not through wall treatments. The space must feel safe, organised, and imaginative. Reference images define the layout — follow exactly. Render in bright cheerful daylight — this should feel like a sunny afternoon in a happy home.',
  0, 0, 0, true
),

-- Pass 3: Furniture
(
  'Kids Room — Bed + Study + Storage (Contemporary)',
  'kids_room', 'contemporary', NULL, 3,
  'Place a single loft bed with an integrated study desk underneath in white MDF with a safe ladder on one side. The underside of the loft houses a compact study zone: 1200mm wide desk with an ergonomic kids chair in bright yellow. On the opposite wall, install a full-width modular storage unit in white with mix of open shelves and closed cubby doors in soft coral and sky blue accents. Include a small two-seater sofa or bean bag in the corner for reading. Keep all dimensions proportional to a 10×12 foot room and layout exactly as in the reference images.',
  0, 0, 0, true
),

-- ─── LIVING ROOM — CLASSIC LUXURY ────────────────────────────────────────────

-- Pass 1: Style Seed
(
  'Living Room — Classic Luxury Style Seed',
  'living_room', 'classic_luxury', NULL, 1,
  'Transform this shell into a classic luxury living room inspired by premium Indian hospitality spaces. The mood is opulent, timeless, and grand. Use a palette of warm cream and champagne white walls with rich burgundy, royal blue, or deep forest green accents. Feature ornate plaster cornice mouldings on the ceiling, wainscotting panels on the lower walls. All metals should be 24K gold tone. Marble everywhere. The space should feel like it belongs in a 5-star heritage hotel. Reference images define the spatial layout — maintain all proportions exactly. Render in warm golden evening light with all interior lights on for maximum opulence.',
  0, 0, 0, true
),

-- Pass 3: Furniture
(
  'Living Room — Classic Carved Furniture (Classic Luxury)',
  'living_room', 'classic_luxury', NULL, 3,
  'Furnish with a 3+1+1 classic Chesterfield-inspired sofa set in deep burgundy button-tufted velvet with carved solid wood frames finished in dark walnut. Centre a large carved marble-top coffee table on decorative gold legs. Install an ornate carved TV/display cabinet in dark walnut with gold inlay details against the main wall. Add 2 high-backed winged armchairs in royal blue velvet beside the fireplace or focal point. Place a console table in gold and marble at the entrance wall with a matching mirror above it. Maintain the spatial layout exactly as defined in reference images.',
  0, 0, 0, true
),

-- ─── LIVING ROOM — TROPICAL ──────────────────────────────────────────────────

-- Pass 1: Style Seed
(
  'Living Room — Tropical Style Seed',
  'living_room', 'tropical', NULL, 1,
  'Transform this shell into a tropical contemporary living room suited to Indian coastal cities (Mumbai, Chennai, Goa). The mood is relaxed, lush, and resort-like. Use warm white walls with natural materials: rattan, cane, woven grass, teak, and terracotta. Introduce abundant tropical greenery — large palms, bird of paradise, pothos, monstera. Colour palette: white, warm sand, terracotta, natural green, with small accents in ocean blue or coral. The space should feel like a beautiful tropical home — breezy, natural, and completely calming. Reference images define the layout. Render in bright, airy natural light with shadows of plants casting across surfaces.',
  0, 0, 0, true
),

-- Pass 3: Furniture
(
  'Living Room — Natural Rattan + Teak Furniture (Tropical)',
  'living_room', 'tropical', NULL, 3,
  'Furnish the living room with a large 3-seater teak-framed sofa with thick removable cushions in off-white outdoor-grade fabric. Add 2 rattan occasional chairs with white cushions on the opposite side. Centre a large round teak coffee table with a lower cane shelf. Install a low teak media console with rattan door fronts against the main wall. Add a tall bamboo bookshelf in one corner styled with books, baskets, and trailing plants. All furniture should have a hand-crafted, artisanal quality — not factory perfect. Keep the layout exactly as defined in reference images.',
  0, 0, 0, true
);
