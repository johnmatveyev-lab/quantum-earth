const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', ['realtime', `openai-insecure-api-key.${apiKey}`]);

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: "session.update",
        session: { voice: "human_Sal", turn_detection: { type: "server_vad" } }
    }));

    // Start audio
    setTimeout(() => {
        // sending 1 second of random noise
        const samples = 24000;
        const pcm = new Int16Array(samples);
        for (let i = 0; i < samples; i++) {
            pcm[i] = (Math.random() - 0.5) * 10000;
        }
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
        
        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: Buffer.from(binary, 'binary').toString('base64') }));
        ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        ws.send(JSON.stringify({ type: 'response.create' })); // explicitly request response!
    }, 1000);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('<-', msg.type);
    if (msg.type === 'response.audio.delta') {
       // audio delta
    } else if (msg.type === 'response.audio_transcript.delta') {
       process.stdout.write(msg.delta);
    } else if (msg.type === 'error') {
       console.error(msg.error);
    } else if (msg.type === 'response.done') {
       process.exit(0);
    }
});
