import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    encode as base64Encode,
} from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

// Minimal JWT creation for LiveKit access tokens (no external deps)
function createLiveKitToken(
    apiKey: string,
    apiSecret: string,
    roomName: string,
    participantName: string,
    ttlSeconds = 3600
): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
        iss: apiKey,
        sub: participantName,
        iat: now,
        nbf: now,
        exp: now + ttlSeconds,
        jti: participantName + "-" + now,
        video: {
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        },
    };

    const enc = new TextEncoder();
    const headerB64 = base64Encode(enc.encode(JSON.stringify(header)));
    const payloadB64 = base64Encode(enc.encode(JSON.stringify(payload)));
    const signingInput = `${headerB64}.${payloadB64}`;

    // HMAC-SHA256 signing
    const keyData = enc.encode(apiSecret);
    return crypto.subtle
        .importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, [
            "sign",
        ])
        .then((key) => crypto.subtle.sign("HMAC", key, enc.encode(signingInput)))
        .then((sig) => {
            const sigB64 = base64Encode(new Uint8Array(sig));
            return `${signingInput}.${sigB64}`;
        }) as unknown as string; // handled in async serve
}

serve(async (req) => {
    if (req.method === "OPTIONS")
        return new Response(null, { headers: corsHeaders });

    try {
        const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
        const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
        const LIVEKIT_URL =
            Deno.env.get("LIVEKIT_URL") ||
            "wss://quantumearth-rylepnkg.livekit.cloud";

        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            throw new Error("LIVEKIT_API_KEY or LIVEKIT_API_SECRET not configured");
        }

        const body = await req.json().catch(() => ({}));
        const roomName = body.room || "skywatch-copilot";
        const participantName =
            body.participant || `user-${crypto.randomUUID().slice(0, 8)}`;

        // Create JWT token
        const now = Math.floor(Date.now() / 1000);
        const ttlSeconds = 3600;
        const header = { alg: "HS256", typ: "JWT" };
        const payload = {
            iss: LIVEKIT_API_KEY,
            sub: participantName,
            iat: now,
            nbf: now - 30, // subtract 30s for clock skew
            exp: now + ttlSeconds,
            jti: participantName + "-" + now,
            video: {
                room: roomName,
                roomJoin: true,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
            },
        };

        const enc = new TextEncoder();
        const headerB64 = base64Encode(enc.encode(JSON.stringify(header)));
        const payloadB64 = base64Encode(enc.encode(JSON.stringify(payload)));
        const signingInput = `${headerB64}.${payloadB64}`;

        const keyData = enc.encode(LIVEKIT_API_SECRET);
        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const sig = await crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            enc.encode(signingInput)
        );
        const sigB64 = base64Encode(new Uint8Array(sig));
        const token = `${signingInput}.${sigB64}`;

        return new Response(
            JSON.stringify({ token, url: LIVEKIT_URL }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (e) {
        console.error("livekit-token error:", e);
        return new Response(
            JSON.stringify({
                error: e instanceof Error ? e.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
