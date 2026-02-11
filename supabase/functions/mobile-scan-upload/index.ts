import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { sessionId, imageBase64, documentType } = await req.json();

    if (!sessionId || !imageBase64) {
      return new Response(
        JSON.stringify({ error: "sessionId and imageBase64 are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify session
    const { data: session, error: sessionError } = await supabase
      .from("document_scan_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Phiên quét không tồn tại" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Phiên quét đã hoàn thành hoặc hết hạn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const docType = documentType || session.document_type || "cccd";

    // 2. Call OCR via AI gateway
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

    const systemPrompt = prompts[docType] || prompts.cccd;
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    console.log("[mobile-scan-upload] Calling OCR...");
    const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
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
                  is_valid_document: { type: "boolean", description: "true if the image clearly shows an identity document (ID card, passport, visa). false if it's a selfie, random photo, or unclear image." },
                  rejection_reason: { type: "string", description: "If is_valid_document is false, explain why" },
                  full_name: { type: "string", description: "Full name of the person" },
                  id_number: { type: "string", description: "Document number" },
                  date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
                  gender: { type: "string", enum: ["male", "female"], description: "Gender" },
                  nationality: { type: "string", description: "Nationality" },
                  address: { type: "string", description: "Address if available" },
                },
                required: ["is_valid_document", "full_name", "id_number"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_info" } },
      }),
    });

    if (!ocrResponse.ok) {
      const status = ocrResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("OCR error:", status, await ocrResponse.text());
      throw new Error("Lỗi xử lý ảnh, vui lòng thử lại.");
    }

    const ocrResult = await ocrResponse.json();
    const toolCall = ocrResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_document_info") {
      return new Response(
        JSON.stringify({ error: "Không thể trích xuất thông tin. Vui lòng chụp lại rõ hơn." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scannedData = JSON.parse(toolCall.function.arguments);
    console.log("[mobile-scan-upload] OCR result:", scannedData);

    if (!scannedData.is_valid_document) {
      // Update session as failed
      await supabase
        .from("document_scan_sessions")
        .update({ status: "failed", scanned_data: { rejection_reason: scannedData.rejection_reason } })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({ error: scannedData.rejection_reason || "Ảnh không phải giấy tờ tùy thân. Vui lòng chụp lại ảnh CCCD/Hộ chiếu/Visa." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Upload image to storage using service role (bypasses RLS)
    let imageUrl: string | null = null;
    try {
      const fileName = `${session.tenant_id}/${Date.now()}-${docType}.jpg`;
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("guest-documents")
        .upload(fileName, bytes.buffer, { contentType: "image/jpeg" });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("guest-documents")
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
        console.log("[mobile-scan-upload] Image uploaded:", imageUrl);
      } else if (uploadError) {
        console.error("[mobile-scan-upload] Upload error:", uploadError.message);
      }
    } catch (storageErr) {
      console.error("[mobile-scan-upload] Storage error:", storageErr);
    }

    // 4. Update session
    const { error: updateError } = await supabase
      .from("document_scan_sessions")
      .update({
        status: "completed",
        scanned_data: scannedData,
        image_url: imageUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("[mobile-scan-upload] Session update error:", updateError);
      throw new Error("Lỗi cập nhật phiên quét");
    }

    console.log("[mobile-scan-upload] Complete!");
    return new Response(
      JSON.stringify({ success: true, data: scannedData, imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[mobile-scan-upload] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
