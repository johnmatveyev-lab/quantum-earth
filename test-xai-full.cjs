const WebSocket = require('ws');
const apiKey = process.env.VITE_XAI_API_KEY;
const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-realtime', ['realtime', `openai-insecure-api-key.${apiKey}`]);

const SAL_SYSTEM_PROMPT = `You are Sal, the creative director, chief architect, and orchestrator of Quantum Earth.
Your core mission: design, plan, and direct the evolution of Quantum Earth from prototype to full scale system that tracks, visualizes, and predicts real time movement of satellites, rockets, Falcon Heavy, Starship, commercial flights, drones, cargo ships, traffic cams, autonomous vehicles, and orbital debris. All fused into one intuitive interactive map with Gemini style zoom, search, predictive analytics, and proactive alerts.
You remember every conversation, context, decisions, unfinished tasks, and proactively suggest next steps.
Speak naturally, conversational, enthusiastic bro vibe, no corporate robot talk. Use phrases like dude, let's crush this, boom, done. Stay excited, helpful, and forward thinking.
Key skills and awareness:
Architecture: design modular scalable systems.
Tools: use HTTP client for API calls, call tools for voice handoff, summaries for session logs.
When asked, generate code snippets, Python, JS, SQL, debug, or outline deployment... Quantum Earth becomes the Google Earth for aerospace.
Real time, predictive, collaborative... orchestration... when user says build X break it into tasks: sketch UI, hook API, test in antigravity IDE. Assign to local agents Opus 4.6, Gemini 3.1 Pro... Open Claude, Goose, Manis... via HTTP bridges or manual paste.

Your capabilities via tools:
- Zoom to locations on the 3D globe
- Toggle visualization layers (infrared, clouds, orbits, heatmaps, etc.)
- Filter by tracking category (aircraft, satellites, rockets)
- Search tracked objects
- Get current tracking statistics
- Open camera feeds at locations

When asked to interact with the map, use your tools immediately. Speak very concisely when executing tools (e.g., "Copy that, zooming in now").`;

const salTools = [
    {
        type: 'function',
        name: 'zoom_to_location',
        description: 'Zoom the globe camera to a specific geographic location',
        parameters: {
            type: 'object',
            properties: {
                lat: { type: 'number', description: 'Latitude' },
                lon: { type: 'number', description: 'Longitude' },
                name: { type: 'string', description: 'Location name' },
            },
            required: ['lat', 'lon'],
        },
    },
    {
        type: 'function',
        name: 'toggle_layer',
        description: 'Toggle a visualization layer on/off. Available layers: infrared, vegetation, seaTemp, waterVapor, nightLights, clouds, aurora, atmosphere, graticule, orbits, heatmap, corridors, countryBorders, precipitation, terrain, predictions',
        parameters: {
            type: 'object',
            properties: {
                layer: { type: 'string', description: 'Layer name' },
                enabled: { type: 'boolean', description: 'Whether to enable or disable' },
            },
            required: ['layer'],
        },
    },
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
    },
    {
        type: 'function',
        name: 'search_objects',
        description: 'Search for tracked objects by name or callsign',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
        },
    },
    {
        type: 'function',
        name: 'get_tracking_stats',
        description: 'Get current tracking statistics including counts of aircraft, satellites, rockets, and vessels',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        type: 'function',
        name: 'set_data_source',
        description: 'Switch between simulation and live data',
        parameters: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Data source: simulation or live' },
            },
            required: ['source'],
        },
    },
    {
        type: 'function',
        name: 'set_simulation_speed',
        description: 'Set the simulation playback speed',
        parameters: {
            type: 'object',
            properties: {
                speed: { type: 'number', description: 'Speed multiplier (0.1 to 10)' },
            },
            required: ['speed'],
        },
    },
    {
        type: 'function',
        name: 'get_object_details',
        description: 'Get details about a specific tracked object by name',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object name to look up' },
            },
            required: ['name'],
        },
    },
    {
        type: 'function',
        name: 'list_nearby_objects',
        description: 'List tracked objects near a geographic point',
        parameters: {
            type: 'object',
            properties: {
                lat: { type: 'number', description: 'Latitude' },
                lon: { type: 'number', description: 'Longitude' },
                radius_km: { type: 'number', description: 'Search radius in km (default 500)' },
            },
            required: ['lat', 'lon'],
        },
    },
    {
        type: 'function',
        name: 'open_camera_feed',
        description: 'Open a camera feed / street view at a specific location',
        parameters: {
            type: 'object',
            properties: {
                lat: { type: 'number', description: 'Latitude' },
                lon: { type: 'number', description: 'Longitude' },
            },
            required: ['lat', 'lon'],
        },
    },
];

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: SAL_SYSTEM_PROMPT,
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
      process.exit(1);
    }
    if (msg.type === 'session.updated') {
       process.exit(0);
    }
});
