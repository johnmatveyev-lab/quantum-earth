import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Generate realistic mock aircraft data as fallback
  function generateMockAircraft() {
    const airlines = [
      { prefix: "UAL", name: "United" }, { prefix: "AAL", name: "American" },
      { prefix: "DAL", name: "Delta" }, { prefix: "SWR", name: "Swiss" },
      { prefix: "BAW", name: "British Airways" }, { prefix: "DLH", name: "Lufthansa" },
      { prefix: "AFR", name: "Air France" }, { prefix: "QFA", name: "Qantas" },
      { prefix: "JST", name: "Jetstar" }, { prefix: "TVF", name: "Transavia" },
      { prefix: "RYR", name: "Ryanair" }, { prefix: "EZY", name: "easyJet" },
      { prefix: "ANA", name: "ANA" }, { prefix: "JAL", name: "Japan Airlines" },
      { prefix: "CPA", name: "Cathay Pacific" }, { prefix: "SIA", name: "Singapore" },
    ];
    const aircraft = [];
    const seed = Math.floor(Date.now() / 30000); // changes every 30s for slight movement
    for (let i = 0; i < 200; i++) {
      const al = airlines[i % airlines.length];
      const flightNum = 100 + ((seed + i * 7) % 900);
      const baseLat = ((i * 137 + seed) % 1600 - 800) / 10;
      const baseLon = ((i * 211 + seed) % 3600 - 1800) / 10;
      const drift = Math.sin(seed * 0.001 + i) * 0.05;
      aircraft.push({
        id: `osky-mock${i.toString(16)}`,
        name: `${al.prefix}${flightNum}`,
        type: "aircraft",
        latitude: Math.max(-85, Math.min(85, baseLat + drift)),
        longitude: ((baseLon + drift + 180) % 360) - 180,
        altitude: 8 + (((i * 31 + seed) % 50) / 10),
        speed: 600 + ((i * 17 + seed) % 400),
        heading: ((i * 47 + seed) % 360),
        callsign: `${al.prefix}${flightNum}`,
        status: i % 8 === 0 ? "descending" : "active",
      });
    }
    return aircraft;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://opensky-network.org/api/states/all", {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("OpenSky API returned:", response.status, "- using mock data");
      const aircraft = generateMockAircraft();
      return new Response(JSON.stringify({ aircraft, time: Date.now() / 1000, source: "mock" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aircraft = (data.states || []).slice(0, 200).map((s: any[]) => ({
      id: `osky-${s[0]}`,
      name: (s[1] || "Unknown").trim(),
      type: "aircraft",
      latitude: s[6] || 0,
      longitude: s[5] || 0,
      altitude: (s[7] || 0) / 1000,
      speed: (s[9] || 0) * 3.6,
      heading: s[10] || 0,
      callsign: (s[1] || "").trim(),
      status: s[8] ? "active" : "descending",
    }));

    return new Response(JSON.stringify({ aircraft, time: data.time, source: "opensky" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.warn("OpenSky unreachable, using mock data:", e instanceof Error ? e.message : e);
    const aircraft = generateMockAircraft();
    return new Response(JSON.stringify({ aircraft, time: Date.now() / 1000, source: "mock" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
