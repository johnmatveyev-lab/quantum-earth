import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const xaiKey = Deno.env.get('XAI_API_KEY');
        if (!xaiKey) {
            return new Response(
                JSON.stringify({ error: 'XAI_API_KEY not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Request an ephemeral token from xAI for client-side WebSocket auth
        const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${xaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                expires_after: { seconds: 300 },
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('[xai-token] Token request failed:', err);
            return new Response(
                JSON.stringify({ error: 'Failed to get ephemeral token', details: err }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (e) {
        console.error('[xai-token] Error:', e);
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
