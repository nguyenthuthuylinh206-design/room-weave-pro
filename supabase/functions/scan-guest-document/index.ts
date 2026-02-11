import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, documentType } = await req.json();

    if (!imageBase64 || !documentType) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and documentType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt based on document type
    const prompts: Record<string, string> = {
      cccd: `Analyze this Vietnamese Citizen ID Card (CCCD/CMND) image. Extract all visible information accurately. 
For Vietnamese names, keep the original Vietnamese characters with diacritics.
The ID number is a 12-digit number on the card.
Date format on card is typically DD/MM/YYYY - convert to YYYY-MM-DD format.
Gender: "Nam" = male, "Nữ" = female.
Nationality is usually "Việt Nam" for CCCD.`,
      passport: `Analyze this passport image. Extract all visible information accurately.
Keep the full name as shown on the passport.
The passport number is usually alphanumeric (e.g., B1234567).
Date of birth format: convert to YYYY-MM-DD.
Gender: M = male, F = female.
Extract nationality/country of origin.`,
      visa: `Analyze this visa document image. Extract all visible information accurately.
Keep the full name as shown.
Extract the visa number.
Extract nationality.`,
    };

    const systemPrompt = prompts[documentType] || prompts.cccd;

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Data}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_info",
              description: "Extract structured information from an identity document image",
              parameters: {
                type: "object",
                properties: {
                  full_name: {
                    type: "string",
                    description: "Full name of the person as shown on the document",
                  },
                  id_number: {
                    type: "string",
                    description: "Document number (CCCD number, passport number, or visa number)",
                  },
                  date_of_birth: {
                    type: "string",
                    description: "Date of birth in YYYY-MM-DD format",
                  },
                  gender: {
                    type: "string",
                    enum: ["male", "female"],
                    description: "Gender of the person",
                  },
                  nationality: {
                    type: "string",
                    description: "Nationality or country of origin",
                  },
                  address: {
                    type: "string",
                    description: "Address as shown on the document (if available)",
                  },
                },
                required: ["full_name", "id_number"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau giây lát." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Cần nạp thêm credits để sử dụng tính năng này." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Lỗi xử lý ảnh, vui lòng thử lại." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    
    // Extract tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_document_info") {
      return new Response(
        JSON.stringify({ error: "Không thể trích xuất thông tin từ ảnh. Vui lòng chụp lại rõ hơn." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-guest-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
