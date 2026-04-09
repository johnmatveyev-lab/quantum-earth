import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: { "Access-Control-Allow-Origin": "*" },
        });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        return new Response("Missing stripe-signature header", { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Signature verification failed";
        console.error("Webhook signature verification failed:", message);
        return new Response(`Webhook Error: ${message}`, { status: 400 });
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.supabase_user_id;
                const tier = session.metadata?.tier as "pro" | "enterprise";

                if (userId && tier) {
                    // Update profile subscription tier
                    const { error } = await supabaseAdmin
                        .from("profiles")
                        .update({
                            subscription_tier: tier,
                            stripe_customer_id: session.customer as string,
                            stripe_subscription_id: session.subscription as string,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", userId);

                    if (error) {
                        console.error("Failed to update profile:", error);
                    } else {
                        console.log(`Updated user ${userId} to tier: ${tier}`);
                    }
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                // Find user by stripe_customer_id
                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (profile) {
                    // If subscription was canceled or expired, downgrade to free
                    if (
                        subscription.status === "canceled" ||
                        subscription.status === "unpaid"
                    ) {
                        await supabaseAdmin
                            .from("profiles")
                            .update({
                                subscription_tier: "free",
                                stripe_subscription_id: null,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("id", profile.id);

                        console.log(`Downgraded user ${profile.id} to free`);
                    }
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (profile) {
                    await supabaseAdmin
                        .from("profiles")
                        .update({
                            subscription_tier: "free",
                            stripe_subscription_id: null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", profile.id);

                    console.log(`User ${profile.id} subscription deleted, downgraded to free`);
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (profile) {
                    // Optionally create an alert for the user
                    await supabaseAdmin.from("alerts").insert({
                        user_id: profile.id,
                        alert_type: "billing",
                        title: "Payment Failed",
                        description:
                            "Your subscription payment failed. Please update your payment method to avoid service interruption.",
                    });
                    console.log(`Payment failed alert sent to user ${profile.id}`);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Webhook processing error:", message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
