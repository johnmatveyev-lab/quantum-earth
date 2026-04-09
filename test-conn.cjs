const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', ['realtime', `openai-insecure-api-key.${apiKey}`]);

ws.on('open', () => {
    console.log('OPENED');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(msg.type);
});

ws.on('error', (err) => {
    console.error('ERROR', err);
});

ws.on('close', (code, reason) => {
    console.log('CLOSED', code, reason.toString());
});

setTimeout(() => process.exit(0), 4000);
