const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', ['realtime', `openai-insecure-api-key.${apiKey}`]);

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: "session.update",
        session: { voice: "human_Sal", keep_context: true, turn_detection: { type: "server_vad" } }
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'session.updated') {
       console.log('\n[Session Updated]', JSON.stringify(msg.session.keep_context));
       process.exit(0);
    }
});
