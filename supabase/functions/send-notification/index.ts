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
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);

        const { alert_type, title, description, user_id } = await req.json();

        if (!user_id || !title) {
            return new Response(JSON.stringify({ error: "user_id and title required" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get matching notification rules for this event type
        const { data: rules } = await supabase
            .from("notification_rules")
            .select("*, notification_channels(*)")
            .eq("user_id", user_id)
            .eq("event_type", alert_type)
            .eq("active", true);

        if (!rules || rules.length === 0) {
            return new Response(JSON.stringify({ sent: 0, message: "No matching rules" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let sentCount = 0;

        for (const rule of rules) {
            const channel = rule.notification_channels;
            if (!channel || !channel.active) continue;

            try {
                if (channel.channel_type === "webhook" && channel.webhook_url) {
                    await fetch(channel.webhook_url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ event: alert_type, title, description, timestamp: new Date().toISOString() }),
                    });
                    sentCount++;
                }

                if (channel.channel_type === "discord" && channel.webhook_url) {
                    await fetch(channel.webhook_url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: "SKYWATCH",
                            embeds: [{
                                title: `🛰️ ${title}`,
                                description: description || "",
                                color: alert_type.includes("high") ? 0xff4444 : 0x00d4ff,
                                timestamp: new Date().toISOString(),
                                footer: { text: "Orbital Command" },
                            }],
                        }),
                    });
                    sentCount++;
                }

                if (channel.channel_type === "slack" && channel.webhook_url) {
                    await fetch(channel.webhook_url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: `*${title}*\n${description || ""}`,
                            blocks: [
                                { type: "header", text: { type: "plain_text", text: `🛰️ ${title}` } },
                                { type: "section", text: { type: "mrkdwn", text: description || "_No details_" } },
                            ],
                        }),
                    });
                    sentCount++;
                }

                if (channel.channel_type === "email" && channel.email) {
                    // Use Supabase Auth admin to send email (basic approach)
                    // In production, integrate with Resend or SendGrid
                    console.log(`Would send email to ${channel.email}: ${title}`);
                    sentCount++;
                }
            } catch (err) {
                console.error(`Failed to send to channel ${channel.id}:`, err);
            }
        }

        return new Response(JSON.stringify({ sent: sentCount }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
