import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashKey(key: string): Promise<string> {
    const data = new TextEncoder().encode(key);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Extract API key from Authorization header
    const authHeader = req.headers.get("Authorization") || "";
    const apiKey = authHeader.replace("Bearer ", "").trim();

    if (!apiKey || !apiKey.startsWith("api_")) {
        return json({ error: "Missing or invalid API key. Use Authorization: Bearer api_..." }, 401);
    }

    // Validate key
    const keyHash = await hashKey(apiKey);
    const { data: keyRecord, error: keyErr } = await supabase
        .from("api_keys")
        .select("id, user_id, permissions, rate_limit, active, expires_at")
        .eq("key_hash", keyHash)
        .single();

    if (keyErr || !keyRecord) {
        return json({ error: "Invalid API key" }, 401);
    }
    if (!keyRecord.active) {
        return json({ error: "API key is disabled" }, 403);
    }
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
        return json({ error: "API key has expired" }, 403);
    }

    // Rate limiting
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
        .from("api_usage_logs")
        .select("request_count")
        .eq("api_key_id", keyRecord.id)
        .eq("usage_date", today)
        .single();

    const currentCount = usage?.request_count || 0;
    if (currentCount >= keyRecord.rate_limit) {
        return json({ error: "Rate limit exceeded", limit: keyRecord.rate_limit, reset: "midnight UTC" }, 429);
    }

    // Increment usage counter
    if (usage) {
        await supabase
            .from("api_usage_logs")
            .update({ request_count: currentCount + 1 })
            .eq("api_key_id", keyRecord.id)
            .eq("usage_date", today);
    } else {
        await supabase.from("api_usage_logs").insert({
            api_key_id: keyRecord.id,
            usage_date: today,
            request_count: 1,
        });
    }

    // Update last_used_at
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);

    // Route request
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api-public/, "");

    try {
        // GET /v1/aircraft
        if (path === "/v1/aircraft" && req.method === "GET") {
            const limit = parseInt(url.searchParams.get("limit") || "100");
            // Fetch from OpenSky proxy
            const res = await fetch(`${supabaseUrl}/functions/v1/opensky-proxy`, {
                headers: { Authorization: `Bearer ${serviceKey}` },
            });
            const data = await res.json();
            const states = (data.states || []).slice(0, limit).map((s: any) => ({
                icao24: s[0], callsign: s[1]?.trim(), country: s[2],
                latitude: s[6], longitude: s[5], altitude: s[7],
                velocity: s[9], heading: s[10], on_ground: s[8],
            }));
            return json({ data: states, count: states.length, timestamp: new Date().toISOString() });
        }

        // GET /v1/satellites
        if (path === "/v1/satellites" && req.method === "GET") {
            const limit = parseInt(url.searchParams.get("limit") || "100");
            const res = await fetch(`${supabaseUrl}/functions/v1/celestrak-proxy`, {
                headers: { Authorization: `Bearer ${serviceKey}` },
            });
            const data = await res.json();
            const sats = (data.satellites || data || []).slice(0, limit);
            return json({ data: sats, count: sats.length, timestamp: new Date().toISOString() });
        }

        // GET /v1/history
        if (path === "/v1/history" && req.method === "GET") {
            const objectId = url.searchParams.get("object_id");
            const from = url.searchParams.get("from");
            const to = url.searchParams.get("to") || new Date().toISOString();
            const limit = parseInt(url.searchParams.get("limit") || "500");

            let query = supabase.from("object_positions").select("*").order("created_at", { ascending: false }).limit(limit);
            if (objectId) query = query.eq("object_id", objectId);
            if (from) query = query.gte("created_at", from);
            if (to) query = query.lte("created_at", to);

            const { data, error } = await query;
            if (error) return json({ error: error.message }, 500);
            return json({ data, count: data?.length || 0 });
        }

        // GET /v1/objects/:id
        const objectMatch = path.match(/^\/v1\/objects\/(.+)$/);
        if (objectMatch && req.method === "GET") {
            const objectId = objectMatch[1];
            const { data, error } = await supabase
                .from("object_positions")
                .select("*")
                .eq("object_id", objectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
            if (error) return json({ error: "Object not found" }, 404);
            return json({ data });
        }

        // GET /v1/watchlists
        if (path === "/v1/watchlists" && req.method === "GET") {
            const { data, error } = await supabase
                .from("watchlists")
                .select("*, watchlist_items(*)")
                .eq("user_id", keyRecord.user_id);
            if (error) return json({ error: error.message }, 500);
            return json({ data, count: data?.length || 0 });
        }

        // GET /v1/alerts
        if (path === "/v1/alerts" && req.method === "GET") {
            const limit = parseInt(url.searchParams.get("limit") || "50");
            const { data, error } = await supabase
                .from("alerts")
                .select("*")
                .eq("user_id", keyRecord.user_id)
                .order("created_at", { ascending: false })
                .limit(limit);
            if (error) return json({ error: error.message }, 500);
            return json({ data, count: data?.length || 0 });
        }

        return json({
            error: "Not found", available_endpoints: [
                "GET /v1/aircraft", "GET /v1/satellites", "GET /v1/objects/:id",
                "GET /v1/history", "GET /v1/watchlists", "GET /v1/alerts",
            ]
        }, 404);

    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
});

function json(body: any, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
