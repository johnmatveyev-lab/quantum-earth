const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', [
    'realtime',
    `openai-insecure-api-key.${apiKey}`
]);

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: "Answer me.",
            turn_detection: { type: 'server_vad' }
        }
    }));

    // send loud beep array
    setTimeout(() => {
        const samples = 24000;
        const pcm = new Int16Array(samples);
        for (let i = 0; i < samples; i++) {
            pcm[i] = Math.sin((i / 24000) * 440 * Math.PI * 2) * 10000;
        }
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);

        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: Buffer.from(binary, 'binary').toString('base64') }));
        // Not doing input_audio_buffer.commit here, because server_vad should handle it automatically if it works like OAI
    }, 500);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('<-', msg.type);
});
setTimeout(() => process.exit(0), 4000);
