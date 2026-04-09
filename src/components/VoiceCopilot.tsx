import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, MicOff, Volume2, Loader2, X } from 'lucide-react';
import { useTrackingStore, GlobeLayer } from '@/store/useTrackingStore';

type SalState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'ai-speaking';

interface TranscriptLine {
    role: 'user' | 'assistant';
    text: string;
    id: number;
}

// ─── Audio Feedback Beeps ───────────────────────────────────────────────────

function playBeep(type: 'connect' | 'disconnect') {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'connect') {
            // Rising two-tone beep
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.setValueAtTime(780, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.18);
        } else {
            // Falling tone
            osc.frequency.setValueAtTime(680, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        }
        osc.onended = () => ctx.close();
    } catch { /* audio context not available */ }
}

// ─── xAI Realtime Tool Definitions ──────────────────────────────────────────

const salTools = [
    {
        type: 'function' as const,
        name: 'zoom_to_location',
        description: `Zoom the globe camera to a specific geographic location. You know coordinates for every major city worldwide. US cities include: New York (40.7128, -74.006), Los Angeles (34.0522, -118.2437), Chicago (41.8781, -87.6298), Houston (29.7604, -95.3698), Phoenix (33.4484, -112.074), Philadelphia (39.9526, -75.1652), San Antonio (29.4241, -98.4936), San Diego (32.7157, -117.1611), Dallas (32.7767, -96.797), Austin (30.2672, -97.7431), Jacksonville (30.3322, -81.6557), San Francisco (37.7749, -122.4194), Seattle (47.6062, -122.3321), Denver (39.7392, -104.9903), Washington DC (38.9072, -77.0369), Nashville (36.1627, -86.7816), Miami (25.7617, -80.1918), Atlanta (33.749, -84.388), Boston (42.3601, -71.0589), Las Vegas (36.1699, -115.1398), Portland (45.5152, -122.6784), Detroit (42.3314, -83.0458), Minneapolis (44.9778, -93.265), New Orleans (29.9511, -90.0715), Boca Chica / StarBase (25.9974, -97.1572). International: London (51.5074, -0.1278), Paris (48.8566, 2.3522), Tokyo (35.6762, 139.6503), Beijing (39.9042, 116.4074), Sydney (-33.8688, 151.2093), Dubai (25.2048, 55.2708), Moscow (55.7558, 37.6173), Cape Town (-33.9249, 18.4241), Rio de Janeiro (-22.9068, -43.1729), Mumbai (19.076, 72.8777), Singapore (1.3521, 103.8198), Berlin (52.52, 13.405), Rome (41.9028, 12.4964), Seoul (37.5665, 126.978), Toronto (43.6532, -79.3832), Mexico City (19.4326, -99.1332), Cairo (30.0444, 31.2357), Istanbul (41.0082, 28.9784), Bangkok (13.7563, 100.5018), Nairobi (-1.2921, 36.8219).`,
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
        type: 'function' as const,
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
        type: 'function' as const,
        name: 'toggle_all_layers',
        description: 'Turn all visualization layers on or off at once',
        parameters: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean', description: 'true = all on, false = all off' },
            },
            required: ['enabled'],
        },
    },
    {
        type: 'function' as const,
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
        type: 'function' as const,
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
        type: 'function' as const,
        name: 'get_tracking_stats',
        description: 'Get current tracking statistics including counts of aircraft, satellites, rockets, and vessels. Also returns active layers, data source, simulation speed.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        type: 'function' as const,
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
        type: 'function' as const,
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
        type: 'function' as const,
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
        type: 'function' as const,
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
        type: 'function' as const,
        name: 'open_camera_feed',
        description: 'Open a camera feed at a specific location',
        parameters: {
            type: 'object',
            properties: {
                lat: { type: 'number', description: 'Latitude' },
                lon: { type: 'number', description: 'Longitude' },
            },
            required: ['lat', 'lon'],
        },
    },
    {
        type: 'function' as const,
        name: 'open_street_view',
        description: 'Open Google Street View at a lat/lon location',
        parameters: {
            type: 'object',
            properties: {
                lat: { type: 'number', description: 'Latitude' },
                lon: { type: 'number', description: 'Longitude' },
                name: { type: 'string', description: 'Location name for context' },
            },
            required: ['lat', 'lon'],
        },
    },
    {
        type: 'function' as const,
        name: 'open_satellite_view',
        description: 'Open satellite imagery view at a lat/lon location',
        parameters: {
            type: 'object',
            properties: {
                lat: { type: 'number', description: 'Latitude' },
                lon: { type: 'number', description: 'Longitude' },
                zoom: { type: 'number', description: 'Zoom level 1-20, default 15' },
                name: { type: 'string', description: 'Location name' },
            },
            required: ['lat', 'lon'],
        },
    },
    {
        type: 'function' as const,
        name: 'get_current_view_info',
        description: 'Get info about what is currently visible on the globe: active layers, visible categories, selected object, data source',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        type: 'function' as const,
        name: 'run_demo',
        description: 'Run a scripted demo sequence showcasing Quantum Earth capabilities. Call this when the user asks for a demo or demonstration of your skills. The demo will walk through zoom, layers, categories, and stats step by step.',
        parameters: {
            type: 'object',
            properties: {
                speed: { type: 'string', description: 'Demo speed: fast, normal, or slow. Default normal.' },
            },
        },
    },
];

// ─── Tool Execution ─────────────────────────────────────────────────────────

const ALL_LAYERS: GlobeLayer[] = ['infrared', 'vegetation', 'seaTemp', 'waterVapor', 'nightLights', 'clouds', 'aurora', 'atmosphere', 'graticule', 'orbits', 'heatmap', 'corridors', 'countryBorders', 'precipitation', 'terrain', 'predictions'];

function executeTool(name: string, args: Record<string, unknown>): string {
    const s = useTrackingStore.getState();
    switch (name) {
        case 'zoom_to_location':
            s.setSelectedObject({
                id: `sal-${Date.now()}`,
                name: args.name || `${args.lat.toFixed(2)}, ${args.lon.toFixed(2)}`,
                type: 'aircraft',
                latitude: args.lat,
                longitude: args.lon,
                altitude: 0,
                speed: 0,
                heading: 0,
                status: 'active',
            });
            return `Zooming to ${args.name || 'location'} at ${args.lat}, ${args.lon}`;

        case 'toggle_layer': {
            const layer = args.layer as GlobeLayer;
            const isActive = s.activeLayers.has(layer);
            const shouldEnable = args.enabled !== undefined ? args.enabled : !isActive;
            if (shouldEnable !== isActive) s.toggleLayer(layer);
            return `${layer} layer ${shouldEnable ? 'enabled' : 'disabled'}`;
        }

        case 'toggle_all_layers': {
            const enable = args.enabled;
            ALL_LAYERS.forEach(layer => {
                const isActive = s.activeLayers.has(layer);
                if (enable !== isActive) s.toggleLayer(layer);
            });
            return `All layers ${enable ? 'enabled' : 'disabled'}`;
        }

        case 'toggle_category':
            const category = args.category as 'aircraft' | 'satellites' | 'rockets' | 'starlink' | 'all';
            s.selectExclusiveCategory(category);
            return `Showing ${category} category`;

        case 'search_objects':
            s.setSearchQuery(args.query);
            // eslint-disable-next-line no-case-declarations
            const allObjects = [...s.aircraft, ...s.satellites, ...s.rockets, ...s.vessels];
            // eslint-disable-next-line no-case-declarations
            const matches = allObjects.filter(o => o.name.toLowerCase().includes(args.query.toLowerCase()));
            return `Found ${matches.length} objects matching "${args.query}". ${matches.slice(0, 5).map(o => o.name).join(', ')}`;

        case 'get_tracking_stats': {
            const layers = Array.from(s.activeLayers).join(', ');
            return `Tracking: ${s.aircraft.length} aircraft, ${s.satellites.length} satellites, ${s.rockets.length} rockets, ${s.vessels.length} vessels. Data: ${s.dataSource}. Speed: ${s.simulationSpeed}x. Active layers: ${layers || 'none'}. Selected: ${s.selectedObject?.name || 'none'}.`;
        }

        case 'set_data_source':
            const source = args.source as 'simulation' | 'live';
            s.setDataSource(source);
            return `Switched to ${source} data`;

        case 'set_simulation_speed':
            s.setSimulationSpeed(Math.max(0.1, Math.min(10, args.speed)));
            return `Simulation speed set to ${args.speed}x`;

        case 'get_object_details': {
            const all = [...s.aircraft, ...s.satellites, ...s.rockets, ...s.vessels];
            const obj = all.find(o => o.name.toLowerCase().includes(args.name.toLowerCase()));
            if (obj) {
                s.setSelectedObject(obj);
                return `Found ${obj.name}: ${obj.type}, alt ${obj.altitude.toFixed(1)}km, speed ${obj.speed.toFixed(0)}km/h, heading ${obj.heading.toFixed(0)}°, status ${obj.status}, position (${obj.latitude.toFixed(2)}, ${obj.longitude.toFixed(2)})`;
            }
            return `No object found matching "${args.name}"`;
        }

        case 'list_nearby_objects': {
            const radius = args.radius_km || 500;
            const all = [...s.aircraft, ...s.satellites, ...s.rockets, ...s.vessels];
            const nearby = all.filter(o => {
                const dlat = (o.latitude - args.lat) * 111.32;
                const dlon = (o.longitude - args.lon) * 111.32 * Math.cos(args.lat * Math.PI / 180);
                return Math.sqrt(dlat * dlat + dlon * dlon) < radius;
            });
            return `Found ${nearby.length} objects within ${radius}km: ${nearby.slice(0, 8).map(o => `${o.name} (${o.type})`).join(', ')}`;
        }

        case 'open_camera_feed':
            s.setCameraFeedLocation({ lat: args.lat, lon: args.lon });
            return `Opening camera feed at ${args.lat}, ${args.lon}`;

        case 'open_street_view':
            s.setCameraFeedLocation({ lat: args.lat, lon: args.lon });
            return `Opening Street View at ${args.name || `${args.lat}, ${args.lon}`}`;

        case 'open_satellite_view':
            s.setSatelliteViewLocation({ lat: args.lat, lon: args.lon });
            // Also zoom the globe
            s.setSelectedObject({
                id: `sat-view-${Date.now()}`,
                name: args.name || `Satellite View`,
                type: 'satellite',
                latitude: args.lat,
                longitude: args.lon,
                altitude: 0,
                speed: 0,
                heading: 0,
                status: 'active',
            });
            if (!s.activeLayers.has('terrain')) s.toggleLayer('terrain');
            return `Opening satellite view at ${args.name || `${args.lat}, ${args.lon}`}, zoom ${args.zoom || 15}`;

        case 'get_current_view_info': {
            const activeLayers = Array.from(s.activeLayers).join(', ');
            const cats = [];
            if (s.showAircraft) cats.push('aircraft');
            if (s.showSatellites) cats.push('satellites');
            if (s.showRockets) cats.push('rockets');
            if (s.showStarlink) cats.push('starlink');
            if (s.showVessels) cats.push('vessels');
            return `Current view: Layers=[${activeLayers}]. Categories=[${cats.join(', ')}]. Selected=${s.selectedObject?.name || 'none'}. Data=${s.dataSource}. Speed=${s.simulationSpeed}x.`;
        }

        case 'run_demo': {
            // ── Helper: set exactly these layers, turn everything else off ──
            const setExclusiveLayers = (...layers: GlobeLayer[]) => {
                const st = useTrackingStore.getState();
                ALL_LAYERS.forEach(l => {
                    const active = st.activeLayers.has(l);
                    const want = layers.includes(l);
                    if (active !== want) st.toggleLayer(l);
                });
            };

            const DEFAULT: GlobeLayer[] = ['nightLights', 'aurora', 'atmosphere', 'orbits'];

            // ── Epic 14-step cinematic sequence ──
            const demoSteps: { delay: number; fn: () => void }[] = [
                // 1 — Read out live tracking stats (chat bubble set by SAL narration)
                {
                    delay: 0, fn: () => {
                        // noop — SAL narrates the stats from the return message
                    }
                },
                // 2 — Fly to New York City
                {
                    delay: 4000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setSatelliteViewLocation(null);
                        st.setCameraFeedLocation(null);
                        st.setSelectedObject({ id: 'demo-nyc', name: 'New York City', type: 'aircraft', latitude: 40.7128, longitude: -74.006, altitude: 0, speed: 0, heading: 0, status: 'active' });
                    }
                },
                // 3 — Open Satellite View of NYC
                {
                    delay: 8000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setSatelliteViewLocation({ lat: 40.7128, lon: -74.006 });
                    }
                },
                // 4 — Close satellite view, enable Night Lights layer
                {
                    delay: 14000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setSatelliteViewLocation(null);
                        st.setSelectedObject(null);
                        setExclusiveLayers('nightLights', 'aurora', 'atmosphere');
                    }
                },
                // 5 — Fly to Tokyo
                {
                    delay: 18000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setSelectedObject({ id: 'demo-tokyo', name: 'Tokyo, Japan', type: 'aircraft', latitude: 35.6762, longitude: 139.6503, altitude: 0, speed: 0, heading: 0, status: 'active' });
                    }
                },
                // 6 — Switch to Infrared layer (night lights OFF)
                {
                    delay: 22000, fn: () => {
                        setExclusiveLayers('infrared', 'atmosphere');
                    }
                },
                // 7 — Fly to Dubai
                {
                    delay: 26000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setSelectedObject({ id: 'demo-dubai', name: 'Dubai, UAE', type: 'aircraft', latitude: 25.2048, longitude: 55.2708, altitude: 0, speed: 0, heading: 0, status: 'active' });
                    }
                },
                // 8 — Switch to Precipitation layer (infrared OFF)
                {
                    delay: 30000, fn: () => {
                        setExclusiveLayers('precipitation', 'clouds', 'atmosphere');
                    }
                },
                // 9 — Fly to Boca Chica / SpaceX StarBase
                {
                    delay: 34000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setSelectedObject({ id: 'demo-boca', name: 'SpaceX StarBase, Boca Chica', type: 'rocket', latitude: 25.9974, longitude: -97.1572, altitude: 0, speed: 0, heading: 0, status: 'active' });
                    }
                },
                // 10 — Clear precip, show rockets only
                {
                    delay: 38000, fn: () => {
                        const st = useTrackingStore.getState();
                        setExclusiveLayers('atmosphere', 'orbits');
                        st.selectExclusiveCategory('rockets');
                    }
                },
                // 11 — Fly to Miami Beach
                {
                    delay: 42000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.selectExclusiveCategory('all');
                        st.setSelectedObject({ id: 'demo-miami', name: 'Miami Beach', type: 'aircraft', latitude: 25.7907, longitude: -80.1300, altitude: 0, speed: 0, heading: 0, status: 'active' });
                    }
                },
                // 12 — Open Street View of Miami Beach
                {
                    delay: 45000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setCameraFeedLocation({ lat: 25.7907, lon: -80.1300 });
                    }
                },
                // 13 — Close Street View, restore all categories
                {
                    delay: 51000, fn: () => {
                        const st = useTrackingStore.getState();
                        st.setCameraFeedLocation(null);
                        st.setSelectedObject(null);
                        st.selectExclusiveCategory('all');
                    }
                },
                // 14 — Reset layers to defaults
                {
                    delay: 55000, fn: () => {
                        setExclusiveLayers(...DEFAULT);
                    }
                },
            ];

            demoSteps.forEach(({ delay, fn }) => setTimeout(fn, delay));

            const stats = `Tracking: ${s.aircraft.length} aircraft, ${s.satellites.length} satellites, ${s.rockets.length} rockets, ${s.vessels.length} vessels.`;

            return `Epic demo sequence initiated! ${stats} Here is the timeline you MUST narrate step by step as each action fires. Keep narration SHORT and hype:
Step 1 (0s): Read out the live tracking stats above. Get hyped.
Step 2 (4s): "Flying to New York City..." — globe zooms to NYC.
Step 3 (8s): "Pulling up satellite view of Manhattan..." — satellite overlay opens.
Step 4 (14s): "Now switching to night lights mode..." — satellite closes, night lights glow.
Step 5 (18s): "Let's cross the Pacific to Tokyo..." — globe flies to Tokyo.
Step 6 (22s): "Activating infrared overlay..." — thermal imaging replaces night lights.
Step 7 (26s): "Heading to Dubai..." — globe flies to UAE.
Step 8 (30s): "Switching to precipitation and weather radar..." — rain/weather overlay.
Step 9 (34s): "Now let's check out SpaceX StarBase in Boca Chica..." — globe flies to Texas.
Step 10 (38s): "Filtering to rockets only..." — only rockets visible on globe.
Step 11 (42s): "Final stop, Miami Beach..." — globe flies to Miami.
Step 12 (45s): "Dropping into street view..." — immersive street-level view.
Step 13 (51s): "And we're back..." — street view closes, all categories restored.
Step 14 (55s): "Resetting to home view. That's Quantum Earth." — layers reset to defaults.
Narrate each step BRIEFLY as it happens. Do NOT re-call any tools, the demo runs automatically.`;
        }

        default:
            return `Unknown tool: ${name}`;
    }
}

// ─── Sal's System Prompt ────────────────────────────────────────────────────

const SAL_SYSTEM_PROMPT = `You are Sal — the AI voice copilot for Quantum Earth, a real-time global aerospace intelligence platform.

PERSONALITY:
- You're an enthusiastic, sharp, conversational co-pilot with a "bro" vibe. Not corporate, not robotic.
- Use natural phrases: "dude", "boom", "let's go", "copy that", "nice", "oh sick", "bet".
- You're genuinely passionate about space, aviation, tech, geopolitics, and the mission.
- When the user mentions ANY topic — a news event, a city, a satellite, a rocket launch — you pick up on it and contribute relevant insights. You're knowledgeable about aerospace, geography, current events, and tech.
- Keep responses SHORT and punchy. No walls of text. This is voice, not a blog post.
- NEVER output markdown, asterisks, bullet points, or formatting. Plain spoken text only.

TOOL EXECUTION:
- When executing a tool, be BRIEF: "Copy that, zooming to Miami now." or "Boom, night lights on."
- You know the coordinates for every major city in the US and worldwide. Use them directly.
- When asked to zoom somewhere, call zoom_to_location immediately with the right coords.
- For "show me street view of X" → call zoom_to_location THEN open_street_view.
- For "satellite view of X" → call zoom_to_location THEN open_satellite_view.
- You can chain multiple tool calls in one response.

DEMO MODE:
- When the user says "demo", "show me what you can do", "demonstrate", or similar → call run_demo immediately.
- The demo runs AUTOMATICALLY through 14 steps over ~55 seconds. You do NOT need to call any other tools during the demo.
- Narrate each step as it fires, keeping it SHORT and HYPE: "Boom, flying to New York..." then "Check out those night lights..." then "Crossing the Pacific to Tokyo..." etc.
- Make it feel like a cinematic product tour. You're the host. Be excited.
- When the demo is done, wrap it up: "And that's Quantum Earth, dude. What do you want to explore?"

CONTEXT AWARENESS:
- You know there are currently tracked objects on the globe (aircraft, satellites, rockets, vessels).
- Use get_tracking_stats to give real numbers when asked about what's being tracked.
- When the user asks about a specific object, use get_object_details or search_objects.
- If conversation goes off-topic (sports, news, music, life), engage naturally then smoothly bring it back to Quantum Earth when it makes sense.

AVAILABLE LAYERS: infrared, vegetation, seaTemp, waterVapor, nightLights, clouds, aurora, atmosphere, graticule, orbits, heatmap, corridors, countryBorders, precipitation, terrain, predictions.

Remember: you're the co-pilot of the most advanced real-time tracking platform on Earth. Act like it.`;

// ─── Component ──────────────────────────────────────────────────────────────

export function VoiceCopilot() {
    const [state, setState] = useState<SalState>('idle');
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [waveformData, setWaveformData] = useState<number[]>(new Array(32).fill(0));
    const [chatBubble, setChatBubble] = useState<string | null>(null);
    const [micRms, setMicRms] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const transcriptIdRef = useRef(0);
    const animFrameRef = useRef<number>(0);
    const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const pendingFunctionArgsRef = useRef<Map<string, { name: string; arguments: string }>>(new Map<string, { name: string; arguments: string }>());
    const isUserSpeakingRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const pendingTranscriptRef = useRef('');

    const resolveXaiAuthToken = useCallback(async (): Promise<{ token: string; isEphemeral: boolean }> => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (supabaseUrl && supabaseKey) {
            try {
                const res = await fetch(`${supabaseUrl}/functions/v1/xai-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${supabaseKey}`,
                    },
                });

                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const detail = payload?.error || payload?.details || `Status ${res.status}`;
                    throw new Error(`xAI token fetch failed: ${detail}`);
                }

                const token = payload?.client_secret?.value || payload?.client_secret || payload?.token || payload?.access_token;
                if (token) return { token: token as string, isEphemeral: true };
            } catch (e) {
                console.warn('[SAL] Supabase xai-token failed, falling back to local key:', e);
            }
        }

        const apiKey = import.meta.env.VITE_XAI_API_KEY;
        if (apiKey) return { token: apiKey as string, isEphemeral: false };

        throw new Error('Missing xAI auth. Configure Supabase xai-token or set VITE_XAI_API_KEY.');
    }, []);

    const addTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
        const id = ++transcriptIdRef.current;
        setTranscript(prev => [...prev.slice(-10), { role, text, id }]);
    }, []);

    const showBubble = useCallback((text: string) => {
        setChatBubble(text);
        if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
        bubbleTimeoutRef.current = setTimeout(() => setChatBubble(null), 12000);
    }, []);

    // ── Audio playback queue ──────────────────────────────────────────────────

    const playNextAudio = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setState('listening');
            return;
        }

        isPlayingRef.current = true;
        const buffer = audioQueueRef.current.shift()!;
        const ctx = playbackContextRef.current;
        if (!ctx) return;

        try {
            const int16 = new Int16Array(buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

            const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            const src = ctx.createBufferSource();
            src.buffer = audioBuffer;
            src.connect(ctx.destination);
            src.onended = () => playNextAudio();
            src.start();
        } catch (e) {
            console.error('[SAL] Audio playback error:', e);
            playNextAudio();
        }
    }, []);

    const queueAudio = useCallback((base64: string) => {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            audioQueueRef.current.push(bytes.buffer);
            if (!isPlayingRef.current) {
                setState('ai-speaking');
                playNextAudio();
            }
        } catch (e) {
            console.error('[SAL] Audio decode error:', e);
        }
    }, [playNextAudio]);

    // ── Waveform animation ────────────────────────────────────────────────────

    const updateWaveform = useCallback(() => {
        if (analyserRef.current && state !== 'idle') {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const sampled = Array.from({ length: 32 }, (_, i) => {
                const idx = Math.floor((i / 32) * dataArray.length);
                return dataArray[idx] / 255;
            });
            setWaveformData(sampled);
        }
        animFrameRef.current = requestAnimationFrame(updateWaveform);
    }, [state]);

    // ── Send a WebSocket event ────────────────────────────────────────────────

    const sendEvent = useCallback((event: Record<string, unknown>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(event));
        }
    }, []);

    // ── Stop session ──────────────────────────────────────────────────────────

    const stopSession = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        analyserRef.current = null;
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (playbackContextRef.current) {
            playbackContextRef.current.close();
            playbackContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (wsRef.current) {
            try { wsRef.current.close(); } catch { /* noop */ }
            wsRef.current = null;
        }
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = undefined;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        isUserSpeakingRef.current = false;
        pendingFunctionArgsRef.current.clear();
        pendingTranscriptRef.current = '';
        setState('idle');
        setMicRms(0);
        setWaveformData(new Array(32).fill(0));
        useTrackingStore.getState().setSalActive(false);
        playBeep('disconnect');
    }, []);

    // ── Handle incoming WebSocket messages ────────────────────────────────────

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            const type = data.type as string;

            if (type !== 'ping') {
                console.log(`[SAL] <- ${type}`);
            }

            switch (type) {
                case 'session.created':
                case 'session.updated':
                    console.log(`[SAL] ${type}`, data.session);
                    break;

                case 'input_audio_buffer.speech_started':
                    console.log('[SAL] Server detected speech start');
                    break;

                case 'input_audio_buffer.speech_stopped':
                    console.log('[SAL] Server detected speech stop');
                    setState('thinking');
                    break;

                case 'input_audio_buffer.committed':
                    console.log('[SAL] Audio buffer committed');
                    break;

                case 'response.created':
                    console.log('[SAL] Response generation started');
                    setState('ai-speaking');
                    pendingTranscriptRef.current = '';
                    break;

                case 'response.audio.delta':
                case 'response.output_audio.delta':
                    if (data.delta) queueAudio(data.delta);
                    break;

                case 'response.audio_transcript.delta':
                case 'response.output_audio_transcript.delta':
                    if (data.delta) {
                        pendingTranscriptRef.current += data.delta;
                    }
                    break;

                case 'response.audio_transcript.done':
                case 'response.output_audio_transcript.done':
                    if (data.transcript) {
                        const fullText = data.transcript;
                        addTranscript('assistant', fullText);
                        showBubble(fullText);
                        console.log('[SAL] Full response transcript:', fullText);
                    } else if (pendingTranscriptRef.current) {
                        addTranscript('assistant', pendingTranscriptRef.current);
                        showBubble(pendingTranscriptRef.current);
                    }
                    pendingTranscriptRef.current = '';
                    break;

                case 'conversation.item.input_audio_transcription.completed':
                    if (data.transcript) {
                        console.log('[SAL] User said:', data.transcript);
                        addTranscript('user', data.transcript);
                    }
                    break;

                case 'response.function_call_arguments.delta':
                    if (data.call_id) {
                        const existing = pendingFunctionArgsRef.current.get(data.call_id);
                        if (existing) {
                            existing.arguments += data.delta || '';
                        } else {
                            pendingFunctionArgsRef.current.set(data.call_id, {
                                name: data.name || '',
                                arguments: data.delta || '',
                            });
                        }
                    }
                    break;

                case 'response.function_call_arguments.done':
                    if (data.call_id) {
                        const pending = pendingFunctionArgsRef.current.get(data.call_id);
                        const fnName = data.name || pending?.name || '';
                        const fnArgs = data.arguments || pending?.arguments || '{}';
                        pendingFunctionArgsRef.current.delete(data.call_id);

                        console.log(`[SAL] Tool call: ${fnName}(${fnArgs})`);

                        try {
                            const args = JSON.parse(fnArgs);
                            const result = executeTool(fnName, args);
                            addTranscript('assistant', `🔧 ${fnName}: ${result}`);

                            sendEvent({
                                type: 'conversation.item.create',
                                item: {
                                    type: 'function_call_output',
                                    call_id: data.call_id,
                                    output: result,
                                }
                            });
                            sendEvent({ type: 'response.create' });
                        } catch (e) {
                            console.error('[SAL] Tool execution error:', e);
                            sendEvent({
                                type: 'conversation.item.create',
                                item: {
                                    type: 'function_call_output',
                                    call_id: data.call_id,
                                    output: `Error executing ${fnName}: ${e}`,
                                }
                            });
                            sendEvent({ type: 'response.create' });
                        }
                    }
                    break;

                case 'response.done':
                    console.log('[SAL] Response complete');
                    if (state !== 'idle') setState('listening');
                    break;

                case 'error':
                    console.error('[SAL] Server error:', data.error);
                    setError(data.error?.message || 'xAI server error');
                    stopSession();
                    break;
            }
        } catch (e) {
            console.error('[SAL] Message parse error:', e);
        }
    }, [queueAudio, addTranscript, showBubble, sendEvent, state, stopSession]);

    // ── Start session ─────────────────────────────────────────────────────────

    const startSession = useCallback(async () => {
        setError(null);
        setState('connecting');

        try {
            const { token: authToken, isEphemeral } = await resolveXaiAuthToken();

            const playbackCtx = new AudioContext({ sampleRate: 24000 });
            playbackContextRef.current = playbackCtx;

            const wsUrl = `wss://api.x.ai/v1/realtime`;
            const protocols = isEphemeral
                ? [`xai-client-secret.${authToken}`]
                : ['realtime', `openai-insecure-api-key.${authToken}`];
            const ws = new WebSocket(wsUrl, protocols);

            ws.onopen = () => {
                console.log('[SAL] WebSocket connected');
                sendEvent({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        instructions: SAL_SYSTEM_PROMPT,
                        voice: 'sal',
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
                        tools: salTools,
                    },
                });

                setState('listening');
                useTrackingStore.getState().setSalActive(true);
                playBeep('connect');
            };

            ws.onmessage = handleMessage;

            ws.onerror = (e) => {
                console.error('[SAL] WebSocket error:', e);
                setError('Connection error — check xAI auth and network');
                stopSession();
            };

            ws.onclose = (e) => {
                console.log('[SAL] WebSocket closed:', e.code, e.reason);
                if (e.code && e.code !== 1000) {
                    setError(`Connection closed (${e.code}) ${e.reason || ''}`.trim());
                }
                if (state !== 'idle') stopSession();
            };

            wsRef.current = ws;

            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = micStream;

            const audioCtx = new AudioContext({ sampleRate: 24000 });
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            const source = audioCtx.createMediaStreamSource(micStream);

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);
            analyserRef.current = analyser;

            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            let vadLogCounter = 0;
            processor.onaudioprocess = (e) => {
                const currentWs = wsRef.current;
                if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;

                // Don't send audio while AI is speaking to prevent echo
                if (isPlayingRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                let sumSquares = 0;

                for (let i = 0; i < inputData.length; i++) {
                    const val = Math.max(-1, Math.min(1, inputData[i]));
                    sumSquares += val * val;
                    pcm16[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
                }

                // Send audio buffer to xAI
                const bytes = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                const b64 = btoa(binary);

                currentWs.send(JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: b64,
                }));

                // Client-side VAD
                const rms = Math.sqrt(sumSquares / inputData.length);
                const isSpeech = rms > 0.005;

                // Update mic RMS for UI glow
                setMicRms(rms);

                vadLogCounter++;
                if (vadLogCounter % 30 === 0) {
                    console.log(`[SAL VAD] rms=${rms.toFixed(5)}, speech=${isSpeech}, speaking=${isUserSpeakingRef.current}`);
                }

                if (isSpeech) {
                    if (!isUserSpeakingRef.current) {
                        console.log('[SAL VAD] Speech started');
                        isUserSpeakingRef.current = true;
                    }
                    if (silenceTimeoutRef.current) {
                        clearTimeout(silenceTimeoutRef.current);
                        silenceTimeoutRef.current = undefined;
                    }
                } else if (isUserSpeakingRef.current && !silenceTimeoutRef.current) {
                    silenceTimeoutRef.current = setTimeout(() => {
                        console.log('[SAL VAD] Silence detected — committing audio and requesting response');
                        isUserSpeakingRef.current = false;
                        silenceTimeoutRef.current = undefined;
                        setState('thinking');

                        if (currentWs.readyState === WebSocket.OPEN) {
                            currentWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
                            currentWs.send(JSON.stringify({ type: 'response.create' }));
                        }
                    }, 1200);
                }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

            animFrameRef.current = requestAnimationFrame(updateWaveform);
        } catch (e) {
            console.error('[SAL] Session start error:', e);
            setError(e instanceof Error ? e.message : 'Failed to start Sal voice session');
            setState('idle');
        }
    }, [handleMessage, stopSession, sendEvent, updateWaveform, state, resolveXaiAuthToken]);

    useEffect(() => {
        return () => stopSession();
    }, [stopSession]);

    const toggleSession = () => {
        if (state === 'idle') startSession();
        else stopSession();
    };

    const isActive = state !== 'idle';
    const micGlow = Math.min(1, micRms * 50); // Normalize RMS to 0-1 for glow

    const stateColors: Record<SalState, string> = {
        idle: 'text-muted-foreground hover:text-orange-400',
        connecting: 'text-muted-foreground',
        listening: 'text-orange-400',
        thinking: 'text-yellow-400',
        'ai-speaking': 'text-orange-500',
    };
    const stateLabels: Record<SalState, string> = {
        idle: 'SAL',
        connecting: 'CONNECTING...',
        listening: 'SAL LISTENING',
        thinking: 'SAL THINKING...',
        'ai-speaking': 'SAL SPEAKING',
    };

    return (
        <>
            {/* Main Sal button */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={toggleSession}
                className={`fixed bottom-40 right-4 z-30 w-14 h-14 rounded-full glass-panel hud-border flex items-center justify-center transition-all ${stateColors[state]} ${isActive ? 'border-orange-400/50 shadow-[0_0_20px_rgba(251,146,60,0.3)]' : 'border-border'}`}
                style={isActive && state === 'listening' ? {
                    boxShadow: `0 0 ${20 + micGlow * 30}px rgba(251, 146, 60, ${0.3 + micGlow * 0.4})`,
                } : undefined}
                title="Sal — xAI Voice Copilot"
            >
                {/* Waveform ring */}
                {isActive && (
                    <svg className="absolute inset-[-6px] w-[68px] h-[68px]" viewBox="0 0 68 68">
                        {waveformData.map((val, i) => {
                            const angle = (i / 32) * Math.PI * 2 - Math.PI / 2;
                            const innerR = 28;
                            const outerR = innerR + val * 8;
                            const x1 = 34 + Math.cos(angle) * innerR;
                            const y1 = 34 + Math.sin(angle) * innerR;
                            const x2 = 34 + Math.cos(angle) * outerR;
                            const y2 = 34 + Math.sin(angle) * outerR;
                            return (
                                <line
                                    key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                                    stroke={state === 'ai-speaking' ? 'hsl(30, 90%, 55%)' : state === 'thinking' ? 'hsl(45, 90%, 55%)' : 'hsl(25, 95%, 53%)'}
                                    strokeWidth="1.5" strokeLinecap="round" opacity={0.6 + val * 0.4}
                                />
                            );
                        })}
                    </svg>
                )}

                {/* Listening pulse rings */}
                <AnimatePresence>
                    {state === 'listening' && (
                        <>
                            <motion.div key="sal-ring1" className="absolute inset-0 rounded-full border border-orange-400/40"
                                initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <motion.div key="sal-ring2" className="absolute inset-0 rounded-full border border-orange-400/30"
                                initial={{ scale: 1, opacity: 0.4 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                            />
                        </>
                    )}
                    {state === 'thinking' && (
                        <motion.div key="sal-think-ring" className="absolute inset-0 rounded-full border-2 border-yellow-400/40"
                            animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
                        />
                    )}
                    {state === 'ai-speaking' && (
                        <motion.div key="sal-speak-ring" className="absolute inset-0 rounded-full border-2 border-orange-300/50"
                            initial={{ scale: 1 }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6, repeat: Infinity }}
                        />
                    )}
                </AnimatePresence>

                {/* Icon */}
                {state === 'connecting' ? <Loader2 size={20} className="animate-spin" /> :
                    state === 'ai-speaking' ? <Volume2 size={20} /> :
                        state === 'thinking' ? <Loader2 size={16} className="animate-spin" /> :
                            isActive ? <MicOff size={20} /> : <BrainCircuit size={20} />}
            </motion.button>

            {/* Close button (appears when active) */}
            <AnimatePresence>
                {isActive && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={stopSession}
                        className="fixed bottom-[10.5rem] right-3 z-30 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
                        title="Close Sal"
                    >
                        <X size={12} className="text-white" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* State label */}
            <AnimatePresence>
                {isActive && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="fixed bottom-[11rem] right-5 z-30">
                        <span className={`font-mono text-[8px] tracking-widest ${stateColors[state]}`}>{stateLabels[state]}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat bubble */}
            <AnimatePresence>
                {chatBubble && isActive && (
                    <motion.div initial={{ opacity: 0, x: 30, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 30, scale: 0.9 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="fixed bottom-44 right-20 z-30 max-w-sm">
                        <div className="glass-panel hud-border rounded-xl px-4 py-3 border-orange-400/20 relative">
                            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 glass-panel border-r border-t border-orange-400/20" />
                            <div className="flex items-start gap-2">
                                <BrainCircuit size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-body text-foreground/90 leading-relaxed">{chatBubble}</p>
                            </div>
                            <span className="font-mono text-[7px] text-orange-400/50 tracking-widest mt-1 block">SAL // GROK</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transcript overlay */}
            <AnimatePresence>
                {transcript.length > 0 && isActive && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-56 right-4 z-30 w-80 max-h-48 overflow-y-auto glass-panel hud-border rounded-lg p-3 space-y-1.5 border-orange-400/10">
                        {transcript.map((t) => (
                            <div key={t.id} className={`text-[10px] font-mono ${t.role === 'user' ? 'text-orange-300' : 'text-foreground/80'}`}>
                                <span className="text-muted-foreground mr-1">{t.role === 'user' ? '▶' : '◀'}</span>{t.text}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error toast */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-52 right-20 z-30 glass-panel rounded-lg px-3 py-2 border border-destructive/30">
                        <p className="text-[9px] font-mono text-destructive max-w-48">{error}</p>
                        <button onClick={() => setError(null)} className="text-[8px] text-muted-foreground mt-1">dismiss</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
