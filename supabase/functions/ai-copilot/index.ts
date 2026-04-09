import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool declarations for AI globe control
const tools = [
  {
    type: "function",
    function: {
      name: "zoom_to_location",
      description: "Zoom the globe camera to a specific geographic location",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lon: { type: "number", description: "Longitude" },
          name: { type: "string", description: "Location name" },
        },
        required: ["lat", "lon"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_layer",
      description: "Toggle a visualization layer. Available: infrared, vegetation, seaTemp, waterVapor, nightLights, clouds, aurora, atmosphere, graticule, orbits, heatmap, corridors, countryBorders, precipitation, terrain, predictions",
      parameters: {
        type: "object",
        properties: {
          layer: { type: "string", description: "Layer name" },
          enabled: { type: "boolean", description: "Enable or disable" },
        },
        required: ["layer"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_category",
      description: "Show only a specific tracking category: aircraft, satellites, rockets, starlink, all",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Category to show" },
        },
        required: ["category"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_objects",
      description: "Search tracked objects by name or callsign",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tracking_stats",
      description: "Get current tracking statistics",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_data_source",
      description: "Switch between simulation and live data",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "simulation or live" },
        },
        required: ["source"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_simulation_speed",
      description: "Set simulation playback speed multiplier (0.1 to 10)",
      parameters: {
        type: "object",
        properties: {
          speed: { type: "number", description: "Speed multiplier" },
        },
        required: ["speed"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const validated = copilotRequestSchema.parse(body);
    const { messages, context } = validated;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are SKYWATCH AI Copilot, an aerospace intelligence assistant embedded in a global tracking platform. You have access to real-time aerospace data and can control the globe visualization.

Current context: ${context || 'No context provided'}

Your capabilities via tools:
- Zoom to any location on the globe
- Toggle visualization layers (infrared, vegetation, sea temperature, water vapor, night lights, clouds, aurora, atmosphere, graticule, orbits, heatmap, corridors, country borders, precipitation, terrain, predictions)
- Filter by tracking category (aircraft, satellites, rockets, starlink, all)
- Search tracked objects by name
- Get current tracking statistics
- Switch between live and simulation data
- Adjust simulation speed

When users ask to see a location, use zoom_to_location. When they ask about data, use get_tracking_stats first.

Style guidelines:
- Be concise and mission-control professional
- Use specific numbers and data when available
- Format responses with markdown for clarity
- Use bullet points for lists
- Bold important metrics and findings`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
