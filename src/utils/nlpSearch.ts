import { ActiveFilters } from '@/store/useTrackingStore';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are a filter engine for a satellite/aircraft/rocket tracking application called Orbital Command.
Given a natural language query from an OSINT analyst, return a JSON object representing structured filters.

The JSON schema is:
{
  "types": ["aircraft" | "satellite" | "rocket"],  // empty array means all types
  "altitudeMin": number | undefined,                // in km
  "altitudeMax": number | undefined,                // in km
  "speedMin": number | undefined,                   // in km/h
  "speedMax": number | undefined,                   // in km/h
  "callsignPattern": string | undefined,            // wildcard pattern, e.g. "RYR*" or "STARLINK*"
  "country": string | undefined,                    // 2-letter country code
  "operator": string | undefined                    // operator name
}

Examples:
- "Show me military aircraft" → {"types":["aircraft"],"callsignPattern":"*","operator":"Military"}
- "Satellites above 500km" → {"types":["satellite"],"altitudeMin":500}
- "Fast rockets" → {"types":["rocket"],"speedMin":20000}
- "Aircraft over 10km altitude" → {"types":["aircraft"],"altitudeMin":10}
- "Low orbit satellites" → {"types":["satellite"],"altitudeMax":600}
- "All objects below 5km" → {"types":[],"altitudeMax":5}

IMPORTANT: Only return raw JSON, no markdown, no explanation.`;

/**
 * Detect whether a search query looks like natural language
 * (as opposed to a simple callsign/name filter)
 */
export function isNLPQuery(query: string): boolean {
    if (query.length < 8) return false;
    const nlpKeywords = [
        'show', 'find', 'where', 'above', 'below', 'over', 'near', 'around',
        'military', 'fast', 'slow', 'high', 'low', 'orbit', 'altitude',
        'speed', 'aircraft', 'satellite', 'rocket', 'all', 'what', 'which',
        'more than', 'less than', 'between', 'flying',
    ];
    const lower = query.toLowerCase();
    return nlpKeywords.some((kw) => lower.includes(kw));
}

/**
 * Send an NLP query to Gemini and get back structured filters
 */
export async function nlpToFilters(query: string): Promise<Partial<ActiveFilters> | null> {
    if (!GEMINI_API_KEY) {
        console.warn('[NLP Search] No Gemini API key configured');
        return null;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: [{ parts: [{ text: query }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 256,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        if (!response.ok) {
            console.error('[NLP Search] API error:', response.status);
            return null;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        const parsed = JSON.parse(text);
        return {
            types: parsed.types || [],
            altitudeMin: parsed.altitudeMin,
            altitudeMax: parsed.altitudeMax,
            speedMin: parsed.speedMin,
            speedMax: parsed.speedMax,
            callsignPattern: parsed.callsignPattern,
            country: parsed.country,
            operator: parsed.operator,
        };
    } catch (err) {
        console.error('[NLP Search] Failed to parse:', err);
        return null;
    }
}
