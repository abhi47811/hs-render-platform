import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

interface AnalyseSpaceRequest {
  room_id: string;
  project_id: string;
  shell_url: string; // should be the photorealistic_shell_url
}

interface SpatialConstraintJSON {
  vanishing_point: { x_pct: number; y_pct: number };
  depth_planes: {
    foreground: string;
    mid: string;
    background: string;
  };
  doors: Array<{
    location: string; // "left wall", "right wall", "back wall", "ceiling"
    approximate_position: string; // "top-left", "center", etc.
    notes: string;
  }>;
  windows: Array<{
    location: string;
    approximate_position: string;
    light_direction: string; // "from left", "overhead", etc.
    notes: string;
  }>;
  forbidden_zones: Array<{
    reason: string; // "door swing", "window sill", "structural column", "fixed fixture"
    location: string;
    approximate_pct: string; // e.g. "left 0-20% of floor"
  }>;
  furniture_zones: Array<{
    zone_name: string; // e.g. "main seating area", "dining zone"
    location: string;
    approximate_pct: string;
    notes: string;
  }>;
  ceiling_height_estimate: string; // e.g. "8-9 feet", "10+ feet"
  floor_area_estimate: string; // e.g. "small (< 150 sqft)", "medium (150-300 sqft)", "large (> 300 sqft)"
  structural_features: string[]; // e.g. ["false ceiling", "exposed beam", "arch", "niche"]
  lighting_conditions: string; // e.g. "bright natural from right", "diffuse overhead"
  analysis_confidence: "high" | "medium" | "low";
  analyst_notes: string;
}

const SPATIAL_ANALYSIS_PROMPT = `You are an expert interior spatial analyst. I am providing you with a photorealistic photograph of an empty room interior.

Your task: Perform a comprehensive spatial constraint analysis of this room to guide furniture placement in future AI-generated staging. Return ONLY a valid JSON object — no markdown, no code blocks, no explanation text outside the JSON.

Analyse the following carefully:

1. VANISHING POINT: Estimate the primary vanishing point as a percentage of image width (x_pct) and height (y_pct). Range 0-100 for each. This determines perspective anchoring.

2. DEPTH PLANES: Describe what constitutes the foreground (bottom 1/3), mid-ground (middle 1/3), and background (top/back 1/3) of the room.

3. DOORS: Identify every door, door frame, or opening. For each: location (which wall), approximate position in image, and any notes about swing direction or clearance needed.

4. WINDOWS: Identify every window, opening, or light source. For each: location, position, primary light direction it creates, notes about natural light.

5. FORBIDDEN ZONES: Identify areas where furniture CANNOT be placed:
   - In front of doors (door swing clearance)
   - On window sills or blocking windows
   - In structural pathways or load-bearing columns
   - In fixed fixtures (built-in wardrobes, kitchen units)
   - Electrical panels, AC vents, or floor outlets

6. FURNITURE ZONES: Identify optimal zones where furniture SHOULD be placed. Name each zone descriptively (e.g. "primary seating area", "TV wall zone", "dining corner").

7. CEILING HEIGHT ESTIMATE: Based on proportions and reference points visible in the image.

8. FLOOR AREA ESTIMATE: Estimate rough floor area category.

9. STRUCTURAL FEATURES: List any architectural features that would affect staging (false ceiling, exposed beams, arches, niches, columns, split levels).

10. LIGHTING CONDITIONS: Describe the natural light quality, direction, and intensity.

11. CONFIDENCE: Rate your overall analysis confidence as high/medium/low based on image quality and visibility.

12. ANALYST NOTES: Any critical observations the staging AI must know.

Return this exact JSON structure:
{
  "vanishing_point": { "x_pct": <number>, "y_pct": <number> },
  "depth_planes": { "foreground": "<string>", "mid": "<string>", "background": "<string>" },
  "doors": [{ "location": "<string>", "approximate_position": "<string>", "notes": "<string>" }],
  "windows": [{ "location": "<string>", "approximate_position": "<string>", "light_direction": "<string>", "notes": "<string>" }],
  "forbidden_zones": [{ "reason": "<string>", "location": "<string>", "approximate_pct": "<string>" }],
  "furniture_zones": [{ "zone_name": "<string>", "location": "<string>", "approximate_pct": "<string>", "notes": "<string>" }],
  "ceiling_height_estimate": "<string>",
  "floor_area_estimate": "<string>",
  "structural_features": ["<string>"],
  "lighting_conditions": "<string>",
  "analysis_confidence": "<high|medium|low>",
  "analyst_notes": "<string>"
}`;

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.includes("png") ? "image/png"
    : contentType.includes("webp") ? "image/webp"
    : "image/jpeg";
  const data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return { data, mimeType };
}

function extractJsonFromText(text: string): string {
  // Strip markdown code blocks if model returns them despite instructions
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
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
    const body = (await req.json()) as AnalyseSpaceRequest;
    const { room_id, project_id, shell_url } = body;

    if (!room_id || !project_id || !shell_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: room_id, project_id, shell_url" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 1. Fetch the enhanced shell as base64
    const { data: imageBase64, mimeType } = await fetchImageAsBase64(shell_url);

    // 2. Call Gemini in vision-only mode (text output only — no image generation)
    // Use gemini-2.0-flash for vision analysis (cheaper, faster)
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
                { text: SPATIAL_ANALYSIS_PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Low temperature for structured factual output
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

    // 3. Parse the JSON response
    let spatialData: SpatialConstraintJSON;
    try {
      const cleanJson = extractJsonFromText(textPart.text);
      spatialData = JSON.parse(cleanJson);
    } catch {
      throw new Error(`Failed to parse Gemini JSON response: ${textPart.text.substring(0, 200)}`);
    }

    // 4. Store in rooms.spatial_analysis
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ spatial_analysis: spatialData })
      .eq("id", room_id);

    if (updateError) {
      console.error("Failed to update rooms.spatial_analysis:", updateError);
    }

    // 5. Log API cost (vision call = ~₹1.5 flat)
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
      action_type: "spatial_analysis",
      action_description: `Spatial analysis complete — ${spatialData.analysis_confidence} confidence`,
      metadata: {
        doors_count: spatialData.doors?.length ?? 0,
        windows_count: spatialData.windows?.length ?? 0,
        forbidden_zones_count: spatialData.forbidden_zones?.length ?? 0,
        furniture_zones_count: spatialData.furniture_zones?.length ?? 0,
        confidence: spatialData.analysis_confidence,
      },
    });

    return new Response(
      JSON.stringify({ success: true, spatial_analysis: spatialData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("analyse-space error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
