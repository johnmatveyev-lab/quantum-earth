import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Call OpenSky API
        const osRes = await fetch('https://opensky-network.org/api/states/all');
        let aircraftMap = [];
        if (osRes.ok) {
            const osData = await osRes.json();
            // Just grab the first 500 to avoid blowing up DB for testing
            const states = (osData.states || []).slice(0, 500);
            aircraftMap = states.filter(s => s[5] !== null && s[6] !== null).map(a => ({
                object_id: a[0], // icao24
                object_type: 'aircraft',
                name: a[1]?.trim() || 'Unknown',
                callsign: a[1]?.trim(),
                latitude: a[6],
                longitude: a[5],
                altitude: a[7] ? a[7] / 1000 : 10,
                speed: a[9] ? a[9] * 3.6 : 800,
                heading: a[10] || 0,
                status: a[8] ? 'grounded' : 'active',
                metadata: { origin: a[2] }
            }));
        }

        // Call CelesTrak (active)
        const activeSatRes = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle");
        let satMap = [];
        if (activeSatRes.ok) {
            const tlesRaw = await activeSatRes.text();
            const lines = tlesRaw.trim().split('\n').map(l => l.trim());
            const SATS_TO_CAPTURE = 200; // Limit for now
            let count = 0;

            for (let i = 0; i < lines.length; i += 3) {
                if (i + 2 >= lines.length || count >= SATS_TO_CAPTURE) break;
                const name = lines[i];
                const tle1 = lines[i + 1];
                const tle2 = lines[i + 2];

                if (tle1.startsWith('1 ') && tle2.startsWith('2 ')) {
                    const id = tle1.substring(2, 7).trim();
                    satMap.push({
                        object_id: `sat-${id}`,
                        object_type: 'satellite',
                        name: name.replace(/_|-/g, ' '),
                        latitude: 0, // In reality, we'd propagate here or in client. We'll store TLEs in metadata.
                        longitude: 0,
                        altitude: 0,
                        speed: 0,
                        heading: 0,
                        metadata: { tle1, tle2 }
                    });
                    count++;
                }
            }
        }

        const allObjects = [...aircraftMap, ...satMap];

        if (allObjects.length === 0) {
            return new Response(JSON.stringify({ message: "No objects fetched to capture." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Insert snapshot
        const { data: snapshot, error: snapErr } = await supabaseClient
            .from('tracking_snapshots')
            .insert({
                source: 'snapshot_worker',
                object_count: allObjects.length,
                description: `Captured ${aircraftMap.length} aircraft and ${satMap.length} satellites.`
            })
            .select('id')
            .single();

        if (snapErr) throw snapErr;

        // Attach snapshot_id to objects
        const positionsToInsert = allObjects.map(obj => ({
            ...obj,
            snapshot_id: snapshot.id
        }));

        // Insert positions in chunks of 500
        const CHUNK_SIZE = 500;
        for (let i = 0; i < positionsToInsert.length; i += CHUNK_SIZE) {
            const chunk = positionsToInsert.slice(i, i + CHUNK_SIZE);
            const { error: posErr } = await supabaseClient
                .from('object_positions')
                .insert(chunk);

            if (posErr) {
                console.error("Error inserting chunk:", posErr);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            snapshot_id: snapshot.id,
            captured: allObjects.length
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e) {
        console.error("Snapshot capture error:", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
