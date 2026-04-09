const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;

console.log('=== SAL ENHANCED E2E TEST ===\n');

const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', [
    'realtime',
    `openai-insecure-api-key.${apiKey}`
]);

ws.on('open', () => {
    console.log('✅ WebSocket connected');

    ws.send(JSON.stringify({
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: "You are Sal, an AI voice copilot. Say hello and briefly mention you can do demos, zoom to cities, and toggle layers. Keep it under 2 sentences.",
            voice: 'human_Sal',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'grok-3-fast' },
            keep_context: true,
            turn_detection: { type: 'server_vad' },
            tools: [
                {
                    type: 'function',
                    name: 'run_demo',
                    description: 'Run a demo sequence',
                    parameters: { type: 'object', properties: {} },
                },
                {
                    type: 'function',
                    name: 'zoom_to_location',
                    description: 'Zoom to a location',
                    parameters: {
                        type: 'object',
                        properties: {
                            lat: { type: 'number' },
                            lon: { type: 'number' },
                            name: { type: 'string' },
                        },
                        required: ['lat', 'lon'],
                    },
                },
            ],
        },
    }));
});

let transcriptChunks = '';
let audioChunks = 0;

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'ping') return;

    switch (msg.type) {
        case 'session.updated':
            console.log('✅ Session configured with enhanced tools');
            setTimeout(() => {
                // Send fake audio
                const pcm = new Int16Array(24000);
                for (let i = 0; i < 24000; i++) {
                    pcm[i] = (Math.sin((i / 24000) * 200 * Math.PI * 2) * 3000 + (Math.random() - 0.5) * 4000);
                }
                const bytes = new Uint8Array(pcm.buffer);
                let binary = '';
                for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
                ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: Buffer.from(binary, 'binary').toString('base64') }));

                setTimeout(() => {
                    ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
                    ws.send(JSON.stringify({ type: 'response.create' }));
                    console.log('📤 Audio committed & response requested');
                }, 500);
            }, 500);
            break;

        case 'response.output_audio.delta':
            audioChunks++;
            break;

        case 'response.output_audio_transcript.delta':
            transcriptChunks += msg.delta || '';
            process.stdout.write(msg.delta || '');
            break;

        case 'response.output_audio_transcript.done':
            console.log('');
            break;

        case 'response.done':
            console.log(`\n✅ RESPONSE COMPLETE (${audioChunks} audio chunks)`);
            console.log(`📝 Full: "${transcriptChunks}"`);
            process.exit(0);
            break;

        case 'error':
            console.error('❌', msg.error);
            process.exit(1);
            break;

        default:
            if (!msg.type.includes('conversation.') && !msg.type.includes('response.content_part') && !msg.type.includes('response.output_item') && !msg.type.includes('response.output_audio.done'))
                console.log(`   <- ${msg.type}`);
    }
});

setTimeout(() => { console.log('⏰ Timeout'); process.exit(1); }, 15000);
