import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Optional environment config — if provided, shell enhancement + staging are
// combined into a SINGLE Gemini call instead of two separate API calls.
interface EnvironmentConfig {
  style: string;        // e.g. "Modern Contemporary", "Scandinavian"
  room_type: string;    // e.g. "Living Room", "Master Bedroom"
  palette?: string;     // e.g. "Warm Neutrals", "Jewel Tones"
  custom_prompt?: string; // Any extra instructions from the designer
  resolution_tier?: "1K" | "2K" | "4K";
}

interface EnhanceShellRequest {
  room_id: string;
  project_id: string;
  shell_url: string;
  // If provided → one Gemini call does both shell enhancement + staging
  environment?: EnvironmentConfig;
}

// ─── PROMPT: Shell-only photorealism ─────────────────────────────────────────
const SHELL_ONLY_PROMPT = `YOU ARE PERFORMING A PHOTOREALISM TREATMENT — NOT AN INTERIOR DESIGN TASK.

⚠️ CRITICAL CONSTRAINT — READ THIS FIRST:
This is a BARE SHELL room. It is INTENTIONALLY EMPTY.
DO NOT add any furniture.
DO NOT add any decor objects.
DO NOT add any rugs, curtains, lamps, plants, cushions, or any objects whatsoever.
DO NOT add anything that was not already present in the input image.
The room MUST remain 100% empty in the output — just walls, floor, ceiling, windows, and doors.
If you add even one piece of furniture, the task has FAILED.

WHAT THIS TASK IS:
You are an architectural visualization renderer. I am giving you a 3D render from Coohom interior design software. Your only job is to apply photorealistic visual treatment to the existing surfaces and lighting — nothing else. The room content (empty space) must be IDENTICAL before and after. Only the visual quality of the surfaces and lighting changes.

WHAT STAYS EXACTLY THE SAME (do not change any of these):
- The room is completely empty — no furniture, no objects (THIS DOES NOT CHANGE)
- Room layout, wall positions, ceiling height, floor area
- Location and size of every window, door, and door frame
- Camera angle, perspective, and composition

WHAT YOU MUST IMPROVE (surfaces and lighting only):

1. LIGHTING — Replace the flat CG lighting with natural photographic lighting:
   - Bright directional sunlight through windows with visible light shafts
   - Realistic caustics and light scatter on walls and floor
   - Strong contrast between sunlit areas and shadows
   - Warm colour temperature on sunlit surfaces, cool ambient fill in shadows
   - Window frames casting sharp rectangular shadow patterns on floor and walls

2. SURFACE TEXTURES — Replace plastic-looking CG surfaces with real material textures:
   - Walls: visible paint texture, subtle roller marks, slight sheen variation
   - Floor: clear tile grout lines, specular reflections, surface grain
   - Ceiling: plaster texture, slight paint colour variation

3. AMBIENT OCCLUSION — Pronounced contact shadows on all joins:
   - Dark shadow gradient at every wall-floor junction
   - Shadow accumulation in corners where walls meet the ceiling and floor
   - Darkening under window sills, above door frames

4. DEPTH OF FIELD — Wide-angle architectural lens:
   - Foreground slightly sharper, background elements have natural softness
   - Subtle lens vignetting at corners

5. ATMOSPHERE — Real space feel:
   - Faint dust particles visible in window light beams
   - Natural surface imperfections: tiny wall scuffs, slight colour variation

OUTPUT: A photographic image that looks like a professional architectural photographer shot an empty room with a DSLR camera. The room IS EMPTY. There is NO furniture. Only the photorealistic quality of the surfaces and lighting is different from the input.`;

// ─── PROMPT: Combined shell enhancement + staging ────────────────────────────
const buildCombinedPrompt = (env: EnvironmentConfig): string => `You are a world-class architectural visualization and interior design artist. I am giving you a 3D render from interior design software (Coohom). Your job is to transform this render into a FULLY STYLED, PHOTOREALISTIC interior photograph — completely indistinguishable from a real photograph of a real designed room.

THIS IS A TWO-PART TRANSFORMATION. Do BOTH in a single output image:

PART 1 — PHOTOREALISM (apply to every surface):
- Replace flat CG lighting with natural sunlight through windows: light shafts, caustics, warm/cool contrast
- Add realistic surface textures: painted plaster walls, floor grain, ceiling texture, grout lines
- Apply heavy ambient occlusion at all wall-floor-ceiling junctions and corners
- Wide-angle lens depth-of-field with natural vignetting
- Atmospheric particles in light beams, subtle surface imperfections

PART 2 — INTERIOR STYLING (furnish and design the room):
- Room Type: ${env.room_type}
- Design Style: ${env.style}
- Colour Palette: ${env.palette ?? "Warm neutrals with natural wood accents"}
${env.custom_prompt ? `- Additional instructions: ${env.custom_prompt}` : ""}

Furnishing guidelines:
- Add furniture, lighting, decor, and textiles appropriate for a ${env.room_type} in ${env.style} style
- All pieces must be proportionally correct for the room dimensions
- Arrange furniture in a natural, liveable layout — not showroom-stiff
- Layer textures: soft furnishings (cushions, rugs, throws), hard surfaces (wood, stone, metal)
- Include realistic details: books, plants, small decor objects — nothing generic or floating
- Lighting: add table lamps, pendant or ceiling fixture if appropriate, subtle ambient glow

WHAT MUST STAY THE SAME (room structure only):
- Wall positions, ceiling height, floor area
- Window and door locations and sizes
- Camera angle and composition

OUTPUT: A single photographic image that looks like a professional interior design photograph from Architectural Digest. Both the photorealism AND the styling must be exceptional quality.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image from: ${url}`);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.includes("png") ? "image/png"
    : contentType.includes("webp") ? "image/webp"
    : "image/jpeg";

  // Chunked base64 — avoids "Maximum call stack size exceeded" on large images
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return { data: btoa(binary), mimeType };
}

async function callGemini(prompt: string, imageData: string, mimeType: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: imageData } },
            { text: prompt },
          ],
        }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 500)}`);
  }

  const result = await response.json();
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: Record<string, unknown>) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image returned by Gemini — check model availability");
  }
  return imagePart.inlineData.data as string;
}

async function uploadToStorage(
  bucket: string,
  filePath: string,
  imageBase64: string,
  contentType = "image/jpeg"
): Promise<string> {
  const imageBuffer = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, imageBuffer, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as EnhanceShellRequest;
    const { room_id, project_id, shell_url, environment } = body;

    if (!room_id || !project_id || !shell_url) {
      return new Response(JSON.stringify({ error: "Missing required fields: room_id, project_id, shell_url" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch shell image
    const { data: shellBase64, mimeType } = await fetchImageAsBase64(shell_url);

    // ── COMBINED mode: one call does shell enhancement + environment staging ──
    if (environment) {
      const combinedPrompt = buildCombinedPrompt(environment);
      const stagedBase64 = await callGemini(combinedPrompt, shellBase64, mimeType);

      // Upload staged result to renders bucket
      const resolutionTier = environment.resolution_tier ?? "2K";
      const stagedPath = `${project_id}/${room_id}/combined_pass1_A_${Date.now()}.jpg`;
      const stagedUrl = await uploadToStorage("renders", stagedPath, stagedBase64);

      // Set both shell URLs so the flow automatically skips the Environment step
      // and lands directly on CP1 (Shell Approval) with the fully staged result
      const { error: roomUpdateError } = await supabase.from("rooms").update({
        photorealistic_shell_url: stagedUrl,
        enhanced_shell_url: stagedUrl,   // skips Environment step
        design_style: environment.style, // skips Style Config step
      }).eq("id", room_id);

      if (roomUpdateError) {
        throw new Error(`DB room update failed: ${roomUpdateError.message}`);
      }

      // Insert render row so it appears in the gallery
      const { error: renderInsertError } = await supabase.from("renders").insert({
        room_id,
        project_id,
        pass_number: 1,
        pass_type: "combined",
        variation_label: "A",
        resolution_tier: resolutionTier,
        storage_url: stagedUrl,
        thumbnail_url: stagedUrl,
        status: "generated",
        prompt_used: combinedPrompt,
        references_used: [`Shell: ${shell_url}`],
        api_cost: resolutionTier === "4K" ? 15.0 : resolutionTier === "2K" ? 6.0 : 2.5,
      });

      if (renderInsertError) {
        console.error("Render insert failed (non-fatal):", renderInsertError.message);
      }

      // Cost log
      await supabase.from("api_cost_log").insert({
        project_id,
        room_id,
        call_type: "combined_enhancement",
        resolution_tier: resolutionTier,
        cost_inr: resolutionTier === "4K" ? 15.0 : resolutionTier === "2K" ? 6.0 : 2.5,
        gemini_model: "gemini-3.1-flash-image-preview",
      });

      // Activity log
      await supabase.from("activity_log").insert({
        project_id,
        room_id,
        action_type: "combined_enhancement",
        action_description: `Shell enhanced + ${environment.style} ${environment.room_type} staged in one pass`,
        metadata: { shell_url, staged_url: stagedUrl, environment },
      });

      return new Response(
        JSON.stringify({
          success: true,
          mode: "combined",
          photorealistic_url: stagedUrl,
          staged_url: stagedUrl,
        }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── SHELL-ONLY mode: bare photorealistic shell (original behaviour) ───────
    const enhancedBase64 = await callGemini(SHELL_ONLY_PROMPT, shellBase64, mimeType);
    const shellPath = `${project_id}/${room_id}/photorealistic_shell.jpg`;
    const photorealisticUrl = await uploadToStorage("shells", shellPath, enhancedBase64);

    // Update room record
    const { error: shellRoomUpdateError } = await supabase.from("rooms")
      .update({ photorealistic_shell_url: photorealisticUrl })
      .eq("id", room_id);

    if (shellRoomUpdateError) {
      throw new Error(`DB room update failed: ${shellRoomUpdateError.message}`);
    }

    // Cost log
    await supabase.from("api_cost_log").insert({
      project_id,
      room_id,
      call_type: "enhancement",
      resolution_tier: null,
      cost_inr: 6.0,
      gemini_model: "gemini-3.1-flash-image-preview",
    });

    // Activity log
    await supabase.from("activity_log").insert({
      project_id,
      room_id,
      action_type: "shell_photorealistic",
      action_description: "Shell enhanced to photorealistic quality",
      metadata: { shell_url, photorealistic_url: photorealisticUrl },
    });

    return new Response(
      JSON.stringify({ success: true, mode: "shell_only", photorealistic_url: photorealisticUrl }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("enhance-shell error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
