import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

interface ExtractPaletteRequest {
  room_id: string;
  project_id: string;
  style_seed_url: string; // the approved style seed render (CP2 approved)
}

interface ColourSwatch {
  role: string;         // "wall", "floor", "primary_furniture", "accent_1", "accent_2", "metal_finish"
  hex: string;          // e.g. "#C4A882"
  name: string;         // e.g. "Warm Taupe"
  pantone_approx?: string; // e.g. "PANTONE 7527 C" — optional, if detectable
  usage: string;        // e.g. "Walls and ceiling", "Hardwood flooring"
}

interface ColourPaletteJSON {
  swatches: ColourSwatch[];
  dominant_temperature: "warm" | "cool" | "neutral";
  saturation_level: "muted" | "moderate" | "vibrant";
  overall_mood: string; // e.g. "Earthy and grounded", "Cool and airy"
  extraction_confidence: "high" | "medium" | "low";
  notes: string;
}

const PALETTE_EXTRACTION_PROMPT = `You are an expert colour analyst specialising in interior design. I am providing you with a photorealistic AI-generated interior design render.

Your task: Extract the definitive colour palette from this render. This palette will be permanently locked and used to maintain colour consistency across all subsequent AI generations for this room.

Extract exactly 6 colour swatches in this role order:
1. wall — the dominant wall colour (or ceiling if wall colour is neutral white)
2. floor — the primary flooring colour/tone
3. primary_furniture — the most prominent furniture piece colour
4. accent_1 — the first accent/highlight colour (cushions, curtains, decor)
5. accent_2 — the second accent colour (different from accent_1)
6. metal_finish — the metal/hardware tone (gold, brass, chrome, matte black, etc.)

For each swatch, provide:
- role: one of the 6 roles above (exact strings)
- hex: the most accurate hex colour code you can determine (e.g. "#C4A882")
- name: a descriptive colour name as an interior designer would use it (e.g. "Warm Sandstone", "Deep Teal", "Aged Brass")
- pantone_approx: your best Pantone approximation if confident, or omit
- usage: what surface or element this colour represents in the room

Also provide:
- dominant_temperature: "warm" (oranges/reds/yellows dominate) | "cool" (blues/greys/greens) | "neutral" (balanced)
- saturation_level: "muted" | "moderate" | "vibrant"
- overall_mood: a brief evocative description (e.g. "Warm and luxurious with earthy grounding", "Clean Scandinavian with pops of warmth")
- extraction_confidence: "high" | "medium" | "low" based on image clarity and colour clarity
- notes: any important colour observations for the staging team

Return ONLY valid JSON — no markdown, no code blocks, no explanation:
{
  "swatches": [
    {
      "role": "<string>",
      "hex": "#XXXXXX",
      "name": "<string>",
      "pantone_approx": "<string or omit>",
      "usage": "<string>"
    }
  ],
  "dominant_temperature": "<warm|cool|neutral>",
  "saturation_level": "<muted|moderate|vibrant>",
  "overall_mood": "<string>",
  "extraction_confidence": "<high|medium|low>",
  "notes": "<string>"
}`;

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.includes("png") ? "image/png"
    : contentType.includes("webp") ? "image/webp"
    : "image/jpeg";
  return {
    data: btoa(String.fromCharCode(...new Uint8Array(buffer))),
    mimeType,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = (await req.json()) as ExtractPaletteRequest;
    const { room_id, project_id, style_seed_url } = body;

    if (!room_id || !project_id || !style_seed_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: room_id, project_id, style_seed_url" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 1. Fetch the style seed render as base64
    const { data: imageBase64, mimeType } = await fetchImageAsBase64(style_seed_url);

    // 2. Call Gemini 2.0 Flash in vision mode for colour extraction
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: imageBase64 } },
                { text: PALETTE_EXTRACTION_PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.05, // Near-zero for deterministic colour extraction
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errText}`);
    }

    const geminiResult = await geminiResponse.json();
    const textPart = geminiResult.candidates?.[0]?.content?.parts?.find(
      (p: Record<string, unknown>) => p.text
    );

    if (!textPart?.text) {
      throw new Error("No text response from Gemini");
    }

    // 3. Parse the JSON
    let paletteData: ColourPaletteJSON;
    try {
      const raw = textPart.text;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      paletteData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      throw new Error(`Failed to parse palette JSON: ${textPart.text.substring(0, 200)}`);
    }

    // 4. Store in rooms.colour_palette
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ colour_palette: paletteData })
      .eq("id", room_id);

    if (updateError) {
      console.error("Failed to update rooms.colour_palette:", updateError);
    }

    // 5. Log cost (vision call = ₹1.5)
    await supabase.from("api_cost_log").insert({
      project_id,
      room_id,
      call_type: "vision",
      resolution_tier: null,
      cost_inr: 1.5,
      gemini_model: "gemini-2.0-flash",
    });

    // 6. Activity log
    await supabase.from("activity_log").insert({
      project_id,
      room_id,
      action_type: "palette_extracted",
      action_description: `Colour palette extracted — ${paletteData.extraction_confidence} confidence · ${paletteData.dominant_temperature} tones`,
      metadata: {
        swatch_count: paletteData.swatches?.length ?? 0,
        confidence: paletteData.extraction_confidence,
        temperature: paletteData.dominant_temperature,
      },
    });

    return new Response(
      JSON.stringify({ success: true, colour_palette: paletteData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("extract-palette error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
