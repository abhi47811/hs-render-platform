import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface GenerateStagingRequest {
  room_id: string;
  project_id: string;
  pass_number: number;
  pass_type: string;
  prompt: string;
  reference_urls: string[];
  resolution_tier: "1K" | "2K" | "4K";
  variation_count: number;
  requested_by: string;
}

const COST_PER_IMAGE = {
  "1K": 2.5,
  "2K": 6.0,
  "4K": 15.0,
};

const getVariationLabels = (count: number): string[] => {
  const labels = ["A", "B", "C"];
  return labels.slice(0, count);
};

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = await response.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const uploadToSupabase = async (
  projectId: string,
  roomId: string,
  passNumber: number,
  variationLabel: string,
  imageBase64: string
): Promise<string> => {
  const fileName = `pass${passNumber}_${variationLabel}.jpg`;
  const filePath = `${projectId}/${roomId}/${fileName}`;

  const imageBuffer = Uint8Array.from(atob(imageBase64), (c) =>
    c.charCodeAt(0)
  );

  const { data, error } = await supabase.storage
    .from("renders")
    .upload(filePath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("renders").getPublicUrl(filePath);

  return publicUrl;
};

const generateWithGemini = async (
  prompt: string,
  referenceUrls: string[]
): Promise<string> => {
  const parts: Record<string, unknown>[] = [];

  for (const url of referenceUrls) {
    try {
      const base64 = await fetchImageAsBase64(url);
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64,
        },
      });
    } catch (err) {
      console.error(`Failed to process reference URL: ${url}`, err);
    }
  }

  parts.push({
    text: prompt,
  });

  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const result = await response.json();

  if (
    !result.candidates ||
    !result.candidates[0] ||
    !result.candidates[0].content ||
    !result.candidates[0].content.parts
  ) {
    throw new Error("No image generated in Gemini response");
  }

  const imagePart = result.candidates[0].content.parts.find(
    (part: Record<string, unknown>) => part.inlineData
  );
  if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
    throw new Error("No image data in Gemini response");
  }

  return imagePart.inlineData.data;
};

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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const body = (await req.json()) as GenerateStagingRequest;

    const {
      room_id,
      project_id,
      pass_number,
      pass_type,
      prompt,
      reference_urls,
      resolution_tier,
      variation_count,
      requested_by,
    } = body;

    // Insert into generation_queue with status='processing'
    const { data: queueRow, error: queueError } = await supabase
      .from("generation_queue")
      .insert({
        project_id,
        room_id,
        pass_number,
        pass_type,
        variation_count,
        prompt,
        reference_urls,
        resolution_tier,
        priority: 2,
        status: "processing",
        requested_by,
      })
      .select()
      .single();

    if (queueError) {
      throw new Error(`Queue insert failed: ${queueError.message}`);
    }

    const queueId = queueRow.id;
    const variationLabels = getVariationLabels(variation_count);
    const costPerImage = COST_PER_IMAGE[resolution_tier];
    const totalCost = costPerImage * variation_count;

    const renderIds: string[] = [];

    // Generate each variation
    for (const variationLabel of variationLabels) {
      try {
        const imageBase64 = await generateWithGemini(prompt, reference_urls);

        // Upload to storage
        const storageUrl = await uploadToSupabase(
          project_id,
          room_id,
          pass_number,
          variationLabel,
          imageBase64
        );

        // Insert into renders table
        const { data: renderRow, error: renderError } = await supabase
          .from("renders")
          .insert({
            room_id,
            project_id,
            pass_number,
            pass_type,
            variation_label,
            resolution_tier,
            storage_url: storageUrl,
            watermarked_url: storageUrl,
            thumbnail_url: storageUrl,
            status: "generated",
            prompt_used: prompt,
            references_used: reference_urls,
            api_cost: costPerImage,
            artifact_flags: {},
          })
          .select()
          .single();

        if (renderError) {
          throw new Error(`Render insert failed: ${renderError.message}`);
        }

        renderIds.push(renderRow.id);
      } catch (variationError) {
        console.error(
          `Failed to generate variation ${variationLabel}:`,
          variationError
        );
      }
    }

    // Insert into api_cost_log
    await supabase.from("api_cost_log").insert({
      project_id,
      room_id,
      call_type: "generation",
      resolution_tier,
      cost_inr: totalCost,
      gemini_model: "gemini-2.0-flash-preview-image-generation",
    });

    // Update generation_queue: status='complete'
    await supabase
      .from("generation_queue")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        api_cost: totalCost,
      })
      .eq("id", queueId);

    // Update rooms: current_pass
    await supabase
      .from("rooms")
      .update({ current_pass: pass_number })
      .eq("id", room_id);

    return new Response(
      JSON.stringify({
        success: true,
        render_ids: renderIds,
        total_cost: totalCost,
        queue_id: queueId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Generation error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
