import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trackingData, analysisType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompts: Record<string, string> = {
      trajectory: `You are an aerospace intelligence AI analyst. Given tracking data for aircraft, satellites, and rockets, provide trajectory predictions for the next 5-30 minutes. Format your response as JSON with the following structure: { "predictions": [{ "objectId": string, "predictedLat": number, "predictedLon": number, "predictedAlt": number, "confidence": number (0-1), "timeMinutes": number }], "summary": string }`,
      collision: `You are a space situational awareness AI. Analyze the provided satellite and object positions and identify potential collision risks or close approaches. Format as JSON: { "risks": [{ "object1": string, "object2": string, "minDistance": number, "riskLevel": "low"|"medium"|"high"|"critical", "timeToClosest": number }], "summary": string }`,
      anomaly: `You are an aerospace anomaly detection AI. Analyze the tracking data and identify any unusual patterns, deviations from expected behavior, or suspicious activities. Format as JSON: { "anomalies": [{ "objectId": string, "type": string, "description": string, "severity": "info"|"warning"|"critical" }], "summary": string }`,
      general: `You are SKYWATCH AI, an aerospace intelligence assistant for a global tracking platform. Provide concise, mission-control-style analysis of the provided aerospace data. Be specific about counts, patterns, and notable observations. Keep responses under 200 words.`,
    };

    const prompt = systemPrompts[analysisType] || systemPrompts.general;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify(trackingData) },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ analysis: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
