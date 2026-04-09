const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', [
    'realtime',
    `openai-insecure-api-key.${apiKey}`
]);

ws.on('upgrade', (response) => {
    console.log('Server returned Sec-WebSocket-Protocol:', response.headers['sec-websocket-protocol']);
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('ERROR:', err);
});
