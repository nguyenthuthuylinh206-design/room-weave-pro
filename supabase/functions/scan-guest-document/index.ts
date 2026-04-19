import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BEEKNOEE_URL = "https://platform.beeknoee.com/api/v1/chat/completions";

const DEFAULT_FALLBACK_MODELS = [
  { name: "gemini-2.5-flash", timeout: 55000 },
  { name: "gemini-3-flash", timeout: 45000 },
  { name: "glm-4.7-flash", timeout: 30000 },
  { name: "glm-4.5-flash", timeout: 30000 },
  { name: "openai/gpt-oss-120b", timeout: 30000 },
];

async function getAiSettings(supabase: any, tenantId: string | null) {
  if (!tenantId) return {} as Record<string, string>;
  const { data } = await supabase
    .from("ai_settings")
    .select("config_key, config_value")
    .eq("tenant_id", tenantId);
  const map: Record<string, string> = {};
  for (const row of data || []) map[row.config_key] = row.config_value;
  return map;
}

function buildModelChain(settings: Record<string, string>) {
  const primary = settings.ocr_model;
  const chain = [...DEFAULT_FALLBACK_MODELS];
  if (primary && !chain.some((m) => m.name === primary)) {
    chain.unshift({ name: primary, timeout: 55000 });
  } else if (primary) {
    // Move primary to front
    const idx = chain.findIndex((m) => m.name === primary);
    if (idx > 0) {
      const [m] = chain.splice(idx, 1);
      chain.unshift(m);
    }
  }
  return chain;
}

async function callBeeknoeeWithFallback(
  apiKey: string,
  body: Record<string, unknown>,
  models: Array<{ name: string; timeout: number }>,
) {
  let lastErr: { status?: number; text?: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const { name: model, timeout } of models) {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeout);
      try {
        console.log(`[beeknoee] try ${model} (attempt ${attempt + 1})`);
        const resp = await fetch(BEEKNOEE_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, model }),
          signal: controller.signal,
        });
        clearTimeout(tid);
        if (resp.ok) {
          const json = await resp.json();
          return { ok: true as const, data: json, model };
        }
        const text = await resp.text();
        lastErr = { status: resp.status, text: text.substring(0, 200) };
        console.warn(`[beeknoee] ${model} failed (${resp.status}): ${text.substring(0, 150)}`);
        if (resp.status === 401 || resp.status === 403) {
          return { ok: false as const, error: "Beeknoee API key không hợp lệ", status: resp.status };
        }
        if (resp.status === 429) await new Promise((r) => setTimeout(r, 3000));
      } catch (e) {
        clearTimeout(tid);
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[beeknoee] ${model} error: ${msg}`);
        lastErr = { text: msg };
      }
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 4000));
  }
  return { ok: false as const, error: "Tất cả model AI đều không phản hồi", lastErr };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BEEKNOEE_API_KEY = Deno.env.get("BEEKNOEE_API_KEY");
    if (!BEEKNOEE_API_KEY) {
      throw new Error("BEEKNOEE_API_KEY chưa được cấu hình");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { imageBase64, documentType, tenantId } = await req.json();

    if (!imageBase64 || !documentType) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and documentType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const settings = await getAiSettings(supabase, tenantId || null);
    const models = buildModelChain(settings);

    const prompts: Record<string, string> = {
      cccd: `IMPORTANT: First determine if the image actually shows an identity document. If the image is a selfie, random photo, or does not clearly show an ID card/passport/visa, set is_valid_document to false.

Analyze this Vietnamese Citizen ID Card (CCCD/CMND) image. Extract all visible information accurately.
For Vietnamese names, keep the original Vietnamese characters with diacritics.
The ID number is a 12-digit number on the card.
Date format on card is typically DD/MM/YYYY - convert to YYYY-MM-DD format.
Gender: "Nam" = male, "Nữ" = female.
Nationality is usually "Việt Nam" for CCCD.`,
      passport: `IMPORTANT: First determine if the image actually shows an identity document. If the image is a selfie, random photo, or does not clearly show an ID card/passport/visa, set is_valid_document to false.

Analyze this passport image. Extract all visible information accurately.
Keep the full name as shown on the passport.
The passport number is usually alphanumeric (e.g., B1234567).
Date of birth format: convert to YYYY-MM-DD.
Gender: M = male, F = female.
Extract nationality/country of origin.`,
      visa: `IMPORTANT: First determine if the image actually shows an identity document. If the image is a selfie, random photo, or does not clearly show an ID card/passport/visa, set is_valid_document to false.

Analyze this visa document image. Extract all visible information accurately.
Keep the full name as shown.
Extract the visa number.
Extract nationality.`,
    };

    const systemPrompt = prompts[documentType] || prompts.cccd;
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const tools = [
      {
        type: "function",
        function: {
          name: "extract_document_info",
          description: "Extract structured information from an identity document image",
          parameters: {
            type: "object",
            properties: {
              is_valid_document: {
                type: "boolean",
                description:
                  "true if the image clearly shows an identity document (ID card, passport, visa). false if it's a selfie, random photo, or unclear image.",
              },
              rejection_reason: { type: "string", description: "If is_valid_document is false, explain why" },
              full_name: { type: "string", description: "Full name of the person as shown on the document" },
              id_number: { type: "string", description: "Document number (CCCD/passport/visa number)" },
              date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
              gender: { type: "string", enum: ["male", "female"], description: "Gender" },
              nationality: { type: "string", description: "Nationality or country of origin" },
              address: { type: "string", description: "Address as shown on the document (if available)" },
            },
            required: ["is_valid_document", "full_name", "id_number"],
            additionalProperties: false,
          },
        },
      },
    ];

    const result = await callBeeknoeeWithFallback(
      BEEKNOEE_API_KEY,
      {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
            ],
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_document_info" } },
      },
      models,
    );

    if (!result.ok) {
      const status = result.status === 401 || result.status === 403 ? 401 : 503;
      return new Response(
        JSON.stringify({ error: result.error || "AI không phản hồi, vui lòng thử lại." }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "extract_document_info") {
      return new Response(
        JSON.stringify({ error: "Không thể trích xuất thông tin từ ảnh. Vui lòng chụp lại rõ hơn." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    if (!extractedData.is_valid_document) {
      return new Response(
        JSON.stringify({
          error:
            "Ảnh không phải giấy tờ tùy thân. Vui lòng chụp rõ mặt trước hoặc mặt sau của CCCD, Hộ chiếu hoặc Visa.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ data: extractedData, model: result.model }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("scan-guest-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
