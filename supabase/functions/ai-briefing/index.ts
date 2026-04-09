import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiKey = Deno.env.get("GEMINI_API_KEY");

        if (!geminiKey) {
            return new Response(
                JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch recent snapshots from the last 24 hours
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: snapshots } = await supabase
            .from("tracking_snapshots")
            .select("id, snapshot_time, source, object_count, description")
            .gte("snapshot_time", since)
            .order("snapshot_time", { ascending: false })
            .limit(12);

        // Get a summary of positions from the most recent snapshot
        let recentPositions: any[] = [];
        if (snapshots && snapshots.length > 0) {
            const { data: positions } = await supabase
                .from("object_positions")
                .select("object_id, object_name, object_type, latitude, longitude, altitude, velocity, heading")
                .eq("snapshot_id", snapshots[0].id)
                .limit(50);
            recentPositions = positions || [];
        }

        // Fetch recent alerts
        const { data: recentAlerts } = await supabase
            .from("alerts")
            .select("alert_type, title, description, created_at")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(20);

        // Build context for AI
        const briefingContext = {
            timeRange: `Last 24 hours (since ${since})`,
            snapshotCount: snapshots?.length || 0,
            latestSnapshot: snapshots?.[0] || null,
            recentPositions: recentPositions.slice(0, 30),
            recentAlerts: recentAlerts || [],
            totalObjectsTracked: snapshots?.reduce((sum: number, s: any) => sum + (s.object_count || 0), 0) || 0,
        };

        const prompt = `You are SKYWATCH AI, an aerospace intelligence analyst. Generate a concise daily briefing based on the following tracking data from the last 24 hours.

DATA:
${JSON.stringify(briefingContext, null, 2)}

Generate a briefing in this JSON format:
\`\`\`json
{
  "summary": "2-3 sentence executive summary of activity",
  "notableEvents": [
    { "title": "Event title", "description": "Brief description", "severity": "low|medium|high" }
  ],
  "activityTrends": [
    { "trend": "Description of a trend or pattern observed" }
  ],
  "recommendations": [
    "Actionable recommendation for the analyst"
  ],
  "objectsOfInterest": [
    { "name": "Object name", "reason": "Why this object is notable" }
  ]
}
\`\`\`

If there is limited data, acknowledge that and provide general aerospace intelligence context. Keep the briefing professional and concise.`;

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
                }),
            }
        );

        const geminiData = await geminiResponse.json();
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Briefing unavailable.";

        // Try to parse JSON from the response
        let briefing: any = { summary: text };
        try {
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                briefing = JSON.parse(jsonMatch[1]);
            }
        } catch { }

        return new Response(JSON.stringify({ briefing }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
