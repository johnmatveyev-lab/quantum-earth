import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );

        const authHeader = req.headers.get("Authorization")!;
        const token = authHeader.replace("Bearer ", "");
        const {
            data: { user },
        } = await supabaseClient.auth.getUser(token);

        if (!user) {
            throw new Error("Not authenticated");
        }

        const { tier } = await req.json();

        if (!tier || !["pro", "enterprise"].includes(tier)) {
            throw new Error("Invalid tier. Must be 'pro' or 'enterprise'.");
        }

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
            apiVersion: "2023-10-16",
        });

        // Check if customer already exists
        const customers = await stripe.customers.list({
            email: user.email,
            limit: 1,
        });

        let customerId: string;
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        } else {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;
        }

        // Map tier to price lookup key
        const priceLookup: Record<string, string> = {
            pro: Deno.env.get("STRIPE_PRO_PRICE_ID") ?? "",
            enterprise: Deno.env.get("STRIPE_ENTERPRISE_PRICE_ID") ?? "",
        };

        const priceId = priceLookup[tier];
        if (!priceId) {
            throw new Error(`Price ID not configured for tier: ${tier}`);
        }

        // Check for existing active subscriptions and cancel
        const existingSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
            limit: 10,
        });

        for (const sub of existingSubs.data) {
            await stripe.subscriptions.update(sub.id, {
                cancel_at_period_end: true,
            });
        }

        const origin = req.headers.get("origin") || "http://localhost:5173";

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: `${origin}/subscription?success=true`,
            cancel_url: `${origin}/subscription?canceled=true`,
            metadata: {
                supabase_user_id: user.id,
                tier,
            },
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
