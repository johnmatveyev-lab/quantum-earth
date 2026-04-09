const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', ['realtime', `openai-insecure-api-key.${apiKey}`]);

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: "You are Sal, the creative director, chief architect, and orchestrator of Quantum Earth.",
            voice: 'human_Sal',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'grok-3-fast' },
            keep_context: true,
            turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 800,
            },
            tools: [],
        },
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(msg.type);
    if(msg.type === 'error'){
      console.log(msg);
      process.exit(1);
    }
    if (msg.type === 'session.updated') {
       process.exit(0);
    }
});
