const WebSocket = require('ws');
console.log('Connecting to xAI...');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', ['realtime', `openai-insecure-api-key.${apiKey}`]);

ws.on('open', () => {
    console.log('Connected!');

    const sessionUpdate = {
        type: "session.update",
        session: {
            voice: "sal",
            instructions: "You are a helpful assistant.",
            tools: [{
                type: "function",
                name: "get_weather",
                description: "Get weather",
                parameters: { type: "object", properties: { location: { type: "string" } } }
            }]
        }
    };
    ws.send(JSON.stringify(sessionUpdate));

    // Wait a bit, then stream some dummy audio (1 second of 440Hz sine wave)
    setTimeout(() => {
        const sampleRate = 24000;
        const duration = 1.0;
        const samples = sampleRate * duration;
        const pcm = new Int16Array(samples);
        for (let i = 0; i < samples; i++) {
            pcm[i] = Math.sin((i / sampleRate) * 440 * Math.PI * 2) * 10000;
        }

        // Chunk it up
        const chunkSize = 4096;
        for (let i = 0; i < pcm.length; i += chunkSize) {
            const chunk = pcm.subarray(i, i + chunkSize);
            const bytes = new Uint8Array(chunk.buffer);
            let binary = '';
            for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
            const b64 = btoa(binary);
            ws.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: b64
            }));
        }
        ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));

    }, 2000);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('<-', msg.type, msg.name || '');
    if (msg.type === 'session.updated') {
        console.log('\n[Session Updated]', JSON.stringify(msg.session, null, 2));
    } else if (msg.type === 'response.audio.delta') {
        // Too much spam
    } else if (msg.type === 'response.audio_transcript.delta') {
        process.stdout.write(msg.delta);
    } else if (msg.type === 'response.audio_transcript.done') {
        console.log('\n[Transcript done]', msg.transcript);
    } else if (msg.type === 'response.function_call_arguments.done') {
        console.log('\n[Function Call Arguments]', msg.arguments);
    } else if (msg.type === 'error') {
        console.error('\n[Error]', msg.error);
    }
});

ws.on('error', (err) => console.error('Error:', err));
ws.on('close', (c, r) => console.log('Closed:', c, r.toString()));
