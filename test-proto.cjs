const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', [
    'realtime',
    `openai-insecure-api-key.${apiKey}`
]);

ws.on('upgrade', (response) => {
    console.log('UPGRADE headers:', response.headers['sec-websocket-protocol']);
});
ws.on('open', () => {
    console.log('Protocol accepted by server:', ws.protocol);
    process.exit(0);
});
ws.on('error', (err) => {
    console.error('Error:', err);
    process.exit(1);
});
