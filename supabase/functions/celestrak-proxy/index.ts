import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const url = new URL(req.url);
        const group = url.searchParams.get("group") || "active"; // e.g., 'active', 'stations', 'starlink', 'weather'

        // Fetch TLE data from CelesTrak
        // GROUP FORMAT: active, stations, weather, noaa, goes, earth-resources
        const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`);

        if (!response.ok) {
            throw new Error(`CelesTrak API returned ${response.status}`);
        }

        const tlesRaw = await response.text();
        const lines = tlesRaw.trim().split('\n').map(l => l.trim());

        const satellites = [];

        // Parse the 3-line format (Name, Line 1, Line 2)
        for (let i = 0; i < lines.length; i += 3) {
            if (i + 2 >= lines.length) break;

            const name = lines[i];
            const tle1 = lines[i + 1];
            const tle2 = lines[i + 2];

            // Very rough check to ensure lines look like TLE strings
            if (tle1.startsWith('1 ') && tle2.startsWith('2 ')) {
                // Extract catalog number from TLE line 1 (cols 3-7)
                const id = tle1.substring(2, 7).trim();

                satellites.push({
                    id: `sat-${id}`,
                    name: name.replace(/_|-/g, ' '),
                    tle1,
                    tle2
                });
            }
        }

        return new Response(JSON.stringify({
            source: 'celestrak',
            count: satellites.length,
            satellites: satellites
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.error("CelesTrak proxy error:", message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
