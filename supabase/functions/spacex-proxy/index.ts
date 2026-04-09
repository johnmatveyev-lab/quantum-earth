import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "launches/upcoming";

    // SpaceX v4 API (public, no auth needed)
    const response = await fetch(`https://api.spacexdata.com/v4/${endpoint}`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("SpaceX API error:", response.status, text);
      throw new Error(`SpaceX API: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ data, source: "spacex" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("spacex-proxy error:", e);
    return new Response(JSON.stringify({ data: [], error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
