const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', ['realtime', `openai-insecure-api-key.${apiKey}`]);

const salTools = [
    {
        type: 'function',
        name: 'toggle_category',
        description: 'Show only a specific tracking category. Options: aircraft, satellites, rockets, starlink, all',
        parameters: {
            type: 'object',
            properties: {
                category: { type: 'string', description: 'Category to show exclusively' },
            },
            required: ['category'],
        },
    }
];

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: "Hello",
            voice: 'human_Sal',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'grok-3-fast' },
            turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 800,
            },
            tools: salTools,
            keep_context: true,
        },
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(msg.type);
    if(msg.type === 'error'){
      console.log(msg);
    }
});
ws.on('close', (code, reason) => {
    console.log('CLOSED', code, reason.toString());
});
setTimeout(() => process.exit(0), 4000);
