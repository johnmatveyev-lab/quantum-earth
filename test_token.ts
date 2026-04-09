import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "your_livekit_api_key";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "your_livekit_api_secret";

async function createToken() {
        const roomName = "skywatch-copilot";
        const participantName = `user-12345`;

        const now = Math.floor(Date.now() / 1000);
        const ttlSeconds = 3600;
        const header = { alg: "HS256", typ: "JWT" };
        const payload = {
            iss: LIVEKIT_API_KEY,
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
        console.log(token);
}
createToken();
